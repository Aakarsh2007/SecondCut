# SecondCut

SecondCut evaluates whether unfinished custom furniture from a cancelled order can be adapted for another buyer, then coordinates fixed approvals and a PayPal sandbox recovery payment/refund path.

## What works

- Gemini extracts explicit requirements from anonymized notes with mechanically checked source quotes. People review the extracted facts; AI cannot grant consent, manufacture permission or payment authority.
- A deterministic planner checks dimensions, material, finish, raw-stock modification rules, pickup, expiry and integer-cent economics. It compares cancellation against recovery and shows a 20% remaining-work/adaptation overrun scenario.
- Bounded counteroffers use maker-approved limits and at most three rounds. They are rules-based suggestions, not autonomous buyer negotiations.
- Fixed physical/financial terms can use clearly labeled owner-controlled demo attestations or three distinct authenticated participant accounts. Targeted invitations expire and store hashed tokens.
- PayPal sandbox supports original deposit capture, a different replacement buyer's authorization/capture, original-buyer partial refund, provider readback, idempotency, voiding and conservative reconciliation.
- A separate durable receiver verifies actual PayPal signatures before storage. The private workspace independently verifies and processes events, then acknowledges them.
- Owner-only journey evidence joins canonical AI records, saved plan, exact-term approvals, payment resources, processed signed events and participant-reported physical status. Missing checkpoints remain visible.

The supplied buyer requests, products, modification quotes and financial assumptions are synthetic. Real provider calls do not establish real buyer demand or physical fulfillment. No live-money mode is implemented.

## Run locally

Node.js 22.13+ and npm are required. No Sites plugin or Git credentials are needed for ordinary local development.

