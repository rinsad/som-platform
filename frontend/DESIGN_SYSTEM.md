# SOM Platform — Design System

The visual language for the Shell Oman Marketing (SOM) internal platform. Light, enterprise, Shell-branded. This document describes the system **as it is built today** so new screens stay consistent with existing ones.

- **Stack:** React 19 + Vite, vanilla CSS. No CSS framework, no CSS-in-JS library.
- **Two styling layers:**
  1. **Global tokens & primitives** — CSS custom properties and a few utility classes in [`src/index.css`](src/index.css).
  2. **Component styles** — plain JS style objects, by convention `const s = { ... }` at the bottom of each component, applied via `style={s.foo}`.
- Prefer the `--css-variables` for anything shared (color, radius, shadow, easing). Inline style objects are for component-local layout.

---

## 1. Brand

Three Shell brand colors. Everything else is neutral or semantic.

| Token | Hex | Use |
|-------|-----|-----|
| `--shell-red` | `#DD1D21` | Primary interactive accent — buttons, CTAs, active nav, links on hover. |
| `--shell-yellow` | `#FFD500` | Secondary accent — top brand borders, badges, highlights, avatar fills. |
| `--shell-navy` | `#003366` | Dark surfaces only. **Never** for interactive elements. |

**Signature brand cues**
- A **yellow top border** (`5px`–`8px` solid `#FFD500`) crowns primary chrome: the sidebar brand block, the app navbar, and page hero cards.
- A **red left border** (`3px`–`5px`) marks active/emphasis states (active sidebar item, Capex page header).
- Red hover accent on interactive list rows and titles.

---

## 2. Color tokens

Defined in `:root` ([`src/index.css`](src/index.css)). The platform runs a **light theme**.

### Labels (text)
| Token | Hex |
|-------|-----|
| `--label` | `#222222` — primary text |
| `--label-secondary` | `#595959` |
| `--label-tertiary` | `#777777` |
| `--label-quaternary` | `#a3a3a3` |

### Backgrounds & surfaces
| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#f7f7f7` | App canvas |
| `--bg-secondary` / `--surface` | `#ffffff` | Cards, panels, chrome |
| `--bg-tertiary` | `#fff8cc` | Soft yellow tint (hero wash, highlight rows) |
| `--surface-grouped` | `#f7f7f7` | Grouped/inset surfaces |

### Fills (subtle hover / tint)
| Token | Value |
|-------|-------|
| `--fill-primary` | `rgba(221,29,33,0.10)` — red tint |
| `--fill-secondary` | `rgba(255,213,0,0.20)` — yellow tint |
| `--fill-tertiary` | `#f4f4f4` |
| `--fill-quaternary` | `#fafafa` |

### Separators
| Token | Hex |
|-------|-----|
| `--separator` | `#d8d8d8` |
| `--separator-clear` | `#e7e7e7` |

### Neutral scale — the single neutral family
`--gray-50` `#fafafa` · `--gray-100` `#f1f1f1` · `--gray-200` `#e1e1e1` · `--gray-300` `#c9c9c9` · `--gray-400` `#8a8a8a` · `--gray-500` `#666666` · `--gray-600` `#4f4f4f` · `--gray-700` `#3b3b3b` · `--gray-800` `#2c2c2c` · `--gray-900` `#222222`

Borders use `--gray-200` (`#e1e1e1`); hairline separators use `--separator` (`#d8d8d8`); muted text uses `--label-secondary` (`#595959`). **The cool slate family (`#E0E5EB`, `#E9EDF2`, `#D9DEE5`, `#5B6773`, `#1F2933`, …) is retired** — it must not appear in new or existing code.

### Semantic status colors — the ONLY status palette
Defined as tokens in `:root`. Used for status dots, badges, and system-health text. **The neon set (`#34d399`, `#fbbf24`, `#ff6b6b`, `#6b9fff`) is retired** — it is dark-theme residue and must not be used.

