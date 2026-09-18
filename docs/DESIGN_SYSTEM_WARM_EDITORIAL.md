# Tidywaro Design System — Warm Editorial (proposed)

Prepared September 16, 2026. Status: **documented, not implemented**. No component, style sheet, or token file in the repository has been changed to produce this system. It exists so design work (DESIGN-02/DESIGN-03 in [TASKS.md](launch/TASKS.md)) and a future, explicitly authorized implementation task (UI-01) have one shared source of truth. Selected direction recorded in [DECISIONS.md](launch/DECISIONS.md) (D04); starting tokens and rules come from [Prompt 00 — master brief](launch/02-Tidywaro-Screen-Design-Prompts.md#prompt-00--master-brief-and-design-system).

This document has two parts: **Part A** extracts what the codebase actually implements today, so the gap is explicit. **Part B** is the new system.

---

## Part A — Current implemented system (extracted from source)

This is what ships today. It is a purple/pink gradient + glassmorphism aesthetic, not the approved warm editorial direction. Source of truth: [`apps/mobile/src/styles/theme.ts`](../apps/mobile/src/styles/theme.ts), summarized previously in [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

| Area | As observed |
|---|---|
| Primary gradient | `#8B5CF6` → `#EC4899` (vibrant purple to hot pink), solid fallback `#A855F7` |
| Secondary gradient | `#F59E0B` → `#EF4444` (amber to red), solid fallback `#F97316` |
| Neutrals | Warm-gray scale `#FAFAF9` (50) → `#1C1917` (900) |
| Semantic | Success `#10B981`, Warning `#F59E0B`, Error `#EF4444`, Info `#3B82F6` |
| Glassmorphism | Background `rgba(255,255,255,0.7)`, border `rgba(255,255,255,0.3)` |
| Headings font | `Outfit` |
| Body font | `Inter` |
| Type scale | `xs` 12 → `5xl` 48, 8px-based steps |
| Spacing | 4px grid, `xs` 4 → `6xl` 64 |
| Radius | Not centralized as a scale in `theme.ts`; `docs/DESIGN_SYSTEM.md` lists `sm` 8 → `2xl` 24 and `full` |
| Shadow | Black shadow, 4 elevation steps (`sm`–`xl`), opacity 0.05–0.2 |

The web app ([`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css)) has no product design system yet — it is the unmodified Next.js starter (Geist fonts, `#ffffff`/`#0a0a0a` background/foreground, light/dark via `prefers-color-scheme`). It does not implement any part of the mobile theme.

**Gap this document addresses:** no shared cross-platform token set exists; the implemented palette is the opposite of the agreed direction (decorative gradients/glass vs. quiet editorial); web has nothing to align to yet.

---

## Part B — New system: Warm Editorial

Quiet luxury, clear hierarchy, real clothing photography, generous but useful space. Welcoming across genders, body shapes, ages, and skin tones — no stereotyped color-coding by gender. No decorative purple-pink gradients and no glassmorphism.

### 1. Color

#### Anchor tokens (as directed)

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#F7F3ED` | App background |
| `surface` | `#FFFDFA` | Cards, sheets, elevated panels |
| `text-primary` | `#252320` | Primary text, icons |
| `text-secondary` | `#625B56` | Supporting text, captions |
| `plum` (accent) | `#6E485D` | Primary interactive color — buttons, links, selected states |
| `border` | `#DDD4CB` | Default dividers, card outlines |
| `success` | `#35624B` | Positive status |
| `error` | `#9B3434` | Errors, destructive actions |

#### Extended neutral scale

The anchors above sit at fixed steps of one warm-stone scale, so components can reference intermediate steps instead of inventing new grays:

| Step | Hex | Notes |
|---|---|---|
| 50 | `#FBF9F5` | Rarely used; near-white highlight |
| 100 | `#F7F3ED` | = `canvas` |
| 200 | `#EFE8DE` | Subtle section fill |
| 300 | `#DDD4CB` | = `border` (decorative only, see accessibility note) |
| 400 | `#C2B7AA` | Disabled fills |
| 500 | `#97897A` | Proposed `border-strong` — accessible component outlines (see §4) |
| 600 | `#7A6D60` | Icons on light surfaces, deprioritized |
| 700 | `#625B56` | = `text-secondary` |
| 800 | `#3F3A35` | Dark surface / inverse text on light accents |
| 900 | `#252320` | = `text-primary` |

#### Extended semantic and accent tokens (proposed, to complete the set)

The anchor list didn't include `warning`/`info`, and interactive states need hover/pressed/tint variants. These are new proposals, contrast-checked in §4, not yet approved:

| Token | Hex | Role |
|---|---|---|
| `plum-strong` | `#5A3A4C` | Plum hover/pressed |
| `plum-tint` | `#F3E8ED` | Selected chip / subtle accent background |
| `warning` | `#8A5A1E` | Muted ochre — replaces the old amber, fits the palette |
| `warning-tint` | `#F2E6D6` | Warning banner background |
| `success-tint` | `#E6EEE9` | Success banner background |
| `error-tint` | `#F4E4E4` | Error banner background |
| `info` | `#3E5C74` | Muted slate-blue, used sparingly (e.g., neutral informational banners) |

No gradients are defined. If a brand moment needs visual richness, use editorial photography or texture, not a color gradient.

### 2. Typography

Per the brief: one sans-serif for product UI with native fallbacks, one editorial serif reserved for large headings only. Same family, weight hierarchy, line-height intent, and semantic roles frozen across iOS, Android, and web.

| Role | Family | Notes |
|---|---|---|
| UI / body | **Inter** | Already used in the current mobile theme; highly legible, wide platform support, free/OFL-licensed. Fallback stack: `-apple-system, Roboto, system-ui, sans-serif` |
| Editorial display | **Fraunces** (proposed) | Warm serif with a soft, non-corporate character that fits ivory/charcoal/plum; variable font, OFL-licensed, available via Google Fonts. Headings only, never body or UI chrome |

Both are proposals to confirm during DESIGN-02, not installed dependencies. Bundle/subset appropriately; layouts must stay usable before web fonts load (system-font fallback first paint).

#### Type scale (logical px / line-height)

| Role | Font | Size / Line-height | Weight |
|---|---|---|---|
| Display | Fraunces | 32/40 (mobile) – 40/48 (desktop) | 500 |
| H1 | Fraunces | 28/36 | 500 |
| H2 | Inter | 24/32 | 600 |
| H3 | Inter | 20/28 | 600 |
| Body | Inter | 16/24 | 400 |
| Supporting / caption | Inter | 14/20 | 400–500 |
| Label / button | Inter | 14–16/20 | 500 |

Font sizes must respect the user's OS/browser accessibility text-size settings; do not hardcode fixed px in a way that blocks scaling on any platform.

### 3. Spacing, radius, shadow, motion

**Spacing** — same 4-unit grid as today, kept because it already works and isn't part of the visual identity change:

`xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 48 · 6xl 64`

**Radius** — tightened relative to the current system. Quiet-luxury editorial reads more premium with restrained, print-like corners rather than bubbly SaaS radii; `full` stays available for avatars/pills, used sparingly:

`sm 6 · md 10 · lg 14 · xl 20 · full 999`

**Shadow** — warm-tinted, not pure black, and used more sparingly (reserve elevation for sheets/modals/menus, not every card):

| Step | Shadow |
|---|---|
| `sm` | `0 1px 2px rgba(37,35,32,0.06)` |
| `md` | `0 4px 10px rgba(37,35,32,0.08)` |
| `lg` | `0 12px 24px rgba(37,35,32,0.12)` — sheets, dialogs, menus only |

No glassmorphism tokens (no translucent blurred backgrounds).

**Motion** — 150–250ms for standard transitions; never delay completion feedback (e.g., a finished try-on job must not wait on an animation). Provide a reduced-motion alternative for every non-essential transition.

### 4. Accessibility validation

Contrast computed against WCAG 2.1 relative-luminance formula. Normal text needs ≥4.5:1 (AA), large text/UI components ≥3:1.

| Pair | Ratio | Result |
|---|---|---|
| `text-primary` on `canvas` | 14.2:1 | AAA |
| `text-primary` on `surface` | 15.4:1 | AAA |
| `text-secondary` on `canvas` | 6.0:1 | AA (normal text) |
| `text-secondary` on `surface` | 6.6:1 | AA |
| `plum` text/icon on `canvas` | 6.9:1 | AA |
| `plum` text/icon on `surface` | 7.5:1 | AAA |
| White text on `plum` (filled button) | 7.6:1 | AAA |
| `success` on `canvas` | 6.3:1 | AA |
| `error` on `canvas` | 6.5:1 | AA |
| `warning` on `canvas` | 5.3:1 | AA |
| `border` (`#DDD4CB`) on `canvas`/`surface` | ~1.3:1 | **Fails** 3:1 non-text contrast |

**Finding:** the directed `border` token is too subtle to serve as an accessible boundary for interactive components (inputs, focus-adjacent outlines) on its own — it's fine for decorative dividers between rows/cards where a boundary isn't the only cue. Proposed fix: use `border` for decorative separation, and the new `border-strong` (`#97889A`-family, step 500 above, ~3.3:1 against `surface`) for any boundary a user depends on to perceive an interactive element (text field outline, unfocused control edge). Confirm the exact value against real rendering in the design tool before treating it as final — this is a documentation-stage validation, not a signed-off token.

All other anchor and proposed tokens pass AA at minimum for their intended text/icon use; several pass AAA. Re-verify once real component backgrounds (not solid canvas/surface) are chosen — e.g., text over a photo needs a scrim, not a raw contrast check against `canvas`.

### 5. Iconography

One coherent icon family across platforms, outline style to match the editorial, non-decorative direction. Proposal: **Lucide** (MIT-licensed, has both `lucide-react` and `lucide-react-native` packages, consistent 24px grid) — not yet installed, needs confirmation during DESIGN-02.

### 6. Touch targets

At least 44pt on iOS, 48dp on Android, 44 CSS px for primary controls on web — applies to every tappable control, not just buttons (filter chips, icon buttons, list-row affordances).

### 7. Component inventory (tokens only — full states are DESIGN-03 scope)

Button (primary/secondary/quiet/destructive), TextField, ScreenHeader, GarmentCard, OutfitCard, FilterChip, BottomSheet, EmptyState, ErrorState, Skeleton, CreditBadge, JobStatusCard, PhotoCard, PlanOption.

General rules for all of them under this system:
- No gradient fills, no translucent/blurred (glass) backgrounds.
- Default resting elevation is flat (`shadow` none or `sm`); reserve `md`/`lg` for things that visually float above content (sheets, menus, dialogs).
- Selected/active state uses `plum-tint` fill + `plum` border or text, not a color swap to an unrelated hue.
- Destructive actions use `error`, never `plum` or `error` mixed with warm accents in the same control.
- Garment/outfit photography keeps a consistent 3:4 frame; the photo itself carries the "editorial" quality — chrome around it stays quiet.

### 8. What this does not decide yet

- Final font licensing/availability confirmation for Fraunces and any Inter variable-font packaging per platform.
- Approved anchor screen frames (Closet, Outfit Detail, Try-On Result) — this is the token layer they should be built from.
- Icon library installation.
- Dark mode (brief specifies light-mode launch only; do not design a full dark palette from these tokens without a separate decision).
- Any code change. Implementing these tokens into `apps/mobile/src/styles/theme.ts`, a new `apps/web` token source, or a shared package is a separate, explicitly authorized task (UI-01 in [TASKS.md](launch/TASKS.md)) and has not started.

---

## Relationship to other documents

- [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — left unchanged; it accurately documents the *current* implemented system (Part A above extracts from it and from source directly). Do not delete it until UI-01 actually replaces the implementation.
- [`docs/launch/02-Tidywaro-Screen-Design-Prompts.md`](launch/02-Tidywaro-Screen-Design-Prompts.md) — source of the anchor tokens and brief this document expands into a full token set.
- [`docs/launch/DECISIONS.md`](launch/DECISIONS.md) — D04 records the direction selection this document implements.
- [`docs/launch/TASKS.md`](launch/TASKS.md) — DESIGN-02 is the task this document supports; it does not close that task by itself (no approved frames, no accessibility sign-off in a design tool, no recorded final selection yet).
