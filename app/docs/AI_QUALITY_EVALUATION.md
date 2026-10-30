# AI evaluation and impact evidence

Run `node scripts/evaluate-quality.mjs` for the controlled dataset. Optional `--live` makes at most five sequential Gemini requests, with 13-second spacing, no retry, no payment and no paid fallback. It requires confirmed free-tier configuration. `--reuse-live` recomputes the fixture summary while retaining an existing observed sample; it does not call a model. Local outputs are ignored; the sanitized development report is `AI_QUALITY_RESULTS.json`.

## Observed sample: 30 October 2026

- 15/15 controlled checks passed: conditional no-cut recovery, original protected geometry, above-budget/below-floor prices, impossible enlargement, invented references, unauthorized refund changes, stale quotes, material mismatch, closed/unconsented/expired requests, conflicting dimensions and absent units.
- Five actual model requests: four completed, one connection/timeout outcome. No retry was used. The adversarial free-form test is therefore **unresolved as a live-model result**, not marked successful. Existing automated payload-isolation tests verify that free-form identity/notes do not enter the commercial prompt.
- Two completed commercial calls returned seven proposals. One passed deterministic checks; six were blocked. Four of those blocked proposals came from deliberately uneconomic stock. Do not interpret this as an aggregate model accuracy percentage.
- A normal protected request was rejected by the unchanged-requirements rules baseline. The real model proposed one conditionally feasible uncut geometry. That changes buyer requirements and still requires maker/buyer approval; this is not superiority on identical specifications.
- Both completed extraction evaluations kept ambiguous or contradictory dimensions out of accepted facts. Valid unrelated fields could still be retained.
- Median observed latency among the four successful requests: **3,850 ms**. Failed-attempt elapsed time remains in the report; this successful-request median is not an uptime or tail-latency claim.
- Successful responses reported **4,463 tokens** in total. The timed-out response has unknown token usage. No billing receipt is available. The zero-dollar token estimate applies only to declared free-tier use under [Google's published pricing](https://ai.google.dev/gemini-api/docs/pricing); it is not a measured invoice amount.

This is a small synthetic development sample using real model calls. It is not an independent benchmark, held-out population estimate, customer study or guarantee.

## Reproducible impact baseline

The rules baseline evaluates the buyer's original requirements without proposing concessions. The AI-assisted path proposes conditional specification/price/date tradeoffs, then applies the same deterministic validation. Compare baseline status, generated/passing/blocked alternatives and required requirement changes in the report. The controlled fixture elapsed times measure local validation work only; they are not customer resolution times.

The product's owner-only evidence now reports actual submitted negotiation rounds, model latency, completed operation records, operation attempts and verified sandbox capture/refund amounts. Test-journey elapsed time uses stored original-order and completed-refund timestamps, includes human approval waits and test coordination, and is not provider processing speed. Manual time/actions saved remain null until a matched manual baseline is measured. No reduction percentage or realized profit is inferred.

The completed fresh sandbox journey separately verifies an AI-generated alternative, exact-term approvals, USD 1,000 original deposit, USD 1,700 replacement capture, USD 900 original refund and linked signed events. Those receipts establish financial software execution; they do not establish manufacturing feasibility, external customer demand or actual merchant earnings.
