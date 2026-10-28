# SecondCut — submission draft

Draft only. The entrant must review the final form, eligibility, terms, source visibility and video before submitting. Repository remains private until the entrant chooses to make it public at submission.

## Tagline

Turn cancelled custom work into an approved adaptation, a replacement sale and a verified refund trail.

## Inspiration

Custom furniture can become hard to resell once it is built for one person's specifications. Public makers describe early investment in wood and scheduling, and established clearance businesses already resell cancelled orders. We asked whether a workshop could evaluate an alternative buyer's requirements before finishing the piece—and coordinate the original and replacement financial obligations without hiding uncertainty.

## What it does

SecondCut evaluates a cancelled unfinished tabletop against explicit buyer requirements. Gemini extracts facts with source-line quotes. Deterministic rules check material, dimensions, supported cuts, price boundaries, pickup, expiry, consent and integer-cent economics. Makers must review physical constraints and costs. Participants approve fixed terms before sandbox payments proceed.

The financial workflow verifies an original deposit, authorizes and captures a different replacement buyer's payment, then issues the agreed original-buyer partial refund. Provider readback and signed events join the AI, planning and approval evidence. Missing steps remain visible; physical completion is separate.

## How we built it

React/Vinext provides the interface and server routes; Cloudflare Workers and D1 store cases, operation identities, invitations and evidence. Gemini supplies cited extraction. A deterministic planner and bounded counteroffer engine calculate and validate proposed adaptations. PayPal Checkout, Orders v2 and Payments v2 provide sandbox approval, authorization, capture, void and partial refund. A separate signature-verifying inbox durably stores events; the private workspace independently verifies and processes them.

The model never chooses an executable refund amount or grants financial authority. Current exact-term approvals and server-side gates govern commitments. Distinct operation request IDs, locks and conservative reconciliation prevent uncertain outcomes from becoming a convenient success.

## Challenges

Provider approval is different from authorization, which is different from capture. Checkout links expire; an old unused order must be recovered without losing the deposit or approvals. Refunds can fail independently and can change the original capture's current status. Webhook delivery can be delayed or duplicated. The interface and canonical evidence must represent those states honestly.

## What we verified

One hosted joined test linked seven cited Gemini fields, a feasible saved plan and three separate approving accounts to an actual USD 1,000 sandbox deposit, USD 1,700 replacement capture and USD 900 original refund. Exact linked signed events were verified. No real money moved. All reviewer accounts were controlled by one tester, and the manufacturing/request inputs were synthetic.

The source passed a fresh install, TypeScript, production build, six database migrations, 92 application tests and six receiver tests. An eight-scenario synthetic comparison shows an additional feasible dimensional adaptation beyond exact-specification matching. See [verification](VERIFICATION.md) for boundaries.

## What makes the approach different

The demonstrated combination addresses a workshop's pre-completion adaptation decision and the connected original/replacement settlement. Cancellation resale, contextual matching, AI refunds and payment evidence already exist. We do not claim universal novelty or superior marketplace liquidity. The prototype makes supported modifications, economics, refusals, approvals and provider evidence inspectable in one journey.

## Next steps

Validate permissioned cancellation records with makers, actual modification quotes, real buyer demand and willingness to pay. Test physical readiness and receipt honestly. Extend supported materials or operations only with maker-approved constraints. No live-money rollout or autonomous manufacturing promise is part of this submission.

## Submission checklist

- Repository: https://github.com/Aakarsh2007/SecondCut — keep private during development; entrant makes public before final judging submission.
- Functional testing: [judge walkthrough](JUDGE_GUIDE.md) and complete setup guide. Private hosted access requires a separate approved allowlist.
- Video: still to record/upload; target less than three minutes. Do not submit a placeholder URL.
- Built with: Gemini, PayPal Checkout/Orders v2/Payments v2, React, Vinext, TypeScript, Cloudflare Workers, D1, SQLite-based tests.
- License: MIT with bundled third-party notices.
- Claims: sandbox money, synthetic manufacturing assumptions and unverified physical/commercial outcomes must remain explicit.
