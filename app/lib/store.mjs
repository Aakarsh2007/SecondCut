export class Store {
  constructor(db) { this.db = db; }
  async one(sql,...args) { return this.db.prepare(sql).bind(...args).first(); }
  async all(sql,...args) { return (await this.db.prepare(sql).bind(...args).all()).results; }
  async run(sql,...args) { return this.db.prepare(sql).bind(...args).run(); }
  async getCase(id, owner) {return this.one('SELECT * FROM recovery_cases WHERE id=? AND owner=?',id,owner);}
  async patch(id, values) {
    const allowed = new Set(['approvals','original_order_id','original_capture_id','replacement_order_id','authorization_id','replacement_capture_id','refund_id','merchant_id','original_status','replacement_status','refund_status','active_operation']);
    const entries = Object.entries({...values}).filter(([key])=>allowed.has(key));
    if(!entries.length) return;
    await this.run(`UPDATE recovery_cases SET ${entries.map(([k])=>`${k}=?`).join(',')},updated_at=? WHERE id=?`,...entries.map(([,v])=>v),new Date().toISOString(),id);
  }
  async event(caseId,type,message,metadata={}) {await this.run('INSERT INTO audit_events (id,case_id,type,message,metadata,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),caseId,type,message,JSON.stringify(metadata),new Date().toISOString());}
  async operation(caseId,kind) {return this.one('SELECT * FROM payment_operations WHERE case_id=? AND kind=?',caseId,kind);}
  async renewUnusedReplacement(c,op,reason) {
    const eligible=`SELECT id FROM recovery_cases WHERE id=? AND owner=? AND replacement_order_id=? AND active_operation=? AND replacement_status='NOT_STARTED' AND authorization_id IS NULL AND replacement_capture_id IS NULL AND refund_id IS NULL AND NOT EXISTS (SELECT 1 FROM payment_operations WHERE case_id=? AND kind IN ('replacement_authorize','replacement_capture'))`;
    const args=[c.id,c.owner,c.replacement_order_id,op.id,c.id],stamp=new Date().toISOString();
    return this.db.batch([
      this.db.prepare(`UPDATE payment_operations SET kind=kind||':archived:'||? WHERE id=? AND kind='replacement_order' AND case_id IN (${eligible})`).bind(c.replacement_order_id,op.id,...args),
      this.db.prepare(`INSERT INTO audit_events(id,case_id,type,message,metadata,created_at) SELECT ?,id,'CHECKOUT_RENEWED',?,?,? FROM recovery_cases WHERE id IN (${eligible})`).bind(crypto.randomUUID(),reason,JSON.stringify({previousOrder:c.replacement_order_id,previousRequest:op.request_id}),stamp,...args),
      this.db.prepare(`UPDATE recovery_cases SET replacement_order_id=NULL,active_operation=NULL,updated_at=? WHERE id IN (${eligible})`).bind(stamp,...args),
    ]);
  }
  async retryVoidedReplacement(c) {
    // D1 batches are transactional: archive the old attempt and reset its pointers together.
    const eligible = `SELECT id FROM recovery_cases WHERE id=? AND owner=? AND replacement_status='VOIDED' AND authorization_id=? AND active_operation IS NULL AND replacement_capture_id IS NULL AND refund_id IS NULL AND NOT EXISTS (SELECT 1 FROM payment_operations WHERE case_id=? AND kind='replacement_capture')`;
    const args=[c.id,c.owner,c.authorization_id,c.id], stamp=new Date().toISOString();
    return this.db.batch([
      this.db.prepare(`UPDATE payment_operations SET kind=kind||':archived:'||? WHERE case_id=? AND kind IN ('replacement_order','replacement_authorize','void') AND case_id IN (${eligible})`).bind(c.authorization_id,c.id,...args),
      this.db.prepare(`INSERT INTO audit_events (id,case_id,type,message,metadata,created_at) SELECT ?,id,'REPLACEMENT_RETRY','Verified void; previous replacement operations retained, fresh checkout enabled.',?,? FROM recovery_cases WHERE id IN (${eligible})`).bind(crypto.randomUUID(),JSON.stringify({previousAuthorization:c.authorization_id}),stamp,...args),
      this.db.prepare(`UPDATE recovery_cases SET replacement_order_id=NULL,authorization_id=NULL,replacement_status='NOT_STARTED',updated_at=? WHERE id IN (${eligible})`).bind(stamp,...args),
    ]);
  }
  async ensureOperation(caseId,kind,spec) {
    const now=new Date().toISOString();
    await this.run('INSERT OR IGNORE INTO payment_operations (id,case_id,kind,request_id,path,payload,status,attempts,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),caseId,kind,crypto.randomUUID(),spec.path,JSON.stringify(spec.payload),'READY',0,now,now);
    return this.operation(caseId,kind);
  }
  async lock(caseId,id) {
    return this.one('UPDATE recovery_cases SET active_operation=? WHERE id=? AND (active_operation IS NULL OR active_operation=?) RETURNING id',id,caseId,id);
  }
  async start(op) {
    return this.one("UPDATE payment_operations SET status='RUNNING',attempts=attempts+1,updated_at=? WHERE id=? AND status IN ('READY','UNKNOWN','PENDING','RETRYABLE') RETURNING id",new Date().toISOString(),op.id);
  }
  async finish(op,status,resourceId,error=null) {
    await this.run('UPDATE payment_operations SET status=?,resource_id=COALESCE(?,resource_id),error=?,updated_at=? WHERE id=?',status,resourceId,error,new Date().toISOString(),op.id);
    if(['COMPLETED','FAILED','REVIEW_REQUIRED'].includes(status)) await this.run('UPDATE recovery_cases SET active_operation=NULL WHERE id=? AND active_operation=?',op.case_id,op.id);
  }
  async detail(id,owner) {
    const c=await this.getCase(id,owner);if(!c)return null;
    return {...c,approvals:JSON.parse(c.approvals),operations:await this.all('SELECT id,kind,request_id,status,resource_id,error,attempts,created_at,updated_at FROM payment_operations WHERE case_id=? ORDER BY created_at',id),events:await this.all('SELECT type,message,metadata,created_at FROM audit_events WHERE case_id=? ORDER BY created_at DESC',id)};
  }
}
