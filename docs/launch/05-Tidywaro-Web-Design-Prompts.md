# Tidywaro — responsive web application prompt library

Companion to [the shared design system and screen prompts](02-Tidywaro-Screen-Design-Prompts.md). Web includes the full signed-in product, not only a landing page. It belongs to the same design project as iOS and Android.

## How to use

Paste shared master prompt 00, the matching shared screen prompt, W00 below, and its W01–W20 companion. Attach approved mobile references and the design-system version. Start with W04, W09, and W15 to establish desktop and compact-web anchors. Keep sample users, garments, outfits, and job states identical to the mobile counterparts.

A desktop page is an adaptation of the same user task. Use the extra space to reduce navigation and improve inspection, while retaining the same visual identity and action hierarchy.

## W00 — responsive application shell

```text
Design Tidywaro's full responsive signed-in web application using the approved shared design system. Implementation target is the repository's Next.js app. Keep the mobile brand: ivory, charcoal, muted plum, shared licensed fonts and type roles, icon family, garment photography, card radii, state colors, copy, and feature names. Avoid generic enterprise dashboards, analytics panels, and a separate web aesthetic.

Design 1440, 1024, 768, and 390 CSS px widths. Use these as reference canvases, with content-driven breakpoints. Proposed starting behavior: wide screens use a roughly 224 px branded sidebar and a flexible main area; intermediate widths use compact navigation when needed; narrow touch screens use the four bottom destinations. Do not show both full sidebar and bottom navigation. Keep labels Closet, Outfits, Try-On, Account in that order.

Use larger grids and master/detail layouts where they improve the task. Keep forms and reading columns comfortably constrained rather than stretching to the viewport. The public landing page can use a narrower marketing container than the signed-in wardrobe workspace. Images retain the shared 3:4 garment framing and actual result aspect ratios.

Provide real page routes and browser Back/Forward/Refresh behavior. Detail URLs open directly after authentication and do not require navigation from a parent screen. Preserve appropriate filters through URL query parameters; never put private image URLs, tokens, or personal data in browser URLs. Use persistent server job IDs for resumable work.

All controls work with keyboard and touch. Specify focus order, visible focus, semantic headings/landmarks, skip navigation, dialog focus trapping/restoration, and status announcements. Hover enhancements must have non-hover equivalents. Touch controls target 44 CSS px for this project. Verify 200% zoom and increased text without hiding actions or requiring horizontal scrolling for normal forms/content.

File upload always offers a labeled file button; drag/drop is optional. Browser camera/share capabilities need fallbacks. Do not draw mobile OS chrome into the website. Compact web adapts the product; it is not a phone mockup surrounded by blank desktop space.

Deliver desktop/intermediate/compact frames, shared component references, responsive rules, URL map, complete states, and a comparison with iOS/Android. Keep native/DOM implementations distinct while sharing tokens, data contracts, assets, and pure domain rules.
```

## W01 — Welcome and product preview

```text
Adapt shared screen 01 into a browser welcome flow. At wide widths, pair the editorial hero with a concise value proposition and actions; stack them on compact screens. Explore a Sample Closet opens a clearly labeled interactive web sample. Build My Wardrobe leads to account creation with a return destination. Keep the same headline and imagery as mobile. Do not force downloading the mobile app to use the web product.
```

## W02 — Sign in/create account

```text
Adapt shared screen 02 at /sign-in and /sign-up. Use a bounded form panel with an optional supporting image at desktop widths; retain the same branded fields/buttons on compact web. Specify labels, autofill, password-manager behavior, Enter submission, visible focus, and accessible validation. Preserve a safe internal return path after login. Do not put auth errors only in a toast that disappears before a keyboard user can read it.
```

## W03 — Verification/recovery

```text
Adapt shared screen 03 into addressable verification and recovery pages. Include a link opened in a new tab or a different browser, expired token, successful reset, resend cooldown, and already-signed-in state. Show Open Email App only with a useful fallback. On completion route to the intended app destination without a redirect loop. Keep submitted emails out of URL query strings and use the same neutral recovery wording as mobile.
```

## W04 — Closet workspace anchor

```text
Adapt shared screen 04 at /app/closet. Use the branded sidebar, page title/count, search/filter toolbar, and Add Clothes button. Let the grid expand from two columns on compact screens to a comfortable multi-column desktop grid; avoid stretching individual garment cards excessively. Show exactly the same sample items and image crops as mobile.

Support item selection without hover, keyboard focus, and return-to-grid scroll restoration. Preserve search/filters in safe URL state. Include loading, no results, empty wardrobe, cached/offline content, and retry states. No unrelated revenue charts or dashboard statistics.
```

