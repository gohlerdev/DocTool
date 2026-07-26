# DocTool — Modern Mobile UI Redesign Plan (Extremely Detailed)

**Version:** 1.0  
**Date:** 2026-07-26  
**Skill:** `modern-mobile-ui` (tokens → hierarchy → states → motion → a11y → device verify)  
**Stack reality:** Tauri 2 + React + WebView (Android/iOS), not native Compose/SwiftUI  
**Status:** Plan only — no implementation until approved  

---

## 0. Executive summary

### 0.1 Goal

Elevate DocTool from a **functional mid-tier MVP UI** to a **top-tier 2025–26 mobile product feel** on Android (and iOS parity), without rewriting the Rust core or abandoning the WebView shell.

### 0.2 One-sentence design direction

**“Private Keep meets a calm developer tool”** — soft tonal surfaces, ruthless hierarchy (one primary action per screen), physical springs, real icons, designed empty/loading/error states, edge-to-edge safe areas, light + dark first-class.

### 0.3 What this plan is *not*

- Not a rewrite to Jetpack Compose / SwiftUI (out of scope unless future native shell).  
- Not a brand rebrand with new product name.  
- Not adding features (SFTP/Drive); UI only + structural polish that enables feel.  
- Not desktop-first redesign (desktop inherits tokens; mobile is the quality bar).

### 0.4 Success criteria (definition of “modern”)

| # | Criterion | How verified |
|---|-----------|--------------|
| S1 | No emoji as nav icons; Lucide (or equivalent) SVG icons | Screenshot |
| S2 | Full token system; zero raw hex in screen components | `rg` audit |
| S3 | Light + dark both first-class and screenshotted | Emulator shots |
| S4 | Every primary screen has content / empty / loading / error | Checklist |
| S5 | Edge-to-edge + safe-area + keyboard padding correct | Emulator |
| S6 | Touch targets ≥ 44px (prefer 48) on all controls | Measure |
| S7 | Structural motion with one spring family; reduced-motion respected | Manual |
| S8 | Notes list feels Keep-grade (masonry, color wash, press scale) | Screenshot |
| S9 | Hierarchy: exactly one loud primary action per screen | Design review |
| S10 | Rebuild + install on Android emulator; no regressions on core flows | adb |

---

## 1. Research base

### 1.1 Skill non-negotiables (mapped to WebView)

| Skill rule | DocTool WebView mapping |
|------------|-------------------------|
| Tokens before screens | CSS variables + `theme.ts` + no hex in TSX |
| One primary action | Button variants: `primary` \| `secondary` \| `ghost` \| `danger` |
| Four states | Shared `<EmptyState>`, `<Skeleton>`, `<ErrorBanner>` |
| Springs not durations | CSS `spring()` where available + WAAPI / small motion util |
| a11y 48dp / labels | min-height 48px; `aria-label` on icon buttons |
| Edge-to-edge + keyboard | `env(safe-area-*)` + `visualViewport` keyboard padding |
| Elevation tonal not painted | Surface steps, not heavy drop-shadows |
| Dark + light first-class | `[data-theme="light\|dark"]` on `<html>` |
| Verify on device | Android emulator already available |

### 1.2 Platform references adapted

**From Material 3 Expressive / Android (Compose ref):**

- Tonal surface container ladder (`surface` → `surfaceContainerHigh`)  
- Dynamic color: *optional* later via Android WebView CSS injection; v1 use branded palette  
- Bottom sheets for secondary flows (color picker, SFTP host key, filters)  
- Predictive back: use history stack + CSS transition; Android system predictive back limited in WebView  

**From iOS SwiftUI ref (principles):**

- Large title collapsing behavior on Notes  
- Sheet presentation for editor optional alternate; v1 full-screen push is fine  
- SF-like spacing rhythm (8pt grid)  

**From motion & haptics ref:**

| Event | Motion | Haptic (if exposed via Tauri plugin) |
|-------|--------|--------------------------------------|
| Note card press | scale 0.97 spring | light impact optional |
| Note open | shared-element-ish fade+slide | none |
| FAB press | scale + elevate | medium |
| Save success | checkmark morph | success |
| Destructive delete confirm | shake optional | warning |
| Vault unlock success | shield pulse once | success |
| Host key accept | sheet dismiss spring | selection |

