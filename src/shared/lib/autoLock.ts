/** V3 — Auto-lock vault after idle / background. */

import { api } from "./invoke";

const META_TIMEOUT = "vault.auto_lock_seconds";
const DEFAULT_SECONDS = 300; // 5 min

let timer: ReturnType<typeof setTimeout> | null = null;
let seconds = DEFAULT_SECONDS;
let enabled = true;
let onLocked: (() => void) | null = null;

export async function initAutoLock(opts?: { onLocked?: () => void }) {
  onLocked = opts?.onLocked ?? null;
  try {
    const v = await api.settingsGet(META_TIMEOUT);
    if (v === "0" || v === "off") {
      enabled = false;
      seconds = 0;
    } else if (v && !Number.isNaN(Number(v))) {
      seconds = Math.max(30, Number(v));
      enabled = true;
    }
  } catch {
    /* defaults */
  }
  bind();
  arm();
}

export async function setAutoLockSeconds(s: number) {
  seconds = s;
  enabled = s > 0;
  await api.settingsSet(META_TIMEOUT, String(s));
  arm();
}

export function getAutoLockSeconds() {
  return seconds;
}

function arm() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!enabled || seconds <= 0) return;
  timer = setTimeout(() => {
    void lockNow();
  }, seconds * 1000);
}

async function lockNow() {
  try {
    const st = await api.vaultStatus();
    if (st.unlocked) {
      await api.vaultLock();
      onLocked?.();
    }
  } catch {
    /* ignore */
  }
}

function bind() {
  if (typeof window === "undefined") return;
  const bump = () => arm();
  ["pointerdown", "keydown", "touchstart", "scroll"].forEach((ev) =>
    window.addEventListener(ev, bump, { passive: true })
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && enabled) {
      void lockNow();
    } else {
      arm();
    }
  });
  window.addEventListener("blur", () => {
    // Soft: don't lock on every desktop focus change if timeout is long; only when tab hidden handled above
  });
}
