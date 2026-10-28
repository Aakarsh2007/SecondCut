// Manual localhost integration check. Never runs against the hosted Site or PayPal.
const origin='http://127.0.0.1:5173';
async function api(path,body){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:origin,Cookie:'__sites_local_auth=1'},...(body?{body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
const me=await api('/api/participation');
if(me.identity.email!=='seedy@sites.test')throw new Error('This check requires the starter’s local mock identity; no hosted account is allowed.');
const cases=await api('/api/cases'),c=cases.find(c=>c.approval_mode==='PARTICIPANTS'&&c.original_status==='NOT_STARTED'&&!c.replacement_order_id);
if(!c)throw new Error('Prepare one unpaid local fixture case in participant mode first.');
const state=await api(`/api/cases/${c.id}/participants`);
if(state.invitations.some(i=>i.role==='maker'))throw new Error('Maker fixture already exists; inspect its saved review instead of recreating access.');
const invitation=await api(`/api/cases/${c.id}/participants`,{action:'invite',role:'maker',email:me.identity.email});
const review=await api('/api/participation/claim',{token:invitation.token});
if(review.role!=='maker'||review.status!=='CLAIMED')throw new Error('Maker claim failed.');
const f=await api(`/api/participation/${review.id}/fulfillment`);
if(f.stage!=='NOT_STARTED'||f.paymentVerified)throw new Error('Unexpected fulfillment state.');
console.log(JSON.stringify({test:'local mock maker invite → authenticated claim → role-scoped review → unstarted handoff',passed:true,reviewId:review.id,caseId:c.id,noMessagesSent:true,noPaymentsMoved:true,identity:'LOCAL_MOCK_ONLY'}));
