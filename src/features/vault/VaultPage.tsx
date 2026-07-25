import { useEffect, useState } from "react";
import { api, VaultStatus } from "../../shared/lib/invoke";

export function VaultPage() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [recovery, setRecovery] = useState("");
  const [newRecovery, setNewRecovery] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmSaved, setConfirmSaved] = useState(false);

  async function refresh() {
    try {
      setStatus(await api.vaultStatus());
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    setError(null);
    setMsg(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }
    try {
      const res = await api.vaultCreate(password);
      setNewRecovery(res.recoveryKey);
      setPassword("");
      setPassword2("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function unlock() {
    setError(null);
    try {
      if (useRecovery) {
        await api.vaultUnlock({ recoveryKey: recovery });
      } else {
        await api.vaultUnlock({ password });
      }
      setPassword("");
      setRecovery("");
      setMsg("Vault unlocked");
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function lock() {
    await api.vaultLock();
    setMsg("Vault locked");
    await refresh();
  }

  async function syncNow() {
    try {
      const r = await api.notesSyncNow();
      setMsg(`Sync: pushed ${r.pushed}, pulled ${r.pulled}`);
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  if (!status) return <p className="muted">Loading vault…</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Vault</h1>
        <span className="muted">
          <span className={`status-dot ${status.unlocked ? "ok" : "lock"}`} />
          {status.unlocked ? "Unlocked" : status.configured ? "Locked" : "Not configured"}
        </span>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      {newRecovery && (
        <div className="panel stack" style={{ marginBottom: "1rem" }}>
          <h2>Save your recovery key</h2>
          <p className="muted">
            This is the only way to access your vault if you forget your password. DocTool cannot
            reset it. Store it offline. You will not see it again.
          </p>
          <div className="recovery-key">{newRecovery}</div>
          <label className="row">
            <input
              type="checkbox"
              checked={confirmSaved}
              onChange={(e) => setConfirmSaved(e.target.checked)}
              style={{ width: "auto" }}
            />
            I have saved my recovery key offline
          </label>
          <button
            className="primary"
            disabled={!confirmSaved}
            onClick={() => {
              setNewRecovery(null);
              setConfirmSaved(false);
            }}
          >
            Continue
          </button>
        </div>
      )}

      {!status.configured && !newRecovery && (
        <div className="panel stack">
          <h2>Create encrypted vault</h2>
          <p className="muted">
            Client-side AES-256-GCM. Password or recovery key required. Local vault objects + dual-write notes.
          </p>
          <input
            type="password"
            placeholder="Password (min 8)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
          <button className="primary" onClick={create}>
            Create vault
          </button>
        </div>
      )}

      {status.configured && !status.unlocked && !newRecovery && (
        <div className="panel stack">
          <h2>Unlock vault</h2>
          <div className="row">
            <button className={!useRecovery ? "primary" : ""} onClick={() => setUseRecovery(false)}>
              Password
            </button>
            <button className={useRecovery ? "primary" : ""} onClick={() => setUseRecovery(true)}>
              Recovery key
            </button>
          </div>
          {useRecovery ? (
            <input
              placeholder="Recovery key"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
            />
          ) : (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button className="primary" onClick={unlock}>
            Unlock
          </button>
        </div>
      )}

      {status.unlocked && (
        <div className="panel stack">
          <h2>Vault active</h2>
          <p className="muted">
            Entries: {status.entryCount} · Pending sync jobs: {status.pendingJobs}
          </p>
          <p className="muted">
            Google Drive cloud link: planned (local encrypted store active). Notes dual-write to
            vault when unlocked.
          </p>
          <div className="row">
            <button className="primary" onClick={syncNow}>
              Sync notes now
            </button>
            <button onClick={lock}>Lock</button>
          </div>
        </div>
      )}
    </div>
  );
}
