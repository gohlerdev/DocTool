/** O4 — One-shot contextual coaches. */

import { api } from "./invoke";

const KEYS = {
  vault: "coach.v1.vault",
  sftp: "coach.v1.sftp",
} as const;

export type CoachId = keyof typeof KEYS;

export async function shouldShowCoach(id: CoachId): Promise<boolean> {
  try {
    const v = await api.settingsGet(KEYS[id]);
    return v !== "1" && v !== "true";
  } catch {
    return false;
  }
}

export async function dismissCoach(id: CoachId): Promise<void> {
  await api.settingsSet(KEYS[id], "1");
}

export const COACH_COPY: Record<CoachId, { title: string; body: string }> = {
  vault: {
    title: "Your vault",
    body: "Create a strong password and save the recovery key offline. We cannot reset a lost password. Auto-lock keeps the vault safe when you leave the app.",
  },
  sftp: {
    title: "SFTP security",
    body: "Host keys are pinned on first connect (TOFU). If the key changes later, DocTool blocks the connection until you reset the pin intentionally.",
  },
};
