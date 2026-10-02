---
name: Serene Fellowship
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#444651'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#193000'
  on-tertiary: '#ffffff'
  tertiary-container: '#294800'
  on-tertiary-container: '#87bb4b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#bbf37c'
  tertiary-fixed-dim: '#a0d663'
  on-tertiary-fixed: '#0f2000'
  on-tertiary-fixed-variant: '#2e4f00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies a tranquil, modern, and faith-centered social ecosystem. The brand personality balances contemporary digital social patterns with reverence, warmth, and pastoral reassurance. Designed mobile-first for contemplative reading, uplifting exchange, and community cohesion, the interface avoids the visual hyperactivity of conventional social feeds in favor of stillness, clarity, and intentionality.

The design movement combines **Minimalism** with **Organic Tactility**:
- **Generous negative space:** Uncluttered layouts facilitate reflective scripture reading, devotionals, and prayer requests.
- **Warm organic canvas:** Replaces stark clinical whites with gentle alabaster and linen tones to reduce optical fatigue during extended study or communion.
- **Accented reverence:** Deliberate placements of deep cerulean royal blue instill confidence and institutional trust, balanced by solar amber highlights that suggest spiritual warmth and illumination.
- **Restrained micro-architecture:** 1px hairline dividers and diffused ambient lighting ground elements naturally on hand-held surfaces, prioritizing content and message over ornamentation.

## Colors

The palette establishes an atmosphere of spiritual peace, warmth, and fellowship through precise semantic layering:

- **Primary (`#1E3A8A` - Royal Cerulean):** Expresses depth, trustworthiness, and quiet authority. Used for primary navigation, app bar signatures, active tab indicators, and primary action buttons.
- **Secondary (`#D97706` - Warm Sun-Gold / Amber):** Represents spiritual warmth, divine light, and active encouragement. Applied to celebratory reactions, highlights within scripture, badges of honor, and secondary calls-to-action.
- **Tertiary (`#4D7C0F` - Serene Olive / Sage):** Conveys renewal, peace, and spiritual growth. Dedicated to prayer status tags, affirmative community tags, answered prayers, and growth milestones.
- **Reaction Rose (`#E11D48`):** A warm, compassionate rose hue reserved strictly for love/blessing reactions and urgent prayer needs.
- **Neutrals & Surfaces:**
  - `Neutral Dark (#1E293B)`: Deep slate navy for high-contrast, readable body copy and headline typography without the harshness of pure black.
  - `Neutral Muted (#64748B)`: Slate gray for secondary metadata, scripture citations, timestamps, and placeholder states.
  - `Border Subtle (#E2E8F0)`: Clean hairline border to frame cards and separate feed activities cleanly.
  - `Surface Warm Alabaster (#F8FAFC)`: The foundational canvas background.
  - `Surface Pure White (#FFFFFF)`: The elevated card and sheet layer.
  - `Surface Sunken Stone (#F1F5F9)`: Background for input fields, scripture callout blocks, and inactive pill badges.

## Typography

Typography balances geometric modern warmth in display contexts with rigorous utilitarian legibility in sustained reading contexts.

- **Headlines & Interface Labels (`Plus Jakarta Sans`):** Provides warm, open apertures and rounded terminals that establish an approachable, community-oriented tone without feeling childish. Titles, navigation headers, metrics, and actionable labels utilize medium to bold weights.
- **Body & Scripture Text (`Inter`):** Selected for its neutral legibility, tall x-height, and balance across small mobile screens. Scripture passages, devotional discussions, and prayer requests employ generous line-height multiples (1.6x to 1.65x) to maintain visual pacing, foster meditation, and prevent visual crowding.
- **Scale Optimization:** Mobile headlines are constrained to a maximum of 34px for display contexts to avoid truncation and awkward wrap issues in portrait orientations.

## Layout & Spacing

The layout is built around mobile-first utility, accommodating one-handed touch ergonomics and fluid vertical scrolling feeds.

- **Grid Architecture:** Employs a single fluid column model on mobile devices with consistent `1rem` (16px) outer side margins and gutters. On tablet breakpoints (≥600dp), feeds max out at 560dp centered with expanded margins, or convert into a balanced split-view (feed + active prayer/discussion thread).
- **Rhythm & Touch Standards:**
  - Base increment adheres strictly to an 8pt spatial grid, with 4pt half-steps (`space-xs`) for fine-tuning badge insets and inline icon spacing.
  - Interactive touch surfaces preserve a hard minimum boundary of 44×44dp (52dp preferred for main floating interaction buttons) to maintain effortless accessibility for users of all demographics.
- **Vertical Feed Cadence:** Spacing between social/testimony feed cards defaults to `space-md` (16px), giving each testimony or prayer request independent breathing room while maintaining cohesion during quick vertical scans.

## Elevation & Depth

