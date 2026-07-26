import { api } from "../shared/lib/invoke";

/** Full app surface themes */
export type ThemeId =
  | "midnight"
  | "daylight"
  | "ocean"
  | "forest"
  | "sunset"
  | "violet"
  | "rose"
  | "mono"
  | "luxury-dark"
  | "luxury-light";

/** Icon color palettes (nav, chrome, list icons) */
export type IconColorId =
  | "theme" // follow accent
  | "luxury-gold"
  | "luxury-platinum"
  | "luxury-champagne"
  | "luxury-obsidian"
  | "luxury-pearl"
  | "luxury-sapphire"
  | "luxury-emerald";

export type LayoutNav = "bottom" | "dock" | "rail";
export type NotesLayout = "grid" | "list" | "compact";
export type Density = "comfortable" | "compact";
export type DefaultTab = "notes" | "files" | "vault" | "settings";

export type AppearancePrefs = {
  themeId: ThemeId;
  followSystem: boolean;
  iconColorId: IconColorId;
  layoutNav: LayoutNav;
  notesLayout: NotesLayout;
  density: Density;
  defaultTab: DefaultTab;
};

export const THEME_OPTIONS: {
  id: ThemeId;
  label: string;
  description: string;
  mode: "dark" | "light";
  swatches: [string, string, string];
}[] = [
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep blue-gray default",
    mode: "dark",
    swatches: ["#0b0d12", "#181c26", "#6b8cff"],
  },
  {
    id: "daylight",
    label: "Daylight",
    description: "Clean light surfaces",
    mode: "light",
    swatches: ["#f4f5f8", "#ffffff", "#3d5afe"],
  },
  {
    id: "luxury-dark",
    label: "Luxury Dark",
    description: "Black, gold, deep charcoal",
    mode: "dark",
    swatches: ["#0a0a0a", "#161412", "#d4af37"],
  },
  {
    id: "luxury-light",
    label: "Luxury Light",
    description: "Ivory, soft gold, platinum",
    mode: "light",
    swatches: ["#f7f4ef", "#ffffff", "#9a7b2f"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Teal on deep navy",
    mode: "dark",
    swatches: ["#07131a", "#0f2230", "#2dd4bf"],
  },
  {
    id: "forest",
    label: "Forest",
    description: "Paper light + green",
    mode: "light",
    swatches: ["#f3f6f1", "#ffffff", "#2f9e44"],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm dark + amber",
    mode: "dark",
    swatches: ["#140e0c", "#241a16", "#ff9f43"],
  },
  {
    id: "violet",
    label: "Violet",
    description: "Soft purple dark",
    mode: "dark",
    swatches: ["#100e18", "#1c1830", "#b197fc"],
  },
  {
    id: "rose",
    label: "Rose",
    description: "Blush light",
    mode: "light",
    swatches: ["#faf5f6", "#ffffff", "#e64980"],
  },
  {
    id: "mono",
    label: "Mono",
    description: "Neutral grayscale",
    mode: "dark",
    swatches: ["#0c0c0c", "#171717", "#e5e5e5"],
  },
];

export const ICON_COLOR_OPTIONS: {
  id: IconColorId;
  label: string;
  description: string;
  preview: string;
  suite: "auto" | "dark" | "light";
}[] = [
  {
    id: "theme",
    label: "Match theme",
    description: "Icons use the theme accent",
    preview: "var(--color-accent)",
    suite: "auto",
  },
  {
    id: "luxury-gold",
    label: "Luxury Gold",
    description: "Dark suite — rich metallic gold",
    preview: "#d4af37",
    suite: "dark",
  },
  {
    id: "luxury-platinum",
    label: "Luxury Platinum",
    description: "Dark suite — cool silver-white",
    preview: "#e8e8ec",
    suite: "dark",
  },
  {
    id: "luxury-champagne",
    label: "Luxury Champagne",
    description: "Dark suite — soft warm metal",
    preview: "#e6d5a8",
    suite: "dark",
  },
  {
    id: "luxury-obsidian",
    label: "Luxury Obsidian",
    description: "Light suite — deep near-black icons",
    preview: "#1a1a1c",
    suite: "light",
  },
  {
    id: "luxury-pearl",
    label: "Luxury Pearl",
    description: "Light suite — soft graphite pearl",
    preview: "#5c5c66",
    suite: "light",
  },
  {
    id: "luxury-sapphire",
    label: "Luxury Sapphire",
    description: "Either suite — deep jewel blue",
    preview: "#3d5afe",
    suite: "auto",
  },
  {
    id: "luxury-emerald",
    label: "Luxury Emerald",
    description: "Either suite — deep jewel green",
    preview: "#0ca678",
    suite: "auto",
  },
];