| Meaning | Accent (dot) | Text | Soft bg |
|---------|-------------|------|---------|
| Success / Operational | `--success` `#16a34a` | `--success-text` `#166534` | `--success-bg` `#f0fdf4` |
| Warning / Attention | `--warning` `#f59e0b` | `--warning-text` `#92400e` | `--warning-bg` `#fff8cc` |
| Error / Rejected | `--danger` `#DD1D21` | `--danger-text` `#991b1b` | `--danger-bg` `#fee2e2` |
| Info / In-progress | `--info` `#1d4ed8` | `--info-text` `#1d4ed8` | `--info-bg` `#dbeafe` |
| Neutral / Draft | `--neutral` `#6b7280` | `--neutral-text` `#6b7280` | `--neutral-bg` `#f4f4f4` |

> A badge = soft-bg fill + matching text color + `1px` border in the accent (or `--gray-200`). Never white text on a light fill.

### Module accent identity
Each functional module carries one accent for framing (icon tiles, hero borders, meters, dashboard cards). These are **identity, not status** — defined as tokens; don't invent new ones.

| Module | Accent | Soft bg | Line / Text |
|--------|--------|---------|-------------|
| Capex (gold) | `--accent-gold` (`--shell-yellow`) | `--accent-gold-bg` (`--bg-tertiary`) | — |
| Purchase Requests (red) | `--accent-red` (`--shell-red`) | `--accent-red-bg` `#fff1f1` | `--accent-red-line` `#ffd3d3` |
| Assets / RADP (amber) | `--accent-amber` `#b45309` | `--accent-amber-bg` `#fff7ed` | `--accent-amber-line` `#f1d36a` · `--accent-amber-text` `#8a5d00` |

> The public portal ([ModuleD](src/modules/ModuleD/)) is a marketing surface with its own dark hero/footer (`#1f1f1f`, `#262626`, `#272727`) — the one place raw dark hex is intentional and permitted.

### Learning topic accents
The Think Secure learning navigation uses a controlled seven-color sequence for its bottom rules. These colors communicate topic identity and ordering—not status—and should not replace the semantic status palette.

| Topic | Token | Value |
|-------|-------|-------|
| Think Secure Home | `--learning-topic-home` | `var(--gray-700)` |
| Access | `--learning-topic-access` | `#d97706` |
| Devices | `--learning-topic-devices` | `#0891b2` |
| Data & Information | `--learning-topic-data` | `#d29d00` |
| Collaboration & Connection | `--learning-topic-collaboration` | `#16866b` |
| Social Engineering & Phishing | `--learning-topic-phishing` | `var(--shell-red)` |
| Outside of Shell | `--learning-topic-outside` | `#65a30d` |

Use these tokens only for compact learning-topic cues such as tab underlines, section markers, or matching legend keys. Keep surfaces neutral and text on the standard label scale.

---

## 3. Typography

```
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
```

- **Base:** `14px`, `line-height: 1.5`, antialiased.
- Weights lean **heavy** — the UI uses `700`–`900` liberally for labels and headings; `500`–`600` for secondary/muted text.

### Scale (observed roles)
| Role | Size | Weight |
|------|------|--------|
| Page H1 / hero | `28–32px` | `800` |
| Section / panel title | `17px` | `800` |
| Modal title | `17px` | `800` |
| Card / module label | `18px` | `800` |
| Stat value | `22px` | `800` |
| Body | `13–15px` | `500–700` |
| Field label | `12px` | `700` |
| Table header | `11px` | `850`, uppercase, `letter-spacing: 0.4px` |
| Eyebrow / section kicker | `11–12px` | `800`, uppercase |
| Meta / caption | `10.5–12px` | `500–700` |

---

## 4. Spacing, radius, elevation

### Radius — one tight enterprise scale
| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | `4px` | chips, badges, small controls, icon tiles |
| `--radius-sm` | `6px` | buttons |
| `--radius-md` | `8px` | inputs, cards, panels, tables, modals, page headers |
| `--radius-pill` / `--radius-full` | `9999px` | pills, avatars, dots |

`--radius-lg` / `--radius-xl` / `--radius-2xl` are **legacy aliases that all resolve to `8px`** — don't reach for them in new code. No raw radius values (`10`, `12`, `14`, `16`, `20`, `26`…) — always use a token.

