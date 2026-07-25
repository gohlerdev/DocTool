# DocTool — UI / UX Specification

**Platforms:** Linux, macOS (desktop shell) · iOS, Android (mobile shell)

---

## 1. Design principles

1. **Notes first on mobile** — capture must be &lt; 2 taps.  
2. **Files first on desktop** — sidebar sources always visible.  
3. **Privacy visible** — vault locked/unlocked status always clear.  
4. **Keyboard-friendly desktop** — palette, shortcuts.  
5. **One-handed mobile** — primary actions in thumb zone.  
6. **Calm density** — Keep-like cards; not cluttered IDE chrome by default.

---

## 2. Information architecture

### 2.1 Primary destinations

| Id | Name | Purpose |
|----|------|---------|
| notes | Notes | Keep-style notes |
| files | Files | Local, SFTP, vault browsers |
| vault | Vault | Unlock, status, recovery, Drive link |
| settings | Settings | Prefs, profiles, about |

### 2.2 Desktop layout (≥ 900px)

```
┌──────────────┬────────────────────────────┬─────────────┐
│ BRAND        │ Tab bar                    │             │
│              ├────────────────────────────┤  Inspector  │
│ Sources      │                            │  (optional) │
│  Notes       │     Editor / Browser       │  - outline  │
│  Local       │                            │  - meta     │
│  SFTP *      │                            │  - sync     │
│  Vault       │                            │             │
│  Recents     │                            │             │
│              │                            │             │
│ Search       │ Status: vault · sync       │             │
└──────────────┴────────────────────────────┴─────────────┘
```

- Sidebar width 240px resizable 200–320.  
- Inspector collapsible; hidden by default on small laptop widths 900–1100.

### 2.3 Mobile layout

```
┌──────────────────────────┐
│ Safe area · Title · ···  │
│                          │
│                          │
│       Content            │
│                          │
│                          │
├──────────────────────────┤
│  Notes  Files  Vault  ⚙  │
└──────────────────────────┘
```

- Editor routes hide bottom nav or shrink it.  
- Use native-feeling stack navigation (push/pop).

---

## 3. Visual design tokens (initial)

| Token | Dark (default) | Light |
|-------|----------------|-------|
| bg.app | `#0f1115` | `#f6f7f9` |
| bg.surface | `#171a21` | `#ffffff` |
| bg.card | `#1c2029` | `#ffffff` |
| text.primary | `#e8eaed` | `#1a1d23` |
| text.muted | `#9aa0a6` | `#5f6368` |
| accent | `#7c9cff` | `#3b5bdb` |
| danger | `#ff6b6b` | `#c92a2a` |
| success | `#51cf66` | `#2f9e44` |
| border | `#2a2f3a` | `#e2e5eb` |
| radius.md | 12px | 12px |
| font.ui | system-ui / Inter | |
| font.mono | ui-monospace / JetBrains Mono | |

**Note colors (Keep-like):** default, red, orange, yellow, green, teal, blue, purple, gray — background tints on cards.

---

## 4. Notes UX (Keep-like)

### 4.1 List

- Masonry grid (desktop 2–4 cols); single column list option.  
- Pinned section header “Pinned”.  
- Card shows title (bold), 3-line snippet, label chips, color edge.  
- Long-press / right-click: pin, archive, delete, change color, labels.  
- Search bar sticky; filters: label, archived, color.

### 4.2 Editor

- Title field (plain).  
- Tiptap body: bold, italic, underline, lists, checklist, code, link.  
- Top bar: back, color, label, pin, more (export md, delete).  
- Autosave indicator “Saved” / “Saving…”.

### 4.3 FAB

- Mobile: bottom-right “+” new note.  
- Desktop: sidebar button + shortcut `C` or `Ctrl+N` in notes context.

### 4.4 Empty state

Illustration + “Capture a thought” + button Create note.

---

## 5. Files UX

### 5.1 Source switcher

