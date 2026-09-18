# Tidywaro — shared project context

Recorded September 16, 2026. Local clone and reviewed source both resolved to `16bc12ada98f998c7d7a1d16c8a941e7457b7a3f` when preparing this package. Recheck HEAD and the working tree before future work.

## User intent

Launch and monetize Tidywaro, using AI to assist design and implementation while holding the result to experienced senior/principal engineering standards. First improve the UI. Keep the current stack and code untouched during this documentation task. Create a reusable Markdown base for Codex and Claude.

iOS, Android, and a complete responsive web app must feel designed by one designer/design firm in one project. Selected direction: warm editorial, ivory/charcoal/muted plum. The old iOS-first/marketing-only-web scope has been superseded by this explicit cross-platform direction.

## Existing stack — preserve

| Area | Observed in repository |
|---|---|
| Workspace | npm workspaces and Turborepo; TypeScript |
| Mobile | Expo `~54.0.30`, React Native `0.81.5`, React `19.1.0`, React Navigation; StyleSheet/theme components |
| Web | Next.js `16.0.3`, React `19.2.0`, Tailwind CSS 4; currently a starter page |
| Backend | Express 4, TypeScript, Node, Axios/fetch, Winston, Multer/Sharp |
| Data | Supabase Auth, PostgreSQL and Storage; SQL files in `database/` |
| Existing AI | Google Gemini SDK; background-removal tooling; Hugging Face/Gradio try-on paths |
| Existing payments | Stripe SDK/service/routes, subscription table and mobile upgrade screen |

These are manifest values, not an assertion that all dependencies/builds are valid or current. Mobile and web currently have different React versions; do not align them as an incidental docs/UI change. RevenueCat/StoreKit integration and FASHN evaluation are future proposals, not installed capabilities. Do not replace Express with web server actions, Supabase with another database, or mobile styling with a new library just because a tutorial does so.

## Agreed product direction

- Four shared destinations: Closet, Outfits, Try-On, Account.
- Returning users start in Closet. Add Clothes is a prominent action within it.
- Mobile uses native-feeling bottom navigation; desktop web adapts with a branded sidebar and wider layouts.
- Same semantic colors, font roles, image treatment, icon family, component language, copy, and status semantics on all platforms.
- Design system and anchor screens first; complete state-aware prototype second; code only when implementation is requested.
- Single-garment try-on is the first quality milestone. Full outfits require a separate benchmark and must not be implied by collaged images.
- A preview helps with styling; it is not a physical size/fit guarantee.
- Preserve useful user data on downgrade. Credits and entitlements are server-owned when implemented.

## Current versus intended

The current app has mobile screens, wardrobe uploads, planning, Stripe scaffolding, and try-on code. The new visual direction, complete web app, shared validated contracts, durable credit ledger, and managed-provider integration are not implemented by this package. No benchmark, device test, payment test, or deployed-database inspection was performed in the documentation preparation.

`docs/DESIGN_SYSTEM.md` and `.github/copilot-instructions.md` retain earlier conventions. Their source descriptions may be stale; the warm editorial direction and UI-first order are deliberate new decisions. Public storage and a claimed working auth/payment flow must not be treated as verified safe simply because older docs describe them.

## What “senior-level quality” means here

Clear feature boundaries; typed/validated contracts; authorization; recoverable jobs; idempotent money/credit operations; accessible UI; consistent cross-platform behavior; measured try-on quality/cost; focused tests; reviewable changes. Keep infrastructure proportional to the app. Do not add custom model training, Kubernetes, or extra services without a concrete need and explicit scope.

## Reading paths

- Design: shared prompts → Android/web companion → consistency audit.
- Implementation planning: build plan → current task → affected source → acceptance criteria.
- Try-on: review baseline → playbook → current official provider docs before integration.
- Resume after a tool switch: TASKS → latest task/handoff → verify the current tree.

Only the user's next explicit instruction changes the current documentation/design scope into an implementation task. Do not start coding because a backlog row says “Ready” or because this file contains a future architecture.
