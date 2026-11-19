---
name: SkillBridge AI
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd6f8'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f1ff'
  surface-container: '#f0ebff'
  surface-container-high: '#eae5ff'
  surface-container-highest: '#e4dfff'
  on-surface: '#1a1832'
  on-surface-variant: '#474554'
  inverse-surface: '#302d48'
  inverse-on-surface: '#f3eeff'
  outline: '#787586'
  outline-variant: '#c9c4d7'
  surface-tint: '#5a45d6'
  primary: '#5842d3'
  on-primary: '#ffffff'
  primary-container: '#715eee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c7bfff'
  secondary: '#546500'
  on-secondary: '#ffffff'
  secondary-container: '#d3ef66'
  on-secondary-container: '#596c00'
  tertiary: '#5c5a6b'
  on-tertiary: '#ffffff'
  tertiary-container: '#757384'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c7bfff'
  on-primary-fixed: '#180065'
  on-primary-fixed-variant: '#4226bd'
  secondary-fixed: '#d3ef66'
  secondary-fixed-dim: '#b7d24d'
  on-secondary-fixed: '#181e00'
  on-secondary-fixed-variant: '#3f4c00'
  tertiary-fixed: '#e4e0f4'
  tertiary-fixed-dim: '#c8c4d7'
  on-tertiary-fixed: '#1b1a28'
  on-tertiary-fixed-variant: '#464555'
  background: '#fcf8ff'
  on-background: '#1a1832'
  surface-variant: '#e4dfff'
typography:
  display-hero:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 54px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  label-numeric:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.02em
  label-badge:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies an energetic synthesis between Gen-Z self-directed agency and the rigorous structural precision of high-end analytical SaaS. It serves ambitious learners, career pivoters, and talent strategists seeking uncompromised clarity in their career trajectories.

The visual direction blends **Tactile Modern SaaS** with **Vibrant Editorial Accents**:
- **Clarity and Precision**: Dense, actionable career architectures organized with crisp geometry, razor-thin perimeter boundaries, and unmistakable contrast.
- **Electric Optimism**: Deep foundational tones disrupted by charged violet primaries and high-voltage lime accents, converting complex data visualization into a gamified, empowering experience.
- **Academic Credibility**: Restrained structural rhythm avoiding ephemeral micro-trends in favor of balanced typography, clear hierarchical weight, and intentional negative space.

## Colors

The palette balances clinical precision against expressive energy, anchored in structured roles:

- **Primary (`#7865F5` - Electric Violet)**: Reserved for principal interactive destinations, focused states, primary buttons, and dynamic progress indications.
- **Secondary (`#D7F36A` - Lime Accent)**: Used selectively for breakthrough accomplishments, skill completion signals, readiness delta indicators, and high-impact tags. Text on this tone must always be `#17152E`.
- **Tertiary (`#EEEAFE` - Soft Lavender)**: Provides subtle surface differentiation, ghost button states, soft structural dividers, and secondary badge containers.
- **Neutral Primary (`#17152E` - Midnight Navy)**: Grounding hue for headlines, primary body copy, active icons, and high-contrast dark callouts.
- **Neutral Muted (`#77758A` - Muted Slate)**: Explicitly deployed for metadata, structural grid labels, empty states, and inactive tab counters.
- **Canvas Base (`#FAF9F6` - Warm Off-White)**: The foundational viewport background, mitigating glare and imparting tactile warmth.
- **Card Surfaces (`#FFFFFF` - Pure White)**: Crisp foreground panels resting above the warm off-white canvas.
- **System States**:
  - Success: `#16805D` (Verified skills, confirmed target alignments)
  - Warning / In-Progress: `#C28A23` (Emerging gaps, deadline proximities)

## Typography

Typography balances rapid editorial hierarchy with scientific precision. 

- **Primary Voice (Manrope)**: Delivers geometric character with open apertures and tight geometric tracking across display scales. Headlines leverage heavy weights (`700`, `800`) with negative letter-spacing for punchy, confident delivery.
- **Analytical Voice (JetBrains Mono)**: Applied strictly to numeric telemetry—readiness match percentages, compensation deltas, skill affinity scores, and computational benchmarks. This enforces visual alignment in vertical data stacks.
- **Hierarchy Rules**:
  - Metric displays combine `label-numeric` values paired with `body-sm` metadata labels.
  - Section headers must pair `headline-lg` with a secondary `body-md` description using `#77758A`.
  - Uppercase styling is exclusively reserved for `label-badge` with deliberate tracking (`0.04em`).

## Layout & Spacing

The layout is structured around an adaptive 12-column responsive fluid grid designed primarily for complex desktop dashboards while scaling cleanly to mobile.

