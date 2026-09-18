# Codex and Claude working guide

Current mode: Markdown and design preparation only. Code examples and implementation prompts in this library are for later, explicitly requested tasks.

## Shared context, focused sessions

Open the repository root in either coding tool. Codex reads `AGENTS.md`; Claude Code reads `CLAUDE.md`, which imports `@AGENTS.md`. Plain Claude chat or a design tool needs the relevant files attached or pasted; do not assume it can inspect the clone. These mechanisms follow the [Codex project instructions guide](https://developers.openai.com/codex/guides/agents-md) and [Claude Code memory documentation](https://code.claude.com/docs/en/memory).

1. Read project instructions, PROJECT_CONTEXT, TASKS, and the one relevant prompt section. Inspect the current working tree.
2. Choose a single outcome. Copy [the task template](templates/TASK.md) and name allowed files, required states, and evidence before starting.
3. Separate observations, proposals, and approved decisions. Recheck source findings against the current commit before fixing them.
4. Produce the smallest coherent result. For design, compare anchor screens before expanding the system. For later implementation, complete one vertical slice with failure/recovery behavior.
5. Review the actual artifact or diff against acceptance criteria. Record checks that ran, checks that did not, and any remaining limitation.
6. Update TASKS and write a [handoff](templates/HANDOFF.md). Start a fresh focused session when the objective changes.

Codex can implement or review; Claude can plan, design, implement, or review. Roles are interchangeable. Use one active writer for overlapping files in this checkout. A second tool can review a fixed diff without editing it. Do not launch multiple agents, create worktrees, or install integrations merely because a guide mentions them.

## Ideas adapted from the supplied guides

| Guide | Idea used here | Tidywaro application |
|---|---|---|
| [Codex](https://flaviocopes.com/codex/) | Persistent project instructions and bounded, verifiable tasks | Root instructions, clear scope, small changes, explicit checks and visual evidence |
| [Cursor projects](https://flaviocopes.com/cursor-projects/) | Keep project context and progress outside individual chats | TASKS, DECISIONS and handoffs shared by Codex and Claude; no Cursor migration required |
| [tldraw](https://flaviocopes.com/tldraw/) | Use a visual canvas to reason about flows | Sketch try-on branches and recovery before building screens or backend behavior |
| [v0 tutorial](https://flaviocopes.com/v0-tutorial/) | Iterate on visual references in small UI steps | Use approved frames and fixture states for isolated previews before connecting services |

These are workflow ideas, not stack recommendations. Keep Expo/React Native, Next.js/Tailwind, Express and Supabase. No new hosting, database, framework, SDK, design subscription, or automatic Git connection is needed for this documentation setup.

## Design-tool packet

For Claude Design, Figma or another design tool, provide the master prompt from [the shared library](02-Tidywaro-Screen-Design-Prompts.md), the specific screen prompt, and the matching [Android](04-Tidywaro-Android-Design-Prompts.md) or [web](05-Tidywaro-Web-Design-Prompts.md) adaptation. Include approved anchor frames when they exist. Ask for editable components, named tokens, constraints, interaction states and handoff notes; an attractive screenshot alone is insufficient.

Start with Closet 04, Outfit Detail 09 and Try-On Result 15 using identical fixtures across platforms. Review them together. Use Higgsfield or another image tool only for clearly labeled concept/editorial assets where appropriate; those images are not proof of actual try-on quality. Obtain real consent for any personal image used with an external service.

### Whiteboard prompt for tldraw

```text
Create a Tidywaro try-on journey diagram, not application code. Use the attached project context and try-on playbook. Show: entry from garment/outfit, choosing one supported garment, choosing a consented person photo, photo validation, credit/cost disclosure, confirmation, queued job, processing, result, save and history. Add branches for denied photo access, invalid input, insufficient credits, offline, expired session, provider timeout with unknown outcome, definitive failure, app close/reopen and retry. Show where a reserved credit is consumed or released; do not imply retries are always free or instant. Distinguish user-visible states from backend states. Flag unresolved decisions. Preserve the existing stack.
```

### Isolated web preview prompt for v0 or a comparable tool

```text
Create a design preview of Tidywaro's Closet screen using the attached shared master prompt, screen 04, web W00/W04 and approved anchors if available. Match the warm editorial ivory/charcoal/plum system used by Android and iOS. Show desktop, tablet and narrow mobile web, with populated, empty, loading, error and filtered-empty states. Use fictional fixture data. Target the existing Next.js 16 / React 19 / Tailwind 4 stack in handoff notes. Keep this preview outside the repository: do not sync Git, install packages, connect Supabase or Stripe, change authentication, or deploy. Return editable design/prototype output and a component/state specification. Identify any generated code requiring manual adaptation before a later authorized implementation.
```

## Future engineering prompt, only when implementation is requested

```text
Read AGENTS.md and the referenced task/handoff. Inspect the current tree and the relevant source. Implement only [TASK-ID] within [allowed files], preserving the existing stack and unrelated work. Use the approved design reference [link/version] and acceptance criteria [list]. First identify contract/security risks that affect this task. Keep the change small, cover meaningful failure and recovery paths, and run the applicable checks available in this repository. Inspect the final diff. Report exact changes, verification evidence, limitations and next step. Do not claim mocked behavior proves real provider, billing or device behavior.
```

## Review and handoff prompts

```text
Review the fixed diff for [TASK-ID] without editing. Compare it with the task acceptance criteria and approved design. Prioritize broken user journeys, ownership/entitlement errors, duplicate side effects, accessibility and cross-platform drift. Give concrete file references and reproduction steps where possible. Separate observed defects from risks needing a test. Do not expand scope or claim checks you did not run.
```

```text
Prepare a Markdown handoff using docs/launch/templates/HANDOFF.md. Record the current source revision, actual changes, task status, decisions, checks and unresolved issues. Specify the next bounded action. Do not include secrets or invent design links, successful tests, provider evaluations or deployments.
```
