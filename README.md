# SecondCut

> **AI finds a commercially viable second chance for cancelled custom work; people approve the exact terms, and PayPal verifies the financial recovery.**

SecondCut is a safety-first recovery workflow for custom furniture. When a buyer cancels after material or labour has been committed, it evaluates whether unfinished work can serve a different, opt-in buyer request. Gemini proposes conditional alternatives; deterministic code proves or blocks them; people approve fixed terms; PayPal Sandbox records the replacement payment and eligible original refund as separate, verifiable operations.

## Why it stands apart

| Conventional workflow | SecondCut |
| --- | --- |
| Refund or manually search for a buyer | Evaluate an unfinished workpiece against an opt-in request |
| Trust a plausible modification | Enforce geometry, material, expiry, maker limits, price, margin, and refund rules |
| Treat checkout approval as success | Separate authorization, capture, refund, signed event evidence, and physical handoff |
| Lose the decision rationale | Preserve cited AI facts, proposal versions, approvals, and linked payment evidence |

SecondCut is not a resale marketplace, an autonomous negotiator, or a generic refund interface.

## Demonstrated Sandbox journey

```text
$1,000 original Sandbox deposit
  → $1,700 replacement authorization and capture
  → $900 eligible original-payment refund
```

The recorded development journey passed seven linked evidence checkpoints and 12 independent provider relationship/amount reads. These are real **PayPal Sandbox** operations, not real revenue. Requirements, costs, and participant accounts are synthetic or entrant-controlled; physical fulfillment is explicitly unverified.

## What is implemented

- Gemini 2.5 Flash extracts source-quoted requirements and drafts conditional size, price, and pickup alternatives.
- Independent integer-cent policy checks validate physical feasibility, consent, expiry, maker limits, protected margins, and refund obligations.
- Versioned terms and distinct role approvals prevent AI from accepting agreements, changing production, capturing funds, or refunding money.
- PayPal JavaScript SDK, Orders API v2, Payments API v2, and signature-verified webhooks support the recorded Sandbox workflow.
- Idempotency, reconciliation, duplicate-event handling, and visible uncertain states protect against double commitment.
- Financial settlement and physical readiness/receipt are deliberately separate.

## Run and judge

Start with the complete [application README](app/README.md) and the [judge testing guide](app/docs/JUDGE_TESTING.md).

- Node.js 22.13+ and npm are required.
- Run `npm run install:ci`, copy `app/.dev.vars.example` to `app/.dev.vars`, then follow the migration and test instructions.
- Deterministic planning can be examined without provider credentials.
- Live AI and payment tests require the judge's own Gemini and PayPal Sandbox configuration. No entrant credentials, real cards, or live-money transactions are required.

The sibling [webhook inbox](webhook-inbox/README.md) is a separate, minimal signed-event receiver for independently hosted Sandbox delivery.

## Evidence and limits

- **105 application tests + 6 receiver tests** passed. These include simulated provider failures and are not a claim of 111 live PayPal calls.
- Three actual Gemini calls produced an uncut offer, a later-pickup/one-cut offer, and a safe no-offer for incompatible material. Cross-context replay was blocked. This is a small synthetic study, not a general-accuracy claim.
- A single agent-operated review comparison avoided retyping three calculated fields; it is not a measured human time-saving or merchant-ROI result.

SecondCut currently focuses on one workshop, raw tabletops, USD, local pickup, and shortening/narrowing before completion. It does not claim real buyer demand, maker-confirmed costs, delivery, realized profit, environmental impact, legal advice, live-money processing, or escrow.

## License

[MIT](LICENSE). Secrets, local databases, private evidence, provider credentials, tokens, and local configuration are excluded from this repository.