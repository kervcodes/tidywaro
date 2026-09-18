# Tidywaro — reusable screen design prompts

Selected direction: warm editorial with ivory, charcoal, and muted plum. Prepared September 16, 2026.

This is the shared source of truth for iOS, Android, and the responsive web application. Use prompt 00 first. For each subsequent request, include the master brief, approved anchor-screen references, the relevant numbered screen prompt, and its platform companion below. Generate one screen family per request. Keep the same design file/project and component library across iterations.

- iOS: use the shared screen prompt with the iOS platform rules in prompt 00.
- Android: append the matching A01–A20 prompt from [the Android library](04-Tidywaro-Android-Design-Prompts.md).
- Web: append the matching W01–W20 prompt from [the web library](05-Tidywaro-Web-Design-Prompts.md), including its application-shell prompt W00.

Example: master 00 + shared 04 + Android A04 creates the Android Closet. Master 00 + shared 04 + web W00/W04 creates the web Closet. The platform companions adapt the shared brief; they do not replace its product behavior, states, or visual identity.

These prompts describe intended design outputs. Tool capabilities vary: Claude or another prototyping tool can explore interaction; Figma can hold editable specifications; Higgsfield or an image tool can produce separate editorial assets. Do not treat generated screenshots or prototype web code as production React Native code.

## Prompt 00 — master brief and design system

```text
Act as the lead designer of one design firm delivering Tidywaro as a single product across iOS, Android, and responsive web. Mobile uses React Native/Expo; web uses the existing Next.js application. Give all three platforms equal design attention. Design a production-feasible experience for people who want to organize clothes they already own, make outfits, plan a week, and preview individual garments on themselves.

The selected visual direction is warm editorial: quiet luxury, clear hierarchy, real clothing photography, generous but useful space. Make it welcoming across genders, body shapes, ages, and skin tones. Avoid stereotyped pink-for-women/blue-for-men categories.

Starting tokens:
Canvas #F7F3ED; surfaces #FFFDFA; primary text #252320; secondary text #625B56; plum accent #6E485D; border #DDD4CB; success #35624B; error #9B3434. Validate contrast and adjust semantic tokens when needed. No decorative purple-pink gradients or glass cards everywhere.

Choose one appropriately licensed sans-serif family for product typography across platforms, with native-system fallbacks. Explore one editorial serif for large headings only. Bundle/subset fonts appropriately; layouts must remain usable before web fonts load. Freeze the same family, weight hierarchy, line-height intent, and semantic type roles across platforms. Use a 4-unit spacing scale; start body/supporting/heading roles at 16/14/24–32 logical units. Touch targets: at least 44 pt on iOS, 48 dp on Android, and a project target of 44 CSS px for primary touch controls on web. Font sizes must respond to user accessibility settings. Garment photos use consistent 3:4 frames; preserve complete silhouettes.

Shared navigation labels and order: Closet, Outfits, Try-On, Account. Closet is the returning-user home. Add Clothes is a prominent action within Closet. iOS and compact Android use a bottom tab/navigation bar respecting native insets. Desktop web uses a branded left sidebar with the same destinations; compact web uses a touch-friendly bottom navigation. Focused capture, editing, and checkout flows may hide navigation when the next/back actions remain obvious. Give browser pages meaningful URLs and Back behavior. Native permission dialogs, pickers, sharing, and billing surfaces should look native; branded app surfaces should visibly belong to the same project.

Create platform comparison frames: iOS at 390 × 844 pt and 375 × 667 pt; Android at 360 × 800 dp and 412 × 915 dp; web at 1440, 1024, 768, and 390 CSS px widths. These are representative design canvases, not mandatory device dimensions or hard-coded layouts. Validate increased text size, keyboard visibility, browser zoom, and content-driven reflow. Launch light mode with accessible tokens and reduced-motion alternatives.

Build reusable components: Button (primary, secondary, quiet, destructive), labeled TextField, ScreenHeader, GarmentCard, OutfitCard, FilterChip, BottomSheet, EmptyState, ErrorState, Skeleton, CreditBadge, JobStatusCard, PhotoCard, and PlanOption. Specify default, pressed, disabled, loading, selected, focused, and error variants where appropriate. Use one coherent icon family. Motion should generally last 150–250 ms and must never delay completion feedback.

For each requested screen deliver:
1. High-fidelity main state with realistic sample content.
2. Relevant empty/loading/error/offline/permission/limited states as separate named frames.
3. An interaction map covering every visible action and its destination.
4. Component/token references, spacing, typography, image behavior, safe-area/keyboard rules, and accessibility annotations.
5. A brief explanation of the primary action and the information hierarchy.
6. Side-by-side iOS, Android, and web counterparts with a table explaining intentional platform differences.

Keep identical across platforms: color roles, typography roles, icon family, radii, photo treatment, core copy, navigation names, feature terminology, credit semantics, and state meaning. Adapt only layout density, navigation container, input methods, safe areas, and native integrations. Do not invent a new palette, a Material-template look for Android, or a generic SaaS dashboard look for web. Use shared specimen data so visual comparisons show the same garments, outfits, user, and job states.

If editable design is supported, use named components, Auto Layout, and variants. If producing a coded prototype, keep components reusable and clearly mark fixture data. Otherwise provide annotated reference frames and a handoff specification. Do not claim unsupported tooling actions were performed.

Product constraints: Free and Premium only; no invented trials, reviews, badges, or testimonials. Prices and credit allowances are sample variables until connected to billing. Virtual try-on is an AI styling preview, not a size/fit guarantee. Launch try-on supports one garment at a time. A generated example is illustrative until replaced by a benchmark-approved real result.

First produce the design system and two restrained variations of the Closet, Outfit Detail, and Try-On Result anchor screens. Show each variation across all three platforms. Keep both within the selected color direction. Recommend one coherent set; do not combine unrelated styles. Name the approved system version and carry that version into all subsequent screen requests.
```

