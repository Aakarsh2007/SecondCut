export class AppError extends Error {
  constructor(message, status = 400, code = 'INVALID_REQUEST') { super(message); this.status = status; this.code = code; }
}
export const money = (cents) => ({ currency_code: 'USD', value: (cents / 100).toFixed(2) });
export function cents(value) {
  if (typeof value !== 'string' || !/^\d{1,7}(\.\d{1,2})?$/.test(value)) throw new AppError('Enter an amount with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 100000000) throw new AppError('Amount is outside the supported limit.');
  return result;
}
export function evaluate(c) {
  return { projectedMargin: c.deposit + c.replacement - c.refund - c.costs - c.contingency,
    merchantReceipts: c.deposit + c.replacement - c.refund, refundable: c.refund <= c.deposit };
}
export function validateCase(input) {
  const title = String(input.title || 'Walnut writing desk').trim();
  if (title.length < 3 || title.length > 100) throw new AppError('Order title must contain 3–100 characters.');
  const parsed = { title, currency: 'USD', deposit: cents(input.deposit ?? '1000'), replacement: cents(input.replacement ?? '1700'),
    refund: cents(input.refund ?? '900'), costs: cents(input.costs ?? '1600'), contingency: cents(input.contingency ?? '100') };
  if (!parsed.deposit || !parsed.replacement || !parsed.refund) throw new AppError('Deposit, replacement price, and refund must be greater than zero.');
  const economics = evaluate(parsed);
  if (!economics.refundable) throw new AppError('Refund cannot exceed the original deposit.');
  if (economics.projectedMargin < 0) throw new AppError('This proposal loses money after costs and contingency. Revise the agreement.');
  return parsed;
}
export async function hashAgreement(c) {
  const terms=[c.id,c.title,c.currency,c.deposit,c.replacement,c.refund,c.costs,c.contingency];
  if(c.agreement_details&&c.agreement_details!=='{}')terms.push(c.agreement_details,c.agreement_expires_at);
  const encoded = new TextEncoder().encode(JSON.stringify(terms));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function requireApprovals(c) {
  if(c.recovery_status&&c.recovery_status!=='ACTIVE')throw new AppError('Recovery was rejected or withdrawn. No new financial commitment is allowed.',409,'RECOVERY_STOPPED');
  const approvals = typeof c.approvals === 'string' ? JSON.parse(c.approvals) : c.approvals;
  if(c.approval_mode==='PARTICIPANTS'){
    if(c.replacement_status!=='COMPLETED'&&(!c.agreement_expires_at||Date.parse(c.agreement_expires_at)<=Date.now()))throw new AppError('Participant agreement expired. Start a fresh proposal.',409,'AGREEMENT_EXPIRED');
    const roles=['maker','original','replacement'],actors=roles.map(role=>approvals[role]?.actor);
    if(!roles.every(role=>approvals[role]?.hash===c.agreement_hash&&approvals[role]?.mode==='PARTICIPANT')||actors.some(a=>!a)||new Set(actors).size!==3)throw new AppError('Three distinct signed-in participants must approve these exact terms.',409,'APPROVAL_REQUIRED');
    return;
  }
  if (!['maker','original','replacement'].every(role => approvals[role]?.hash === c.agreement_hash)) {
    throw new AppError('Record all three demo agreement attestations before replacement checkout.', 409, 'APPROVAL_REQUIRED');
  }
}
export function assertAmount(resource, expected) {
  if (!resource?.amount || resource.amount.currency_code !== 'USD' || cents(resource.amount.value) !== expected) {
    throw new AppError('PayPal amount or currency does not match the approved agreement. Review required.', 409, 'PROVIDER_MISMATCH');
  }
}
export const OP_KINDS = ['original_order','original_capture','replacement_order','replacement_authorize','replacement_capture','original_refund','void','retry_replacement','renew_replacement_checkout'];
export function operationSpec(kind, c) {
  if(kind!=='void'&&c.recovery_status&&c.recovery_status!=='ACTIVE')throw new AppError('Recovery is stopped. Review outstanding holds and refund obligations.',409,'RECOVERY_STOPPED');
  if(c.approval_mode==='PARTICIPANTS'&&['original_order','original_capture'].includes(kind)&&(!Number.isFinite(Date.parse(c.agreement_expires_at))||Date.parse(c.agreement_expires_at)<=Date.now()))throw new AppError('Agreement expired. No new deposit can be collected against these terms.',409,'AGREEMENT_EXPIRED');
  const unit = amount => [{ reference_id: c.id, custom_id: c.id, description: `SecondCut sandbox · ${c.title}`, amount: money(amount) }];
  const order = (intent, amount) => ({ intent, purchase_units: unit(amount) });
  switch (kind) {
    case 'original_order': return { path: '/v2/checkout/orders', payload: order('CAPTURE', c.deposit) };
    case 'original_capture':
      if (!c.original_order_id) throw new AppError('Create and approve the original deposit order first.',409);
      return {path:`/v2/checkout/orders/${c.original_order_id}/capture`,payload:{}};
    case 'replacement_order':
      if(c.original_status !== 'COMPLETED') throw new AppError('A verified original deposit is required.',409);
      requireApprovals(c);
      return {path:'/v2/checkout/orders',payload:order('AUTHORIZE',c.replacement)};
    case 'replacement_authorize':
      requireApprovals(c);
      if(!c.replacement_order_id) throw new AppError('Create and approve replacement checkout first.',409);
      return {path:`/v2/checkout/orders/${c.replacement_order_id}/authorize`,payload:{}};
    case 'replacement_capture':
      requireApprovals(c);
      if(c.replacement_status !== 'AUTHORIZED' || !c.authorization_id) throw new AppError('A confirmed authorization is required.',409);
      return {path:`/v2/payments/authorizations/${c.authorization_id}/capture`,payload:{amount:money(c.replacement),final_capture:true}};
    case 'original_refund':
      if(c.replacement_status !== 'COMPLETED' || !c.replacement_capture_id || !c.original_capture_id) throw new AppError('Replacement capture must be verified complete before recovery refund.',409);
      requireApprovals(c);
      return {path:`/v2/payments/captures/${c.original_capture_id}/refund`,payload:{amount:money(c.refund),note_to_payer:'SecondCut approved sandbox recovery settlement'}};
    case 'void':
      if(!c.authorization_id || c.replacement_status !== 'AUTHORIZED') throw new AppError('Only a confirmed uncaptured authorization can be voided.',409);
      return {path:`/v2/payments/authorizations/${c.authorization_id}/void`,payload:{}};
    default:throw new AppError('Unsupported payment action.');
  }
}
