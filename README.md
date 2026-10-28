# SecondCut

**Give unfinished custom work a second chance—with a reviewed adaptation and a verified payment/refund trail.**

SecondCut evaluates whether a cancelled custom furniture order can satisfy another buyer's request. Gemini extracts explicit requirements with source quotes. Deterministic rules check supported cuts, constraints and integer-cent economics. Participants approve fixed terms before PayPal sandbox coordinates a replacement sale and the agreed original-buyer refund.

## Workflow

Cancelled unfinished order → cited requirement extraction → physical/economic checks → exact-term approvals → replacement authorization/capture → original-buyer refund → independent readback and signed events.

- Shorten or narrow a raw tabletop; keep impossible changes, missing evidence, stale requests and bad economics visible.
- Separate authenticated participant roles in hosted mode; clearly labeled development identities locally.
- Sandbox-only checkout, partial refunds, idempotency, conservative reconciliation and expired unused-checkout recovery.
- Durable signature-verifying receiver, independent resource readback and seven linked evidence checkpoints.
- AI cannot grant discovery consent, manufacturing permission or payment authority.

## Run locally

Node.js **22.13+** and npm are required. Start with:

```sh
cd app
npm run install:ci
```

Follow [the complete setup and migration instructions](app/README.md#run-locally), including the example environment file, all six migrations and startup. No managed Git or Sites credentials are needed locally. Real sandbox requests require your own free PayPal sandbox app and test buyers. Optional Gemini calls need your own configured project. Never commit provider secrets.

Credential-free checks, from `app/`:

```sh
node --test tests/*.test.mjs
npm run typecheck
npm run build
node scripts/benchmark-recovery.mjs
```

The separate [webhook inbox](webhook-inbox/README.md) needs its own D1 deployment and public HTTPS endpoint for genuine delivery. Main-app setup is usable without it; a complete signed-event test requires both services. Deployment origins here are placeholders: configure your own pinned receiver origin and matching fixture before synchronization.

## Evidence and limits

A hosted test completed recorded Gemini extraction, a feasible saved plan, three separate approved accounts, a USD 1,000 original deposit, a different buyer's USD 1,700 replacement capture, a USD 900 original refund and linked signed events. No real money moved. All reviewer accounts belong to one tester; requests, manufacturing quotes and costs were synthetic. Private participant details, credentials and transaction exports are excluded.

Fresh installation, TypeScript and production build passed, alongside **92 application tests** and **6 receiver tests**. The [eight-scenario comparison](BENCHMARK_RESULTS.json) adds one feasible adaptation beyond an exact-specification baseline. It is a synthetic functional benchmark, not evidence of competitor superiority, conversion gains, time saved or LLM accuracy.

Real buyer demand, maker costs, physical safety, delivery and environmental impact remain unverified. The MVP supports one workshop, USD and local pickup. Counteroffers are bounded rules-based proposals, not autonomous negotiations. SecondCut is not an escrow service or a determination of legal refund rights.

Read the [problem evidence](MARKET_EVIDENCE.md), [competitive review](COMPETITIVE_RESEARCH.md), [implementation guide](app/README.md) and [source provenance](RELEASE_MANIFEST.json).

For evaluation, use the [judge walkthrough](docs/JUDGE_GUIDE.md) and [verification record](docs/VERIFICATION.md). The [submission draft](docs/SUBMISSION_DRAFT.md) is preparation material, not a submitted entry.

The [public-source case review](docs/PUBLIC_EVIDENCE_CASES.md) separates documented cancellation examples, incomplete listings, policy context and existing resale channels. These sources are not SecondCut customers or evidence of consented buyer demand. No outreach or transaction was performed from them.

## License

[MIT](LICENSE). Preserve included third-party notices.

## Financial protection and validation

New planner sessions require the minimum margin and baseline improvement to survive the modeled 20% overrun. The current synthetic USD 1,700 request is rejected under that policy: USD 1,780 would be needed. The report shows the gap without changing a buyer budget or inventing cheaper costs. Explicit review mode and legacy plans retain their stated fragile assumptions; the earlier joined sandbox test used that reviewed mode.

Use the [private validation playbook](app/docs/VALIDATION_PLAYBOOK.md) for the permissioned maker record, physical checks, genuine buyer requirement, supported quote and receipt gates. Historical merchant-deposit import remains outside this MVP; it collects a new sandbox original deposit per case. Existing provider evidence is not proof of buyer demand or physical feasibility.
