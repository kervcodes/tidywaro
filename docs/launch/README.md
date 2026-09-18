# Tidywaro launch workspace — start here

Prepared September 16, 2026 for the existing clone at `C:\Users\kervi\Code\tidywaro`.

**Current scope: documentation and UI/design preparation only.** These files record today's decisions and provide reusable prompts. They do not implement the redesign, fix the reviewed defects, install tools, change the stack, or activate a model/payment provider.

## First session in Codex or Claude

Open the repository root as the project. Codex uses the root `AGENTS.md`; Claude Code's `CLAUDE.md` imports the same instructions. Both should inspect the current tree and read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) and [TASKS.md](TASKS.md). A plain Claude chat needs the selected documents attached manually.

Start with this prompt:

```text
Read AGENTS.md, docs/launch/PROJECT_CONTEXT.md, and docs/launch/TASKS.md. Keep the existing stack and all application code unchanged. Work on DESIGN-01 only: use the shared master prompt and Android/web companions to prepare one cohesive design brief and the three anchor-screen specifications across iOS, Android, and web. Use the warm editorial direction already selected. Record unresolved design choices and acceptance criteria in Markdown; do not implement screens, install packages, or connect services.
```

## Document map

| Document | Purpose |
|---|---|
| [Project context](PROJECT_CONTEXT.md) | Current source versus agreed target; stack and constraints |
| [Decisions](DECISIONS.md) | What was agreed, what is only proposed, what remains open |
| [Tasks](TASKS.md) | Ordered work and honest completion status |
| [AI workflow](AI_WORKFLOW.md) | Working with Codex/Claude and borrowing ideas from the supplied guides |
| [Review baseline](REVIEW_BASELINE.md) | Source-derived launch risks to revisit after UI planning |
| [Prompt library entry](00-Tidywaro-Prompt-Library-Start-Here.md) | How to assemble a design request |
| [Build plan](01-Tidywaro-UI-First-Build-Plan.md) | UI-first phases and release gates |
| [Shared prompts](02-Tidywaro-Screen-Design-Prompts.md) | Design system, 20 screen families, assets and handoff prompts |
| [Try-on playbook](03-Tidywaro-Try-On-and-Engineering-Playbook.md) | Evaluation, architecture, contracts, recovery and engineering prompts |
| [Android prompts](04-Tidywaro-Android-Design-Prompts.md) | 20 Android screen adaptations |
| [Web prompts](05-Tidywaro-Web-Design-Prompts.md) | Full responsive app, 20 adaptations and consistency audit |
| [Task template](templates/TASK.md) | A bounded request with allowed files and verification |
| [Handoff template](templates/HANDOFF.md) | Resume with another agent without losing decisions |

## Design sequence

1. Shared prompt 00 establishes the system.
2. Design Closet (04), Outfit Detail (09), and Try-On Result (15) together.
3. Append Android A00 and matching A04/A09/A15; append web W00 and matching W04/W09/W15.
4. Compare side by side using the same wardrobe and states. Choose one system before expanding to all screens.
5. Use the complete prototype and acceptance criteria to request an explicit implementation task later.

The prompt libraries' imperative examples are reusable future requests, not permission to execute them while preparing documentation. Existing documentation remains intact; these launch documents describe the next product direction. Record future design links in the task/handoff rather than pretending frames exist today.
