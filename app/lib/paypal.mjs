import { AppError } from './domain.mjs';
export class ProviderError extends AppError {
  constructor(message,status,code,debugId){super(message,status,code);this.debugId=debugId;this.uncertain=status>=500||status===408||status===429;}
}
export class PayPal {
  constructor(config, fetcher=(...args)=>fetch(...args)) {this.config=config;this.fetcher=fetcher;this.base='https://api-m.sandbox.paypal.com';}
  async token() {
    if(!this.config.PAYPAL_CLIENT_ID||!this.config.PAYPAL_CLIENT_SECRET) throw new AppError('PayPal sandbox credentials are not configured. Payments have not been simulated.',503,'SANDBOX_NOT_CONFIGURED');
    const r=await this.fetcher(`${this.base}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${btoa(`${this.config.PAYPAL_CLIENT_ID}:${this.config.PAYPAL_CLIENT_SECRET}`)}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(20000)});
    const body=await r.json();if(!r.ok)throw new ProviderError('PayPal could not authenticate the sandbox app.',r.status,'PAYPAL_AUTHENTICATION_FAILED',body.debug_id);
    return body.access_token;
  }
  async request(path,{method='GET',body,requestId}={}) {
    if(!/^\/v[12]\/[a-z0-9_\-/]+$/i.test(path))throw new AppError('Invalid provider resource path.');
    const token=await this.token();
    const response=await this.fetcher(`${this.base}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(requestId?{'PayPal-Request-Id':requestId,Prefer:'return=representation'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const data=response.status===204?{}:await response.json();
    if(!response.ok){const code=data.details?.[0]?.issue||data.name||'PAYPAL_ERROR';throw new ProviderError(`PayPal: ${code.replaceAll('_',' ').toLowerCase()}.`,response.status,code,data.debug_id);}
    return data;
  }
  async getOrder(id){return this.request(`/v2/checkout/orders/${id}`);}
  async verifyWebhook(headers,event) {
    if(!this.config.PAYPAL_WEBHOOK_ID)throw new AppError('Webhook ID is not configured.',503,'WEBHOOK_NOT_CONFIGURED');
    const result=await this.request('/v1/notifications/verify-webhook-signature',{method:'POST',body:{auth_algo:headers['paypal-auth-algo'],cert_url:headers['paypal-cert-url'],transmission_id:headers['paypal-transmission-id'],transmission_sig:headers['paypal-transmission-sig'],transmission_time:headers['paypal-transmission-time'],webhook_id:this.config.PAYPAL_WEBHOOK_ID,webhook_event:event}});
    return result.verification_status==='SUCCESS';
  }
}
