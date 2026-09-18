# Ordered launch tasks

Prepared September 16, 2026. Current authorization is documentation only. “Ready” means a task is well enough defined to start when requested; it does not authorize implementation, purchases or external service changes.

| ID | Outcome | Status | Completion evidence required |
|---|---|---|---|
| DOCS-01 | Shared instructions, prompt library and workflow | Prepared | Markdown installed and links checked; no source modifications |
| DESIGN-01 | Cohesive design brief and anchor specifications for iOS, Android and web | Ready; not started | Closet, Outfit Detail and Try-On Result specs with shared fixtures, states and acceptance criteria |
| DESIGN-02 | Editable visual anchors and chosen design system | In progress — tokens, accessibility review, and one frame variation drafted; additional states, a second variation, and final selection outstanding | Side-by-side frames, tokens, typography decision, accessibility review and recorded selection |
| DESIGN-03 | All screen families and complete clickable journey | Not started | Full happy path plus empty/loading/error/permission/credit/recovery states; platform consistency audit |
| UI-01 | Approved shared visual primitives in existing clients | Not started; code task | Existing-stack implementation, focused visual comparison and accessible interaction checks |
| UI-02 | Complete UI with fixture data | Not started; code task | All screens navigable, correct web responsiveness and native back/keyboard behavior |
| TRY-01 | Provider evaluation and commercial suitability decision | Not started | Consented dataset, budget approval, held-out quality scores, cost/latency and terms review |
| SEC-01 | Secure ownership, RPCs, private images and URL handling | Not started; launch blocker | Negative authorization tests, restricted functions, safe downloads, private image access |
| API-01 | Consistent mobile/web/backend contracts and authentication | Not started; launch blocker | Contract checks, production API configuration, cold/warm auth callbacks and recovery journey |
| TRY-02 | Durable single-garment try-on and credits | Not started; launch blocker | Durable job lifecycle, unknown-outcome reconciliation, concurrent requests, restart/retry and ledger evidence |
| PAY-01 | Subscription lifecycle and sustainable entitlements | Not started; launch blocker | Signed/idempotent webhooks, renewal/cancel/past-due handling, correct caps/credits and chosen storefront rules |
| RELEASE-01 | End-to-end production readiness | Not started | Real device/browser acceptance, privacy/deletion, environment validation, monitoring and rollback rehearsal |

Design is first, as requested. Security, payment and job integrity remain mandatory before public launch or paid real-user trials. Consult [review baseline](REVIEW_BASELINE.md) before estimating implementation, and [build plan](01-Tidywaro-UI-First-Build-Plan.md) for detailed gates. UI fixtures must not be presented as a working paid product.

## Current evidence

- Reviewed clone revision: `16bc12ada98f998c7d7a1d16c8a941e7457b7a3f`.
- Prompt documents and task plans exist. Approved visual frames, an implemented redesign and completed provider benchmarks do not yet exist.
- September 16, 2026: drafted [`docs/DESIGN_SYSTEM_WARM_EDITORIAL.md`](../DESIGN_SYSTEM_WARM_EDITORIAL.md) — extracted the current implemented system from source, proposed a full warm-editorial token set (color, type, spacing, radius, shadow, motion) from the D04/Prompt-00 anchors, and ran a WCAG contrast validation (one finding: the directed `border` token needs a stronger companion for accessible component outlines). Typography choice (Inter + Fraunces) and icon family (Lucide) are proposals, not confirmed.
- September 16, 2026: published a first side-by-side frame variation (Claude Artifact, private, link held by the requesting user) covering Closet, Outfit Detail, and Try-On Result at iOS 390×844, Android 412×915, and web 1440×1024, applying the tokens above, with an interaction map and a platform-difference table per screen. Main/populated state only — no empty, loading, error, offline, or permission states yet; only one variation exists (the brief calls for two to choose between); no selection has been recorded as approved. Garment and portrait imagery are flat editorial line-illustrations, not real photography or AI try-on output. DESIGN-02 is in progress, not complete. Next action: add the missing states, produce a second restrained variation, and record an approved selection.
- No application tests, real payments, provider generations, database migrations or deployments were performed for this documentation task.
- Future task updates must include a date, actual evidence and next action. Do not mark a task complete because a prompt or checklist was written.
