import { useEffect, useState } from "react";
import { api, AppInfo } from "../../shared/lib/invoke";

export function SettingsPage() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: "22",
    username: "",
    authType: "password",
    password: "",
    privateKeyPem: "",
    defaultPath: "/",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    try {
      setInfo(await api.appInfo());
      setProfiles(await api.sftpProfilesList());
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveProfile() {
    try {
      setError(null);
      await api.sftpProfileSave({
        name: form.name || form.host,
        host: form.host,
        port: Number(form.port) || 22,
        username: form.username,
        authType: form.authType,
        password: form.authType === "password" ? form.password : undefined,
        privateKeyPem: form.authType === "key" ? form.privateKeyPem : undefined,
        defaultPath: form.defaultPath || "/",
      });
      setMsg("SFTP profile saved");
      setForm({
        name: "",
        host: "",
        port: "22",
        username: "",
        authType: "password",
        password: "",
        privateKeyPem: "",
        defaultPath: "/",
      });
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function removeProfile(id: string) {
    await api.sftpProfileDelete(id);
    await refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="panel stack" style={{ marginBottom: "1rem" }}>
        <h2>About DocTool</h2>
        {info && (
          <>
            <p>
              Version <strong>{info.version}</strong> · OS <strong>{info.os}</strong>
            </p>
            <p className="muted">Device: {info.deviceId}</p>
            <p className="muted" style={{ wordBreak: "break-all" }}>
              Data: {info.dataDir}
            </p>
          </>
        )}
        <p className="muted">MIT © 2026 gohlerdev · Privacy-first documents workspace</p>
      </div>

      <div className="panel stack" style={{ marginBottom: "1rem" }}>
        <h2>SFTP profiles</h2>
        {profiles.map((p) => (
          <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
            <span>
              {p.name} — {p.username}@{p.host}:{p.port}
            </span>
            <button className="danger" onClick={() => removeProfile(p.id)}>
              Delete
            </button>
          </div>
        ))}
        {profiles.length === 0 && <p className="muted">No servers yet</p>}
        <hr style={{ borderColor: "var(--border)", width: "100%" }} />
        <h3>Add server</h3>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Host"
          value={form.host}
          onChange={(e) => setForm({ ...form, host: e.target.value })}
        />
        <input
          placeholder="Port"
          value={form.port}
          onChange={(e) => setForm({ ...form, port: e.target.value })}
        />
        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <select
          value={form.authType}
          onChange={(e) => setForm({ ...form, authType: e.target.value })}
        >
          <option value="password">Password</option>
          <option value="key">Private key</option>
        </select>
        {form.authType === "password" ? (
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        ) : (
          <textarea
            placeholder="Paste private key PEM"
            rows={4}
            value={form.privateKeyPem}
            onChange={(e) => setForm({ ...form, privateKeyPem: e.target.value })}
          />
        )}
        <input
          placeholder="Default path"
          value={form.defaultPath}
          onChange={(e) => setForm({ ...form, defaultPath: e.target.value })}
        />
        <button className="primary" onClick={saveProfile} disabled={!form.host || !form.username}>
          Save profile
        </button>
      </div>
    </div>
  );
}