## W05 — Filters and selection

```text
Adapt shared screen 05 into desktop filter controls and a compact filter sheet. Use labeled popovers or a panel for category/color/occasion/season. Apply and Reset behave identically across layouts. Selection shows checkboxes and an action bar; do not depend on Ctrl-click or drag selection. Escape closes a transient panel and returns focus to its trigger. Keep selected filters readable and removable at 200% zoom.
```

## W06 — Upload/import

```text
Adapt shared screen 06 at /app/closet/add. Desktop offers drag/drop plus a visible Choose Photos button, file previews, per-file progress, and a summary action. Compact web uses the file picker and offers capture only when supported. Browsers may not preserve local file handles after reload: distinguish uploaded drafts from files that must be reselected, without promising impossible persistence.

Include invalid files, repeated files, offline interruption, partial success, quota gating, and safe navigation away. Keep completed uploads; retry failed files only. Use the same capture guidance as mobile.
```

## W07 — Review tags

```text
Adapt shared screen 07 into a desktop image/form split view and a single-column compact flow. For batches, show an accessible item list or filmstrip alongside the current review; save/next controls remain predictable. Preserve editable tags, original-photo selection, and manual entry when AI fails. Display unsaved changes before internal navigation; specify browser-close warnings as best-effort behavior, not a guaranteed draft-save mechanism.
```

## W08 — Garment detail/edit

```text
Adapt shared screen 08 at /app/closet/[itemId]. Desktop uses a large image pane and a readable details/actions pane; compact web stacks them. The URL works on direct load and Refresh. An optional grid preview drawer must also provide Open Full Details and proper focus management. Keep primary/secondary actions and metadata identical to mobile. Include missing/deleted item, forbidden access without data disclosure, image failure, edit validation, and save conflicts.
```

## W09 — Outfit detail anchor

```text
Adapt shared screen 09 at /app/outfits/[outfitId]. Desktop pairs the same outfit composition with garment list, styling explanation, and Plan This Outfit. Compact web preserves the mobile reading order. Use a date/day dialog and accessible garment swap controls. Keep preview selection limited to one supported garment. Include direct URL loading, missing garments, unsaved swaps, failed save, and preservation of a previous valid outfit.
```

## W10 — Outfits hub

```text
Adapt shared screen 10 at /app/outfits. Use a roomy editorial gallery with Saved/Suggestions sections and a clear planner entry. Keep occasion controls, generation allowance, and Create an Outfit visible without making the page look like an AI chat dashboard. Suggestions load independently of saved outfits. Support keyboard/touch, deep links to details, and empty/error/limited states using the same component semantics as mobile.
```

## W11 — Weekly planner

```text
Adapt shared screen 11 at /app/planner. On wide screens show a legible seven-day board; move to a focused-day/list layout when columns become too narrow. Preserve shared garment cards and dates. Drag/drop can be an enhancement, but each assignment also has Choose Day/Move controls for keyboard and touch.

Show the current plan while replacement generates. Include week navigation, direct date links, partial plans, save conflicts from another device, and failed regeneration. Do not replace the whole week because one day was edited.
```

## W12 — Personal photo library

```text
Adapt shared screen 12 as /app/account/photos and as a reusable photo-selection dialog. Use matching photo cards, default badge, upload guide, and privacy disclosure. Offer file upload everywhere; browser camera is optional and has a denied/unavailable fallback. Separate sample models from private uploads. Include validation, processing, deletion-in-use, and expired image access. Keep delete controls available without hover and show the same account photo library used by mobile.
```

## W13 — Try-on setup

```text
Adapt shared screen 13 at /app/try-on. Desktop shows the selected personal photo and garment in two coordinated panels plus a concise credit/action summary; compact web stacks the same content. Do not use the empty output panel to imply an already generated result. The server supplies allowance and cost.

Preserve uploaded asset selections through authentication or checkout where safe. Include unsupported garment, missing photo, low credits, stale balance from another device, and duplicate-click prevention. Refresh must not start generation.
```

## W14 — Generation progress

```text
Adapt shared screen 14 at /app/try-on/jobs/[jobId]. Make the page refreshable and safe to close because processing is server-side. Use readable status copy and an indeterminate indicator; the tab title may indicate completion, but do not promise browser notifications without permission and implementation.

Include reconnecting, slow job, saving, confirmed failure, refund pending, and completion. Another tab displaying the same job must show the same state; no duplicate job should be created by opening the link. Navigation back to Closet keeps a recent-job entry available.
```