**From polish checklist:**

Every screen must pass the 12-point audit after implementation (hierarchy, status once, spacing, truncation, four states, both themes, insets, targets, type scale, motion, haptics, labels).

### 1.3 Competitive visual references (for feel, not clone)

| App | Steal this | Do not steal |
|-----|------------|--------------|
| Google Keep | Color wash cards, speed of capture, grid | Cluttered multi-account chrome |
| Apple Notes | Large title, calm type, folders sheet | Flat monochrome only |
| Obsidian mobile | Editor density when in-file | Over-plugin visual noise |
| Linear mobile | Typography, primary action discipline | Pure SaaS purple brand |
| Proton / privacy apps | Trust/security status clarity | Paranoid red aesthetics |

### 1.4 Current DocTool UI audit (what is weak)

Evidence: `src/styles.css`, `App.tsx`, feature pages, emulator screenshot `docs/android-screenshot.png`.

| # | Weakness | Severity | Cause | Fix direction |
|---|----------|----------|-------|---------------|
| W1 | Emoji icons in bottom nav | High | No icon system | Lucide SVG components |
| W2 | Dark-only tokens; light theme incomplete | High | `:root` hardcodes dark | Dual theme token tables |
| W3 | No loading skeletons | High | Only empty + error | Skeleton cards for notes/files |
| W4 | Generic bordered buttons everywhere | High | One button style | Variant system + hierarchy |
| W5 | No motion | High | Static CSS | Spring motion utility |
| W6 | FAB overlaps content poorly; double primary (New + FAB) | Med | Two loud CTAs | FAB only on mobile list; header New becomes ghost or removed |
| W7 | Safe-area partial (bottom only) | Med | Missing top inset | Full safe-area padding |
| W8 | Keyboard can cover note editor | Med | No IME pad | visualViewport listener |
| W9 | Note colors as left-border only | Med | Weak Keep fidelity | Soft full-card wash + border |
| W10 | Search field looks default HTML | Med | Unstyled chrome | Pill search with icon |
| W11 | Bottom nav is flat border bar | Med | No blur/tonal lift | Tonal bar + active indicator |
| W12 | Files list is plain buttons | Med | No row component | ListRow with icon, meta, chevron |
| W13 | Vault/Settings panels feel form-wizard | Med | Bootstrap-like panels | Segmented control, hero status card |
| W14 | No pressed/focused ring system | Med | Missing states | Focus-visible + press |
| W15 | Desktop inherits mobile amateur cues | Low | Shared emoji | Same icon set everywhere |
| W16 | PDF viewer bare iframe | Low | Functional only | Chrome toolbar polish |
| W17 | No splash / adaptive icon polish | Med | Default Tauri assets | Icon + splash pass (phase late) |
| W18 | Status can duplicate (error banner + toast later) | Low | No status policy | One `StatusHost` |

### 1.5 What is already good (keep)

- Correct **IA**: Notes / Files / Vault / Settings  
- Notes-first mobile default  
- Empty state copy is friendly (“Capture a thought”)  
- Dark palette base is calm (good starting surface)  
- Adaptive shell switch at 900px exists  

---

## 2. Design system specification (tokens first)

### 2.1 File structure (target)

```
src/
  design/
    tokens.css          # CSS variables only
    themes.ts           # theme switch + system preference
    motion.ts           # spring presets, prefers-reduced-motion
    haptics.ts          # optional Tauri haptic bridge
  shared/ui/
    Icon.tsx            # Lucide wrapper
    Button.tsx
    IconButton.tsx
    TextField.tsx
    ListRow.tsx
    NoteCard.tsx
    EmptyState.tsx
    Skeleton.tsx
    ErrorBanner.tsx
    SegmentedControl.tsx
    Sheet.tsx           # bottom sheet
    StatusHost.tsx
    AppBar.tsx
    BottomNav.tsx
    FAB.tsx
    TextArea.tsx
```

**Rule:** Feature pages import only `shared/ui/*` + tokens. No hex in feature TSX. No emoji icons.

### 2.2 Color tokens

Use **semantic names**, dual theme.

