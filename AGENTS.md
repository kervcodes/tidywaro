# Tidywaro project instructions

## Scope and starting context

- Current phase: UI/design planning and documentation. A roadmap or implementation prompt is not permission to implement it. Keep code unchanged until the user explicitly requests a code task; then work only within that task's scope.
- Read [project context](docs/launch/PROJECT_CONTEXT.md), [task status](docs/launch/TASKS.md), and the relevant launch document before working. Do not load the entire prompt library for a small task.
- Preserve existing uncommitted work. Inspect the working tree before editing. Never revert unrelated changes or run a broad formatter for a narrow task.
- Keep the existing stack and dependency versions unless the user explicitly authorizes a change: npm/Turborepo, TypeScript, React Native/Expo, React Navigation, Next.js/React/Tailwind, Express, and Supabase. Billing/AI provider changes in the plan are proposals, not completed work.

## Product and design

- iOS, Android, and the full responsive web application are equal design surfaces of one product.
- Approved direction: warm editorial; ivory, charcoal, muted plum. Shared typography, imagery, components, copy, and states; platform-appropriate navigation/input behavior.
- Use [shared prompts](docs/launch/02-Tidywaro-Screen-Design-Prompts.md) with the [Android](docs/launch/04-Tidywaro-Android-Design-Prompts.md) or [web](docs/launch/05-Tidywaro-Web-Design-Prompts.md) companion.
- Existing `docs/DESIGN_SYSTEM.md` describes the current gradient design. The launch docs describe the requested future design. Do not claim it is implemented.
- Legacy README/Copilot/architecture docs may describe intended behavior. Verify claims against source; do not reproduce known unsafe policies merely because they are documented.

## Engineering work, when requested

- Prefer a small vertical feature slice with explicit acceptance criteria and error states. Separate UI, API contracts, domain policy, persistence, and provider adapters.
- Keep mobile/web contracts consistent. Do not use `any` assertions to hide request/response mismatches.
- Verify ownership and entitlement on the server. Keep private photos, administrative credentials, and provider keys out of clients, Git, logs, and public URLs.
- Payment/credit/job mutations need idempotency and recovery evidence. Treat external timeouts as unknown outcomes until reconciled.
- One active writer per overlapping file set. Codex and Claude share the same docs; hand off explicitly. Do not start agents, automation, or parallel work unless requested.
- Verify the changed behavior with appropriate checks; report what actually ran and what remains untested. Do not claim device/model quality from mocked tests.
- Do not commit, push, deploy, apply database changes, or spend on provider calls unless the user's task authorizes those actions.

## Existing commands (run from repository root only when relevant)

| Purpose | Command |
|---|---|
| Mobile development | `npm run start --workspace=mobile` |
| Android launch | `npm run android --workspace=mobile` |
| iOS launch | `npm run ios --workspace=mobile` (requires a suitable iOS environment) |
| Web development | `npm run dev --workspace=web` |
| Web build / lint | `npm run build --workspace=web` / `npm run lint --workspace=web` |
| Backend development / build | `npm run dev --workspace=bff` / `npm run build --workspace=bff` |
| Try-on worker | `npm run worker --workspace=bff` (may process real jobs; do not start for a docs task) |

Commands are manifest-verified, not proof that the app builds. No standard `test` scripts were present in the reviewed root/mobile/web/backend manifests. Report missing test infrastructure rather than inventing a successful test command. Root `dev` runs declared workspace `dev` tasks; mobile declares `start` instead. Check actual ports before launching concurrent services.

## Completion and handoff

- Inspect the final diff for unintended changes. Documentation-only tasks must not modify source, manifests, lockfiles, SQL, config, or assets.
- Update task status/handoff only with verified results. Use the [task](docs/launch/templates/TASK.md) and [handoff](docs/launch/templates/HANDOFF.md) templates when useful.
- See [AI workflow](docs/launch/AI_WORKFLOW.md) for focused planning, visual reference, implementation, and review prompts.