## W15 — Try-on result anchor

```text
Adapt shared screen 15 on the same durable job URL. Give the result image generous space while keeping its original aspect ratio; put source garment and actions in a restrained desktop side panel. Compact web stacks these in the same priority as mobile. Offer keyboard-accessible Before/After buttons and an optional slider.

Use Download as a browser action; Share appears only with a usable fallback. Do not create public links to private results by default. Regenerate shows its cost, while reopening/downloading is free. Include expired access refresh and download failure.
```

## W16 — Try-on history

```text
Adapt shared screen 16 at /app/try-on/history. Use a responsive gallery with consistent completed, pending, and failed cards. Provide pagination or Load More with clear focus behavior and preserve position after opening a result. Show work started from mobile as the same account-owned jobs. Add keyboard-accessible deletion/details and a recoverable unavailable-result state. Filtering or refreshing history must never submit another generation.
```

## W17 — Premium paywall

```text
Adapt shared screen 17 to a responsive web upgrade page/dialog and hosted checkout boundary. Keep the same benefits, plan names, plum emphasis, and annual-charge clarity as mobile, while showing actual web-channel pricing. Do not copy native-store purchase controls into a browser.

Retain the interrupted task in server-safe state. Show checkout unavailable, canceled, payment pending, confirming entitlement, and active states. Already-subscribed users get management/reconciliation actions rather than a second subscription. Restore is channel-specific, not a decorative universal web button.
```

## W18 — Account/privacy/deletion

```text
Adapt shared screen 18 at /app/account with bounded content panels and clear subnavigation. Keep the same account sections, labels, and destructive-action copy as mobile. On small screens collapse to a straightforward list and detail pages. Include keyboard-accessible reauthentication, deletion status, photo/data cleanup explanation, support, and sign out. Refreshing an account page should retain the current subpage without exposing account data before authentication completes.
```

## W19 — Plan and credits

```text
Adapt shared screen 19 at /app/account/billing. Display the same server-owned plan, available/reserved credits, and renewal/access-end dates as mobile. Identify the actual purchase channel: a subscription purchased elsewhere links to the appropriate management route rather than implying Stripe controls it.

For web purchases, annotate the hosted billing portal and return refresh. Include stale/offline data, payment issue, canceled-until-expiry, and reconciliation. Never offer another purchase simply because a slow request temporarily returned no entitlement.
```

## W20 — Public website and purchase return

```text
Adapt shared screen 20 at public routes distinct from /app. Public pages and the product share fonts, colors, photography, buttons, and brand voice; marketing has its own simpler navigation. Primary CTA opens the available web product; mobile downloads remain secondary unless campaign context justifies another hierarchy.

Provide desktop/compact landing, pricing, support, approved legal-content templates, and checkout success/cancel pages. A success query parameter alone does not prove entitlement. Keep users able to continue on web if Open App fails. Do not require a mobile download for a web purchase benefit.
```

## Web implementation handoff prompt

```text
Turn the approved responsive Tidywaro frames into a Next.js handoff, preserving the shared mobile design system. Specify page URLs, semantic DOM structure, component states, CSS token mappings, grid constraints, responsive behavior, accessible dialogs, keyboard interaction, and content loading. Use named design roles rather than scattering arbitrary hex values and widths. Keep fixed/sticky controls from obscuring content at small heights or browser zoom.

Map shared GarmentCard, OutfitCard, PlanOption, CreditBadge, EmptyState, ErrorState, and JobStatusCard names to web implementations. Share API schemas and pure domain rules with mobile; keep browser auth/storage/upload adapters platform-specific. Do not embed mobile private keys or provider secrets. Deliver a state/route matrix and visual comparison against the matching iOS/Android frames.
```

## Cross-platform brand audit prompt

```text
You are the design director reviewing one Tidywaro project across iOS, Android, and web. Compare the attached frames using the same user, garments, outfit, billing status, and generation state. They must look like the work of one design firm.

Create a matrix for: palette roles, font/weight hierarchy, spacing rhythm, radii, icon family, garment crop/background, primary action treatment, navigation terminology, tone, and loading/error/credit semantics. Identify accidental differences separately from justified adaptations such as desktop sidebar, mobile bottom navigation, Android Back, browser URLs, and native system sheets.

For each accidental difference, name the canonical shared component/token and propagate one correction to all affected frames. Do not average incompatible styles or redesign one platform independently. Finish with a contact sheet of Closet, Outfit Detail, Try-On Setup/Result, and Paywall at all three platforms plus compact web. Explain any remaining differences and confirm the approved design-system version used.
```