#### Dark (default)

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#0B0D12` | App canvas (slightly deeper than today) |
| `--color-surface-0` | `#12151C` | Base surface |
| `--color-surface-1` | `#181C26` | Cards / elevated |
| `--color-surface-2` | `#222836` | Pressed / high container |
| `--color-surface-3` | `#2C3446` | Active chips |
| `--color-border` | `rgba(255,255,255,0.08)` | Hairline |
| `--color-border-strong` | `rgba(255,255,255,0.14)` | Inputs focused ring base |
| `--color-text` | `#F2F4F8` | Primary text |
| `--color-text-secondary` | `#A8B0C0` | Secondary |
| `--color-text-tertiary` | `#6B7385` | Hints |
| `--color-accent` | `#8BA4FF` | Brand (slightly softer than pure blue) |
| `--color-accent-muted` | `rgba(139,164,255,0.16)` | Selected nav bg |
| `--color-accent-fg` | `#0B1020` | Text on accent buttons |
| `--color-danger` | `#FF6B7A` | Destructive |
| `--color-danger-muted` | `rgba(255,107,122,0.14)` | Danger bg |
| `--color-success` | `#3DDC97` | Success / unlocked |
| `--color-success-muted` | `rgba(61,220,151,0.14)` | Success bg |
| `--color-warning` | `#F5C451` | Vault setup / host key |
| `--color-scrim` | `rgba(0,0,0,0.52)` | Modal backdrop |

#### Light

| Token | Value |
|-------|-------|
| `--color-bg` | `#F4F5F8` |
| `--color-surface-0` | `#FFFFFF` |
| `--color-surface-1` | `#FFFFFF` |
| `--color-surface-2` | `#EEF0F5` |
| `--color-surface-3` | `#E4E7EF` |
| `--color-border` | `rgba(15,18,28,0.08)` |
| `--color-border-strong` | `rgba(15,18,28,0.14)` |
| `--color-text` | `#12141A` |
| `--color-text-secondary` | `#5C6475` |
| `--color-text-tertiary` | `#8B93A7` |
| `--color-accent` | `#3D5AFE` |
| `--color-accent-muted` | `rgba(61,90,254,0.10)` |
| `--color-accent-fg` | `#FFFFFF` |
| `--color-danger` | `#E03131` |
| `--color-success` | `#0CA678` |
| `--color-warning` | `#E67700` |
| `--color-scrim` | `rgba(10,12,20,0.4)` |

#### Note color washes (Keep fidelity)

Each note color = soft background + stronger edge:

| Name | Dark bg | Dark edge | Light bg | Light edge |
|------|---------|-----------|----------|------------|
| default | surface-1 | border | white | border |
| red | `#2A1518` | `#FF6B7A` | `#FFE3E3` | `#FA5252` |
| orange | `#2A1C12` | `#FF922B` | `#FFE8CC` | `#FD7E14` |
| yellow | `#2A2412` | `#FCC419` | `#FFF3BF` | `#FAB005` |
| green | `#122A1A` | `#51CF66` | `#D3F9D8` | `#40C057` |
| teal | `#122A28` | `#20C997` | `#C3FAE8` | `#12B886` |
| blue | `#121F2A` | `#4DABF7` | `#D0EBFF` | `#339AF0` |
| purple | `#1E122A` | `#CC5DE8` | `#F3D9FA` | `#BE4BDB` |
| gray | `#1A1C22` | `#868E96` | `#E9ECEF` | `#868E96` |

Contrast: body text on wash must pass WCAG AA for small text (≥4.5:1). Validate both themes.

### 2.3 Typography tokens

| Token | Size | Weight | Line | Use |
|-------|------|--------|------|-----|
| `--text-display` | 28px / 1.75rem | 700 | 1.2 | Large titles (Notes home) |
| `--text-title` | 22px | 650 | 1.25 | Screen titles |
| `--text-title-sm` | 17px | 600 | 1.3 | Card titles |
| `--text-body` | 16px | 400 | 1.45 | Body |
| `--text-body-sm` | 14px | 400 | 1.4 | Snippets, meta |
| `--text-caption` | 12px | 500 | 1.3 | Chips, nav labels |
| `--text-mono` | 13px | 500 | 1.4 | Recovery keys, paths |

**Font stack:**

