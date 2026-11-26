# Smart Budget — Design System: Neon Tokyo

Canonical visual system for this project. All screens inherit these tokens. Do not introduce a second palette or a different type voice without updating this file.

## Color — Neon Tokyo

Dark-first. The scene: a shop owner checking orders on a phone in a dim room at night; the UI is a lit sign against the dark street. Light mode is not part of this system.

| Token | Hex | Role |
| --- | --- | --- |
| `nt-void` | `#070A13` | Page ground (deep indigo-black) |
| `nt-surface` | `#0E1424` | Panels, form cards |
| `nt-raised` | `#151D30` | Inputs, raised controls |
| `nt-line` | `#26334D` | Borders, dividers |
| `nt-ink` | `#F2F6FF` | Primary text |
| `nt-muted` | `#9BA9C4` | Secondary text (7.4:1 on surface) |
| `nt-cyan` | `#22E6FF` | Primary neon — CTAs, focus, active state |
| `nt-magenta` | `#FF3FB4` | Secondary neon — brand accent, highlights |
| `nt-violet` | `#8B7CFF` | Tertiary neon — ambient light only |
| `nt-on-neon` | `#04121A` | Ink on cyan fills |
| `nt-danger` | `#FF6B8A` | Errors (paired with an icon and text) |
| `nt-success` | `#3CE6A5` | Success (paired with an icon and text) |

Rules:
- Neon colors are **light**, never text color on large bodies of copy. Body copy is `nt-ink` / `nt-muted`.
- Glow is restrained: a single glow on the active/primary element, not on every border.
- Never signal state with color alone — pair with text or an icon.
- Contrast floor: 4.5:1 for body text, 3:1 for large text and UI boundaries.

## Type

- Display / wordmark: **Chakra Petch** (600–700). Angular techno character without the Orbitron cliché.
- Body / UI: **Geist** (existing project font), 400–600.
- No all-caps eyebrow labels, no gradient text, no monospace used as decoration.

## Layout & components

- Auth: split screen on desktop (brand panel left, form right); compact brand header above the form on mobile.
- Form width: max 26rem. One column. Labels above fields.
- Corner radius: 0.75rem for panels, 0.5rem for controls. Consistent, not rounded-everything.
- Borders: 1px `nt-line`. Depth comes from a border plus a soft, offset shadow — not colored halos.
- Focus: 2px `nt-cyan` outline, 3px offset, visible on every interactive element.
- Motion: one orchestrated load reveal on the brand panel. Reduced motion disables it.
- Icons: drawn SVG (Google mark, eye, lock), consistent 1.6px stroke. No emoji as icons.

## Materials

- Brand panel: an authored SVG night skyline with lit windows, one neon disc, and a perspective grid ground. It is decorative (`aria-hidden`) and never sits behind the form on mobile.
- Ambient light: two low-opacity radial blooms (cyan, magenta) fixed to the brand panel only.

## Anti-patterns

- Purple/indigo-everything SaaS default, glassmorphism as decoration, scattered hover animations.
- Kicker/eyebrow above headings, numbered section markers, `→` appended to link/button text.
- Soft grey shadows on every card, stock hero layouts, placeholder lorem copy.
- Fake product claims. Copy comes from `Smart Budget Plan.md`.

## Status

Introduced with the authentication pages. Extend, don't replace.