export const LAYOUT_NAV_OPTIONS: { id: LayoutNav; label: string; description: string }[] = [
  { id: "bottom", label: "Bottom tabs", description: "Classic tab bar" },
  { id: "dock", label: "Floating dock", description: "Raised pill above home area" },
  { id: "rail", label: "Side rail", description: "Left icon rail" },
];

export const NOTES_LAYOUT_OPTIONS: { id: NotesLayout; label: string; description: string }[] = [
  { id: "grid", label: "Grid", description: "Keep-style masonry cards" },
  { id: "list", label: "List", description: "Single-column rows" },
  { id: "compact", label: "Compact", description: "Dense cards, more on screen" },
];

export const DENSITY_OPTIONS: { id: Density; label: string }[] = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
];

export const DEFAULT_TAB_OPTIONS: { id: DefaultTab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "vault", label: "Vault" },
  { id: "settings", label: "Settings" },
];

export const DEFAULT_PREFS: AppearancePrefs = {
  themeId: "midnight",
  followSystem: false,
  iconColorId: "theme",
  layoutNav: "bottom",
  notesLayout: "list",
  density: "compact",
  defaultTab: "notes",
};

const KEYS = {
  themeId: "theme_id",
  followSystem: "theme_follow_system",
  iconColorId: "icon_color_id",
  layoutNav: "layout_nav",
  notesLayout: "layout_notes",
  density: "layout_density",
  defaultTab: "default_tab",
} as const;

function themeMeta(id: ThemeId) {
  return THEME_OPTIONS.find((t) => t.id === id) ?? THEME_OPTIONS[0];
}

export function resolveThemeId(prefs: AppearancePrefs): ThemeId {
  if (!prefs.followSystem) return prefs.themeId;
  if (typeof window === "undefined") return prefs.themeId;
  const light = window.matchMedia("(prefers-color-scheme: light)").matches;
  if (light) {
    const m = themeMeta(prefs.themeId);
    return m.mode === "light" ? prefs.themeId : "daylight";
  }
  const m = themeMeta(prefs.themeId);
  return m.mode === "dark" ? prefs.themeId : "midnight";
}

/** Map CSS variables for icon inactive/active colors */
function applyIconColors(iconColorId: IconColorId, themeMode: "dark" | "light") {
  const root = document.documentElement;
  root.dataset.iconColor = iconColorId;

  const map: Record<IconColorId, { idle: string; active: string; muted: string }> = {
    theme: {
      idle: "var(--color-text-tertiary)",
      active: "var(--color-accent)",
      muted: "var(--color-accent-muted)",
    },
    "luxury-gold": {
      idle: "#a68b2c",
      active: "#d4af37",
      muted: "rgba(212, 175, 55, 0.18)",
    },
    "luxury-platinum": {
      idle: "#9ca3af",
      active: "#e8e8ec",
      muted: "rgba(232, 232, 236, 0.14)",
    },
    "luxury-champagne": {
      idle: "#b8a078",
      active: "#e6d5a8",
      muted: "rgba(230, 213, 168, 0.16)",
    },
    "luxury-obsidian": {
      idle: "#4a4a52",
      active: "#1a1a1c",
      muted: "rgba(26, 26, 28, 0.1)",
    },
    "luxury-pearl": {
      idle: "#8b8b96",
      active: "#5c5c66",
      muted: "rgba(92, 92, 102, 0.12)",
    },
    "luxury-sapphire": {
      idle: themeMode === "dark" ? "#6b7fd7" : "#5c6bc0",
      active: "#3d5afe",
      muted: "rgba(61, 90, 254, 0.14)",
    },
    "luxury-emerald": {
      idle: themeMode === "dark" ? "#2f9e6a" : "#0b9b6a",
      active: "#0ca678",
      muted: "rgba(12, 166, 120, 0.14)",
    },
  };

  const c = map[iconColorId] ?? map.theme;
  root.style.setProperty("--icon-idle", c.idle);
  root.style.setProperty("--icon-active", c.active);
  root.style.setProperty("--icon-active-bg", c.muted);
}