```css
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

Ship Inter via `@fontsource/inter` (self-host; no CDN dependency). Optional JetBrains Mono only for recovery key screens.

**Dynamic type:** Prefer `rem` everywhere. Support up to 1.5× system font scale without clipping AppBar actions (wrap or icon-only overflow menu).

### 2.4 Spacing scale (4/8 base)

| Token | Value |
|-------|-------|
| `--space-0` | 0 |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

**Screen edge gutter:** `--space-4` (16) mobile; `--space-6` (24) tablet+.  
**Card internal padding:** `--space-4`.  
**Section gap:** `--space-6`.

### 2.5 Radius scale

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Chips, small controls |
| `--radius-md` | 12px | Buttons, inputs |
| `--radius-lg` | 16px | Cards |
| `--radius-xl` | 22px | Sheets, FAB container |
| `--radius-full` | 9999px | Pills, FAB |

### 2.6 Elevation (tonal, not shadow-first)

Prefer surface step changes. Shadows only for:

- FAB (soft, low opacity)  
- Modal sheet top edge  
- Dragged note card  

```css
--elev-fab: 0 8px 28px rgba(0,0,0,0.35);
--elev-sheet: 0 -8px 32px rgba(0,0,0,0.28);
```

Light theme: reduce shadow opacity ~50%.

### 2.7 Motion tokens

| Name | Spec | Use |
|------|------|-----|
| `spring-default` | response ~280ms, damping ~0.82 | Sheets, cards enter |
| `spring-snappy` | response ~180ms, damping ~0.9 | Buttons press, chips |
| `fade-fast` | 120ms ease-out | Cross-fade only when reduced motion |

CSS approach:

```css
/* modern browsers */
transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 200ms ease;
```

JS util for FLIP list animations optional later.

**Reduced motion:**

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Keep opacity fades for structure.

### 2.8 Z-index scale

| Layer | Z |
|-------|---|
| content | 0 |
| sticky app bar | 20 |
| bottom nav | 30 |
| FAB | 40 |
| sheet / modal | 50 |
| toast / status | 60 |

### 2.9 Safe area tokens

```css
--safe-top: env(safe-area-inset-top, 0px);
--safe-right: env(safe-area-inset-right, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);
--nav-h: 56px;
--appbar-h: 52px;
--keyboard-inset: 0px; /* set by JS visualViewport */
```

`SafeArea` component pads top+sides; main scroll pads bottom: `calc(var(--nav-h) + var(--safe-bottom) + var(--space-4))`.  
Editor mode: hide bottom nav; pad bottom with `var(--keyboard-inset)`.

---

## 3. Component recipes

### 3.1 `Button`

| Variant | Visual | When |
|---------|--------|------|
| `primary` | Filled accent, accent-fg text | Single primary action |
| `secondary` | Surface-2 fill, text primary | Secondary actions |
| `ghost` | Transparent, text secondary | Tertiary |
| `danger` | Danger-muted bg + danger text | Delete |
| `danger-solid` | Danger fill | Confirm delete in sheet |

Sizes: `sm` (36h) / `md` (44h) / `lg` (48h). Min width for icon+label.  
Press: scale 0.97 (`spring-snappy`).  
Disabled: opacity 0.45, no press.

### 3.2 `IconButton`

- 48×48 hit target; visual 40×40 circle  
- `aria-label` **required** prop (TypeScript enforced)  
- Variants: ghost / filled / accent  

### 3.3 `BottomNav`

```
┌─────────────────────────────────────┐
│  [icon]  [icon]  [icon]  [icon]     │  ← tonal surface-0 + top hairline
│  Notes   Files   Vault   Settings   │
│         ^^^^ active: accent icon +
│              muted pill behind icon │
└─────────────────────────────────────┘
+ safe-bottom padding
```

- Active: icon color accent + 32×32 rounded rect `accent-muted` behind icon  
- Inactive: tertiary text  
- Optional: hide with transform when scrolling down on long notes list (nice-to-have P2)  
- Hide entirely on Note Editor / full-screen File Editor  

Icons (Lucide):

| Tab | Icon |
|-----|------|
| Notes | `StickyNote` |
| Files | `Folder` |
| Vault | `Shield` |
| Settings | `Settings` |

### 3.4 `AppBar`

Mobile Notes home:

```
[ large title "Notes"          ] [ filter chip ] [ search icon ]
```

Or sticky compact on scroll:

```
[ Notes ] .................... [ archive ] [ + ]
```

Implement scroll-linked title collapse (P1): large title → compact.

Primary action: prefer **FAB** over header “New” on mobile (remove dual primary — W6).

### 3.5 `FAB`

- 56×56, radius full, accent fill  
- Icon `Plus` white/dark  
- Position: `right: 16`, `bottom: calc(nav-h + safe-bottom + 16)`  
- Shadow `--elev-fab`  
- Press scale 0.94  

### 3.6 `NoteCard`

```
┌────────────────────────────┐
│  Title                  📌 │  ← title-sm, 2-line max ellipsis
│  Snippet line one          │  ← body-sm secondary, 3 lines
│  Snippet …                 │
│  [label] [label]    2m ago │  ← chips + relative time
└────────────────────────────┘
 soft color wash background
