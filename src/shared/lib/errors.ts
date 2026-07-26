/** U8 — User-safe error catalog. Map codes / raw messages to actionable copy. */

const CATALOG: Record<string, string> = {
  VaultLocked: "Vault is locked. Unlock it first.",
  VaultNotConfigured: "No vault yet. Create one under Vault.",
  NotFound: "That item could not be found.",
  HostKeyMismatch: "SFTP host key changed. Reset the pin only if you trust this host.",
  Validation: "Check your input and try again.",
  Crypto: "Cryptographic operation failed. Password or key may be wrong.",
  Network: "Network unavailable. Changes stay on this device until you are online.",
  Permission: "Permission denied. Check file access or credentials.",
  Cancelled: "Cancelled.",
  Internal: "Something went wrong. Try again.",
  DriveNotLinked: "Google Drive is not linked. Connect it under Vault.",
  Conflict: "This note conflicts with another copy. Resolve it in Vault sync.",
  BiometricUnavailable: "Biometrics unavailable. Use your password.",
  ImportFailed: "Import failed. File may be corrupt or the wrong format.",
};

export function friendlyError(err: unknown): string {
  if (!err) return CATALOG.Internal;
  if (typeof err === "string") return sanitize(err);
  if (typeof err === "object") {
    const e = err as { code?: string; message?: string };
    if (e.code && CATALOG[e.code]) return CATALOG[e.code];
    if (e.message) return sanitize(e.message);
  }
  return CATALOG.Internal;
}

function sanitize(msg: string): string {
  const m = msg.trim();
  // Strip panic/stack noise
  if (/^Error:/.test(m) && m.length > 200) return CATALOG.Internal;
  if (/panic|stack backtrace|at 0x/i.test(m)) return CATALOG.Internal;
  // Known substrings
  for (const [code, text] of Object.entries(CATALOG)) {
    if (m.includes(code)) return text;
  }
  if (m.length > 180) return m.slice(0, 177) + "…";
  return m;
}

export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: string }).code);
  }
  return undefined;
}