Visual hierarchy leverages soft, diffused natural lighting paired with low-contrast borders rather than deep artificial drop shadows, retaining a peaceful, non-distracting visual field:

- **Level 0 (Flat Canvas - `#F8FAFC`):** The ground plane. Background feeds, user account profiles, and general viewports.
- **Level 1 (Card Baseline):** Clean `#FFFFFF` fill resting on Level 0. Outlined with a continuous 1px stroke of `#E2E8F0` and illuminated by an ultra-soft ambient shadow: `box-shadow: 0 2px 8px -2px rgba(30, 41, 59, 0.04), 0 1px 4px -1px rgba(30, 41, 59, 0.02)`.
- **Level 2 (Active Sheets & Modals):** Pinned app bars on scroll, sticky comment trays, and sliding bottom sheets. Outlined with `#E2E8F0`, elevated by `box-shadow: 0 10px 25px -5px rgba(30, 41, 59, 0.08), 0 8px 10px -6px rgba(30, 41, 59, 0.04)`.
- **Level 3 (Floating Direct Actions):** New Prayer / New Fellowship Post buttons and tooltips. Elevated with a warm ambient tint: `box-shadow: 0 12px 24px -4px rgba(30, 58, 138, 0.22)`.

## Shapes

The design system employs soft, organic geometry to reinforce comfort and peace:

- **Base Corner Radius (`16px` / `1rem` - rounded-2xl):** Default boundary for all content-bearing components, including feed cards, prayer request containers, devotional quote cards, and modal dialogs.
- **Inner Micro-Shapes (`8px` / `0.5rem` - rounded-md):** Used for nested media attachments, scripture bookmark callouts, and form input frames to maintain geometric balance inside the larger cards.
- **Full Pills (`9999px`):** Reserved for contextual topic filters, live prayer counters, user badges, reaction indicators, and primary call-to-action button caps.

## Components

### Buttons
- **Primary Button:** Height 48dp, fully pill-shaped (`rounded-full`), filled with Cerulean Royal Blue (`#1E3A8A`), text in `#FFFFFF` (`label-lg`). Subdued forward momentum via an inline trailing icon with 8px gap. Pressed state: 90% opacity with a scale micro-interaction (0.98x).
- **Secondary / Amber Action:** Height 48dp, pill-shaped, Warm Sun-Gold (`#D97706`) background for urgent fellowship actions (e.g., "Pray Now", "Join Fellowship").
- **Outlined / Ghost Button:** 1px stroke in `#E2E8F0`, transparent surface, text in `#1E293B`. For dismissive or tertiary options.

### Chips & Topic Pills
- **Topic Filter / Tag:** Height 32dp, pill-shaped (`9999px`).
  - *Inactive:* Surface `#F1F5F9`, text `#64748B` (`label-md`), no border.
  - *Active:* Surface `#1E3A8A`, text `#FFFFFF`, subtle blue shadow.
- **Prayer Counter Badge:** Pill-shaped, surface tinted Olive (`#ECFDF5`), border 1px `#D1FAE5`, text `#047857` with leading praying-hands icon.

### Social Feed & Scripture Cards
- **Structure:** Surface `#FFFFFF`, border 1px `#E2E8F0`, border-radius 16px, padding `16px`.
- **Header:** 40dp circular avatar, author name (`headline-sm`), church/fellowship affiliation and timestamp (`body-sm`, `#64748B`), trailing bookmark action.
- **Body Area:** Generous line-height (`body-md`), selectable text.
- **Scripture Callout Container:** Nested with 12px margin, background `#F8FAFC`, left accent rail 3px solid `#D97706`, padding 12px 16px, body in `Inter` italic.

### Interactive Reactions & Actions Bar
- Integrated inside card footer. Horizontal distribution of 4 primary touches: Amen / Prayed (`#D97706`), Love / Blessed (`#E11D48`), Comment (`#1E3A8A`), Share (`#64748B`).
- Touch target minimum 44×44dp with pill hover/press background `#F1F5F9`.

### Text Input Fields
- Height 52dp, rounded-xl (`12px`), surface `#F8FAFC`, border 1px `#E2E8F0`.
- Text style `body-md` in `#1E293B`, placeholder in `#94A3B8`.
- Focus state: Surface `#FFFFFF`, border 1.5px solid `#1E3A8A`, subtle halo ring `rgba(30, 58, 138, 0.1)`.

### Checkboxes & Radio Controls
- Radio: 22dp circle, 2px border `#CBD5E1`. Selected: `#1E3A8A` ring with `#FFFFFF` inner dot.
- Checkbox: 22dp rounded square (6px radius), `#1E3A8A` fill on select with clean white checkmark vector. Minimum touch padding surrounds box to hit 48dp footprint.

### Devotional Audio & Reading Progress
- Custom scrubber: Track height 4dp `#E2E8F0`, filled track `#1E3A8A`, thumb 16dp white circle with 2px solid `#1E3A8A`.