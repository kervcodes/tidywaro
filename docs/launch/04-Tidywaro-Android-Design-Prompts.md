# Tidywaro — Android design prompt library

Companion to [the shared design system and screen prompts](02-Tidywaro-Screen-Design-Prompts.md). Android is an equal product surface. Every request uses the same approved brand system as iOS and web.

## How to use

Paste shared master prompt 00, the matching shared screen prompt, Android A00 below, and its A01–A20 companion. Attach the approved iOS/web counterpart and the current design-system version. For the first pass, request A04, A09, and A15 together to establish Android anchor screens.

These are additive instructions. All states, accessibility requirements, and product constraints from the shared prompt still apply. A native dialog may differ from its iOS equivalent; the surrounding Tidywaro screen must remain recognizably the same design.

## A00 — Android platform brief

```text
Adapt the attached shared Tidywaro screen to Android using the approved cross-platform design system. Keep the same warm ivory canvas, charcoal type, muted-plum action color, licensed product fonts, icon family, image framing, component names, content hierarchy, and exact product terminology as the iOS and web references.

Use Android-appropriate interactions and system surfaces without restyling the product as an unrelated Material template. Target 360 × 800 dp and 412 × 915 dp representative canvases; include expanded-width behavior when relevant. Use 48 dp minimum interactive areas, font scaling, native window/keyboard insets, and layouts that survive gesture or button system navigation. Draw branded content safely around system bars. Do not hard-code a universal bottom offset.

Compact navigation has Closet, Outfits, Try-On, Account in that order. Preserve each destination's state. Define system Back behavior: dismiss keyboard/sheet first where appropriate, then return to the previous screen; protect unsaved work without trapping the user. Do not simulate an iOS navigation bar, permission dialog, photo picker, or purchase sheet. Show Android-native integrations as annotated system boundaries rather than drawing invented OS UI.

Every action must work by touch and TalkBack. Never make a swipe the only route to an essential action. Keep app copy, credit amounts, sample garments, job status, and plan states aligned with the counterpart frames. Dynamic OS color must not replace the approved Tidywaro palette in branded surfaces.

Deliver named Android frames, main and exception states, interaction/Back map, component-token references, and a side-by-side counterpart comparison. Explain each intentional platform difference. Do not change product scope or add Android-only features without marking them as proposals.
```

## A01 — Welcome and onboarding

```text
Adapt shared screen 01 to Android. Keep the same hero asset, headline, sample closet, and action order. Fit the smaller height without clipping CTAs or forcing text over photography. Back from sample exploration returns to welcome; Back after sign-up must not re-enter a stale auth form. Ask for camera/library access only in the later capture flow. Show a long-text variant.
```

## A02 — Sign in and create account

```text
Adapt shared screen 02. Annotate Android email/password autofill, secure entry, IME Next/Done actions, and keyboard resize behavior. Retain shared field styling and inline errors. Back dismisses the keyboard without erasing form values. Prevent duplicate submission. Provide TalkBack labels for visibility controls and errors. Do not add an unimplemented Google sign-in button merely because this is Android.
```

## A03 — Verification and recovery

```text
Adapt shared screen 03. Show email-app opening with a fallback when no email app is available. Annotate verified-link routing, cold start, and a link opened while signed into a different account. Keep expired-link recovery and resend behavior consistent with iOS/web. Back to sign-in preserves the relevant email but never retains password reset tokens in visible navigation.
```

## A04 — Closet/home anchor

```text
Adapt shared screen 04 using the exact same garment fixtures and selected filters as the other platforms. Use a two-column compact grid and a branded Add Clothes action above system/navigation insets. Keep a 48 dp tap area around small icons. Add a tablet/expanded-width grid variant that preserves comfortable card widths. Annotate scroll restoration, TalkBack card order, and image-failure placeholders.
```

## A05 — Search, filters, and selection

```text
Adapt shared screen 05. Use a filter sheet with inset-aware scrolling and persistent Apply/Reset controls. Back dismisses the sheet without applying draft filter edits. Search handles IME Search and Clear. Selection mode shows count and Create Outfit with an explicit Exit Selection action; long-press can be optional, never the only entry. Keep selected state identifiable beyond color.
```

## A06 — Add clothes and capture

```text
Adapt shared screen 06 around Android camera/photo-picker integrations. Distinguish denied camera permission, canceled selection, and a photo that cannot be read. Persist drafts through interruptions where technically supported and describe recovery when temporary access is lost. Keep successful batch items while retrying failures. Avoid broad storage-permission prompts invented by the design; annotate the permission needed by the implemented picker.
```

## A07 — Clothing review and AI tags

```text
Adapt shared screen 07 with a scrollable image/form and a Save action above the keyboard. Chip editing and dropdown choices use accessible sheets or menus with the shared visual tokens. Back from unsaved edits offers Keep Editing or Discard. Include a landscape/expanded view where the image and form can sit side by side without changing field order or meaning.
```

## A08 — Garment detail/edit

```text
Adapt shared screen 08. Preserve the large complete garment image and Add to Outfit/Preview hierarchy. Use an accessible overflow menu with explicit Edit/Replace/Delete. Back from edit protects changes; Back from saved detail returns to the same Closet position. Render long item names and enlarged text without pushing essential actions underneath navigation. Keep destructive confirmation copy identical across platforms.
```