List: Local (bookmarks), each SFTP profile, Vault files.

### 5.2 Browser

- Table desktop: Name, Size, Modified.  
- List mobile: name + subtitle meta.  
- Sort menu.  
- Hidden files toggle.  
- Breadcrumb trail.

### 5.3 Open file

- Pushes editor tab (desktop) or full screen (mobile).  
- Unknown binary: detail sheet with Open as text / Download.

---

## 6. Vault UX

### 6.1 States

| State | Screen |
|-------|--------|
| Not configured | Wizard: create password → show recovery key → optional Drive |
| Locked | Password field + “Use recovery key” link + biometric button |
| Unlocked | Status: linked Drive, last sync, Lock button, Sync now |
| Error | Reconnect Drive, view sync errors |

### 6.2 Recovery key screen (critical)

- Full key in monospace, selectable.  
- Copy button → clipboard clear after 60s.  
- Checkbox “I stored this key offline”.  
- Confirm by re-typing first group.  
- Cannot dismiss without confirm or explicit “Skip vault” (warn).

### 6.3 Indicators

- Header shield icon: green unlocked / gray locked / amber error.

---

## 7. SFTP UX

- Profile list with color dots.  
- Add profile form: name, host, port, user, auth type, key import document picker.  
- First connect host key modal (Accept / Cancel).  
- Host key change: blocking red error + link to reset fingerprint.

---

## 8. Editor chrome

### Desktop tabs

- Favicon by type (md/pdf/code).  
- Dirty dot.  
- Middle-click close.  
- Drag reorder tabs (P1).

### Markdown

- Toolbar: bold, italic, code, link, heading, preview toggle.  
- Status: Ln/Col, encoding UTF-8.

### PDF

- Page input, zoom −/+, fit width, annotate toggle.

---

## 9. Command palette (desktop P0)

Shortcut: `Ctrl+K` / `Cmd+K`.

Commands:

- New note  
- Open recent…  
- Go to Notes / Files / Vault / Settings  
- Connect SFTP profile…  
- Lock vault  
- Sync now  
- Toggle theme  

---

## 10. Shortcuts (desktop)

| Key | Action |
|-----|--------|
| Ctrl/Cmd+N | New note |
| Ctrl/Cmd+S | Save |
| Ctrl/Cmd+P | Palette (alt) |
| Ctrl/Cmd+W | Close tab |
| Ctrl/Cmd+Shift+L | Lock vault |
| Esc | Close modal |

---

## 11. First-run wizard

1. Welcome + MIT blurb.  
2. Create vault (or skip with warning).  
3. Recovery key confirm.  
4. Link Google Drive (optional).  
5. Add SFTP (optional).  
6. Done → Notes.

---

## 12. Accessibility

- Focus visible 2px accent ring.  
- All icon buttons `aria-label`.  
- Hit targets ≥ 44px mobile.  
- `prefers-reduced-motion`: disable card layout animations.  
- Dynamic type: use rem; avoid fixed px fonts for body.  
- Contrast: WCAG AA for text on card colors (tint carefully).

---

## 13. Empty / error / loading patterns

| State | Pattern |
|-------|---------|
| Loading list | Skeleton cards/rows |
| Error | Inline banner + Retry |
| Empty | Illustration + primary CTA |
| Offline | Subtle top chip “Offline” |

---

## 14. Theming

- Default dark.  
- Settings: Dark / Light / System.  
- Persist in SQLite prefs.

---

## 15. Localization

- v1 English only.  
- All UI strings in one module for future i18n.

---

## 16. Wireframe notes (textual)

**Mobile new note:** FAB → editor with keyboard open → body focus.  
**Desktop SFTP edit:** Sidebar profile → path → double-click README → tab CM → Ctrl+S → toast Saved.  
**Vault unlock:** Open app → locked gate if “require unlock for notes sync” — **v1:** notes local work even if vault locked; vault files gated.
