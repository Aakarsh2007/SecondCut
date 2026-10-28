import { AppError } from './domain.mjs';
import { evaluatePlanning } from './planner.mjs';
export function evaluateCounteroffer(input,needId,body,at=new Date()) {
 const original=input.needs.find(n=>n.id===needId);if(!original)throw new AppError('Buyer request not found.',404);
 const base=evaluatePlanning(input,at).candidates.find(n=>n.id===needId);
 if(base.status==='EXCLUDED')return {status:'REFUSED',reason:'Request is no longer open, consented or fresh.'};
 if(!Number.isSafeInteger(body.price)||body.price<input.snapshot.floorPrice||body.price>input.snapshot.askingPrice||body.price>original.budget)return {status:'REFUSED',reason:'Price is outside the approved floor, asking price or buyer budget. Merchant limits were not changed.'};
 const lengthMm=body.lengthMm??original.lengthMm,widthMm=body.widthMm??original.widthMm,latestDate=body.latestDate||original.latestDate;
 if((lengthMm!==original.lengthMm||widthMm!==original.widthMm||latestDate!==original.latestDate)&&body.specChangeConfirmed!==true)return {status:'REFUSED',reason:'Changing requested dimensions or deadline needs explicit buyer-side tradeoff acknowledgment.'};
 const revised=structuredClone(input);revised.snapshot.askingPrice=body.price;
 revised.needs=revised.needs.map(n=>n.id===needId?{...n,lengthMm,widthMm,latestDate}:n);
 const candidate=evaluatePlanning(revised,at).candidates.find(n=>n.id===needId);
 if(candidate.status!=='FEASIBLE')return {status:'REFUSED',reason:[...candidate.reasons.map(r=>r.message),...candidate.questions].join(' '),candidate};
 return {status:'PROPOSAL',reason:'Counteroffer passes the modeled maker limits. It is not accepted by any participant and needs fresh proposal confirmation.',candidate,input:revised};
}
export async function startNegotiation(store,user,runId,needId,at=new Date()){
 const run=await store.one('SELECT * FROM planning_runs WHERE id=? AND owner=?',runId,user);if(!run)throw new AppError('Planning run not found.',404);
 if(run.case_id)throw new AppError('This run is already a fixed payment proposal. Start a new planning evaluation to negotiate.',409);
 const input=JSON.parse(run.input);if(!input.needs.some(n=>n.id===needId))throw new AppError('Buyer request not found.',404);
 const id=crypto.randomUUID();await store.run('INSERT INTO negotiations (id,owner,run_id,need_id,rounds,revision,created_at) VALUES (?,?,?,?,?,?,?)',id,user,runId,needId,'[]',0,at.toISOString());
 return {id,revision:0,rounds:[],remaining:3,input,needId,mode:'OWNER_CONTROLLED_DEMO'};
}
export async function submitCounteroffer(store,user,id,body,at=new Date()){
 const session=await store.one('SELECT * FROM negotiations WHERE id=? AND owner=?',id,user);if(!session)throw new AppError('Negotiation not found.',404);
 if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision!==session.revision)throw new AppError('Negotiation changed in another request. Reload before countering.',409);
 if(session.revision>=3)throw new AppError('Three rounds reached. Maker review and a new planning evaluation are required.',409);
 const run=await store.one('SELECT * FROM planning_runs WHERE id=? AND owner=?',session.run_id,user);if(!run||run.case_id)throw new AppError('Source proposal is already fixed or unavailable.',409);
 for(const round of JSON.parse(session.rounds)){if(round.planId){const child=await store.one('SELECT case_id FROM planning_runs WHERE id=? AND owner=?',round.planId,user);if(child?.case_id)throw new AppError('A counteroffer is already a fixed payment proposal. Negotiation is closed.',409);}}
 const input=JSON.parse(run.input),offer=evaluateCounteroffer(input,session.need_id,body,at),offerId=crypto.randomUUID(),planId=offer.status==='PROPOSAL'?crypto.randomUUID():null;
 const round={id:offerId,number:session.revision+1,price:body.price,lengthMm:body.lengthMm??null,widthMm:body.widthMm??null,latestDate:body.latestDate||null,specChangeConfirmed:body.specChangeConfirmed===true,status:offer.status,reason:offer.reason,planId,createdAt:at.toISOString()};
 const rounds=JSON.stringify([...JSON.parse(session.rounds),round]);
 const stmts=[store.db.prepare('UPDATE negotiations SET rounds=?,revision=revision+1 WHERE id=? AND owner=? AND revision=? AND revision<3').bind(rounds,id,user,session.revision)];
 let result;
 if(planId){result=evaluatePlanning(offer.input,at);stmts.push(store.db.prepare('INSERT INTO planning_runs (id,owner,input,result,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT id FROM negotiations WHERE id=? AND owner=? AND revision=? AND rounds=?)').bind(planId,user,JSON.stringify(offer.input),JSON.stringify(result),at.toISOString(),id,user,session.revision+1,rounds));}
 await store.db.batch(stmts);
 const updated=await store.one('SELECT * FROM negotiations WHERE id=? AND owner=?',id,user);
 if(!JSON.parse(updated.rounds).some(r=>r.id===offerId))throw new AppError('Another counteroffer won the concurrent update. Reload before continuing.',409);
 return {id,needId:session.need_id,input,revision:updated.revision,remaining:3-updated.revision,rounds:JSON.parse(updated.rounds),mode:'OWNER_CONTROLLED_DEMO',proposal:planId?{id:planId,input:offer.input,result}:null};
}
