# LOOP Design System
**SaaS-Level · Social Web App · V3**

> Professional, production-ready design system for a modern social platform.  
> Inspired by clean 3-column social feed layouts (soft cards, clear hierarchy, pink accents for live states) while retaining high-contrast color language and disciplined typography from the LOOP foundation.

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Clarity first** | Every screen must be scannable in under 3 seconds. Primary actions are obvious. |
| **Confident color** | Indigo + Yellow used as solid blocks. Pink is reserved exclusively for live / urgent / notification states. |
| **Type carries energy** | Space Grotesk does the heavy lifting. No decorative second font for headlines. |
| **System data is mono** | Counts, timestamps, live labels, and badges use IBM Plex Mono. |
| **Consistent rhythm** | 4px base unit everywhere. No arbitrary values. |
| **Accessible by default** | WCAG 2.1 AA contrast minimum. Focus states always visible. |
| **Light & Dark ready** | Every token has a defined pair. |

---

## 2. Color System

### Core Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| **Ink** | `#14141C` | `#F4F4F2` | Primary text, borders, icons |
| **Paper** | `#FFFFFF` | `#0F0F14` | Page background |
| **Surface** | `#F7F7F5` | `#1A1A22` | Cards, panels, sidebars |
| **Surface Elevated** | `#FFFFFF` | `#22222C` | Elevated cards, modals, popovers |
| **Muted** | `#6B6B75` | `#8A8A95` | Secondary text, captions, meta |
| **Border** | `#E8E8E4` | `#2A2A34` | Dividers, input borders |
| **Indigo** | `#4B3BFF` | `#6B5BFF` | Primary actions, links, active states |
| **Indigo Soft** | `#EEECFF` | `#2A2550` | Primary subtle backgrounds, selected rows |
| **Yellow** | `#FFC629` | `#FFD24D` | Secondary actions, highlights, success accents |
| **Yellow Soft** | `#FFF6D6` | `#3D3200` | Secondary subtle backgrounds |
| **Pink** | `#FF3D57` | `#FF5C72` | Live indicators, urgent badges, notifications only |
| **Pink Soft** | `#FFE8EC` | `#3D1520` | Live subtle backgrounds |
| **Success** | `#16A34A` | `#22C55E` | Positive feedback |
| **Warning** | `#F59E0B` | `#FBBF24` | Caution states |
| **Error** | `#DC2626` | `#EF4444` | Destructive / error states |

### Color Rules

- **Indigo** = primary CTA, links, active navigation, selected filters.
- **Yellow** = secondary CTA, highlights, “new” indicators, promotional tags.
- **Pink** appears **only** for:
  - Live badges
  - Unread notification dots
  - Urgent / real-time states
- Never use gradients for primary UI surfaces. Gradients are allowed only on marketing heroes or empty-state illustrations.
- Always pair solid color blocks with sufficient contrast (Ink on Paper, White on Indigo, etc.).

---

## 3. Typography

**Primary family:** Space Grotesk  
**Monospace / system:** IBM Plex Mono

### Type Scale

| Token | Size / Line Height | Weight | Tracking | Font | Usage |
|-------|--------------------|--------|----------|------|-------|
| **display** | 48 / 52px | 700 | −2% | Space Grotesk | Marketing heroes, empty states |
| **h1** | 32 / 40px | 700 | −1.5% | Space Grotesk | Page titles |
| **h2** | 24 / 32px | 600 | −1% | Space Grotesk | Section headers |
| **h3** | 18 / 26px | 600 | 0 | Space Grotesk | Card titles, modal headers |
| **body-l** | 16 / 26px | 400 | 0 | Space Grotesk | Ledes, important body copy |
| **body** | 15 / 24px | 400 | 0 | Space Grotesk | Posts, comments, forms |
| **small** | 13 / 20px | 400 | 0 | Space Grotesk | Meta text, helper text, nav labels |
| **micro** | 12 / 16px | 500 | 0 | IBM Plex Mono | Timestamps, counts, badges, live labels |

### Typography Rules

- Body text should ideally stay under **65–70 characters** per line on desktop.
- Headlines (display → h2) use negative tracking for energy.
- Never use pure black (`#000`) for text. Always use **Ink**.
- Numeric values, reply counts, “LIVE”, and timestamps always use **IBM Plex Mono**.

---

## 4. Spacing & Layout

**Base unit:** 4px

```
4   8   12   16   20   24   32   40   48   64   80   96
```

### Recommended Spacing Scale

| Name | Value | Common Use |
|------|-------|------------|
| xs | 4px | Icon gaps, tight padding |
| sm | 8px | Compact element spacing |
| md | 12–16px | Default gap between related items |
| lg | 24px | Section spacing inside cards |
| xl | 32–40px | Card internal padding |
| 2xl | 48–64px | Page section gaps |
| 3xl | 80–96px | Major layout separation |

### Layout Grid (Desktop)

- **Max content width:** 1280–1440px
- **Left sidebar:** 240–280px (fixed)
- **Main feed:** fluid (min 480px)
- **Right sidebar:** 300–340px (fixed)
- **Gutter:** 24–32px between columns

### Mobile

- Single column
- Bottom navigation or collapsible side nav
- Horizontal padding: 16px

