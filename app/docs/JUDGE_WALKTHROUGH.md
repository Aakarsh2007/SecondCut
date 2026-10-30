# Judge walkthrough

SecondCut explores whether unfinished custom furniture from a cancelled order can satisfy another buyer through an explicitly approved commercial tradeoff. It is a pre-completion recovery workflow, rather than an inventory listing or automatic refund chatbot.

1. Start from a synthetic raw walnut tabletop and a smaller buyer requirement. Inspect source quotes and any changed proposal fields.
2. Evaluate the original requirement under protected economics. Explain its rejection.
3. Generate alternatives with Gemini, inspect passing and blocked suggestions, and select an editable counteroffer. The model cannot change costs, consent, refund obligations or merchant limits. Submitted rounds are bounded at three and proposals expire.
4. Fix exact terms. Use three distinct application accounts for participant approvals. Test accounts are controlled by the entrant; they do not establish independent customers.
5. Use distinct PayPal sandbox Personal buyers for the original deposit and replacement authorization. Capture and refund remain server-validated operations. No real money is used.
6. Review the same case's receipt resources, processed signed events and seven joined checkpoints. Inspect recorded alternatives after reload without a fresh AI call. Unpaid or incomplete cases must retain pending indicators.
7. Inspect observed metrics, measurement limits and source tests. See `AI_QUALITY_EVALUATION.md`, `COMMERCIAL_AGENT.md` and `RELEASE_ACCEPTANCE.md`.

## Reproduce without private hosted access

Follow the app README for local installation, migrations and environment configuration; follow `../webhook-inbox/README.md` for the separate signed-event receiver. Use your own sandbox app and generated accounts. Local identity simulation is not a three-user authentication test. Configure an independently accessible receiver for live signed events; passing test doubles does not replace provider evidence.

## Submission assets and access

The source includes the MIT license. The entrant keeps the repository and main hosted workspace private during development. Before submission, the entrant must publish the repository and provide either approved judge access or complete runnable setup. No public access or video upload has been performed by this walkthrough. The final video must remain under three minutes and distinguish synthetic assumptions, real model/provider calls, test-double failures and unverified physical outcomes.