```

- Press: scale 0.98 + surface-2  
- Grid: `auto-fill, minmax(156px, 1fr)` gap 12  
- Stable `key={note.id}`  
- Optional enter animation: fade + 8px Y  

### 3.7 `SearchField`

Pill shape, left search icon, clear button when non-empty, `role="search"`.

### 3.8 `ListRow` (Files / Settings)

```
[ leading icon ]  Title                    [ meta ]
                  Subtitle truncated…        ›
```

Min height 56. Divider inset from left icon edge (iOS-style) or full hairline (Android) — pick **full hairline on surface** for simplicity across platforms.

### 3.9 `EmptyState`

```
[ illustration / large muted icon ]
Title (one line)
Body (one line, secondary)
[ Primary button ]
```

Never empty white silence.

### 3.10 `Skeleton`

Note grid: 6 cards shimmer (CSS gradient animation).  
Files: 8 rows shimmer.  
Respect reduced motion → static gray blocks.

### 3.11 `ErrorBanner`

Single line + Retry text button. Uses danger-muted.  
Placed under AppBar only (status once).

### 3.12 `Sheet`

Bottom sheet for:

- Note color picker  
- Host key trust  
- Delete confirm  
- Label manager  
- Theme picker  

Drag handle, scrim, spring height, focus trap, Esc/back closes.

### 3.13 `SegmentedControl`

Vault unlock: Password | Recovery key.  
Files source: Local | SFTP | Vault.

### 3.14 `StatusHost`

Global thin toast top or bottom (above nav): “Saved”, “Vault unlocked”, “Sync complete”.  
Auto-dismiss 2.5s. One at a time.

---

## 4. Screen-by-screen redesign specs

### 4.1 Notes — Home (mobile)

**Job:** Find or capture a note (primary = create).

**Layout:**

1. SafeArea top  
2. AppBar (title Notes)  
3. SearchField  
4. Optional filter chips: All | Archived (segmented or chips)  
5. Scroll: Pinned section header + grid; Others grid  
6. FAB create  
7. BottomNav  

**States:**

| State | UI |
|-------|-----|
| Loading | 6 skeleton cards |
| Empty (active) | EmptyState “Capture a thought” + Create |
| Empty (archived) | “Nothing archived” + Back to active |
| Error | ErrorBanner + Retry |
| Content | Grids |

**Hierarchy fix:** Remove header primary “New” on mobile; FAB only.

**Motion:** Stagger first paint of cards 40ms (skip if >20 notes or reduced motion).

### 4.2 Notes — Editor

**Job:** Write (primary = implicit autosave; secondary Save if offline error).

**Layout:**

1. Top bar: Back | title ellipsis | Overflow (pin, color, labels, delete)  
2. Title field (borderless, title size)  
3. Color strip (horizontal swatches, 44px targets)  
4. Format toolbar (sticky above keyboard)  
5. Tiptap body  
6. No bottom nav  

**Keyboard:** toolbar sits above keyboard via `--keyboard-inset`.  
**Status once:** subtle “Saving…/Saved” in top bar trailing.  
**Delete:** opens danger Sheet, not `window.confirm` (native confirm is unmodern).

### 4.3 Files — Browser

**Job:** Open a file.

**Layout:**

1. AppBar “Files”  
2. Segmented: Local | Servers | Vault  
3. Horizontal SFTP profile chips if Servers  
4. Breadcrumb pills (scroll-x)  
5. List of ListRows  
6. BottomNav  

**States:** loading skeletons, empty folder, error, host-key sheet.  
**File row leading icons by type:** md, code, pdf, image, folder (Lucide).

### 4.4 Files — Editor

**Job:** Edit & save (primary = Save when dirty).

**Layout:**

1. Top: Back | filename | Save (primary only if dirty) | Preview toggle (md)  
2. CodeMirror / PDF  
3. No bottom nav  

**Dirty policy:** Save button uses primary; disabled/ghost when clean.

### 4.5 Vault

**Job:** Establish trust + unlock (primary depends on state).

**States as full screens / hero cards:**

| State | Hero | Primary |
|-------|------|---------|
| Not configured | Shield illustration | Create vault |
| Locked | Locked shield + status | Unlock |
| Unlocked | Green shield + entry counts | Sync now; Lock secondary |
| Recovery display | Warning emphasis | Continue (disabled until checkbox) |

Use SegmentedControl for password vs recovery.  
Recovery key: mono block, copy button, auto-clear clipboard timer UI.

### 4.6 Settings

**Job:** Configure (no single primary — list of destinations).

**Sections as grouped lists:**

1. Appearance (theme: System / Dark / Light)  
2. SFTP servers (rows + add)  
3. About (version, license, data path)  

Add server → full screen or sheet form with clear primary “Save profile”.

### 4.7 Desktop (≥900px) inheritance

- Same tokens + icons  
- Sidebar uses Icon + label; active accent-muted pill  
- No FAB; primary “New note” in Notes header OK  
- Main content max-width for vault forms ~480px centered left  

---

## 5. Navigation & platform chrome

### 5.1 Navigation model

| From | To | Transition |
|------|----|------------|
| Tab ↔ Tab | Instant cross-fade 120ms | Keep scroll state per tab (P1) |
| Notes list → Editor | Slide from right (iOS-feel) or fade-up | Spring-default |
| Editor → List | Reverse | |
| Any → Sheet | Scrim fade + sheet spring up | |

Implement lightweight stack in React state (already `editingId`); add CSS classes `enter`/`exit`.

### 5.2 Android WebView specifics

- Ensure `viewport-fit=cover` in `index.html`  
- Theme status bar: light content on dark theme (Tauri/Android styles)  
- `overscroll-behavior: none` on body to reduce glow  
- Test 3-button and gesture nav heights  

### 5.3 iOS WebView specifics (when building)

- `viewport-fit=cover`  
- `-webkit-overflow-scrolling: touch`  
- Avoid 300ms delay (already none on modern iOS)  
- Safe area critical for home indicator  

### 5.4 App icon & splash (late phase)

- Adaptive icon Android (foreground logo “D” monogram + brand accent)  
- Splash: surface-0 + centered monogram, no long branded animation  

---

## 6. Implementation phases (UI-only)

Estimate assumes 1 engineer familiar with the codebase.

### Phase U0 — Design system foundation (1–2 days)

| ID | Task | Done when |
|----|------|-----------|
| U0.1 | Add `tokens.css` dual theme | Variables complete |
| U0.2 | `themes.ts` system/dark/light | Persists via settings_set |
| U0.3 | Wire `data-theme` on `<html>` | Flash-free best effort |
| U0.4 | Install Lucide-react + Inter font | Bundle OK |
| U0.5 | `Icon`, `Button`, `IconButton` | Story-less but used in App shell |
| U0.6 | Replace bottom nav + sidebar icons | No emoji |
| U0.7 | SafeArea + keyboard inset hook | Editor not covered |
| U0.8 | `viewport-fit=cover` meta | index.html |

**Exit:** App shell looks modern; themes switch; no emoji nav.

### Phase U1 — Shared primitives (1–2 days)

| ID | Task | Done when |
|----|------|-----------|
| U1.1 | EmptyState, Skeleton, ErrorBanner | Components exist |
| U1.2 | SearchField, ListRow, SegmentedControl | |
| U1.3 | Sheet + StatusHost | Host key + toasts |
| U1.4 | FAB, AppBar | |
| U1.5 | motion.ts helpers | pressable HOC/class |

**Exit:** Features can be migrated without new primitives mid-flight.

### Phase U2 — Notes redesign (1–2 days)

| ID | Task | Done when |
|----|------|-----------|
| U2.1 | NoteCard wash colors | Keep-grade |
| U2.2 | Notes home states | skeleton/empty/error/content |
| U2.3 | Remove dual primary | FAB only mobile |
| U2.4 | Editor chrome + delete sheet | No window.confirm |
| U2.5 | Autosave status in app bar | |
| U2.6 | Emulator screenshots light/dark | |

**Exit:** Notes is the showcase screen.

### Phase U3 — Files redesign (1–2 days)

| ID | Task | Done when |
|----|------|-----------|
| U3.1 | Source segmented control | |
| U3.2 | ListRow file browser | |
| U3.3 | Breadcrumb pills | |
| U3.4 | Host key Sheet | |
| U3.5 | Editor top bar hierarchy | Save only if dirty |
| U3.6 | PDF chrome toolbar | |

**Exit:** Files feels like a real browser, not form buttons.

### Phase U4 — Vault + Settings (1 day)

| ID | Task | Done when |
|----|------|-----------|
| U4.1 | Vault hero status card | |
| U4.2 | Segmented unlock | |
| U4.3 | Recovery key redesigned | |
| U4.4 | Settings grouped lists | |
| U4.5 | Theme picker UI | |

**Exit:** Trust UX is clear and premium-calm.

### Phase U5 — Motion, haptics, polish (1–2 days)

| ID | Task | Done when |
|----|------|-----------|
| U5.1 | Card enter / press springs | |
| U5.2 | Sheet springs | |
| U5.3 | Reduced motion gate | |
| U5.4 | Optional haptics plugin | No-op if missing |
| U5.5 | Full polish checklist pass | All 12 points |
| U5.6 | Font scale 1.5× spot check | |
| U5.7 | Landscape spot check | Usable or locked portrait |

**Exit:** Feels physical and intentional.

### Phase U6 — Platform packaging (0.5–1 day)

| ID | Task | Done when |
|----|------|-----------|
| U6.1 | App icon assets | Adaptive |
| U6.2 | Splash | |
| U6.3 | Status bar color bridge | |
| U6.4 | Final emulator video/screenshots | docs/ui/shots/ |

**Exit:** Store-ready visual identity (still MIT app).

### Dependency graph

```
U0 → U1 → U2 → U5
        ↘ U3 ↗
        ↘ U4 ↗
              → U6