## 01 — Welcome and onboarding

```text
Using the Tidywaro master brief, design a short welcome flow. Lead with “More outfits. From what you own.” Show a realistic garment arrangement and an example saved outfit. Explain Organize → Style → Preview in a single compact sequence, not three mandatory marketing carousels.

Primary action: “Build my wardrobe.” Secondary action: “Explore a sample closet.” Existing-account link: “Sign in.” The sample closet is clearly labeled and uses curated examples. Real personal uploads require sign-in. Request camera/library permissions only when that action is chosen.

Include first visit, sample exploration, and returning signed-out states. After sign-up, route directly to adding the first garment. Avoid a mandatory avatar-selection step. Deliver the linked flow and a compact first-item checklist rather than a tutorial users must remember.
```

## 02 — Sign in and create account

```text
Design distinct but visually related Sign In and Create Account screens. Keep the title, benefit, labeled email/password fields, password visibility control, one primary button, and mode-switch link. Add “Forgot password?” to sign-in. Explain password requirements before submission. Only show social sign-in methods when marked implemented in the supplied product context.

Show idle, keyboard-visible, submitting, invalid email, wrong password, network failure, and completed account creation. Preserve typed email and pending navigation intent after failure. Put errors beside affected fields; use a general banner only for service failures. Include terms/privacy links with real destination placeholders in the prototype specification. No fake successful authentication.
```

## 03 — Verification and account recovery

```text
Design email verification, resend confirmation, forgot password, and set-new-password screens. Verification shows a masked email, “Open email app,” “Resend email,” and “Use another email.” Explain the next step without claiming verification before the server confirms it.

Include resend cooldown, expired link, invalid link, offline, password mismatch, reset success, and a link opened while the app is closed. Recovery submission should use neutral wording that does not expose whether an account exists. Keep a clear way back to sign-in and resume the user's interrupted action after successful authentication.
```

## 04 — Closet/home anchor

```text
Design Tidywaro's default Closet tab. Header: “Your closet,” item count, and a quiet account shortcut. Show a search field, compact category filters, and a two-column garment grid with 3:4 image surfaces. Each card shows the garment, readable name, and one useful secondary attribute. Use realistic sample items: ivory linen shirt, navy straight-leg jeans, olive overshirt, black dress, white sneakers.

Make “Add clothes” prominent and thumb reachable without covering the last grid row. Show a quiet free-plan usage indicator; do not let upselling dominate the page. Tap an item for details. Preserve scroll/filter state after returning.

Design populated, first-use empty with Add CTA, no search results with Clear filters, skeleton, offline with saved content, and fetch-error with Retry states. Search controls and error messages must remain visible even when image loading fails.
```

## 05 — Search, filters, and selection

```text
Design Closet search and its filter bottom sheet. Filters: category, color, season, and occasion. Support multiple selections with visible selected states and a result count. Primary action: “Show [count] items.” Include Reset and Close, preserving previously applied values if the user dismisses without applying.

Add garment multi-selection for building an outfit, with a selected count and “Create outfit.” Do not imply multi-item selection is automatically supported by try-on. Include no matches, loading results, long color/category names, and large-text layouts. Use accessibility-selected states in the specification, not color alone.
```

