# Tidywaro — one project, three platforms

The library now covers **iOS, Android, and the full responsive web application**. Every platform uses the selected warm editorial identity: ivory, charcoal, muted plum, consistent typography, garment photography, and product language.

## Library

| Document | Use |
|---|---|
| [Shared design system and screens](02-Tidywaro-Screen-Design-Prompts.md) | Start here for master prompt 00 and shared screens 01–20 |
| [Android companions](04-Tidywaro-Android-Design-Prompts.md) | Add A00 and the matching A01–A20 prompt |
| [Web companions](05-Tidywaro-Web-Design-Prompts.md) | Add W00 and the matching W01–W20 prompt |
| [UI-first build plan](01-Tidywaro-UI-First-Build-Plan.md) | Ordered phases, screen migration, and completion gates |
| [Try-on and engineering playbook](03-Tidywaro-Try-On-and-Engineering-Playbook.md) | Model evaluation, common backend, contracts, and AI implementation briefs |

## The prompt recipe

**Shared master 00 + shared screen number + platform companion + approved reference frames.**

Examples:

- iOS Closet: shared master 00 + shared 04, using the master's iOS rules.
- Android Closet: shared master 00 + shared 04 + A00 + A04.
- Web Closet: shared master 00 + shared 04 + W00 + W04.

Screen numbers match across all libraries. For Android and web, the platform prompt changes layout/interactions without dropping the shared screen's states or requirements. Request only the current target's detailed frames during individual screen work; include the approved other-platform counterparts for comparison. The master requires all-platform comparison frames when establishing or reviewing a screen family.

## First design session

Run shared master 00 to establish two restrained variations of the same selected direction. Produce Closet (04), Outfit Detail (09), and Try-On Result (15) for iOS, Android, desktop web, and compact web. Compare these anchors together before extending the design to other screens.

Name the chosen set `Tidywaro Design System v1`. This is the canonical reference for subsequent work; it is a proposed name, not a claim that the system has already been designed. Save the chosen frames, tokens, assets, sample content, and short decision notes in the same project. Each generation request names that version and attaches the matching references.

## Keep the design together

Shared decisions: palette roles, fonts/type hierarchy, icon family, spacing rhythm, card radii, photo treatment, component styling, navigation labels, voice, and state meanings.

Intentional differences: desktop sidebar versus mobile bottom navigation, responsive grid density, Android Back, iOS gestures, browser history/focus, native pickers, and platform billing surfaces.

Use the same sample wardrobe and job/plan states in comparisons. An accidental difference is corrected in the canonical component first and then propagated to affected platforms. If a change is intentionally platform-specific, document why it improves that platform's interaction rather than quietly creating a second brand.

Run the cross-platform brand audit at the end of the web library before accepting each screen family. The result should feel commissioned from one design firm as one product, with thoughtful adaptations for each device.
