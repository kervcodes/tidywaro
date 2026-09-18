# Tidywaro — UI-first build plan

Prepared September 16, 2026. Direction selected by Kervintz: warm editorial, ivory, charcoal, muted plum.

This plan builds on the source review of [commit 16bc12a](https://github.com/kervcodes/tidywaro/commit/16bc12ada98f998c7d7a1d16c8a941e7457b7a3f). Recheck the current repository before implementation. Design and provider evaluation remain to be performed; this document does not claim the UI or model has been tested.

## The recommendation

Design the complete experience across iOS, Android, and responsive web first, implement polished prototypes with the same deterministic sample data, then connect real features in small vertical slices. Keep React Native/Expo for mobile, the existing Next.js web application, TypeScript, the Express backend, and Supabase. Replace the fragile public-demo try-on integration with a managed fashion API after a small quality benchmark. All platforms belong to one versioned design system.

The product promise is: **Know what you own. Build outfits you like. Preview a garment on yourself.** A generated preview is a styling aid, not a measurement or guarantee of physical fit.

Senior engineering quality means clear contracts, safe data handling, recoverable failures, measured quality, and maintainable changes. It does not require microservices, Kubernetes, custom model training, or rewriting the stack.

Read the companion documents in this order:

1. [Screen design prompts](02-Tidywaro-Screen-Design-Prompts.md).
2. This build sequence.
3. [Try-on architecture and AI engineering prompts](03-Tidywaro-Try-On-and-Engineering-Playbook.md).
4. [Android screen companions](04-Tidywaro-Android-Design-Prompts.md).
5. [Web application screen companions](05-Tidywaro-Web-Design-Prompts.md).

## 1. Scope and navigation

Design iOS, Android, and the full signed-in web application as equal product surfaces. Web includes wardrobe management, outfits, planning, try-on, account, and billing, as well as public marketing/support pages. Implement by feature slice across platforms; shipping dates can be staged without reducing the web design to a landing page.

Use the same four destinations everywhere: **Closet · Outfits · Try-On · Account**. Compact mobile layouts use bottom navigation; desktop web uses a branded sidebar, while tablet layouts adapt to available space. Put Add Clothes in a prominent Closet action rather than making upload the default home. Respect native insets, Android Back, browser history, and keyboard focus. Use platform-appropriate sheets, dialogs, or pages for uploads, editing, checkout, and photo selection.

Core journeys:

- Welcome → preview the product → create/sign in to an account → add clothing → review tags → closet.
- Closet → select clothing → outfit detail → assign to a day or select one garment for try-on.
- Try-On → choose a personal photo → choose one supported garment → review credit cost → generate → leave/reopen → view result.
- Contextual paywall → purchase → server confirmation → resume the interrupted action.
- Account → manage plan, photos, privacy, recovery, support, and deletion.

The preview before sign-up uses curated sample data. Do not silently add anonymous server accounts or upload a visitor's personal photos before the account flow is implemented. Design a future local-draft experience separately if testing shows sign-up friction matters.

## 2. Tool workflow

| Job | Tool role | Required output |
|---|---|---|
| Explore layout and interaction | Claude design-capable workflow or another UI prototyping tool | Screen alternatives and a clickable prototype |
| Maintain the canonical design | Figma or equivalent editable design tool | Named components, tokens, variants, constraints, and linked screens |
| Produce editorial assets | Higgsfield or another image/video tool | Individual licensed/authorized photographs or illustrations, separate from UI |
| Implement approved designs | Codex or Claude Code in this repository | Reviewed React Native and Next.js components with tested shared feature contracts |
| Generate actual customer try-ons | Managed fashion API, evaluated in document 03 | Measured output quality, costs, latency, and production integration |

These are recommended roles, not claims that every tool supports every requested output. If a tool cannot produce editable components, ask it for annotated references and reconstruct them in the design source. Image tools should produce assets, not rasterized app screens presented as an implementation.

Do not independently generate every screen from scratch. Establish the system once, then attach it and the same reference screens to every subsequent prompt. Keep provider names, queue states, and engineering details out of ordinary customer-facing copy.

## 3. Visual specification

| Token | Starting value | Use |
|---|---|---|
| Canvas | `#F7F3ED` | Warm ivory background |
| Surface | `#FFFDFA` | Cards and sheets |
| Primary text | `#252320` | Charcoal text |
| Secondary text | `#625B56` | Supporting text |
| Accent | `#6E485D` | Muted plum primary action and selection |
| Border | `#DDD4CB` | Quiet separators |
| Success | `#35624B` | Confirmed success |
| Error | `#9B3434` | Error text and feedback |

Validate contrast in actual combinations, including disabled and pressed states. Choose one licensed product sans-serif and an optional editorial heading serif shared across platforms, with native fallbacks. Bundle fonts on mobile and provide usable web fallbacks during loading. Start semantic body/supporting/heading sizes at 16/14/24–32 logical units and a 4-unit spacing scale. Target at least 44 pt interactive areas on iOS, 48 dp on Android, and 44 CSS px for primary web touch controls. Text respects accessibility scaling. Shared token names map to each platform's rendering system.

Let clothing images dominate. Use a consistent 3:4 image frame with contain fitting for garment cutouts. Distinguish original garment photos from processed thumbnails. Use plum sparingly; avoid purple-pink gradients, ornamental glass surfaces, and heavy shadows on every card. Use 12–20-point corner radii according to component size. Honor reduced motion and larger text. Launch light mode deliberately; do not ship an untested automatically inverted dark mode.

## 4. Build sequence and completion gates

These are ordered work packages, not calendar promises. Finish each gate before starting dependent implementation. UI comes first, as requested. The UI phase uses fixtures and does not expose the reviewed unsafe backend to customers.

### Phase A — Art direction and three anchor screens

- [ ] Generate two variations within the selected warm editorial direction.
- [ ] Design populated Closet, Outfit Detail, and Try-On Result.
- [ ] Present all three anchors side by side on iOS, Android, and desktop/compact web using identical specimen data.
- [ ] Choose one direction based on legibility, clarity, realistic clothing imagery, and implementation feasibility.
- [ ] Create component and token pages using prompt 00 in the prompt pack.
- [ ] Record the chosen frames and decisions in the repository's design documentation.

**Gate:** the three screens look like the same product. The primary action is obvious. Result imagery used for mockups is labeled internally as illustrative; it is not evidence of try-on performance.

### Phase B — Complete the screen system

- [ ] Generate the remaining screens using shared prompts 01–20 plus matching Android A01–A20 and web W01–W20 companions.
- [ ] Produce happy, empty, loading, error, permission-denied, and applicable paid/limited states.
- [ ] Link the five journeys above into a prototype for each platform, all derived from the same design system.
- [ ] Test five tasks with a small group of representative users: add an item, find it, plan an outfit, request a preview, find billing/privacy controls.
- [ ] Record where they hesitate and revise those flows before coding.

**Gate:** a person can complete each prototype task without explanation. Copy, navigation labels, credit terminology, and visual components are consistent. Do not invent testimonial quotes or trial offers.

### Phase C — Implement the UI across platforms with shared fixtures

- [ ] Preserve the existing app shell and navigation stack; migrate screen by screen.
- [ ] Build the authenticated Next.js web shell and responsive pages; adapt layout without changing product vocabulary or state semantics.
- [ ] Share versioned tokens, fixture data, API contracts, and suitable pure domain logic. Keep native components and accessible DOM components separate where their behavior differs.
- [ ] Implement tokens and components: Screen, AppText, Button, TextField, GarmentCard, OutfitCard, BottomSheet, EmptyState, ErrorState, Skeleton, CreditBadge, and JobStatusCard.
- [ ] Build feature hooks against typed interfaces. Supply fixtures through development-only adapters.
- [ ] Add a development-only state gallery for loading/error/limit variants. Exclude it from release navigation.
- [ ] Implement Closet and item detail first, then upload/auth, outfits/planner, try-on, and account/paywall.
- [ ] Capture actual device/simulator screenshots beside approved references and resolve meaningful discrepancies.
- [ ] Capture browser screenshots and compare all platforms using the brand-consistency audit in the companion libraries.

**Gate:** every visible control performs its prototype action; no inert primary buttons. Layout works with keyboard, safe areas, long text, and large fonts. Release builds cannot accidentally use fixtures.

### Phase D — Prove try-on image quality

- [ ] Follow the fixed benchmark in document 03 using consented adult photos and real garment inputs.
- [ ] Evaluate one-garment FASHN v1.6 first and compare a bounded Try-On Max sample if needed.
- [ ] Record failure modes, accepted-output cost, and latency before promising a result time or credit allowance.
- [ ] Choose the model/configuration that passes the gate; restrict unsupported categories in the UI.

**Gate:** an evidence-backed provider decision. If no model passes, keep the designed feature behind a flag and retain an explicitly labeled outfit collage. Do not disguise a collage as a generated try-on.

### Phase E — Connect secure wardrobe and planning

- [ ] Implement HTTPS environment configuration and startup validation.
- [ ] Correct storage privacy, RLS, and privileged database function permissions from the review.
- [ ] Connect account creation, email confirmation, recovery, and session restoration.
- [ ] Connect uploads, editable metadata, wardrobe pagination, deletion, and failure recovery.
- [ ] Replace the retired AI model after testing a supported model.
- [ ] Correct planner overlap logic and replace saved plans only after successful generation and transactional persistence.

**Gate:** fresh account → upload → edit → browse → plan works with real data. Interrupted requests do not lose saved clothing or plans. Two-user authorization tests pass.

### Phase F — Complete durable try-on

- [ ] Replace the mismatched mobile/backend/SQL contracts.
- [ ] Add atomic reservations, durable jobs, provider request tracking, output persistence, and reconciliation.
- [ ] Keep personal photos and generated results private.
- [ ] Resume job status after navigation, app restart, and network loss.
- [ ] Disable legacy unmetered generation endpoints.

**Gate:** a real preview survives app closure; duplicate taps do not create duplicate charges; failures restore credits exactly once; worker restarts do not strand jobs. Provider outages are visible and generation can be disabled remotely while the rest of the app remains usable.

### Phase G — Billing and release

- [ ] Repair Stripe raw webhook parsing, event persistence, customer mapping, and current payload fields.
- [ ] Choose the iOS storefront/payment strategy and implement native purchases/restoration where required; verify current platform rules at implementation time.
- [ ] Use one server-side entitlement definition across wardrobe, AI planning, and try-on.
- [ ] Display actual localized prices and explicit included usage.
- [ ] Add account deletion, retention cleanup, support, privacy/terms, and renewal/cancellation states.
- [ ] Run staged beta tests and the release gates below.

**Gate:** payment → entitlement → benefit → renewal/cancellation has been exercised in sandbox and in the intended release configuration. Never announce activation based only on a checkout redirect.

## 5. Existing screen migration map

| Existing repository area | Intended role |
|---|---|
| OnboardingScreen | Welcome and product preview; register the flow deliberately |
| SignInScreen | Separate clear sign-in/create-account modes plus recovery and verification |
| ClosetScreen | Default Closet tab with search, filters, usage, and Add Clothes |
| UploadScreen | Add/import, upload state, review metadata, and partial-batch recovery |
| ItemDetailScreen | Photo, editable attributes, outfit and preview actions |
| StyleAIScreen | Outfits tab and saved/generated outfit discovery |
| PlannerScreen | Weekly calendar reached from Outfits; share components rather than duplicate planning logic |
| ModelSelectionScreen + UserPhotosScreen | One photo/model library and selection flow with persisted photo IDs |
| TryOnScreen | Replace percentage-positioned garment overlay as the main preview; optionally retain a separately labeled collage |
| TryOnJobScreen | Setup, durable progress, and result subroutes using one job contract |
| UpgradeScreen + SubscriptionContext | Paywall and server-confirmed entitlement presentation |
| New Account screens | Plan management, privacy, photos, support, deletion |
| apps/web | Full responsive signed-in app plus marketing/support/legal and web billing return pages |

File names are migration targets, not instructions to rewrite everything at once.

## 6. Launch offer and economics

Maintain one Free plan and one Premium plan initially. Free should support a useful small wardrobe and a limited taste of styling. Premium can expand storage and give a bounded allowance of AI operations. Keep existing clothes readable/exportable/deletable after downgrade.

The old code's 50 try-on credits should not become a public promise without cost validation. At a provider cost of $0.075 per output, 50 successful outputs alone cost $3.75, before retries, storage, payment fees, and support. The old $39.99 annual price produces approximately $3.33 gross revenue per month. That combination cannot support 50 fully used monthly generations economically. These are illustrative calculations using published on-demand API pricing, not a forecast. [FASHN API pricing](https://help.fashn.ai/plans-and-pricing/api-pricing).

Choose allowances using: **net subscription revenue − expected AI costs − storage/egress − support/refund reserve**. Measure provider spend per accepted preview, not just per successful API response. Rejected-looking outputs can still be billable provider successes. Start with a small measured allowance; sell additional credits later only if demand warrants the complexity.

## 7. Definition of done

Each feature ticket contains a user outcome, allowed scope, acceptance criteria, error states, screenshots, verification evidence, and a rollback/disable plan when relevant.

Before public payment:

- [ ] Type checking, linting, and targeted integration tests pass.
- [ ] Core flows run on small/large iOS and Android layouts plus desktop and compact web.
- [ ] Browser Back/refresh/deep links, keyboard-only navigation, touch layouts, and cross-device job/entitlement refresh work consistently.
- [ ] Screen readers, larger text, keyboard avoidance, and reduced motion receive a manual check.
- [ ] Cross-user table/object access and direct RPC bypass tests fail safely.
- [ ] A worker can crash and restart without double charging or abandoning accepted jobs.
- [ ] Expired signed URLs can be refreshed without creating another generation.
- [ ] Duplicate/stale billing events cannot incorrectly grant or remove entitlements.
- [ ] Support can trace a failed job by opaque job ID without seeing raw private images or tokens in logs.
- [ ] A generation kill switch, spend alerts, database backup/restore process, and deletion cleanup are documented and exercised.
- [ ] Try-on quality is measured on the chosen scope. Advertising uses actual approved app output.

## Start here

Open the shared prompt pack and run prompt 00, followed by 04, 09, and 15 for the three anchor screens. For Android append A00 and the matching A04/A09/A15; for web append W00 and W04/W09/W15. Approve one side-by-side reference set spanning the platforms. Then generate each complete prototype before handing one feature slice at a time to an implementation agent.