## 06 — Add clothes and capture

```text
Design the Add Clothes flow with camera and photo-library choices, a small example of a good clothing photo, and concise advice: one garment, good light, whole item visible. Support both a single item and a batch of selected photos.

After selection, show previews with Remove/Replace and one primary “Add [count] items” action. Show how many available free-plan slots remain before upload; preserve selected files if an upgrade is needed. Include permission denied with Settings guidance, canceled selection, unsupported file, oversized file, upload progress, and partial-batch failure with retry only for failed items.

Keep upload byte progress separate from AI processing. Do not invent a numeric processing percentage. The user should never have to reselect successful uploads because another item failed.
```

## 07 — Review clothing and AI tags

```text
Design the post-upload review screen. Put the garment image first, then editable name, category, color, season, and occasion. Show “Suggested by AI” subtly for inferred tags. Uncertain fields remain editable suggestions, not authoritative claims. Include “Use original photo” when background removal cuts off clothing details.

Primary action: “Save to closet.” Secondary: replace image. For a batch, use an item counter and clear next/previous controls with draft preservation. Include processing, successful suggestions, AI unavailable with manual entry, invalid required field, unsaved edits, and saving failure states. Keep completed clothing upload useful even if AI tagging fails.
```

## 08 — Garment detail and edit

```text
Design a garment detail screen with a large complete garment photo, editable name, category/color tags, and a short useful description. Primary action: “Add to outfit.” Secondary: “Preview on me,” available only for supported garment types. Unsupported types should explain what is supported.

Put Edit, Replace image, and Delete in a clear secondary menu. Include editable fields, save/cancel behavior, missing image, failed load, saving, and deletion confirmation. Do not show brand, material, or wear counts as facts unless the data actually exists. Preserve the original photo alongside its processed thumbnail. Deleting an item must explain its effect on saved outfits.
```

## 09 — Outfit detail anchor

```text
Design an editorial Outfit Detail screen using items from the user's closet. Show a tasteful garment composition without pretending it is a realistic on-body preview. Include outfit name, occasion, a short styling explanation, and the individual garment cards below.

Primary action: “Plan this outfit.” Secondary actions: save, swap one item, and preview a supported garment on me. If the user chooses preview from a full outfit, open a garment chooser with “Choose one item to preview.” Do not silently chain multiple generations.

Show an existing saved outfit, generated suggestion awaiting save, missing/deleted garment, failed swap, and unsaved changes. Make AI explanations concise and avoid body-shaming or invented weather data. Design the Plan action as a day-selection sheet.
```

## 10 — Outfits hub / Style AI

```text
Design the Outfits tab with “Saved” and “Suggestions” sections, a compact weekly-plan entry, and one primary “Create an outfit” action. A small occasion selector can guide a suggestion. Display garment imagery rather than a chat interface or decorative AI orb.

Include not enough clothes with a precise next step, first suggestion, generating, generation failed while saved outfits remain visible, exhausted allowance, and successful save. Show a usage preview before a billable generation. Repeated refresh must not look free when it consumes an allowance. Separate generated suggestions from outfits the user has deliberately saved.
```

## 11 — Weekly planner

```text
Design a weekly outfit planner reachable from Outfits. Use a readable week strip and day cards with garment thumbnails, occasion, and Edit. Let users assign a saved outfit or request a suggestion. Include a date picker without forcing a dense monthly calendar onto the main screen.

Primary action on an empty week: “Plan my week.” On a populated week, prioritize today and editing one day. Regeneration must specify which days are replaced and retain the old plan while a new suggestion loads. Show empty, populated, partial week, loading, failed regeneration, and save-conflict states. Never imply a user's old plan disappears just because generation failed.
```

## 12 — Personal photo library / model selection

```text
Unify personal-photo management and model selection into one flow. Lead with “Choose your photo,” with private photo cards, a default badge, Add photo, Replace, and Delete. If sample models are offered, place them in a separate “Try a sample” section and clearly identify them as samples. Do not force binary gender selection.

Provide a concise capture guide: good light, one adult person, whole garment area visible, neutral pose, arms slightly separated from torso where possible. Include examples of cropped/obstructed inputs without judging appearance. Explain who processes photos using a short disclosure and a Details link.

Design no photo, permission denied, uploading, validation failed, valid selection, maximum photo count, and deletion-in-use states. Default selection must be tied to an account, not a device-local file URI.
```

## 13 — Try-on setup