```

**Critical path:** U0 → U1 → U2 → U5 → U6  

---

## 7. File-level change map

| File | Action |
|------|--------|
| `index.html` | viewport-fit=cover, theme-color meta |
| `src/styles.css` | Replace with imports of tokens + residual layout or delete |
| `src/design/tokens.css` | **Create** |
| `src/design/themes.ts` | **Create** |
| `src/design/motion.ts` | **Create** |
| `src/shared/ui/*` | **Create** primitives |
| `src/App.tsx` | Use BottomNav, theme, SafeArea |
| `src/features/notes/*` | Restyle |
| `src/features/files/*` | Restyle |
| `src/features/vault/*` | Restyle |
| `src/features/settings/*` | Restyle |
| `package.json` | lucide-react, @fontsource/inter |
| `docs/ui-ux.md` | Update tokens to match |
| `docs/ui/shots/*` | Emulator evidence |

---

## 8. Accessibility plan

| Requirement | Implementation |
|-------------|----------------|
| Touch ≥ 48px | IconButton, nav items, FAB |
| Labels | aria-label on all icon-only |
| Focus visible | 2px accent ring offset 2px |
| Contrast | Token audit AA |
| Reduced motion | CSS media + motion.ts |
| Screen reader | landmark `nav`, `main`, search |
| Large text | rem; AppBar collapse to icons |
| RTL | defer P2 (use logical properties where easy: margin-inline) |

---

## 9. Performance budget (UI)

| Metric | Target |
|--------|--------|
| Route tab switch | < 100ms perceived |
| Notes list 200 cards | 60fps scroll (virtualize if jank) |
| Font + icon payload | Inter variable or 2 weights only; tree-shake Lucide |
| First contentful Notes | skeletons ≤ 1 frame after bridge ready |

If notes grid janks > 100 items → CSS content-visibility or virtualize (react-virtuoso) in U5.

---

## 10. Verification loop (mandatory)

Per polish-checklist, for **each** of U2–U4:

1. `npm run tauri android build -- --debug --target x86_64`  
2. `adb install -r …app-universal-debug.apk`  
3. Drive: create note, archive, vault create (test password), files browse  
4. `adb exec-out screencap -p > docs/ui/shots/{screen}-{theme}.png`  
5. Open PNGs and run 12-point audit  
6. Fix → re-shot  

**Matrix:**

| Screen | Dark | Light | Loading | Empty | Error |
|--------|------|-------|---------|-------|-------|
| Notes home | ☐ | ☐ | ☐ | ☐ | ☐ |
| Note editor | ☐ | ☐ | ☐ | — | ☐ |
| Files | ☐ | ☐ | ☐ | ☐ | ☐ |
| Vault | ☐ | ☐ | ☐ | — | ☐ |
| Settings | ☐ | ☐ | ☐ | ☐ | ☐ |

Also: keyboard open on editor; font scale if emulator supports.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| WebView ≠ native Material/iOS | Don’t fake exact M3 ripples; aim for quality, not clone |
| Bundle size from CM + Tiptap + Lucide | Tree-shake icons; lazy editors already heavy — don’t add framer-motion full unless needed |
| Theme flash on launch | Inline tiny boot script set data-theme before paint |
| Safe area bugs vary by OEM | Test emulator + document real device follow-up |
| Desktop regression | Shared tokens; visual QA desktop once at end of U5 |
| Scope creep to native rewrite | Explicit non-goal |

---

## 12. Out of scope (explicit)

- Jetpack Compose / SwiftUI rewrite  
- Full custom illustration set (use Lucide + simple SVG marks)  
- Marketing website  
- Collaboration cursors / multiplayer UI  
- Complete desktop IDE chrome redesign  
- Google Drive OAuth UI beyond existing vault copy  

---

## 13. Deliverables checklist

- [ ] This plan approved  
- [ ] U0–U6 implemented per exit criteria  
- [ ] `docs/ui-ux.md` updated to final tokens  
- [ ] `docs/ui/shots/` populated  
- [ ] Android emulator demo stable  
- [ ] No emoji icons remain (`rg '📝|📁|🔒|⚙' src`)  
- [ ] No raw hex in `src/features` (`rg '#[0-9A-Fa-f]{3,8}' src/features`)  

---

## 14. Recommended execution order (first PR)

**PR1 = U0 only** (tokens + icons + shell + safe area + theme).  
Smallest PR that makes the app *read* modern immediately. Then U1, then Notes showcase (U2).

---

## 15. Appendix A — Hierarchy rules (quick ref)

1. One primary filled button per view.  
2. Destructive never primary color.  
3. Status appears once.  
4. Navigation is never “primary button” styled.  
5. FAB counts as the primary for Notes home.

## Appendix B — Copy refresh (micro)

| Place | Old | New |
|-------|-----|-----|
| Notes empty title | Capture a thought | Capture a thought *(keep)* |
| Notes empty body | Keep-style notes… | Offline-first. Encrypted when your vault is on. |
| Vault create | long paragraph | Your notes encrypt on this device before they leave it. |
| Host key | Trust host key? | Verify this server |
| Delete note | browser confirm | Sheet: Delete note? This moves it to trash. |

## Appendix C — Icon map (complete)

| UI element | Lucide |
|------------|--------|
| Notes tab | StickyNote |
| Files tab | Folder |
| Vault tab | Shield |
| Settings tab | Settings |
| FAB / New | Plus |
| Search | Search |
| Archive | Archive |
| Pin | Pin |
| More | MoreVertical |
| Back | ChevronLeft |
| Save | Check / Save |
| File md | FileText |
| File code | FileCode |
| File pdf | FileType |
| Folder row | Folder |
| Sync | RefreshCw |
| Lock | Lock |
| Unlock | Unlock |
| Copy | Copy |
| Warning | AlertTriangle |
| Error | CircleAlert |
| Empty notes | NotebookPen |

---

*End of plan. Implementation starts only after approval; first PR = Phase U0.*
