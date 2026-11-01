# Judge testing guide

SecondCut is evaluated locally with a judge's own credentials. No entrant credentials, real cards, or real-money transactions are needed.

## Fast verification

```bash
npm run install:ci
npm test
npm run typecheck
npm run build
```

The deterministic planning workflow can be reviewed without any external account. Tests cover margin protection, material/geometry constraints, exact-term approvals, idempotency, duplicate webhooks, failed refunds, and uncertain-operation reconciliation.

## Optional live Sandbox route

1. Create a PayPal Sandbox REST app and two Sandbox Personal buyer accounts in your own Developer Dashboard.
2. Copy `.dev.vars.example` to `.dev.vars`; enter only your own Sandbox credentials.
3. Optionally add a Gemini API key from a project whose billing state you understand. Set `AI_FREE_TIER_CONFIRMED=true` only after checking that state.
4. Build the application, apply database migrations once, then run `npm run dev`.
5. Use one buyer only for the original deposit and a different buyer for the replacement agreement. A PayPal checkout approval, authorization, capture, and refund are intentionally separate stages.

Do not paste credentials into issues, Devpost, or source files. Local sign-in is a development simulation; it does not establish real-world identity.

## What to verify in the UI

- AI facts show source quotations and require review before use.
- AI alternatives are conditional drafts, independently blocked or accepted by deterministic constraints.
- Exact terms are frozen before human approvals and payment operations.
- A replacement capture and original refund are visibly separate.
- Missing or failed payment/webhook evidence remains unresolved rather than becoming a false success state.
- Physical readiness and receipt stay separate from financial settlement.

## Evidence boundary

The documented $1,000 / $1,700 / $900 journey is a completed entrant-controlled PayPal Sandbox test using synthetic facts and costs. It is not a claim of customer demand, realized revenue, merchant profit, or completed furniture delivery. See `CONTEXT_STUDY.md`, `CONTEXT_STUDY_RESULTS.json`, and `RELEASE_ACCEPTANCE.md` for the evaluation scope.