```text
Design a focused single-garment try-on setup. Present two large labeled choices: “Your photo” and “Clothing item.” Show the selected photo and garment together, with Change actions. Supported initial categories are tops, bottoms, and one-piece garments, subject to the final quality benchmark.

Bottom action: “Generate preview · 1 credit” using a configurable credit cost, not a hard-coded commercial promise. Show available credits and a short statement that this is an AI styling preview, not a fit guarantee. Do not expose model names or provider settings to customers.

Include missing input, invalid photo, unsupported item, zero credits with contextual upgrade, offline, and ready states. Preserve choices after an upgrade. Confirm the cost before submission; prevent repeated taps while the job is being created.
```

## 14 — Generation progress and recovery

```text
Design a durable try-on progress screen with the submitted photo/garment thumbnails and a clear status: Waiting, Creating your preview, or Saving your preview. Show an honest indeterminate loader; only display a time estimate after measurement supports it.

Tell users “You can leave this screen. Your preview will appear in History.” Offer “Back to closet.” Do not promise push notifications unless implemented. Provide a status card that reappears when the app resumes.

Design queued, generating, reconnecting, unusually slow, saving, completed, and failed states. Say “Credit restored” only after server confirmation; otherwise show “Restoring your credit.” Cancellation is available only before provider submission if supported; after submission, leaving the screen is not cancellation.
```

## 15 — Try-on result anchor

```text
Design the Try-On Result anchor screen with a large portrait preview, subtle “AI preview” label, and an accessible Before/After toggle. A comparison slider can be secondary, never the only way to compare. Preserve the actual output aspect ratio and allow zoom without hiding all navigation.

Primary action: “Save to device.” The result is already saved to account history when this screen opens. Secondary actions: share, choose another garment, report a problem, and delete. Regenerate explicitly displays its credit cost and is a new request.

Include image loading, expired-access link being refreshed, download permission failure, poor-result feedback, failed save to device, and unavailable/deleted result states. Use “AI preview; actual fit may differ.” In the prototype, label any invented preview as illustrative rather than showing it as proof of model quality.
```

## 16 — Try-on history

```text
Design Try-On history as a calm gallery of completed previews with pending/failed cards in context. Each card shows date, garment thumbnail/name, and status. Tap a completed card for result details; tap a pending card for progress. Failed cards show whether credits were restored and the next action.

Include empty history with Generate CTA, mixed states, pagination/loading more, offline cached previews, deleted garment reference, and delete result. Do not make app restart lose a pending job. Prefer clear textual status over small color-only dots. Deletion should remove the result from the gallery promptly while indicating any pending cleanup honestly.
```

## 17 — Contextual Premium paywall

```text
Design a Premium paywall that changes its introduction according to context: wardrobe full, styling allowance exhausted, or no preview credits. Preserve the interrupted action underneath it. Use three concrete benefits, monthly/annual choices, actual charge amount, billing period, and a single Subscribe button.

Treat prices and allowances as variables supplied by billing; sample values must be labeled in the design specification. Annual pricing must show the full annual charge clearly even if a monthly equivalent is included. No trial CTA unless eligibility is confirmed. Include Restore Purchases when native IAP is used, Manage Plan for current subscribers, and terms/privacy links.

Show loading prices, purchase pending, canceled purchase, payment failed, restore complete, and server confirmation pending. Keep Close visible. Never announce Premium based only on a browser redirect.
```

## 18 — Account, privacy, and deletion

```text
Design Account as a clear utility screen: profile/email, plan and allowances, My photos, privacy/data, support, and sign out. Put subscription management here even when users have not hit a limit. Group destructive actions separately without making them undiscoverable.

Design connected screens for photo retention controls, account deletion, and contact support with an optional non-sensitive job reference. Account deletion requires reauthentication where appropriate and clear explanation of data cleanup. State separately whether a subscription must be managed through the purchase provider; do not imply deleting the app cancels billing.

Include loading account data, stale/offline allowances, deletion requested, cleanup pending, deletion failure, and signed-out states. Use approved privacy wording; do not invent legal guarantees.
```

## 19 — Plan and credit management

```text
Design a plan-management screen showing current plan, purchase provider, exact renewal or access-end date, included allowance, available credits, and the next confirmed reset date. Keep provider billing controls accessible. A canceled plan says “Access ends,” not “Renews.”

Include free, active, trial only if actually offered, canceled-until-expiry, payment issue, expired, and reconciliation-pending states. Show a readable usage history when available. Do not display credits as available while they are reserved for running jobs. Additional-credit purchases are a future feature and must not appear as a working launch action unless implemented.
```

## 20 — Public website and purchase return