- **Desktop (>= 1280px)**: 12-column grid, max-width `1440px`, 32px (`space-xl`) outer margins, 24px (`gutter`) column spacing. Complex dashboards utilize a fixed 280px left navigation rail alongside an 8-column main analytical space and a 4-column dynamic contextual drawer.
- **Tablet (768px - 1279px)**: 8-column layout, 24px (`margin`) canvas margins, 16px (`gutter-sm`) columns. Drawers transition into bottom sheets or stacked containers.
- **Mobile (< 768px)**: 4-column layout, 16px (`margin-sm`) margins, 12px columns. Grid cards reflow into vertical full-width stacks.
- **Component Padding Scale**:
  - `space-xs` (4px): Internal chip spacing and badge padding.
  - `space-sm` (8px): Icon-to-label gaps, tight list item separation.
  - `space-md` (16px): Compact card padding, input internal padding.
  - `space-lg` (24px): Standard card containers, table cell grouping.
  - `space-xl` (40px): Section-level vertical separators.

## Elevation & Depth

Visual hierarchy is maintained through subtle translucent borders paired with multi-layer ambient shadows, preventing dense UI panels from feeling cluttered.

- **Base Surfaces (Level 0)**: Page backdrop rendered in `#FAF9F6`.
- **Card Panels (Level 1)**: Flat `#FFFFFF` fill with a `1px` structural outline in `rgba(119, 117, 138, 0.12)` (or `#EEEAFE` on branded sections) and an ambient shadow: `0 2px 8px -2px rgba(23, 21, 46, 0.04), 0 1px 4px -1px rgba(23, 21, 46, 0.02)`.
- **Hover & Interactive Tiers (Level 2)**: Shifted translateY (-2px), bound by `1px solid rgba(120, 101, 245, 0.25)` and elevated via: `0 12px 24px -6px rgba(23, 21, 46, 0.08), 0 4px 8px -2px rgba(23, 21, 46, 0.04)`.
- **Modals & Flyouts (Level 3)**: `#FFFFFF` fill supported by backdrop blur (`backdrop-filter: blur(12px)` over `rgba(23, 21, 46, 0.35)`) and depth shadow: `0 24px 48px -12px rgba(23, 21, 46, 0.16)`.
- **Glow Accents**: Focused active elements (e.g., active skill nodes, current progress indicators) receive a localized diffused bloom: `0 0 0 3px rgba(120, 101, 245, 0.2)`.

## Shapes

The design system implements a rounded shape language (`roundedness: 2`) to establish a human, modern, and accessible software aesthetic:

- **Interactive Core (Inputs, Action Buttons)**: Standardized at `0.5rem` (8px) for buttons and inputs, balancing tactile clickability with UI efficiency.
- **Structural Containers (Cards, Modals)**: Standardized at `1rem` (16px) for standard analytical widgets, scaling to `1.5rem` (24px) for hero insight cards and onboarding containers.
- **Pill Exceptions**: Small UI chips, progress trackers, indicator tags, and status badges use fully rounded pill geometries (`9999px`) to distinguish discrete atomic metadata from structural layout cards.

## Components

### Buttons
- **Primary**: Background `#7865F5`, text `#FFFFFF`, border-radius 8px. Hover state deepens to `#6652E8` with subtle drop shadow. Focus state adds `0 0 0 3px rgba(120, 101, 245, 0.3)`.
- **Accent (Lime)**: Background `#D7F36A`, text `#17152E`, font-weight 600. Exclusively used for primary conversion milestones and "Apply Career Path" actions.
- **Secondary / Ghost**: Background `#EEEAFE`, text `#7865F5`, hover state background `rgba(238, 234, 254, 0.6)`.

### Skill Chips & Tags
- **Verified Skill**: Background `#FFFFFF`, border `1px solid rgba(22, 128, 93, 0.3)`, text `#16805D`. Contains leading green checkmark icon.
- **Gap / Developing Skill**: Background `rgba(120, 101, 245, 0.08)`, border `1px dashed #7865F5`, text `#7865F5`. Contains leading '+' icon for one-click learning addition.
- **Target Role Milestone**: Background `#D7F36A`, text `#17152E`, pill shape, uppercase tracking, bold weight.

### Cards & Analytical Modules
- Constructed on pure white (`#FFFFFF`) surfaces with `16px` or `24px` corner radii and thin `1px` borders (`#EEEAFE`).
- Header sections maintain consistent padding (`space-lg`), separating meta actions from analytic visualizations with subtle divider strokes.

### Progress Rings & Visual Telemetry
- **SVG Circular Progress**: Background track stroke `rgba(238, 234, 254, 0.8)`, active indicator stroke `#7865F5` (or `#D7F36A` for 90%+ readiness scores). Stroke caps are set to `round`.
- Center content displays readiness figures in `label-numeric` with an absolute unit `%`.

### Form Controls & Inputs
- **Text Fields**: Background `#FFFFFF`, border `1px solid rgba(119, 117, 138, 0.25)`, text `#17152E`, placeholder `#77758A`. Focus shifts border to `#7865F5` with outer glow ring.
- **Checkboxes & Radios**: 20px boxes/circles. Inactive state uses border `1px solid rgba(119, 117, 138, 0.3)`. Active state fills with `#7865F5` displaying pure white marks.

### Career Pathway Timeline Nodes
- Connected visual node graph. Completed phases render in `#16805D`, current focused trajectory glows in `#7865F5` with active pulsing perimeter ring, and future milestones maintain muted dotted lines in `#77758A`.