1. Run `npm run install:ci`.
2. Copy `.dev.vars.example` to `.dev.vars`. Set sandbox `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. AI is optional; configure a billing-disabled Gemini project and set `AI_FREE_TIER_CONFIRMED=true` only after checking that project's billing state. Never commit secrets.
3. Run `npm run build`.
4. Initialize a **fresh** local database by applying **all seven** SQL migrations in filename order. In PowerShell, from this directory:

   ```powershell
   Get-ChildItem -LiteralPath drizzle -Filter '*.sql' | Sort-Object Name | ForEach-Object {
     node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file $_.FullName
     if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop and inspect the database.' }
   }
   ```

   On a POSIX shell:

   ```sh
   for migration in drizzle/*.sql; do
     node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration" || exit 1
   done
   ```

   Do not reapply an already-applied migration. For an existing database, apply only missing revisions. Local and hosted databases are separate. Back up useful existing data before manual schema changes.
5. Run `npm run dev`, open the printed localhost URL (normally port 5173), and select Sign in.
6. Use `/planner` for the AI/constraint workflow and `/` for payment cases. Synthetic examples can be exercised without AI. Actual AI and payments require your own provider configuration and buyer approval.

Local sign-in is a development-only identity simulation, not real authentication. Local owner-demo mode is runnable with one identity. To test three actual accounts, deploy with Sites authentication and explicitly allow those accounts to visit the private site. The local test suite simulates separate actors; it does not establish real account identities.

## One complete sandbox journey

1. Review source notes, cited AI fields and a feasible saved plan. Enter request expiry and discovery permission separately.
2. Confirm a fixed unpaid proposal. Fix the exact participant terms and expiry before replacement checkout; create targeted role invitations and approve from the intended accounts. Owner-demo mode is visibly different and cannot substitute for separate-account evidence.
3. Original buyer A approves the original sandbox order. The server captures and independently reads the deposit back.
4. Different sandbox buyer B approves the replacement order. Authorize the hold; this is not captured payment.
5. Capture after current approvals, provider identity, amount, currency, merchant and workflow gates pass.
6. Issue the eligible original-buyer partial refund. It is a separate operation and can fail even after replacement capture.
7. Import linked signed events and inspect One journey. Verified records. Export evidence from the selected case. A complete joined financial test needs all checkpoints, including the AI record and exact resource-linked events.
8. Physical readiness/receipt remains participant-reported and must not be fabricated for a demo.

If a popup closes or does not appear, use the same-order sandbox approval link in that step. After approval, the explicit capture/authorization resume button reads PayPal's APPROVED state before starting a mutation. Clicking too early does not create a poisoned payment operation. Do not create another case to hide an unresolved transaction.

PayPal checkout approvals expire. The explicit expired-replacement recovery control only retires an order after it is at least six hours old, PayPal returns its specific missing-resource error, the original merchant can still be verified, and no authorization/capture attempt or conflicting operation exists. It preserves the old request in the audit trail and keeps the original deposit and approvals. Network failures, recognized orders and uncertain payment attempts block renewal. This does not extend approval deadlines; approve a newly created checkout promptly.

## Reproduce the comparison

New interactive planner sessions enable stress-margin protection by default. Protected mode rejects a proposal if the modeled 20% remaining-work/adaptation overrun breaches the required margin or improvement over cancellation. A financial protection report shows the required price, current ceiling and gap without changing costs, buyer budget or refund. Legacy saved plans retain their explicit review-mode assumptions. Disabling protection permits reviewed fragile proposals; it does not make them financially stronger. Current sample inputs fail protected mode: USD 1,780 would be needed against a USD 1,700 ceiling.

Use the [private validation playbook](docs/VALIDATION_PLAYBOOK.md) to distinguish real maker/buyer evidence from software attestations. It includes go/no-go criteria, an anonymized record template, required cost/constraint checks and the still-unimplemented historical-deposit import boundary. No outreach or real-money purchase is implied.

Run `node scripts/benchmark-recovery.mjs` without credentials or network access. Eight labeled synthetic scenarios compare the production adaptation planner with an exact-specification baseline using the same physical, availability and financial checks but no cuts. The script asserts the expected decisions and prints modeled results. This is not a benchmark of any named competitor, market demand or AI accuracy. The smaller raw-top request illustrates the extra feasible option; oversized, unsupported, expired and unprofitable requests remain blocked.

## Durable webhook receiver

The sibling `webhook-inbox` folder in the public source bundle contains the standalone receiver. It has its own D1 database, no merchant controls, a signed `/paypal/webhook` route and secret-protected `/internal/events` and `/internal/ack` routes.

Private Sites authentication prevents direct PayPal delivery to the main workspace. Deploy the dedicated receiver with approved public HTTPS access, register its URL with your sandbox app, and configure the same webhook ID in both services. Store its random server synchronization key as receiver `INBOX_SYNC_KEY` and main `PAYPAL_INBOX_SYNC_KEY`. Set `PAYPAL_INBOX_ORIGIN` to the receiver's exact origin. The main importer intentionally pins the allowed receiver origin in `lib/webhook-sync.mjs`; configure that literal and its test fixture for your own deployment before enabling synchronization. Do not point a synchronization secret at an unreviewed host.

Receiver verification and storage work independently of a development laptop. Main-workspace processing occurs when opened/refreshed or explicitly imported; no unattended processing schedule is configured. Lost acknowledgments and failed imports leave events queued. An inactive receiver is not reported as verified delivery.

## Verification and recovery

```sh
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Application tests execute production SQL against in-memory SQLite with simulated providers. They include one joined plan/three-approval/payment/refund/event/evidence path, concurrent and repeated operations, lost responses, wrong amounts, failed refunds, invitation isolation, expiry, withdrawal, manufacturing constraints and event poisoning. These are separate from hosted real-provider evidence. Receiver tests run with `node --test tests/*.test.mjs` in its own folder.

UNKNOWN/PENDING/RUNNING operations must be reconciled before a new commitment. A stale RUNNING request can be reviewed after 60 seconds; automatic uncertain-mutation retry is bounded to 30 minutes. Mismatched or refused operations require review; no operator override turns them into success. Failed refunds remain outstanding. Approval/withdrawal does not imply an automatic financial reversal. Void and refund obligations must be handled explicitly.

## Implementation map

- `app/planner`, `lib/planner.mjs`, `lib/planning-service.mjs`: saved deterministic adaptation plans and fixed handoff.
- `lib/ai-extraction.mjs`, `app/api/ai`: Gemini integration, cited-fact validation and quota boundaries.
- `lib/negotiation.mjs`: bounded counteroffers.
- `lib/participants.mjs`, `lib/fulfillment.mjs`, `app/review`: separate-role review and reported handoff/issues.
- `lib/payments.mjs`, `lib/paypal.mjs`: sandbox operations, readback and reconciliation.
- `lib/webhooks.mjs`, `lib/webhook-sync.mjs`: verified event processing and durable receiver import.
- `lib/journey-evidence.mjs`, `app/JourneyEvidence.tsx`: owner-only evidence and completeness checkpoints.
- `db/schema.ts`, `drizzle/`: append-only schema revisions.

## Scope and evidence limits

One workshop, USD, local pickup and only shortening/narrowing a raw tabletop are supported. No finished-top refinishing, structural certification, shipping promise, live buyer network or live-money production deployment is claimed. Historical deposits are not silently imported into new proposals. Independent demand, willingness to pay, actual modification costs, physical fulfillment and environmental impact remain unvalidated unless supported by separate evidence. Account sign-in does not establish legal identity or ownership of a PayPal account. This is not a legal determination of cancellation/refund rights.

The code is MIT licensed; preserve bundled third-party notices. Never publish `.dev.vars`, `.env` files, provider credentials, invitation tokens, cookies, private transaction exports, local databases or managed-repository credentials.

## AI commercial alternatives

The planner now offers Gemini-generated conditional alternatives inside the existing counteroffer flow. See [commercial-agent safeguards](docs/COMMERCIAL_AGENT.md) and [synthetic real-provider evaluation](docs/COMMERCIAL_LIVE_EVIDENCE.json). All alternatives are checked deterministically; selecting a draft creates no acceptance or payment. A fresh AI-negotiated joined sandbox payment journey still requires separate verification.