---

## 5. Elevation, Borders & Radius

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| **none** | 0 | Hard structural elements (rare) |
| **sm** | 6px | Inputs, small buttons, tags |
| **md** | 10–12px | Cards, posts, modals |
| **lg** | 16px | Large panels, image containers |
| **full** | 9999px | Pills, avatars, badges |

> The system leans **soft-modern** (not ultra-hard edges). Prefer 10–12px for cards to match contemporary social SaaS patterns.

### Borders

- Default border: `1px solid Border` token
- Focus ring: `2px solid Indigo` (offset by 2px)
- Active / selected: `1.5–2px solid Indigo`

### Shadows (Light Mode)

| Level | Value | Usage |
|-------|-------|-------|
| **sm** | `0 1px 2px rgba(20,20,28,0.05)` | Subtle lift |
| **md** | `0 4px 12px rgba(20,20,28,0.08)` | Cards, dropdowns |
| **lg** | `0 12px 32px rgba(20,20,28,0.12)` | Modals, popovers |
| **focus** | `0 0 0 3px rgba(75,59,255,0.25)` | Focus rings |

Dark mode shadows should use higher opacity black or be replaced with subtle border + surface elevation.

---

## 6. Components (Core Specs)

### Buttons

| Variant | Background | Text | Border | Hover | Use |
|---------|------------|------|--------|-------|-----|
| **Primary** | Indigo | White | none | Darker Indigo | Main CTAs (Post, Follow, Share) |
| **Secondary** | Yellow | Ink | none | Darker Yellow | Secondary actions |
| **Ghost** | Transparent | Ink | Border | Surface | Tertiary |
| **Destructive** | Error | White | none | Darker Error | Delete, block |
| **Soft Primary** | Indigo Soft | Indigo | none | Slightly stronger | Secondary primary actions |

- Height: 36px (default), 32px (compact), 40px (large)
- Padding: 12–16px horizontal
- Border radius: 8–10px
- Font: Space Grotesk 500 / 14–15px

### Inputs & Forms

- Height: 40px
- Border: 1px Border → 1.5–2px Indigo on focus
- Background: Paper / Surface Elevated
- Placeholder: Muted
- Border radius: 8px
- Error state: Error border + soft error background

### Cards / Posts

- Background: Surface Elevated
- Border radius: 12px
- Padding: 16–20px
- Shadow: md
- Gap between cards: 16px

### Badges & Tags

| Type | Style |
|------|-------|
| **Default** | Surface + Muted text |
| **Primary** | Indigo Soft + Indigo text |
| **Live** | Pink + White text (or Pink Soft + Pink) |
| **Count** | IBM Plex Mono, micro size |

### Navigation

- Active item: Indigo Soft background + Indigo text + optional left accent bar
- Hover: Surface background
- Icons: 20px, stroke weight 1.5–2px

---

## 7. Interaction States

Every interactive component must define:

| State | Treatment |
|-------|-----------|
| **Default** | Base styles |
| **Hover** | Slightly darker / lighter background or border |
| **Active / Pressed** | Darker shade + slight scale or inset |
| **Focus** | Visible 2–3px Indigo ring (never remove) |
| **Disabled** | 40–50% opacity + `cursor: not-allowed` |
| **Loading** | Spinner or skeleton + disabled interaction |

---

## 8. Iconography

- Style: Outlined / stroke (1.5–2px)
- Size scale: 16 / 20 / 24px
- Color: Inherit from text or use Ink / Muted / Indigo
- Corner radius on icons: match overall softness

---

## 9. Motion & Feedback

| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover, press) | 120–150ms | ease-out |
| Standard (modals, panels) | 200–250ms | ease |
| Complex (page transitions) | 300ms | ease-in-out |

Respect `prefers-reduced-motion`.

---

## 10. Accessibility Checklist

- [ ] Text contrast ≥ 4.5:1 (normal) / 3:1 (large)
- [ ] Interactive targets ≥ 44×44px on touch
- [ ] Focus visible on all interactive elements
- [ ] Color is never the only indicator of state
- [ ] Live regions for real-time updates (Pink badges)
- [ ] Proper heading hierarchy
- [ ] Form labels always present

---

## 11. Dark Mode Notes

- Paper becomes near-black (`#0F0F14`)
- Surface elevates with slightly lighter values
- Borders become more visible
- Indigo lightens slightly for better contrast on dark surfaces
- Shadows are reduced; elevation is communicated more through surface color + border

---

## 12. File & Token Naming Convention

```
color.ink
color.paper
color.surface
color.indigo
color.indigo-soft
color.yellow
color.pink
...

font.family.sans
font.family.mono
font.size.body
font.weight.bold
...

space.4
space.8
space.16
...

radius.md
shadow.md
```

---

## 13. Implementation Notes (for Engineers)

- Prefer CSS variables or design tokens (Style Dictionary / Tokens Studio)
- Use `rem` for typography and spacing where possible
- Component library recommendation: build with Radix / Headless UI + your tokens
- Keep a living Storybook or equivalent for every component + state

---

**LOOP Design System V3**  
Space Grotesk + IBM Plex Mono · Light / Dark · Social SaaS  
Ready for product, design, and engineering handoff.
