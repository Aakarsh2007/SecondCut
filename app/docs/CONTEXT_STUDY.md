# Context dependence, not a novelty guarantee

Run `node scripts/context-study.mjs --live` with a confirmed Gemini free-tier configuration. Exactly three sequential calls, 13 seconds between requests, no automatic retry, paid fallback or payment operation. Inputs use dates relative to execution; the checked-in results are an archival development run, not a live offer.

## Observed results, 30 October 2026

| Scenario | Actual response | Independent checks |
|---|---|---|
| A: expensive dimensional cuts | $1,700, 1,800×800 mm uncut top. Projected $200 base / $140 stressed margin. Two single-cut options blocked at $80 stressed margin. | Larger dimensions and changed date require agreement; no maker cut cost is assumed. Any buyer-side cutting suggestion in the raw rationale is unverified, uncosted and not an approved manufacturing plan. |
| B: deadline before maker readiness | $1,700, 1,600×700 mm with one $20 width cut and later pickup; $116 stressed margin. Another option offers a 1,600×900 mm uncut top for $1,680 and $120 stressed margin. | Ranking prefers fewer changed buyer fields; price, cut cost and dimensions differ from A. Both remain conditional proposals. |
| C: oak-only request, walnut stock | Empty alternative set. | No fabricated material conversion or forced sale. |

Three requests completed; three expected outcomes observed. This is not a general model-accuracy statistic. Full actual responses, input facts, latency and token usage are in `CONTEXT_STUDY_RESULTS.json` and visible at `/evidence`.

## Counterfactual replay

The selected A terms fail under B because the top would have to grow. Selected B terms fail under A because both expensive cuts breach protected economics. Both fail under C's material requirement. Replay supplies target-native evidence references, so these failures are not merely citation mismatches. The original source-reference replay is retained separately for transparency.

These results demonstrate distinct behavior in a small synthetic sample. A competent rules system could also enumerate geometry/date options; this study does not prove that only an LLM could solve the tasks or that no competing implementation exists. The earlier quality report retains a real model timeout; this successful run does not erase it.
