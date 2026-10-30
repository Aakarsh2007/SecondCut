# Consolidated release acceptance

Finish implementation, regression checks and deployment before requesting test-account interaction. Preserve completed checkpoints rather than restarting a case.

## Software checks

- Application suite: extraction grounding, AI commercial provenance, protected economics, approval scope, payment reconciliation, concurrency, refunds, forged/duplicate events and joined evidence.
- Receiver suite: signature gate, durable queue, duplicate events, identity conflicts and protected acknowledgment.
- TypeScript check and production builds for the application and receiver.
- Review UI loading/error states and make the checkout panel visible when opened. PayPal sandbox Personal logins are distinct from application sign-in.

## One sequential sandbox session

Use a single saved plan/case and current exact-term approvals. First approve and verify the original deposit. Only then create/resume the replacement checkout, approve its authorization, verify capture and perform the eligible original refund. Provide the actual current checkout and matching test-account credentials page at each login. Do not ask users to repeat successful approvals or captures.

Afterward, require linked signed events and every joined evidence checkpoint, including matching AI commercial provenance. A missing stage stays pending. Reconcile uncertain provider responses before retrying any mutation. Test doubles establish failure handling, not real provider success.

The final video must describe the recorded scenario accurately. Synthetic requirements, modeled costs and user-controlled role accounts must remain labeled. Physical fulfillment, independent customer demand and actual merchant profit are separate evidence requirements.
