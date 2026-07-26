/** Interactive first-install lesson definitions (onboarding v1). */

export const ONBOARDING_COMPLETED_KEY = "onboarding.v1.completed";
export const ONBOARDING_OPEN_VAULT_KEY = "onboarding.v1.open_vault_next";
export const ONBOARDING_CHECKLIST_KEY = "onboarding.v1.checklist_dismissed";

export type LessonStepId =
  | "welcome"
  | "first_note"
  | "vault_intro"
  | "map"
  | "done";

export type LessonStep = {
  id: LessonStepId;
  /** Short label for a11y / progress */
  label: string;
  title: string;
  body: string;
  /** Primary CTA label when not interactive-gated */
  primaryLabel?: string;
  /** Whether step requires a completed interactive action before Continue */
  requiresAction?: boolean;
};

export const LESSON_STEPS: LessonStep[] = [
  {
    id: "welcome",
    label: "Welcome",
    title: "Your private workspace",
    body: "DocTool keeps notes, files, and an encrypted vault on your device. No account required. Nothing leaves this phone unless you choose SFTP or cloud sync.",
    primaryLabel: "Start lesson",
  },
  {
    id: "first_note",
    label: "First note",
    title: "Capture a thought",
    body: "Notes are offline-first and searchable. Write anything below — this becomes a real note in your library.",
    requiresAction: true,
    primaryLabel: "Save note & continue",
  },
  {
    id: "vault_intro",
    label: "Vault",
    title: "Optional encrypted vault",
    body: "The vault locks notes and secrets with Argon2id + AES-256-GCM. Your password never leaves the device — we cannot reset it. Set up later anytime under Vault. If you create a vault, save the recovery key offline.",
    primaryLabel: "Continue",
  },
  {
    id: "map",
    label: "Map",
    title: "Four places to know",
    body: "Notes for capture. Files for local folders and SFTP. Vault for lock & sync. Settings for appearance and SFTP profiles.",
    primaryLabel: "Continue",
  },
  {
    id: "done",
    label: "Done",
    title: "You’re ready",
    body: "You can replay this lesson anytime from Settings. Optional next steps stay on a small checklist until you dismiss them.",
    primaryLabel: "Open Notes",
  },
];

export type ChecklistItemId =
  | "create_note"
  | "setup_vault"
  | "add_sftp"
  | "try_theme";

export type ChecklistItem = {
  id: ChecklistItemId;
  title: string;
  hint: string;
  tab?: "notes" | "files" | "vault" | "settings";
};

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "create_note",
    title: "Create another note",
    hint: "Pin, color, and search work offline.",
    tab: "notes",
  },
  {
    id: "setup_vault",
    title: "Set up the encrypted vault",
    hint: "Strong password + offline recovery key.",
    tab: "vault",
  },
  {
    id: "add_sftp",
    title: "Add an SFTP profile",
    hint: "Browse and edit remote markdown.",
    tab: "settings",
  },
  {
    id: "try_theme",
    title: "Pick a theme & density",
    hint: "Appearance lives in Settings.",
    tab: "settings",
  },
];

export const MAP_DESTINATIONS = [
  { id: "notes", title: "Notes", blurb: "Keep-style capture & search" },
  { id: "files", title: "Files", blurb: "Local folders & SFTP" },
  { id: "vault", title: "Vault", blurb: "Lock, unlock, encrypted sync" },
  { id: "settings", title: "Settings", blurb: "Theme, density, profiles" },
] as const;
