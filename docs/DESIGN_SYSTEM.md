# Tidywaro Design System

The application uses a consistent premium design system with modern gradients, glassmorphism, and carefully selected typography.

## Colors

### Primary Gradient
Used for main actions, buttons, and brand headers.
- **Start**: `#8B5CF6` (Vibrant Purple)
- **End**: `#EC4899` (Hot Pink)
- **Solid**: `#A855F7` (Fallback)

### Secondary Gradient
Used for accents and secondary actions.
- **Start**: `#F59E0B` (Amber)
- **End**: `#EF4444` (Red)
- **Solid**: `#F97316` (Orange)

### Neutrals (Warm Grays)
Range from `#FAFAF9` (50) to `#1C1917` (900).

### Semantic Colors
- **Success**: `#10B981`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`
- **Info**: `#3B82F6`

### Glassmorphism
- **Background**: `rgba(255, 255, 255, 0.7)`
- **Border**: `rgba(255, 255, 255, 0.3)`

## Typography

### Font Families
- **Headings**: `Outfit` (Modern, geometric sans-serif)
- **Body**: `Inter` (Clean, readable sans-serif)

### Scale
From `xs` (12px) to `5xl` (48px), based on an 8px scale.

## Spacing & Layout

Spacing follows a 4px grid system:
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- ...up to `6xl`: 64px

## Shadows

Consistent shadow depth system:
- `sm`: Minimal elevation
- `md`: Standard elevation
- `lg`: Floating elements
- `xl`: High elevation (modals, drawers)

## Implementation

The design system is implemented in `apps/mobile/src/styles/theme.ts` and exported as a `theme` object.