## A09 — Outfit detail anchor

```text
Adapt shared screen 09 with the same outfit composition, garment order, name, and occasion as iOS/web. Use a bottom day-selection sheet for Plan This Outfit. The preview chooser clearly selects one garment. Back from either sheet leaves the outfit unchanged. Make item swapping accessible without drag gestures and preserve draft changes through a temporary navigation interruption.
```

## A10 — Outfits hub

```text
Adapt shared screen 10 with Saved/Suggestions sections and the same generation-allowance language. Maintain tab scroll position and expose loading/error state through TalkBack without repeatedly announcing every refresh. Place the primary create action within comfortable thumb reach. Show the old saved outfits while generation is pending. Android system Back should not accidentally trigger another generation.
```

## A11 — Weekly planner

```text
Adapt shared screen 11. Compact width shows a week strip and focused-day cards; expanded width may show more days side by side. Preserve day order, date labels, and garment imagery. Provide date selection and Move to Day buttons as alternatives to swipes/dragging. Back from a tentative reassignment restores the previous assignment. Use native date selection only at the OS boundary.
```

## A12 — Personal photo library

```text
Adapt shared screen 12 using native picker/camera boundaries and branded photo cards. Set default through an explicit labeled control, not just a long press. Annotate uploaded versus still-local states, revoked input access, upload retry, and deletion while a job is running. Keep sample models clearly separate from the user's private photos. System Back must not imply upload completion.
```

## A13 — Try-on setup

```text
Adapt shared screen 13 with matching person/garment selectors and the same server-supplied credit cost. Keep Generate above navigation insets and disabled until inputs are valid. Retain selections after Android purchase/app switching. Include process recreation: restore persisted selections when available or explain what needs reselecting. Do not treat a local photo URI as an uploaded asset.
```

## A14 — Generation progress

```text
Adapt shared screen 14. Android Back or switching apps leaves the durable job running; make that clear without a blocking “Do not leave” dialog. Show resumed, reconnecting, long-running, and refund-pending states. Do not add a foreground-service notification or promise push alerts unless implementation requires/supports it. History and the progress screen must show the same job status.
```

## A15 — Try-on result anchor

```text
Adapt shared screen 15 with the same generated image and Before/After labels as other platforms. Annotate native share/download behavior, unsupported save destination, and retry. Provide an accessible toggle even if a draggable comparison is present. Back preserves the result in History. Enlargement must have an obvious close control and not conflict with system Back. Keep credit-bearing Regenerate separate from free Download.
```

## A16 — Try-on history

```text
Adapt shared screen 16. Preserve scroll and pagination across tabs. Pending, failed, and completed cards share the same visual/status language as iOS/web. Re-entering the app refreshes job states without generating again. Add explicit delete/details actions accessible without swipe. Show credits restored only from confirmed server data, including after process restart.
```

## A17 — Premium paywall

```text
Adapt shared screen 17 to the approved Android purchase channel. Annotate the real platform billing boundary; do not imitate an Apple purchase sheet. Keep branded plan cards and benefits identical, while displaying localized provider prices and Android-appropriate billing labels. Include pending, canceled, unavailable billing, restore/recheck, and server-confirmation states. Back keeps the interrupted upload/try-on draft intact.
```

## A18 — Account, privacy, deletion

```text
Adapt shared screen 18 with the same sections and labels. Distinguish Android permissions settings from Tidywaro data/privacy controls. Provide accessible touch targets for compact rows and a reauthentication flow for sensitive actions. If an external support/mail action is unavailable, provide a usable fallback. Deletion does not silently imply subscription cancellation. Respect system Back through nested settings pages.
```

## A19 — Plan and credits

```text
Adapt shared screen 19. Label the actual purchase provider. Keep allowance, reservations, renewal/access-end dates, and payment state identical to the backend and other devices. Return from an external billing surface refreshes status with a visible pending state when needed. Offer a fallback if that surface cannot open. Do not present a new purchase CTA when the user already has a plan that is still being reconciled.
```

## A20 — Public entry and purchase return

```text
Adapt shared screen 20 for a visitor using an Android browser or returning to the Android app. The responsive public page retains the same web brand; avoid an unnecessary in-app copy of the marketing page. Open App has a useful browser fallback, and mobile download badges reflect real release availability. Model the browser-to-app return, cold start, canceled checkout, and delayed entitlement without falsely announcing activation.
```

## Android consistency check — append before approval

```text
Compare this Android flow against the approved iOS and web references from the same design-system version. Check palette, typography roles, component radii, icon family, garment crop, spacing rhythm, product copy, action hierarchy, and all credit/plan states. List only intentional platform differences separately: system Back, native picker/permissions/billing, keyboard/insets, and responsive layout.

Revise any accidental visual drift through shared components. Verify 48 dp interaction areas, TalkBack order, large text, keyboard visibility, and gesture/button-navigation insets. Return a side-by-side contact sheet using identical content and a pass/fail checklist. Do not redesign the Android brand independently.
```
