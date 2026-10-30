import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { AppError } from '@/lib/domain.mjs';
import { aiConfigured,extractBuyerNotes } from '@/lib/ai-extraction.mjs';
export async function GET(){try{await owner();const {config}=runtime();return response({configured:aiConfigured(config),provider:'Google Gemini',model:config.GEMINI_MODEL||'gemini-2.5-flash'});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
 mutationGuard(request);const user=await owner(),body=await jsonBody(request),{store,config}=runtime();
 if(!aiConfigured(config))throw new AppError('AI is not connected. No model call was made.',503,'AI_NOT_CONFIGURED');
 if(body.shareWithGoogle!==true||!['SYNTHETIC','MANUAL_RECORD'].includes(body.source))throw new AppError('Confirm source labeling and permission to send these notes to Google.');
 if(typeof body.notes!=='string'||body.notes.trim().length<10||body.notes.length>4000)throw new AppError('Provide 10–4,000 characters of notes.');
 if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(body.notes))throw new AppError('Remove email addresses before sending buyer notes.');
 const id=crypto.randomUUID(),stamp=new Date().toISOString(),day=stamp.slice(0,10);
 const inserted=await store.one("INSERT INTO ai_extractions (id,owner,source,notes,status,created_at) SELECT ?,?,?,?,'RUNNING',? WHERE ((SELECT COUNT(*) FROM ai_extractions WHERE owner=? AND created_at>=?)+(SELECT COUNT(*) FROM commercial_advice WHERE owner=? AND created_at>=?))<20 RETURNING id",id,user,body.source,body.notes,stamp,user,day,user,day);
 if(!inserted)throw new AppError('Workspace AI limit of 20 attempts per UTC day reached. No provider call made.',429);
 try{const result=await extractBuyerNotes(body.notes,config);await store.run("UPDATE ai_extractions SET status='COMPLETED',result=? WHERE id=? AND owner=?",JSON.stringify(result),id,user);return response({id,...result,recordSource:body.source});}
 catch(e){await store.run("UPDATE ai_extractions SET status='FAILED' WHERE id=? AND owner=?",id,user);throw e;}
}catch(e){return errorResponse(e);}}
