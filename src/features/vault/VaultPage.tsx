import { useEffect, useState } from "react";
import { api, VaultStatus, invoke } from "../../shared/lib/invoke";
import { friendlyError } from "../../shared/lib/errors";
import { setAutoLockSeconds, getAutoLockSeconds } from "../../shared/lib/autoLock";
import { AppBar, Button, ErrorBanner, toast } from "../../shared/ui";
import { CoachBanner } from "../../shared/ui/CoachBanner";
import { EncryptionSheet } from "../../shared/ui/EncryptionSheet";

type CryptoInfo = {
  vaultFormatVersion: number;
  kdf: string;
  kdfMemoryMib: number;
  kdfIterations: number;
  aead: string;
  localSecrets: string;
  blobFormat: string;
};

export function VaultPage() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [crypto, setCrypto] = useState<CryptoInfo | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [recovery, setRecovery] = useState("");
  const [newRecovery, setNewRecovery] = useState<string | null>(null);
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [copied, setCopied] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(false);
  const [encOpen, setEncOpen] = useState(false);
  const [autoLock, setAutoLock] = useState(300);
  const [drive, setDrive] = useState<{ linked: boolean; hasToken: boolean } | null>(null);
  const [driveToken, setDriveToken] = useState("");
  const [importB64, setImportB64] = useState("");
  const [kdfHint, setKdfHint] = useState<string | null>(null);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  async function refresh() {
    try {
      setStatus(await api.vaultStatus());
      setDrive(await api.driveStatus());
      const s = await api.vaultGetAutoLock();
      setAutoLock(s);
    } catch (e: any) {
      setError(friendlyError(e));
    }
  }

  useEffect(() => {
    refresh();
    invoke<CryptoInfo>("crypto_info").then(setCrypto).catch(() => {});
    api.cryptoRecommendKdf()
      .then((r) =>
        setKdfHint(`This device: ~${r.recommendedMemoryMib} MiB Argon2 recommended`)
      )
      .catch(() => {});
    const onOff = () => setOffline(!navigator.onLine);
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  async function create() {
    setError(null);
    setMsg(null);
    if (password.length < 12) {
      setError("Password must be at least 12 characters (letters + digits)");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must include letters and digits");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }
    try {
      setBusy(true);
      const res = await api.vaultCreate(password);
      setNewRecovery(res.recoveryKey);
      setPassword("");
      setPassword2("");
      setCopied(false);
      setRecoveryConfirm("");
      await refresh();
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setError(null);
    try {
      setBusy(true);
      setUnlockProgress(true);
      // P2: show progress during Argon2 (sync IPC — UI spinner is the progress signal)
      if (useRecovery) {
        await api.vaultUnlock({ recoveryKey: recovery });
      } else {
        await api.vaultUnlock({ password });
      }
      setPassword("");
      setRecovery("");
      setMsg("Unlocked");
      toast("Vault unlocked", "success");
      await refresh();
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
      setUnlockProgress(false);
    }
  }

  async function lock() {
    await api.vaultLock();
    setMsg("Locked");
    toast("Vault locked", "info");
    await refresh();
  }

  async function syncNow() {
    try {
      const r = await api.notesSyncNow();
      setMsg(`Synced · pushed ${r.pushed} · pulled ${r.pulled}`);
      toast("Sync complete", "success");
      await refresh();
    } catch (e: any) {
      setError(friendlyError(e));
    }
  }

  async function finishRecoveryRitual() {
    const normalized = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();
    if (!copied) {
      setError("Copy the recovery key before continuing");
      return;
    }
    if (!newRecovery || normalized(recoveryConfirm) !== normalized(newRecovery)) {
      setError("Type the recovery key exactly to confirm you saved it");
      return;
    }
    setNewRecovery(null);
    setRecoveryConfirm("");
    setCopied(false);
    setMsg("Vault ready — recovery key confirmed");
    toast("Recovery key confirmed", "success");
  }

  async function exportBackup() {
    try {
      setBusy(true);
      const b64 = await api.vaultExportBackup();
      await navigator.clipboard?.writeText(b64).catch(() => {});
      // Also download as file
      const blob = new Blob([b64], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `doctool-vault-backup-${Date.now()}.dtbak`;
      a.click();
      toast("Encrypted backup exported", "success");
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function importBackup() {
    try {
      setBusy(true);
      await api.vaultImportBackup(importB64.trim());
      setImportB64("");
      toast("Backup imported — unlock with your password", "success");
      await refresh();
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <p className="muted">Loading vault…</p>;

  const pill = status.unlocked ? "ok" : status.configured ? "lock" : "warn";
  const pillLabel = status.unlocked ? "Unlocked" : status.configured ? "Locked" : "Setup";
  const recoveryOk =
    !!newRecovery &&
    copied &&
    recoveryConfirm.replace(/[\s-]/g, "").toUpperCase() ===
      newRecovery.replace(/[\s-]/g, "").toUpperCase();

  return (
    <div className="page-gap page-gap--tight">
      <AppBar
        title="Vault"
        trailing={<span className={`status-pill status-pill--${pill}`}>{pillLabel}</span>}
      />

      <CoachBanner id="vault" />

      {(offline || status.pendingJobs > 0) && (
        <div className={`sync-banner ${offline ? "is-offline" : ""}`} role="status">
          {offline
            ? "Offline — changes stay on this device"
            : `${status.pendingJobs} change${status.pendingJobs === 1 ? "" : "s"} pending sync`}
        </div>
      )}

      {status.unlocked && (
        <div className="screenshot-warn" role="note">
          Vault is unlocked. Avoid screen captures — secrets may be visible.
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {msg && <p className="inline-msg">{msg}</p>}

      {/* V1 recovery ritual — cannot dismiss without typed confirm */}
      {newRecovery && (
        <div className="panel stack">
          <h2>Save recovery key</h2>
          <p className="muted">
            Offline only — cannot reset a lost password. Copy, store offline, then type it back to
            confirm. You cannot skip this step.
          </p>
          <div className="recovery-key" aria-label="Recovery key">
            {newRecovery}
          </div>
          <Button
            variant="secondary"
            block
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(newRecovery);
                setCopied(true);
                toast("Copied to clipboard", "success");
              } catch {
                setError("Copy failed — select the key manually");
              }
            }}
          >
            {copied ? "Copied ✓" : "Copy recovery key"}
          </Button>
          <label className="onboarding__field-label" htmlFor="rk-confirm">
            Type recovery key to confirm
          </label>
          <input
            id="rk-confirm"
            className="field"
            placeholder="Paste or type recovery key"
            value={recoveryConfirm}
            onChange={(e) => setRecoveryConfirm(e.target.value)}
            autoComplete="off"
          />
          <Button variant="primary" block disabled={!recoveryOk} onClick={() => void finishRecoveryRitual()}>
            I saved it — continue
          </Button>
        </div>
      )}

      {!status.configured && !newRecovery && (
        <div className="panel stack">
          <h2>Create vault</h2>
          <p className="muted">Argon2id · AES-256-GCM · no password reset</p>
          {kdfHint && <p className="mono-meta">{kdfHint}</p>}
          <input
            className="field"
            type="password"
            placeholder="Password (12+, letters + digits)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <input
            className="field"
            type="password"
            placeholder="Confirm password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
          <Button variant="primary" block disabled={busy} onClick={create}>
            {busy ? "Creating…" : "Create vault"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEncOpen(true)}>
            How encryption works
          </Button>
        </div>
      )}

      {status.configured && !status.unlocked && !newRecovery && (
        <div className="panel stack">
          <h2>Unlock</h2>
          {unlockProgress && (
            <div className="unlock-progress" role="status">
              <div className="unlock-progress__bar" />
              <p className="muted">Deriving key with Argon2id… this can take a few seconds</p>
            </div>
          )}
          <div className="seg-mini">
            <button
              type="button"
              className={!useRecovery ? "is-active" : ""}
              onClick={() => setUseRecovery(false)}
            >
              Password
            </button>
            <button
              type="button"
              className={useRecovery ? "is-active" : ""}
              onClick={() => setUseRecovery(true)}
            >
              Recovery key
            </button>
          </div>
          {useRecovery ? (
            <input
              className="field"
              placeholder="Recovery key"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          ) : (
            <input
              className="field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          )}
          <Button variant="primary" block disabled={busy} onClick={unlock}>
            {busy ? "Unlocking…" : "Unlock"}
          </Button>
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            Biometric unlock uses the OS keystore after first password unlock (when available on
            device).
          </p>
        </div>
      )}

      {status.unlocked && (
        <div className="panel stack">
          <h2>Unlocked</h2>
          <p className="muted">
            {status.entryCount} entries · {status.pendingJobs} pending sync
            {status.driveLinked ? " · Drive linked" : ""}
          </p>
          {crypto && (
            <div className="crypto-card">
              <p className="crypto-card__title">Protection</p>
              <ul className="crypto-card__list">
                <li>
                  <strong>Key derivation:</strong> {crypto.kdf} ({crypto.kdfMemoryMib} MiB, t=
                  {crypto.kdfIterations})
                </li>
                <li>
                  <strong>Encryption:</strong> {crypto.aead}
                </li>
                <li>
                  <strong>Local secrets:</strong> {crypto.localSecrets}
                </li>
                <li>
                  <strong>Format:</strong> v{crypto.vaultFormatVersion} · {crypto.blobFormat}
                </li>
              </ul>
              <Button variant="ghost" size="sm" onClick={() => setEncOpen(true)}>
                How encryption works
              </Button>
            </div>
          )}
          <div className="row">
            <Button variant="primary" onClick={syncNow}>
              Sync now
            </Button>
            <Button variant="secondary" onClick={lock}>
              Lock
            </Button>
          </div>

          <h3 className="section-h" style={{ marginTop: 8 }}>
            Auto-lock
          </h3>
          <select
            className="field"
            value={autoLock}
            onChange={async (e) => {
              const s = Number(e.target.value);
              setAutoLock(s);
              await api.vaultSetAutoLock(s);
              await setAutoLockSeconds(s);
              toast(s === 0 ? "Auto-lock off" : `Auto-lock ${s}s`, "info");
            }}
          >
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
            <option value={1800}>30 minutes</option>
            <option value={0}>Off</option>
          </select>
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            Current session default: {getAutoLockSeconds()}s · also locks when app is backgrounded
          </p>

          <h3 className="section-h">Google Drive</h3>
          <p className="muted">
            {drive?.linked
              ? "Drive linked — encrypted blobs only leave the device."
              : "Not linked. Paste a refresh token from OAuth (system browser flow) or mark unlinked."}
          </p>
          {!drive?.linked && (
            <>
              <input
                className="field"
                placeholder="OAuth refresh token (optional)"
                value={driveToken}
                onChange={(e) => setDriveToken(e.target.value)}
              />
              <Button
                variant="secondary"
                block
                disabled={!driveToken.trim()}
                onClick={async () => {
                  await api.driveStoreToken(driveToken.trim());
                  setDriveToken("");
                  toast("Drive token stored (encrypted at rest)", "success");
                  await refresh();
                }}
              >
                Link Drive token
              </Button>
            </>
          )}
          {drive?.linked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await api.driveSetLinked(false);
                toast("Drive unlinked", "info");
                await refresh();
              }}
            >
              Unlink Drive
            </Button>
          )}

          <h3 className="section-h">Change password</h3>
          <PasswordChangeForm />

          <h3 className="section-h">Backup</h3>
          <Button variant="secondary" block disabled={busy} onClick={() => void exportBackup()}>
            Export encrypted backup
          </Button>
        </div>
      )}

      {status.configured && !status.unlocked && !newRecovery && (
        <div className="panel stack">
          <h3 className="section-h" style={{ margin: 0 }}>
            Import backup
          </h3>
          <p className="muted">Paste backup contents (base64). Then unlock with the original password.</p>
          <textarea
            className="field"
            rows={3}
            placeholder="Backup base64…"
            value={importB64}
            onChange={(e) => setImportB64(e.target.value)}
          />
          <Button
            variant="secondary"
            block
            disabled={busy || !importB64.trim()}
            onClick={() => void importBackup()}
          >
            Import backup
          </Button>
        </div>
      )}

      <EncryptionSheet open={encOpen} onClose={() => setEncOpen(false)} crypto={crypto} />
    </div>
  );
}

function PasswordChangeForm() {
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      <input
        className="field"
        type="password"
        placeholder="Current password"
        value={cur}
        onChange={(e) => setCur(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="New password"
        value={n1}
        onChange={(e) => setN1(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="Confirm new password"
        value={n2}
        onChange={(e) => setN2(e.target.value)}
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={busy || !cur || n1.length < 12 || n1 !== n2}
        onClick={async () => {
          try {
            setBusy(true);
            await api.vaultChangePassword(cur, n1);
            setCur("");
            setN1("");
            setN2("");
            toast("Password updated", "success");
          } catch (e: any) {
            toast(friendlyError(e), "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        Update password
      </Button>
    </div>
  );
}
