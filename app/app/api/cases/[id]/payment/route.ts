import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { AppError,OP_KINDS } from '@/lib/domain.mjs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
  mutationGuard(request);const {id}=await params;const user=await owner();const body=await jsonBody(request);
  if(!OP_KINDS.includes(body.kind))throw new AppError('Unknown payment operation.');
  const {service,config}=runtime();
  if(!config.PAYPAL_CLIENT_ID||!config.PAYPAL_CLIENT_SECRET)throw new AppError('Configure sandbox credentials before requesting an actual PayPal payment.',503,'SANDBOX_NOT_CONFIGURED');
  return response(await service.execute(id,user,body.kind,{recover:body.recover===true}));
}catch(e){return errorResponse(e);}}