```text
Design the Tidywaro public website in the same editorial identity at mobile and desktop widths. Hero: “More outfits. From what you own.” Show actual app screens, then three short sections: organize your wardrobe, plan outfits, preview a garment. Use “Open Tidywaro” or “Start your wardrobe” for the available web application, with download or beta-signup actions matching mobile launch status. Do not invent store badges, user counts, or testimonials. This marketing page is separate from the signed-in web application defined by prompts W00–W19.

Include transparent pricing/allowance information, FAQ, support, privacy, and terms destinations. Try-on examples must come from validated product output before publication. Use a content width around 1152 px, responsive columns, meaningful image alt text, and visible keyboard focus.

Also design purchase-return states if web checkout is used: confirming, confirmed with Open App, canceled, and confirmation delayed. The page must remain useful if the app cannot open. Legal-page body text comes from approved content rather than invented policy language.
```

## Asset prompt A — onboarding photography

```text
Create one editorial still-life photograph for a wardrobe app called Tidywaro. A thoughtfully arranged ivory linen shirt, navy denim, olive overshirt, and simple white sneakers on a warm matte ivory surface. Soft natural window light, true fabric texture, gentle shadows, believable proportions, generous negative space in the upper third for separately added UI text. Quiet, welcoming, contemporary fashion editorial direction. Vertical 4:5 composition. No text, logos, watermarks, app screens, hands, or invented brand marks. Supply the image as a standalone asset, not embedded in a phone mockup.
```

## Asset prompt B — realistic garment fixtures

```text
Create a cohesive set of individual garment reference photographs for a prototype wardrobe: ivory linen shirt, navy straight-leg jeans, olive overshirt, black midi dress, cream knit sweater, and white sneakers. Generate each as a separate image with the complete garment visible, neutral warm background, consistent soft light, natural texture, centered composition, and no logos/text. Keep silhouettes and construction plausible. These are prototype assets, not evidence of the app's AI accuracy. Provide a consistent 3:4 crop for display while retaining an uncropped source.
```

## Asset prompt C — optional sample adult model

```text
Create a photorealistic fictional adult sample person for a wardrobe prototype. Neutral standing pose, relaxed expression, arms slightly separated from the torso, plain fitted everyday base clothing, visible head and feet, simple warm-gray studio background, soft even light, realistic anatomy and skin texture. Do not beautify or exaggerate body proportions. No text, logos, accessories covering the torso, or dramatic poses. Portrait 2:3 image. Produce a diverse sample set as separate assets with consistent framing. Clearly identify these as fictional sample models in the product; do not present them as a user's own photo.
```

Use consented real photos for the actual try-on evaluation. Synthetic samples do not replace testing on realistic user inputs.

## Asset prompt D — optional marketing motion, after real results exist

```text
Create a restrained 6-second vertical editorial background clip: a neat rail of neutral-toned clothing in soft daylight, subtle camera motion, natural fabric movement, warm ivory and charcoal palette, uncluttered composition, space for separately composited app screenshots. No generated interface, text, logos, body transformation, or before/after try-on claim. Keep motion subtle and provide a still poster frame. This is decorative marketing imagery, not a demonstration of product performance.
```

## Review prompt — critique without restarting the design

```text
Review these Tidywaro frames against the attached master brief and user journeys. Identify the five most consequential problems in task clarity, visual consistency, accessibility, state coverage, or implementation feasibility. Cite the exact frame/component. Explain the user consequence and propose a precise revision. Preserve the selected warm editorial direction. Do not introduce a new aesthetic or new product features.

Check every primary action, Back/Close path, photo/privacy disclosure, price/credit claim, and failure state. Distinguish a measured defect from a subjective preference. Revise the affected components first, then propagate changes to screens. Return a short acceptance checklist and the updated linked flow.
```

## Handoff prompt — design to implementation specification

```text
Convert the approved Tidywaro designs into paired React Native/Expo and Next.js implementation handoffs. For each screen list route parameters or web URLs, components, token usage, flexible layout rules, typography, image sizing, safe-area and keyboard behavior, accessibility labels, and state transitions. Separate fixture values from real API data. Identify shared design decisions and platform-specific rendering. Assets and semantic tokens belong to one versioned system; do not force one rendering component to support incompatible native and DOM behavior. List every visible action and its intended handler/destination.

Provide a cross-platform state matrix and small-screen/large-text/keyboard/browser-zoom checklist. Do not output HTML/CSS as though it were React Native. Do not add networking, authentication, payments, or model-provider logic to presentation components. Flag any design whose behavior depends on an unimplemented backend contract. Use the same component names and design token roles in both handoffs so another engineer can compare them directly.
```
