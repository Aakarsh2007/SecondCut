# Commercial alternatives: AI proposes, policies decide, people commit

Gemini receives an allowlisted structured scenario and the last three submitted negotiation rounds. Names, raw notes, free-form pickup locations, account identifiers and payment resources are excluded. The model may propose price, tabletop dimensions and pickup deadline, with a brief rationale, drawback and exact evidence references. It cannot change costs, original refund, buyer budget, approved price bounds, material, finish, consent or stress policy.

Each alternative is independently checked by the existing counteroffer/planning engine. Invalid evidence, unknown fields, unsafe prices and impossible work are blocked. Ranking first prefers policy-pass alternatives, then non-fragile economics, fewer changed buyer requirements and higher stressed margin. This is transparent deterministic ordering, not a measured satisfaction prediction. Model explanations remain suggestions even when their fact references match.

Selecting an alternative loads an editable draft. The server retains AI provenance only when the submitted values exactly match a completed owner-scoped advice record and its source run, request and negotiation revision. Advice expires after 20 minutes. Size/date changes need explicit tradeoff acknowledgement; actual participant agreement is still required against fixed terms. Three submitted rounds are allowed. Saved child plans preserve existing maker confirmation, participant approval, capture/refund and signed-event gates.

The fixed-case audit and evidence export include matching commercial provenance. `agenticCommercialJourneyComplete` remains false until that provenance and every existing joined AI/planning/approval/payment/event checkpoint are verified. Historical completed sandbox cases remain unchanged and are not relabeled as AI-negotiated recoveries.

Provider errors, invalid output and quota refusal preserve deterministic planning/manual counteroffers. There is no automatic retry, paid fallback, acceptance or financial action. Extraction and alternative requests share a 20-attempt-per-owner UTC-day limit; failed calls consume an attempt. A billing-disabled/free-tier configuration is required.

Run `node --test tests/*.test.mjs`. Run `node scripts/evaluate-commercial.mjs` for controlled synthetic validator cases. Optional `--live` makes exactly one real Gemini request using local ignored configuration and writes results only to ignored `outputs/`. Fixtures are not model-quality measurements. Provider latency is measured; monetary API cost, customer time savings and manufacturing results are not.

API contract reference: [Google Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). Schema formatting does not replace business-rule validation.

## Observed provider behavior during development

Four actual synthetic Gemini requests were observed: an incomplete/invalid response, then a valid empty set, then three proposed alternatives after clarifying conditional buyer tradeoffs and geometry-specific costs, and finally three alternatives through the local UI. The last two each had one policy-pass option and two blocked options. The UI run took approximately 4.9 seconds. This is a small development sample, not an accuracy benchmark. Some blocked model rationales incorrectly claimed the protected margin would pass; deterministic checks rejected them, and the UI identifies those rationales as rejected.
