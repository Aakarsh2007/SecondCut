# Judge walkthrough

SecondCut is a working sandbox prototype for recovering cancelled custom-furniture orders. The production, request and quote examples are synthetic. Actual hosted provider tests are summarized in [verification](VERIFICATION.md). This guide does not include private provider credentials or grant access to the private hosted workspace.

## 1. Verify the source without provider credentials

Clone this repository and use Node.js 22.13+:

```sh
cd app
npm run install:ci
node --test tests/*.test.mjs
npm run typecheck
node scripts/benchmark-recovery.mjs
npm run build
```

Expected: 92 passing application tests; eight benchmark scenarios with one feasible exact-specification option and two feasible adaptation options. Provider behavior in automated tests is simulated. These tests do not contact PayPal or Gemini or move money.

The standalone receiver can be checked without installing schema-development dependencies:

```sh
cd ../webhook-inbox
node --test tests/*.test.mjs
node scripts/build.mjs
```

Expected: six passing receiver tests and a validated Worker export.

## 2. Run the interactive product

Follow [app setup](../app/README.md#run-locally): copy the example environment file, build, apply all six SQL migrations in filename order to a fresh local database, then run `npm run dev`. Open the printed local URL and select local sign-in.

Local sign-in is development simulation. It does not prove three independent users. Do not expose the local development server publicly. The full hosted account review uses Sites authentication and explicitly allowed accounts.

Start with `/planner`. Without provider credentials you can edit the synthetic example, evaluate deterministic recovery options and inspect why requests fail. No AI or payment success is simulated in the interactive provider controls when configuration is missing.

## 3. Inspect a meaningful success and refusal

The sample snapshot is an 1800 × 800 mm raw walnut tabletop. The studio request needs 1600 × 700 mm, so it requires two quoted cuts. Inspect:

- Proposed replacement price: USD 1,700.
- Included costs: USD 1,600, plus USD 100 contingency.
- Original deposit: USD 1,000; conditional refund: USD 900.
- Modeled margin: USD 100, versus a negative USD 140 stated cancellation baseline.
- Under the displayed remaining-work/adaptation cost overrun, margin falls to USD 20. The fragility warning requires acknowledgement.

Next inspect the oversized request (cannot enlarge), different material, insufficient budget, withdrawn request and missing dimensions. Change any input: previously evaluated results become invalid and must be recalculated. Quotes, pickup requirements, expiry and discovery consent are separate constraints. Human acknowledgement does not establish actual feasibility.

## 4. Optional actual AI test

Use your own Gemini project and a locally configured key. The app's free-tier confirmation is a user assertion; it is not automatic billing verification. Follow the provider configuration guidance in the app README, or leave AI disabled.

Enter anonymized explicit notes, for example:

```text
SYNTHETIC TEST, not a real customer request.
I need a walnut desk with a natural finish, 1600 x 700 mm.
My budget is USD 1700.
```

Add a future latest-pickup date and pickup area in the notes if known. Missing facts stay missing. Review each quoted source line; requirements are not consent or a manufacturing instruction. Enter consent and expiry separately. AI cannot call the payment API or invent financial authority.

## 5. Optional actual PayPal sandbox journey

Configure your own sandbox app and two different sandbox Personal buyer accounts. Do not enter real cards or publish secrets. Choose an unpaid case or create a fresh reviewed proposal; never duplicate a case to conceal an uncertain operation.

1. Original buyer approves the deposit order; server capture and independent readback establish the original payment.
2. Record exact terms. Local owner-demo attestations are explicitly distinct from hosted three-account participant approvals.
3. Replacement buyer approves its order. Authorization creates a hold, not a captured sale.
4. Capture the replacement payment. The server checks current workflow gates, distinct buyer, merchant, currency and amount.
5. Issue the agreed original-buyer refund. It is independently verified and may fail separately from the sale.
6. Full genuine signed-event receipt requires the separately deployed receiver, matching webhook registration and pinned origin configuration described in the app README.

If a popup closes, use the same-order approval link and explicit resume control. Approval alone is not capture. Inspect canonical provider status, not popup disappearance. An expired unused replacement order may be conservatively retired through its recovery control; approved, uncertain or previously attempted commitments stay blocked from that reset.

## 6. Check the evidence, not just the headline

The selected case exports owner-only evidence linking the recorded AI response, selected plan, exact account approvals, resource IDs and verified event types. The seven joined checkpoints will remain incomplete if actual AI, separate accounts, payments or linked events are missing. Local owner-demo mode cannot make the three-account checkpoint pass.

Physical readiness and receipt are separate participant reports. Do not mark them complete for a fictional desk. The completed hosted financial test deliberately leaves physical handoff NOT_STARTED and closeout OPEN.

## Troubleshooting

| Observation | Meaning and next step |
| --- | --- |
| Database unavailable / missing table | Build first; apply every missing migration to the correct local state. Do not rerun all migrations on useful existing data. |
| Sandbox setup required | Provider keys are absent; deterministic planner/tests remain usable. |
| PayPal order approved, no capture | Expected intermediate state. Use the merchant authorization/capture control, not another checkout. |
| Unknown operation / request in progress | Wait, then reconcile the same operation. Do not create a replacement payment. |
| Wrong replacement buyer | Capture is blocked. Follow the verified void/retry path; do not force success. |
| Refund failed after sale | Original obligation stays visible. Inspect provider state and prescribed reconciliation; no automatic rollback is implied. |
| Private hosted site refuses access | Repository setup is independent. Hosted testing needs a separately approved allowlist; repository access does not grant site access. |
| AI quota/provider failure | No fabricated success or paid fallback is used. Continue deterministic review or resolve provider configuration. |

## Scope

One workshop, USD, local pickup, raw-top shortening/narrowing. No live buyer network, legal refund determination, structural certification, live-money deployment or proven commercial recovery rate is claimed.

### Updated default financial policy

New interactive sessions enable stress protection, so the unchanged USD 1,700 synthetic request is now REJECTED: its protected minimum price is USD 1,780. The earlier financial breakdown remains useful for explaining why. This refusal is expected. As a separate clearly synthetic boundary test, a hypothetical asking price AND buyer budget of USD 1,780 passes the modeled minimum. This does not establish a real customer's willingness to pay. Review mode is an explicit opt-out and cannot be inferred from acknowledging risk on a protected saved plan. Existing paid cases are not rewritten.