export function applyAppearance(prefs: AppearancePrefs) {
  const themeId = resolveThemeId(prefs);
  const meta = themeMeta(themeId);
  const root = document.documentElement;
  root.dataset.theme = themeId;
  root.dataset.mode = meta.mode;
  root.dataset.layoutNav = prefs.layoutNav;
  root.dataset.notesLayout = prefs.notesLayout;
  root.dataset.density = prefs.density;
  root.style.colorScheme = meta.mode;
  applyIconColors(prefs.iconColorId, meta.mode);

  const metaEl = document.querySelector('meta[name="theme-color"]');
  if (metaEl) metaEl.setAttribute("content", meta.swatches[0]);

  try {
    localStorage.setItem("doctool-theme-boot", themeId);
    localStorage.setItem("doctool-icon-boot", prefs.iconColorId);
  } catch {
    /* ignore */
  }
}

export async function loadAppearancePrefs(): Promise<AppearancePrefs> {
  const prefs: AppearancePrefs = { ...DEFAULT_PREFS };
  try {
    const rows = await Promise.all([
      api.settingsGet(KEYS.themeId),
      api.settingsGet(KEYS.followSystem),
      api.settingsGet(KEYS.iconColorId),
      api.settingsGet(KEYS.layoutNav),
      api.settingsGet(KEYS.notesLayout),
      api.settingsGet(KEYS.density),
      api.settingsGet(KEYS.defaultTab),
    ]);
    const [themeId, follow, iconColorId, layoutNav, notesLayout, density, defaultTab] = rows;
    if (THEME_OPTIONS.some((t) => t.id === themeId)) prefs.themeId = themeId as ThemeId;
    if (follow === "1" || follow === "true") prefs.followSystem = true;
    if (ICON_COLOR_OPTIONS.some((o) => o.id === iconColorId))
      prefs.iconColorId = iconColorId as IconColorId;
    if (LAYOUT_NAV_OPTIONS.some((o) => o.id === layoutNav)) prefs.layoutNav = layoutNav as LayoutNav;
    if (NOTES_LAYOUT_OPTIONS.some((o) => o.id === notesLayout))
      prefs.notesLayout = notesLayout as NotesLayout;
    if (DENSITY_OPTIONS.some((o) => o.id === density)) prefs.density = density as Density;
    if (DEFAULT_TAB_OPTIONS.some((o) => o.id === defaultTab))
      prefs.defaultTab = defaultTab as DefaultTab;
  } catch {
    try {
      const boot = localStorage.getItem("doctool-theme-boot") as ThemeId | null;
      if (boot && THEME_OPTIONS.some((t) => t.id === boot)) prefs.themeId = boot;
      const icon = localStorage.getItem("doctool-icon-boot") as IconColorId | null;
      if (icon && ICON_COLOR_OPTIONS.some((o) => o.id === icon)) prefs.iconColorId = icon;
    } catch {
      /* */
    }
  }
  applyAppearance(prefs);
  return prefs;
}

export async function saveAppearancePrefs(prefs: AppearancePrefs) {
  applyAppearance(prefs);
  try {
    await Promise.all([
      api.settingsSet(KEYS.themeId, prefs.themeId),
      api.settingsSet(KEYS.followSystem, prefs.followSystem ? "1" : "0"),
      api.settingsSet(KEYS.iconColorId, prefs.iconColorId),
      api.settingsSet(KEYS.layoutNav, prefs.layoutNav),
      api.settingsSet(KEYS.notesLayout, prefs.notesLayout),
      api.settingsSet(KEYS.density, prefs.density),
      api.settingsSet(KEYS.defaultTab, prefs.defaultTab),
    ]);
  } catch {
    /* ignore */
  }
}

export function watchSystemAppearance(prefs: AppearancePrefs, onChange: () => void) {
  if (!prefs.followSystem || typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const handler = () => {
    applyAppearance(prefs);
    onChange();
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