### Shadows
| Token | Value |
|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 6px 18px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05)` |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)` |
| `--shadow-xl` | `0 20px 60px rgba(0,0,0,0.16), 0 6px 18px rgba(0,0,0,0.08)` |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.06)` |

Cards and panels most commonly use `--shadow-sm`; modals use `--shadow-xl`-level elevation (`0 20px 60px rgba(16,24,40,0.24)`).

### Spacing
Common step values (px): `2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40`. Card/panel padding is typically `22–28`; page gutter is `40px 32px`.

---

## 5. Motion

```
--ease:        cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--transition:      0.18s var(--ease);
--transition-fast: 0.12s var(--ease);
--transition-slow: 0.28s var(--ease);
```

Keyframes in [`src/index.css`](src/index.css):
- `spin` — loading spinners (`0.8s linear infinite`).
- `fadeIn` — page/main mount (`opacity + translateY(6px)`), used on route content (`animation: fadeIn 0.25s var(--ease)`).
- `slideIn` — `opacity + translateX(-10px)`.

Hover transitions on nav/rows run at `0.12s`. Keep interactive feedback fast (`≤0.18s`).

---

## 6. Layout

The authenticated app uses a fixed **sidebar + workspace** shell ([`src/layouts/AppShell.jsx`](src/layouts/AppShell.jsx)).

```
┌──────────┬───────────────────────────────┐
│ Sidebar  │ Navbar (96px, yellow top rule)│
│ 304px    ├───────────────────────────────┤
│ (fixed)  │ Scroll area (yellow→grey wash)│
│          │   main · max 1450px · centered│
│          │   padding 40px 32px           │
└──────────┴───────────────────────────────┘
```

- **Root:** `display:flex; height:100vh; overflow:hidden;` background `#f7f7f7`.
- **Sidebar:** `304px`, white, `border-right: 1px solid #e5e5e5`, full-height, non-scrolling frame with scrollable nav.
- **Navbar:** `min-height 96px`, white, `border-top: 5px solid #FFD500`, `border-bottom: 1px solid #e5e5e5`.
- **Main scroll region:** `background: linear-gradient(180deg, #fff8cc 0, #f7f7f7 190px)` — a soft yellow-to-grey wash at the top.
- **Content column:** `max-width: 1450px`, centered, `fadeIn` on mount.
- **Public shell** ([`PublicShell.jsx`](src/layouts/PublicShell.jsx)) uses the `variant="public"` navbar (utility bar + mega-menu, max width `1600px`).

### Grids
- Module card grid: `repeat(auto-fit, minmax(260px, 1fr))`, gap `16`.
- Dashboard bottom row: `minmax(0,1fr) minmax(300px,360px)` (content + side panel).

---

## 7. Components

Reusable primitives live in [`src/components/`](src/components/). Convention: styles as a `const s = {}` object at file bottom.

### Card / Panel
White surface (`--surface`), `1px solid var(--gray-200)` border, `--radius-md` (8px), padding `22–24`, `--shadow-sm`. Module/data cards may add a colored accent line (bottom `5px` bar or left border) in the module's accent color.

```jsx
// index.css primitive
.card { background: var(--surface); border-radius: var(--radius-md);
        box-shadow: var(--shadow-card); overflow: hidden; }
```

### Buttons
| Variant | Style |
|---------|-------|
| **Primary (CTA)** | bg `--shell-red`, text `#fff`, `1px solid var(--shell-red-dark)`, `--radius-sm` (6px), padding `9px 18px`, weight `800`. |
| **Secondary** | bg `--surface`, `1px solid var(--gray-300)` (`#c9c9c9`) or `--separator`, text `--gray-700`, `--radius-sm`, weight `800`. |
| **Retry / inline** | red bg, white text, `--radius-sm`, padding `8px 20px`. |

Buttons inherit `font-family` and use `cursor: pointer` (set globally on `button`).

### Field + input ([`Field.jsx`](src/components/Field.jsx), [`fieldStyles.js`](src/components/fieldStyles.js))
- **Field:** label stacked above control, `gap: 6`. Label `12px`, weight `700`, color `--gray-600`. Pass `full` to span a grid row (`gridColumn: '1 / -1'`).
- **Control (`fieldInputStyle`):** `1px solid var(--gray-200)`, `--radius-md` (8px), padding `10px 12px`, `13px`, text `--label`, white bg, full width.

