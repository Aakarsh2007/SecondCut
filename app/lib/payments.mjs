import { AppError, assertAmount, operationSpec, cents } from './domain.mjs';

const now=()=>new Date().toISOString();
export class PaymentService {
  constructor(store,provider){this.store=store;this.provider=provider;}
  async execute(caseId,owner,kind,{recover=false}={}) {
    const c=await this.store.getCase(caseId,owner);if(!c)throw new AppError('Recovery case not found.',404);
    if(kind==='renew_replacement_checkout') {
      operationSpec('replacement_order',c);
      const prior=await this.store.operation(caseId,'replacement_order');
      if(!prior||prior.status!=='COMPLETED'||prior.resource_id!==c.replacement_order_id||c.active_operation||c.authorization_id||c.replacement_capture_id||c.refund_id||c.replacement_status!=='NOT_STARTED'||await this.store.operation(caseId,'replacement_authorize')||await this.store.operation(caseId,'replacement_capture'))throw new AppError('An existing or unresolved payment attempt requires reconciliation; checkout cannot be replaced.',409,'RENEW_NOT_ALLOWED');
      const age=Date.now()-Date.parse(prior.created_at);
      if(!Number.isFinite(age)||age<3*60*60*1000)throw new AppError('This checkout is still within its approval window. Use the existing approval link.',409,'CHECKOUT_STILL_VALID');
      if(!await this.store.lock(caseId,prior.id))throw new AppError('Another payment is unresolved.',409,'OPERATION_LOCKED');
      try {
        // Verify that the configured credentials still reach the original merchant.
        const original=await this.provider.getOrder(c.original_order_id);
        const unit=original?.purchase_units?.[0];assertAmount(unit,c.deposit);
        if(unit.custom_id!==c.id||unit.payee?.merchant_id!==c.merchant_id)throw new AppError('Original merchant cannot be verified with the current credentials.',409,'MERCHANT_MISMATCH');
        let reason;
        try {
          const old=await this.provider.getOrder(c.replacement_order_id);
          const oldUnit=old?.purchase_units?.[0];assertAmount(oldUnit,c.replacement);
          if(old.status!=='CREATED'||oldUnit.custom_id!==c.id||oldUnit.payee?.merchant_id!==c.merchant_id||oldUnit.payments?.authorizations?.length||oldUnit.payments?.captures?.length)throw new AppError('Existing checkout is approved or has financial activity. Reconcile it before continuing.',409,'RENEW_NOT_ALLOWED');
          // A still-retrievable CREATED order might have an extended approval window.
          throw new AppError('PayPal still recognizes this checkout. Use its approval link or review it in PayPal.',409,'CHECKOUT_STILL_VALID');
        } catch(error) {
          // A generic 404, network error or credential failure must never unlock a new payment.
          if(error.status!==404||error.code!=='INVALID_RESOURCE_ID'||age<6*60*60*1000)throw error;
          reason='Aged checkout no longer exists at PayPal; no authorization or capture was attempted by SecondCut.';
        }
        operationSpec('replacement_order',await this.store.getCase(caseId,owner));
        if((await this.store.one('SELECT stage FROM fulfillment_records WHERE case_id=?',caseId))?.stage==='ISSUE_OPEN')throw new AppError('Resolve the participant issue before restarting checkout.',409,'FULFILLMENT_ISSUE');
        await this.store.renewUnusedReplacement(c,prior,reason);
        return {case:await this.store.detail(caseId,owner)};
      } finally {
        await this.store.run('UPDATE recovery_cases SET active_operation=NULL WHERE id=? AND active_operation=?',caseId,prior.id);
      }
    }
    if(kind==='replacement_capture'&&c.replacement_status==='AUTHORIZED') {
      const [original,replacement]=await Promise.all([this.provider.getOrder(c.original_order_id),this.provider.getOrder(c.replacement_order_id)]);
      const buyer=o=>o?.payer?.payer_id||o?.payment_source?.paypal?.account_id;
      if(!buyer(original)||!buyer(replacement)||buyer(original)===buyer(replacement))throw new AppError('Use a different replacement buyer account. Void this hold before retrying checkout.',409,'BUYER_IDENTITY_MISMATCH');
    }
    if(kind==='retry_replacement') {
      if(c.replacement_status!=='VOIDED'||!c.authorization_id||c.active_operation||c.replacement_capture_id||c.refund_id)throw new AppError('Only a verified voided, uncaptured replacement can be retried.',409,'RETRY_NOT_ALLOWED');
      const authorization=await this.provider.request(`/v2/payments/authorizations/${c.authorization_id}`);
      assertAmount(authorization,c.replacement);
      const order=await this.provider.getOrder(c.replacement_order_id);
      if(authorization.status!=='VOIDED'||order.purchase_units?.[0]?.payee?.merchant_id!==c.merchant_id||order.purchase_units?.some(u=>u.payments?.captures?.length))throw new AppError('PayPal has not confirmed an uncaptured void for this merchant.',409,'RETRY_NOT_ALLOWED');
      if(await this.store.operation(caseId,'replacement_capture'))throw new AppError('A previous capture attempt requires review before another checkout.',409,'RETRY_NOT_ALLOWED');
      await this.store.retryVoidedReplacement(c);
      return {case:await this.store.detail(caseId,owner)};
    }
    let op=await this.store.operation(caseId,kind);
    if(op?.status==='COMPLETED')return {operation:op,case:await this.store.detail(caseId,owner)};
    if((!op||op.status==='READY')&&['original_capture','replacement_authorize'].includes(kind)){
      operationSpec(kind,c);
      const order=await this.provider.getOrder(kind==='original_capture'?c.original_order_id:c.replacement_order_id);
      if(order.status!=='APPROVED')throw new AppError('Approve this order in PayPal first, then return here. No payment request was sent.',409,'CHECKOUT_NOT_APPROVED');
    }
    if(['replacement_order','replacement_authorize','replacement_capture'].includes(kind)&&(!op||op.status==='READY')){
      const physical=await this.store.one('SELECT stage FROM fulfillment_records WHERE case_id=?',caseId);
      if(physical?.stage==='ISSUE_OPEN')throw new AppError('A participant reported an unresolved issue. No new replacement commitment is allowed.',409,'FULFILLMENT_ISSUE');
    }
    if(op&&['FAILED','REVIEW_REQUIRED'].includes(op.status))throw new AppError(op.error||'This operation needs review. Do not create another payment.',409,'REVIEW_REQUIRED');
    if(!op) { const spec=operationSpec(kind,c);op=await this.store.ensureOperation(caseId,kind,spec); }
    if(!await this.store.lock(caseId,op.id))throw new AppError('Another payment is unresolved. Reconcile it before continuing.',409,'OPERATION_LOCKED');
    // Approval/withdrawal can race with checkout preparation. Recheck after acquiring
    // the same case lock that participant decisions are required to respect.
    if(op.status==='READY'){
      try{operationSpec(kind,await this.store.getCase(caseId,owner));if(['replacement_order','replacement_authorize','replacement_capture'].includes(kind)&&(await this.store.one('SELECT stage FROM fulfillment_records WHERE case_id=?',caseId))?.stage==='ISSUE_OPEN')throw new AppError('An unresolved participant issue blocks new replacement commitments.',409,'FULFILLMENT_ISSUE');}
      catch(error){await this.store.run('UPDATE recovery_cases SET active_operation=NULL WHERE id=? AND active_operation=?',caseId,op.id);throw error;}
    }
    if(op.status==='RUNNING') {
      if(!recover||Date.now()-Date.parse(op.updated_at)<60000)throw new AppError('Payment request is in progress. Wait before reconciling.',409,'IN_PROGRESS');
      await this.store.finish(op,'UNKNOWN',null,'Interrupted request; reconciliation required.');op.status='UNKNOWN';
    }
    if(!await this.store.start(op))throw new AppError('This operation is already being processed.',409,'IN_PROGRESS');
    try {
      if(kind==='original_refund') {
        await this.store.patch(caseId,{refund_status:'OBLIGATION_RECORDED'});
        // Recheck provider remaining amount immediately before the mutation.
        const original=await this.provider.request(`/v2/payments/captures/${c.original_capture_id}`);
        assertAmount(original,c.deposit);
        const refunded=original.seller_receivable_breakdown?.total_refunded_amount;
        if(refunded && cents(refunded.value)+c.refund>c.deposit && !recover)throw new AppError('Original payment no longer has enough refundable balance.',409,'REFUND_LIMIT');
        const replacement=await this.provider.request(`/v2/payments/captures/${c.replacement_capture_id}`);
        assertAmount(replacement,c.replacement);
        if(replacement.status!=='COMPLETED')throw new AppError('Replacement payment is not currently complete. Review required.',409,'PAYMENT_CHANGED');
      }
      let resource;
      if(recover&&op.resource_id) {
        resource=await this.readResource(kind,op.resource_id,c);
      } else if(recover&&['original_capture','replacement_authorize','replacement_capture'].includes(kind)) {
        const order=await this.provider.getOrder(kind==='original_capture'?c.original_order_id:c.replacement_order_id);
        const key=kind==='replacement_authorize'?'authorizations':'captures';
        resource=order.purchase_units?.[0]?.payments?.[key]?.[0];
      }
      if(!resource) {
        // Endpoint-specific provider idempotency is finite; never retry an unknown mutation indefinitely.
        if(recover&&Date.now()-Date.parse(op.created_at)>30*60*1000)throw new AppError('Unknown operation is beyond the automatic recovery window. Check PayPal records manually.',409,'RECOVERY_WINDOW_EXPIRED');
        resource=await this.provider.request(op.path,{method:'POST',body:JSON.parse(op.payload),requestId:op.request_id});
      }
      const result=await this.apply(kind,c,resource,op);
      await this.store.event(caseId,'PAYPAL_RESULT',`${kind.replaceAll('_',' ')}: ${result.status.toLowerCase()}`,{kind,providerId:result.id||null,requestId:op.request_id,source:'PAYPAL_SANDBOX'});
      return {operation:await this.store.operation(caseId,kind),case:await this.store.detail(caseId,owner)};
    } catch(error) {
      const uncertain=!(error instanceof AppError)||error.uncertain;
      const status=uncertain?'UNKNOWN':(error.code==='SANDBOX_NOT_CONFIGURED'?'RETRYABLE':'REVIEW_REQUIRED');
      const message=error instanceof AppError?error.message:'PayPal response was not received. Reconcile this operation; do not create a new payment.';
      await this.store.finish(op,status,null,message);
      if(kind==='original_refund')await this.store.patch(caseId,{refund_status:uncertain?'UNKNOWN':'ACTION_REQUIRED'});
      await this.store.event(caseId,'PAYMENT_EXCEPTION',message,{kind,status,debugId:error.debugId||null});
      if(status==='RETRYABLE')await this.store.patch(caseId,{active_operation:null});
      throw new AppError(message,uncertain?502:(error.status||409),uncertain?'OUTCOME_UNKNOWN':error.code);
    }
  }
  async readResource(kind,id,c) {
    if(kind.endsWith('_order'))return this.provider.getOrder(id);
    if(kind==='replacement_authorize'||kind==='void')return this.provider.request(`/v2/payments/authorizations/${id}`);
    if(kind==='original_refund')return this.provider.request(`/v2/payments/refunds/${id}`);
    return this.provider.request(`/v2/payments/captures/${id}`);
  }
  async apply(kind,c,result,op) {
    let resource=result;
    if(kind==='original_capture')resource=result.purchase_units?.[0]?.payments?.captures?.[0]||result;
    if(kind==='replacement_authorize')resource=result.purchase_units?.[0]?.payments?.authorizations?.[0]||result;
    if(kind==='void'&&!resource.id)resource=await this.provider.request(`/v2/payments/authorizations/${c.authorization_id}`);
    if(!resource.id)throw new AppError('PayPal returned no resource ID. Review and reconciliation required.',502,'MISSING_RESOURCE');
    const orderKind=kind.endsWith('_order');
    if(orderKind) {
      const unit=resource.purchase_units?.[0];assertAmount(unit,kind==='original_order'?c.deposit:c.replacement);
      if(resource.purchase_units.length!==1||unit.custom_id!==c.id)throw new AppError('PayPal order does not match this case.',409,'PROVIDER_MISMATCH');
      await this.store.patch(c.id,{[kind==='original_order'?'original_order_id':'replacement_order_id']:resource.id});
      await this.store.finish(op,'COMPLETED',resource.id);return resource;
    }
    const expected=kind==='original_capture'?c.deposit:kind==='original_refund'?c.refund:c.replacement;
    assertAmount(resource,expected);
    // Read back the resource independently, rather than trusting the browser or an API callback alone.
    const readback=await this.readResource(kind,resource.id,c);assertAmount(readback,expected);
    const status=readback.status;
    const patch={};
    if(kind==='original_capture') {
      const order=await this.provider.getOrder(c.original_order_id);const merchant=order.purchase_units?.[0]?.payee?.merchant_id;
      if(!merchant)throw new AppError('Unable to establish original merchant identity.',409,'MERCHANT_UNVERIFIED');
      patch.original_capture_id=resource.id;patch.original_status=status;patch.merchant_id=merchant;
    }
    if(kind==='replacement_authorize'||kind==='replacement_capture') {
      const order=await this.provider.getOrder(c.replacement_order_id);
      if(order.purchase_units?.[0]?.payee?.merchant_id!==c.merchant_id)throw new AppError('Replacement seller differs from the original merchant.',409,'MERCHANT_MISMATCH');
      if(kind==='replacement_authorize'){patch.authorization_id=resource.id;patch.replacement_status=status==='CREATED'?'AUTHORIZED':status;}
      else {patch.replacement_capture_id=resource.id;patch.replacement_status=status;}
    }
    if(kind==='original_refund'){patch.refund_id=resource.id;patch.refund_status=status;}
    if(kind==='void')patch.replacement_status=status;
    await this.store.patch(c.id,patch);
    const success=kind==='replacement_authorize'?status==='CREATED':kind==='void'?status==='VOIDED':status==='COMPLETED';
    await this.store.finish(op,success?'COMPLETED':status==='PENDING'?'PENDING':'REVIEW_REQUIRED',resource.id,success?null:`Provider status: ${status}`);
    return readback;
  }
}
