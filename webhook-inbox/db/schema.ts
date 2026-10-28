import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const events=sqliteTable('verified_events',{
 id:text('id').primaryKey(),body:text('body').notNull(),headers:text('headers').notNull(),
 eventType:text('event_type').notNull(),resourceId:text('resource_id'),receivedAt:text('received_at').notNull(),acknowledgedAt:text('acknowledged_at'),
});
export const admission=sqliteTable('admission_budget',{
 window:text('window').primaryKey(),attempts:integer('attempts').notNull().default(0),
});