### Modal ([`Modal.jsx`](src/components/Modal.jsx))
- Backdrop `rgba(16,24,40,0.45)`, top-aligned, `padding: 64px 20px`, `z-index: 1000`, scrollable.
- Card: white, `1px solid var(--gray-200)`, `--radius-md`, `max-width: 560` (override via `maxWidth`), shadow `0 20px 60px rgba(16,24,40,0.24)`.
- Header: title `17px/800`, optional subtitle `13px` `--label-quaternary`, `×` close button (`32×32`, `--radius-md`, `1px solid var(--gray-200)`).
- Body padding `20px 22px`.

### Table (data screens)
- Wrapper: `overflow-x: auto`, `1px solid var(--gray-200)`, `--radius-md`.
- Table: `border-collapse: collapse`, `font-size: 13`, white bg.
- `th`: padding `11px 14px`, `11px`/`850`, uppercase, `letter-spacing 0.4px`, color `--label-secondary`, bg `--gray-50`, `border-bottom: 1px solid var(--separator)`.
- `td`: padding `12px 14px`, `border-bottom: 1px solid var(--gray-100)`, color `--label`, `vertical-align: middle`.
- Clickable rows use the `.capex-req-row` pattern: `cursor:pointer`, hover bg `#EEF3F9`, hover title → `--shell-red`.

### Status badge
Pill or rounded tag: soft-tint background + matching text color from the [semantic status table](#semantic-status-colors), paired with a `7–9px` status dot. Success dot `#16a34a`, warning `#f59e0b`, error `#DD1D21`, neutral `#6b7280`.

### Sidebar ([`Sidebar.jsx`](src/components/Sidebar.jsx))
- Brand block: logo + "Shell Oman Marketing" / "Enterprise Platform", `border-top: 5px solid #FFD500`.
- Sectioned nav (`Overview`, `Modules`, `Administration`) — section labels `11px/800` uppercase, `letter-spacing 0.6px`, color `#8a8a8a`.
- Nav item: `min-height 38`, `borderLeft: 3px solid transparent`. **Active:** bg `#FFF5F5`, `border-left-color #DD1D21`, red label, filled red icon chip. Admin section is role-gated; items are permission-gated via `usePermissions`.
- Footer version badge: green pulse dot + `v1.0 · Shell Oman`.

### Navbar ([`Navbar.jsx`](src/components/Navbar.jsx))
- **App variant:** `96px`, yellow top rule, right-aligned user pill (avatar in Shell yellow with red initial) + "Sign out".
- **Public variant:** utility bar + sticky mega-menu with hover dropdowns; active item underlined in `#FFD500` (`5px`), highlighted item on `#f0f0f0`.

---

## 8. Conventions & guidance

- **Color:** reach for `--shell-red` for anything the user clicks; `--shell-yellow` for brand framing and highlights; never introduce a new brand hue. Use the semantic status **tokens** for state, not decoration. The neon and slate palettes are retired.
- **Borders over shadows:** surfaces are defined primarily by `1px` neutral borders (`--gray-200`) plus a light `--shadow-sm`; avoid heavy drop shadows except on modals.
- **Corners:** always a radius token — `--radius-xs` (4) chips, `--radius-sm` (6) buttons, `--radius-md` (8) everything else, `--radius-pill` for pills/dots. No raw radius numbers.
- **Weight for hierarchy:** this UI signals importance with font-weight (`800–900`) more than size. Keep body text at `13–15px`.
- **Accent rules:** yellow top borders and red left borders are the recurring "Shell" signature — reuse them for new page headers and emphasis instead of inventing new treatments.
- **Styling location:** shared values → CSS variables in `index.css`; component layout → local `const s = {}` object. **Reference tokens, don't hardcode** — no raw brand hex, status hex, neutral hex, or radius numbers when a token exists.
- **Utilities:** `.card`, `.separator` (1px hairline), `.capex-req-row`, `.capex-subnav-btn` live in `index.css`. Custom scrollbars are thin (`6px`) and translucent.
