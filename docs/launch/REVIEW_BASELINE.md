# Launch review baseline

Source reviewed at `16bc12ada98f998c7d7a1d16c8a941e7457b7a3f`. This is a source-based backlog, not a live production audit. Recheck the current implementation before fixing anything. No deployed database, real provider, payment lifecycle or device testing was performed. The user's next priority is UI design; none of these issues is fixed by the new Markdown files.

## Blockers (must fix to make money)

| Priority | Finding from reviewed source | Required outcome before launch |
|---|---|---|
| P0 | Credit/job SQL exposes powerful SECURITY DEFINER operations with arbitrary user/amount inputs and insufficient execution restrictions; direct job insertion can bypass charging | Restrict callable functions and job writes; validate actor, amount and ownership; reserve credits atomically; test hostile and concurrent requests |
| P0 | Try-on photo migration creates a public bucket and public read policy | Private person photos and outputs, short-lived authorized access, consent and deletion policy |
| P1 | Try-on downloads accept client-controlled URLs; legacy generation paths can bypass paid limits | Resolve owned storage objects server-side, prevent unsafe network destinations, and enforce the same entitlement on every generation entry point |
| P1 | Backend JSON middleware precedes the Stripe raw webhook route | Verify signatures against the original bytes; exercise signed events and invalid signatures |
| P1 | Subscription processing assumes obsolete top-level period fields, loses a customer metadata fallback, and can acknowledge database-write failures | Use the installed API's event shape, deterministic customer mapping and durable idempotent event processing with retry/reconciliation |
| P1 | Mobile/controller/worker/database disagree on request names and result/job fields; claimed job rows omit fields the worker expects | One validated contract for submissions, job states and results across all clients and the worker |
| P1 | Queue processing and credit semantics do not establish the durable lifecycle described in the new playbook | Persist provider IDs, use leases/fencing, reconcile unknown submissions, and consume/release a reservation exactly once |
| P1 | Subscription caps/active states differ across SQL, backend and mobile; recurring credits and paid upgrade grants are incomplete | Central server entitlement rules, atomic caps, an auditable credit ledger and tested renewals/upgrades/cancellations |
| P1 | Mobile API configuration points to local network/emulator HTTP addresses; auth callback setup lacks a complete cold-start path | Validated production configuration, HTTPS, confirmed session establishment, password recovery and account deletion |
| P1 | AI service references Gemini 2.0 Flash, whose published retirement date has passed; existing IDM-VTON weights have noncommercial terms | Verify supported models and commercial terms; benchmark a suitable provider before making paid try-on promises |
| P1 | Web is a starter rather than the complete wardrobe product; planner query/replacement logic can select incorrect overlaps and remove saved plans before a successful replacement | Deliver the promised web journey and make planner replacement safe on failure |

Source areas to inspect: `apps/bff/src/index.ts`, subscription/AI/try-on services and controllers, try-on worker, mobile API/auth configuration, and SQL migrations 02, 11 and 12. Use symbol search against the current tree; line numbers and paths can move during implementation. The detailed [try-on playbook](03-Tidywaro-Try-On-and-Engineering-Playbook.md) translates the lifecycle problems into proposed contracts and tests.

The reviewed mobile Supabase anon key is a public client credential, not by itself evidence of a leaked private key. No obvious private provider key was identified in the inspected source; that is not an exhaustive secret scan. Review environment validation, deployed secrets and log redaction during release preparation without printing secret values.

Payment is a product decision as well as an integration: do not promise unlimited generation. Model realistic cost per successful output, retries, refunds, storage, fees and tax. Resolve web versus native storefront purchase rules for the actual distribution countries before implementing mobile purchase calls. Proposed provider/pricing details in these docs require a fresh check before purchase or launch.

Reference behavior: [Stripe signature verification](https://docs.stripe.com/webhooks/signature), [Stripe subscription period field change](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end), [Google model deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [Supabase database functions and privileges](https://supabase.com/docs/guides/database/functions), and [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Enhancements (polish after launch)

- Expand multi-garment try-on only after the single-garment benchmark succeeds; do not confuse generated editorial imagery with garment-fidelity evidence.
- Add richer outfit planning, personalization, sharing and batch workflows after the core closet → outfit → try-on → save journey works reliably.
- Refine motion, transitions and editorial assets after readable typography, stable photo layouts, responsive spacing, keyboard/focus behavior and all failure states are complete.
- Improve funnels and pricing experiments after reliable entitlement and cost telemetry exists.

The UI foundation itself comes first in the work sequence: use the shared ivory/charcoal/plum system across iOS, Android and web, remove inconsistent gradient treatments as part of later authorized implementation, and ensure the Closet cannot remain blank after its first fetch fails. Basic accessibility and recovery states are launch criteria, not optional polish.
