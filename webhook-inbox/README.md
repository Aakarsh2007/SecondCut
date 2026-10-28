# SecondCut dedicated sandbox webhook inbox

A standalone receiver with no UI or payment-control endpoints. POST /paypal/webhook accepts only bounded, signed PayPal sandbox events and stores them in D1 before acknowledging delivery. Invalid signatures never claim event IDs.

POST /internal/events returns at most three unacknowledged events only with the server-held INBOX_SYNC_KEY Bearer token. POST /internal/ack acknowledges exact event IDs after the private workspace processes them. A failed import or lost acknowledgment leaves events available for idempotent retry. Anonymous requests cannot read stored data.

The private workspace independently re-verifies signatures and reads back known provider resources. It imports queued events when opened/refreshed or through its import button. No laptop, temporary tunnel, Git credential, or short-lived Sites visitor token is needed for this design. No background schedule or immediate push is claimed.

Runtime secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, INBOX_SYNC_KEY. Secrets are configured in Sites, never source. Sandbox only. PayPal registration and genuine delivery testing require public access to this receiver; the service is intentionally private until that explicit audience change is approved. The merchant workspace stays private.

Build: npm run build. Tests: npm test. Schema: npm run db:generate. Deployment artifact includes .openai/hosting.json and .openai/drizzle migrations.
