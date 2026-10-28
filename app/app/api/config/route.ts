import {inboxConfigured} from '@/lib/webhook-sync.mjs';
import { owner,runtime,response,errorResponse } from '@/lib/runtime';
export async function GET(){try{await owner();const {config}=runtime();return response({environment:'sandbox',configured:!!(config.PAYPAL_CLIENT_ID&&config.PAYPAL_CLIENT_SECRET),clientId:config.PAYPAL_CLIENT_ID||null,webhookConfigured:!!config.PAYPAL_WEBHOOK_ID,webhookInboxConfigured:inboxConfigured(config),stage:'PAYMENT_MILESTONE',approvalMode:'OWNER_CONTROLLED_DEMO'});}catch(e){return errorResponse(e);}}
