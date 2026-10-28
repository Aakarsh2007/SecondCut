import { AppError } from './domain.mjs';

const integer=(v,min=0,max=100000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const fields=['deposit','refund','incurred','completion','fees','tax','contingency','minimumMargin','minimumImprovement','askingPrice','floorPrice','cutLengthCost','cutWidthCost','baselineRefund','baselineDisposal','baselineFees','baselineSalvage'];
export function validatePlanningInput(input) {
  if(!input||typeof input!=='object'||!input.snapshot||!Array.isArray(input.needs)||input.needs.length>20)throw new AppError('Provide one production snapshot and at most 20 buyer requests.');
  const s=input.snapshot;
  if(typeof s.title!=='string'||s.title.trim().length<3||s.title.length>100)throw new AppError('Name the unfinished order (3–100 characters).');
  for(const k of fields)if(!integer(s[k]))throw new AppError(`Enter a nonnegative integer-cent value for ${k}.`);
  if(!s.deposit||!s.askingPrice||s.floorPrice>s.askingPrice||s.refund>s.deposit)throw new AppError('Check deposit, refund, asking price and price floor.');
  if(!['raw','finished'].includes(s.stage)||!['walnut','oak','plywood'].includes(s.material)||!['natural','dark','painted'].includes(s.finish))throw new AppError('Choose a supported material, finish and production stage.');
  if(!integer(s.version,1,10000))throw new AppError('Snapshot version must be a positive integer.');
  if(!day(s.readyDate))throw new AppError('Enter a valid workshop-ready date.');
  if(typeof s.pickupArea!=='string'||!s.pickupArea.trim()||s.pickupArea.length>80)throw new AppError('Specify the local pickup area.');
  const ids=new Set();
  for(const n of input.needs){if(!n||typeof n!=='object'||typeof n.id!=='string'||!/^[a-zA-Z0-9_-]{1,50}$/.test(n.id)||ids.has(n.id))throw new AppError('Buyer request IDs must be distinct simple identifiers.');ids.add(n.id);if(typeof n.label!=='string'||n.label.length>100)throw new AppError('Give each request a short text label.');if(!['SYNTHETIC','MANUAL_RECORD'].includes(n.source))throw new AppError('Label each request synthetic or manually recorded.');}
  return structuredClone(input);
}

export function evaluatePlanning(raw,at=new Date()) {
  const input=validatePlanningInput(raw),s=input.snapshot,today=at.toISOString().slice(0,10);
  const baseline=s.deposit-s.baselineRefund-s.incurred-s.baselineDisposal-s.baselineFees+s.baselineSalvage;
  const evaluate=n=>{
    const reasons=[],questions=[],evidence=[],operations=[];
    const reject=(code,message,field)=>{reasons.push({code,message});if(field)evidence.push(`snapshot:v${s.version}:${field}`);};
    if(n.consent!==true||n.open!==true||!day(n.expiresDate)||n.expiresDate<today)return {id:n.id,label:n.label||n.id,source:n.source,status:'EXCLUDED',reasons:[{code:'UNAVAILABLE_REQUEST',message:'Request is withdrawn, expired, closed or lacks discovery consent.'}],questions,evidence,operations};
    if(s.makerConfirmed!==true)questions.push('Maker must confirm the production snapshot and quoted costs.');
    if(s.rightsConfirmed!==true)questions.push('Confirm ownership and cancellation terms; do not defer an unconditional refund.');
    if(!day(s.quoteExpiresDate)||s.quoteExpiresDate<today)questions.push('Cost quotes are missing a valid date or have expired. Obtain fresh maker quotes.');
    if(s.unit!=='mm'||!integer(s.lengthMm,100,5000)||!integer(s.widthMm,100,2500))questions.push('Confirm tabletop length and width explicitly in millimetres.');
    if(!integer(n.lengthMm,100,5000)||!integer(n.widthMm,100,2500))questions.push('Confirm buyer dimensions explicitly in millimetres.');
    if(!integer(n.budget,1)||!day(n.latestDate))questions.push('Confirm buyer budget and latest acceptable pickup date.');
    if(n.material!==s.material)reject('MATERIAL','Buyer requires a different material.','material');
    if(n.finish!==s.finish)reject('FINISH','No approved finish-change operation exists.','finish');
    if(n.pickupArea!==s.pickupArea)reject('PICKUP','Pickup areas differ; transport is not quoted in this local-pickup workflow.','pickupArea');
    if(day(n.latestDate)&&s.readyDate>n.latestDate)reject('DEADLINE','Workshop cannot meet the requested pickup date.','readyDate');
    let adaptation=0;
    if(integer(n.lengthMm,100,5000)&&integer(s.lengthMm,100,5000)&&s.unit==='mm'){
      if(n.lengthMm>s.lengthMm)reject('CANNOT_ENLARGE_LENGTH','Required top is longer than the available top. Cutting cannot enlarge it.','lengthMm');
      else if(n.lengthMm<s.lengthMm){if(s.stage!=='raw'||s.allowShorten!==true)reject('SHORTEN_NOT_ALLOWED','Shortening is not approved at this production stage.','allowShorten');else{adaptation+=s.cutLengthCost;operations.push({id:'SHORTEN_TOP',from:s.lengthMm,to:n.lengthMm,unit:'mm',cost:s.cutLengthCost,evidence:`snapshot:v${s.version}:allowShorten`});}}
    }
    if(integer(n.widthMm,100,2500)&&integer(s.widthMm,100,2500)&&s.unit==='mm'){
      if(n.widthMm>s.widthMm)reject('CANNOT_ENLARGE_WIDTH','Required top is wider than available stock.','widthMm');
      else if(n.widthMm<s.widthMm){if(s.stage!=='raw'||s.allowNarrow!==true)reject('NARROW_NOT_ALLOWED','Narrowing is not approved at this production stage.','allowNarrow');else{adaptation+=s.cutWidthCost;operations.push({id:'NARROW_TOP',from:s.widthMm,to:n.widthMm,unit:'mm',cost:s.cutWidthCost,evidence:`snapshot:v${s.version}:allowNarrow`});}}
    }
    const price=integer(n.budget,1)?Math.min(s.askingPrice,n.budget):null;
    const costs=s.incurred+s.completion+adaptation+s.fees+s.tax;
    const margin=price===null?null:s.deposit+price-s.refund-costs-s.contingency;
    const improvement=margin===null?null:margin-baseline;
    const stressMargin=margin===null?null:margin-Math.ceil((s.completion+adaptation)*20/100);
    if(price!==null&&price<s.floorPrice)reject('PRICE_FLOOR','Buyer budget is below the merchant-approved price floor.');
    if(margin!==null&&margin<s.minimumMargin)reject('MARGIN','Projected margin is below the maker minimum.');
    if(improvement!==null&&improvement<s.minimumImprovement)reject('BASELINE','Recovery does not improve sufficiently on the stated cancellation baseline.');
    const status=reasons.length?'REJECTED':questions.length?'NEEDS_EVIDENCE':'FEASIBLE';
    return {id:n.id,label:String(n.label||n.id).slice(0,100),source:n.source,status,reasons,questions,evidence:[...new Set([...evidence,`buyer:${n.id}`,`snapshot:v${s.version}:dimensions`,`snapshot:v${s.version}:costs`])],operations,price,costs,adaptation,margin,baseline,improvement,stressMargin,fragile:stressMargin!==null&&stressMargin<s.minimumMargin,removedTopAreaMm2:status==='FEASIBLE'?s.lengthMm*s.widthMm-n.lengthMm*n.widthMm:null};
  };
  const candidates=input.needs.map(evaluate).sort((a,b)=>Number(b.status==='FEASIBLE')-Number(a.status==='FEASIBLE')||(b.margin??-Infinity)-(a.margin??-Infinity));
  return {engine:'DETERMINISTIC_RULES_V1',evaluatedAt:at.toISOString(),snapshotVersion:s.version,baseline,candidates,feasibleCount:candidates.filter(c=>c.status==='FEASIBLE').length,notice:'Rules-based planning. No AI inference or buyer availability is claimed. Maker must validate joinery, safety, actual costs and delivery. Removed tabletop area is offcut, not measured avoided waste.'};
}

export function samplePlanningInput(now=new Date()) {
  const date=days=>new Date(now.getTime()+days*86400000).toISOString().slice(0,10);
  const base={source:'SYNTHETIC',consent:true,open:true,expiresDate:date(14),lengthMm:1600,widthMm:700,material:'walnut',finish:'natural',pickupArea:'Workshop pickup',latestDate:date(10),budget:170000};
  return {snapshot:{title:'Unfinished walnut writing desk',version:1,unit:'mm',lengthMm:1800,widthMm:800,material:'walnut',finish:'natural',stage:'raw',allowShorten:true,allowNarrow:true,makerConfirmed:true,rightsConfirmed:true,quoteExpiresDate:date(14),readyDate:date(7),pickupArea:'Workshop pickup',deposit:100000,refund:90000,incurred:110000,completion:30000,fees:10000,tax:0,contingency:10000,minimumMargin:10000,minimumImprovement:10000,askingPrice:170000,floorPrice:150000,cutLengthCost:5000,cutWidthCost:5000,baselineRefund:0,baselineDisposal:0,baselineFees:4000,baselineSalvage:0},needs:[{...base,id:'studio',label:'Studio desk request'},{...base,id:'oversized',label:'Larger tabletop request',lengthMm:2000},{...base,id:'oak',label:'Oak-only request',material:'oak'},{...base,id:'budget',label:'Tight-budget request',budget:140000},{...base,id:'withdrawn',label:'Withdrawn request',open:false},{...base,id:'missing',label:'Unconfirmed dimensions',lengthMm:null}]};
}
