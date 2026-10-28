import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { AppError } from './domain.mjs';
import { Store } from './store.mjs';
import { PayPal } from './paypal.mjs';
import { PaymentService } from './payments.mjs';
import {requireWorkshopOperator} from './access.mjs';

export function runtime() {
  if (!env.DB) throw new AppError('Database is not ready. Apply the documented local migrations.',503,'DATABASE_UNAVAILABLE');
  const store=new Store(env.DB);const provider=new PayPal(env);
  return {store,provider,service:new PaymentService(store,provider),config:env};
}
export async function owner() {
  const h=await headers();const id=h.get('oai-authenticated-user-id');
  if(!id)throw new AppError('Sign in to use the private payment workspace.',401,'SIGN_IN_REQUIRED');
  return requireWorkshopOperator(runtime().store,id);
}
export async function participantIdentity(){const h=await headers(),id=h.get('oai-authenticated-user-id');if(!id)throw new AppError('Sign in to review your invitation.',401,'SIGN_IN_REQUIRED');return {id,email:h.get('oai-authenticated-user-email')||''};}
export function mutationGuard(request: Request) {
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)throw new AppError('Cross-origin mutations are not allowed.',403,'ORIGIN_REQUIRED');
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError('JSON content type required.',415);
}
export async function jsonBody(request: Request) {
  const text=await request.text();if(text.length>8192)throw new AppError('Request is too large.',413);
  try{return JSON.parse(text);}catch{throw new AppError('Invalid JSON.');}
}
export function errorResponse(error: unknown) {
  const known=error instanceof AppError;
  return Response.json({error:known?error.message:'Server request failed. Your payment status has not been changed to success.',code:known?error.code:'INTERNAL_ERROR'}, {status:known?error.status:500,headers:{'Cache-Control':'no-store'}});
}
export function response(data: unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
