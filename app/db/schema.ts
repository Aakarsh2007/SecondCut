import { sqliteTable, text, integer, uniqueIndex,index } from 'drizzle-orm/sqlite-core';

export const recoveryCases = sqliteTable('recovery_cases', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(),
  currency: text('currency').notNull(), deposit: integer('deposit').notNull(),
  replacement: integer('replacement').notNull(), refund: integer('refund').notNull(),
  costs: integer('costs').notNull(), contingency: integer('contingency').notNull(),
  agreementHash: text('agreement_hash').notNull(), approvals: text('approvals').notNull().default('{}'),
  approvalMode:text('approval_mode').notNull().default('OWNER_CONTROLLED_DEMO'),
  agreementDetails:text('agreement_details').notNull().default('{}'),
  agreementExpiresAt:text('agreement_expires_at'),
  recoveryStatus:text('recovery_status').notNull().default('ACTIVE'),
  originalOrderId: text('original_order_id'), originalCaptureId: text('original_capture_id'),
  replacementOrderId: text('replacement_order_id'), authorizationId: text('authorization_id'),
  replacementCaptureId: text('replacement_capture_id'), refundId: text('refund_id'), merchantId: text('merchant_id'),
  originalStatus: text('original_status').notNull().default('NOT_STARTED'),
  replacementStatus: text('replacement_status').notNull().default('NOT_STARTED'),
  refundStatus: text('refund_status').notNull().default('NOT_STARTED'),
  activeOperation: text('active_operation'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});

export const paymentOperations = sqliteTable('payment_operations', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => recoveryCases.id),
  kind: text('kind').notNull(), requestId: text('request_id').notNull(),
  path: text('path').notNull(), payload: text('payload').notNull(),
  status: text('status').notNull(), resourceId: text('resource_id'),
  error: text('error'), attempts: integer('attempts').notNull().default(0),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, table => [uniqueIndex('operation_case_kind').on(table.caseId, table.kind), uniqueIndex('operation_request').on(table.requestId)]);

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => recoveryCases.id),
  type: text('type').notNull(), message: text('message').notNull(), metadata: text('metadata').notNull(), createdAt: text('created_at').notNull(),
});

export const webhookInbox = sqliteTable('webhook_inbox', {
  id: text('id').primaryKey(), eventId: text('event_id').notNull(),
  body: text('body').notNull(), headers: text('headers').notNull(),
  status: text('status').notNull(), error: text('error'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
  processingToken:text('processing_token'),
}, table => [uniqueIndex('webhook_event').on(table.eventId)]);

export const planningRuns = sqliteTable('planning_runs', {
  id:text('id').primaryKey(), owner:text('owner').notNull(), input:text('input').notNull(),
  result:text('result').notNull(), selectedNeed:text('selected_need'), caseId:text('case_id'),
  createdAt:text('created_at').notNull(),
});

export const aiExtractions=sqliteTable('ai_extractions',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),source:text('source').notNull(),
 notes:text('notes').notNull(),result:text('result'),status:text('status').notNull(),createdAt:text('created_at').notNull(),
});
export const negotiations=sqliteTable('negotiations',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),runId:text('run_id').notNull(),needId:text('need_id').notNull(),
 rounds:text('rounds').notNull().default('[]'),revision:integer('revision').notNull().default(0),createdAt:text('created_at').notNull(),
});
export const commercialAdvice=sqliteTable('commercial_advice',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),runId:text('run_id').notNull(),needId:text('need_id').notNull(),
 sessionId:text('session_id'),revision:integer('revision').notNull().default(0),status:text('status').notNull(),result:text('result'),createdAt:text('created_at').notNull(),
},table=>[index('advice_owner_day').on(table.owner,table.createdAt)]);
export const participantInvites=sqliteTable('participant_invites',{
 id:text('id').primaryKey(),caseId:text('case_id').notNull().references(()=>recoveryCases.id),
 role:text('role').notNull(),email:text('email').notNull(),tokenHash:text('token_hash').notNull(),
 agreementHash:text('agreement_hash').notNull(),expiresAt:text('expires_at').notNull(),
 actor:text('actor'),status:text('status').notNull().default('INVITED'),
 decisionRef:text('decision_ref'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},table=>[uniqueIndex('participant_token').on(table.tokenHash),uniqueIndex('participant_case_role').on(table.caseId,table.role),uniqueIndex('participant_case_actor').on(table.caseId,table.actor)]);
export const fulfillmentRecords=sqliteTable('fulfillment_records',{
 caseId:text('case_id').primaryKey().references(()=>recoveryCases.id),stage:text('stage').notNull().default('NOT_STARTED'),
 revision:integer('revision').notNull().default(0),evidence:text('evidence').notNull().default('{}'),updatedAt:text('updated_at').notNull(),
});
