import { useEffect, useState } from "react";
import { api, AppInfo } from "../../shared/lib/invoke";
import {
  AppBar,
  Button,
  ErrorBanner,
  toast,
} from "../../shared/ui";
import {
  AppearancePrefs,
  DEFAULT_PREFS,
  DEFAULT_TAB_OPTIONS,
  DENSITY_OPTIONS,
  ICON_COLOR_OPTIONS,
  LAYOUT_NAV_OPTIONS,
  NOTES_LAYOUT_OPTIONS,
  THEME_OPTIONS,
  saveAppearancePrefs,
  type DefaultTab,
  type Density,
  type IconColorId,
  type LayoutNav,
  type NotesLayout,
  type ThemeId,
} from "../../design/themes";
import { resetOnboarding } from "../onboarding/OnboardingLesson";
import { ONBOARDING_CHECKLIST_KEY } from "../onboarding/lessons";

type Props = {
  prefs: AppearancePrefs;
  onPrefsChange: (p: AppearancePrefs) => void;
  onReplayOnboarding?: () => void;
};

export function SettingsPage({ prefs, onPrefsChange, onReplayOnboarding }: Props) {
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

  async function patch(partial: Partial<AppearancePrefs>) {
    const next = { ...prefs, ...partial };
    onPrefsChange(next);
    await saveAppearancePrefs(next);
    // Silent save — toast on every theme tap feels spammy
  }

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
      toast("SFTP profile saved", "success");
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
    <div className="page-gap">
      <AppBar title="Settings" />
      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* ── Themes ── */}
      <h2 className="section-h">Theme</h2>
      <div className="toggle-row">
        <div>
          <div className="option-row__title">Follow system light/dark</div>
          <div className="option-row__desc">Match OS light/dark</div>
        </div>
        <input
          type="checkbox"
          checked={prefs.followSystem}
          onChange={(e) => patch({ followSystem: e.target.checked })}
          aria-label="Follow system theme"
        />
      </div>
      <div className="theme-grid">
        {THEME_OPTIONS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`theme-card ${prefs.themeId === t.id ? "is-selected" : ""}`}
            onClick={() => patch({ themeId: t.id as ThemeId })}
          >
            <span className="theme-card__swatches">
              {t.swatches.map((c, i) => (
                <span
                  key={i}
                  className="theme-card__swatch"
                  style={{ background: c }}
                />
              ))}
            </span>
            <span className="theme-card__label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Icon colors ── */}
      <h2 className="section-h">Icon color</h2>
      <div className="icon-color-grid">
        {ICON_COLOR_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`icon-color-card ${prefs.iconColorId === o.id ? "is-selected" : ""}`}
            onClick={() => patch({ iconColorId: o.id as IconColorId })}
            title={o.description}
          >
            <span
              className="icon-color-card__dot"
              style={{
                background:
                  o.id === "theme" ? "var(--color-accent)" : o.preview.startsWith("var") ? undefined : o.preview,
              }}
            />
            <span className="icon-color-card__label">
              {o.label.replace(/^Luxury\s+/i, "")}
            </span>
          </button>
        ))}
      </div>

      {/* ── Layouts ── */}
      <h2 className="section-h">Navigation layout</h2>
      <div className="option-list">
        {LAYOUT_NAV_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`option-row ${prefs.layoutNav === o.id ? "is-selected" : ""}`}
            onClick={() => patch({ layoutNav: o.id as LayoutNav })}
          >
            <span className="option-row__radio" />
            <span>
              <div className="option-row__title">{o.label}</div>
              <div className="option-row__desc">{o.description}</div>
            </span>
          </button>
        ))}
      </div>

      <h2 className="section-h">Notes layout</h2>
      <div className="option-list">
        {NOTES_LAYOUT_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`option-row ${prefs.notesLayout === o.id ? "is-selected" : ""}`}
            onClick={() => patch({ notesLayout: o.id as NotesLayout })}
          >
            <span className="option-row__radio" />
            <span>
              <div className="option-row__title">{o.label}</div>
              <div className="option-row__desc">{o.description}</div>
            </span>
          </button>
        ))}
      </div>

      <h2 className="section-h">Density</h2>
      <div className="option-list">
        {DENSITY_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`option-row ${prefs.density === o.id ? "is-selected" : ""}`}
            onClick={() => patch({ density: o.id as Density })}
          >
            <span className="option-row__radio" />
            <span className="option-row__title">{o.label}</span>
          </button>
        ))}
      </div>

      <h2 className="section-h">Start screen</h2>
      <div className="option-list">
        {DEFAULT_TAB_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`option-row ${prefs.defaultTab === o.id ? "is-selected" : ""}`}
            onClick={() => patch({ defaultTab: o.id as DefaultTab })}
          >
            <span className="option-row__radio" />
            <span className="option-row__title">{o.label}</span>
          </button>
        ))}
      </div>

      {/* ── SFTP ── */}
      <h2 className="section-h">SFTP servers</h2>
      <div className="panel stack">
        {profiles.map((p) => (
          <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">
              {p.name} — {p.username}@{p.host}:{p.port}
            </span>
            <Button variant="danger" size="sm" onClick={() => removeProfile(p.id)}>
              Delete
            </Button>
          </div>
        ))}
        {profiles.length === 0 && <p className="muted">No servers yet</p>}
        <input
          className="field"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="field"
          placeholder="Host"
          value={form.host}
          onChange={(e) => setForm({ ...form, host: e.target.value })}
        />
        <input
          className="field"
          placeholder="Port"
          value={form.port}
          onChange={(e) => setForm({ ...form, port: e.target.value })}
        />
        <input
          className="field"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <select
          className="field"
          value={form.authType}
          onChange={(e) => setForm({ ...form, authType: e.target.value })}
        >
          <option value="password">Password</option>
          <option value="key">Private key</option>
        </select>
        {form.authType === "password" ? (
          <input
            className="field"
            type="password"
            placeholder="Password (encrypted at rest)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        ) : (
          <>
            <textarea
              className="field"
              placeholder="Paste private key PEM (encrypted at rest)"
              rows={4}
              value={form.privateKeyPem}
              onChange={(e) => setForm({ ...form, privateKeyPem: e.target.value })}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pem,.key,text/plain,*/*";
                input.onchange = async () => {
                  const f = input.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  setForm((prev) => ({ ...prev, privateKeyPem: text }));
                  toast("Key file loaded", "success");
                };
                input.click();
              }}
            >
              Pick key file…
            </Button>
          </>
        )}
        <input
          className="field"
          placeholder="Default path"
          value={form.defaultPath}
          onChange={(e) => setForm({ ...form, defaultPath: e.target.value })}
        />
        <Button
          variant="primary"
          block
          onClick={saveProfile}
          disabled={!form.host || !form.username}
        >
          Save profile
        </Button>
      </div>

      {/* ── Sample data (O5) ── */}
      <h2 className="section-h">Getting started data</h2>
      <div className="panel stack">
        <p className="muted">Seed a sample welcome note without replaying the full lesson.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await api.notesSeedSample();
              toast("Sample note created", "success");
            } catch (e: any) {
              setError(e?.message || String(e));
            }
          }}
        >
          Add sample note
        </Button>
      </div>

      {/* ── WebDAV (F7) ── */}
      <h2 className="section-h">WebDAV / Nextcloud</h2>
      <div className="panel stack">
        <p className="muted">
          Profiles are used from Files → add URL below to store credentials (encrypted at rest via
          settings). Browse via Files source when connected.
        </p>
        <WebDavSettings />
      </div>

      {/* ── Privacy / crash (P4) ── */}
      <h2 className="section-h">Privacy</h2>
      <div className="panel stack">
        <label className="toggle-row">
          <div>
            <div className="option-row__title">Opt-in crash reports</div>
            <div className="option-row__desc">Off by default. Never includes note bodies.</div>
          </div>
          <CrashOptIn />
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await api.dbVacuum();
            toast("Database vacuum complete", "success");
          }}
        >
          Vacuum local database
        </Button>
      </div>

      {/* ── About ── */}
      <h2 className="section-h">About</h2>
      <div className="panel stack">
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
        <p className="muted">
          MIT © 2026 gohlerdev · Vault format v2 · Argon2id 128 MiB · AES-256-GCM
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onPrefsChange(DEFAULT_PREFS);
            saveAppearancePrefs(DEFAULT_PREFS);
            toast("Reset to defaults", "info");
          }}
        >
          Reset appearance defaults
        </Button>
        {onReplayOnboarding && (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await resetOnboarding();
              await api.settingsSet(ONBOARDING_CHECKLIST_KEY, "0");
              toast("Starting lesson…", "info");
              onReplayOnboarding();
            }}
          >
            Replay onboarding lesson
          </Button>
        )}
      </div>
    </div>
  );
}

function CrashOptIn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    api.settingsGet("privacy.crash_opt_in").then((v) => setOn(v === "1")).catch(() => {});
  }, []);
  return (
    <input
      type="checkbox"
      checked={on}
      aria-label="Opt-in crash reports"
      onChange={async (e) => {
        setOn(e.target.checked);
        await api.settingsSet("privacy.crash_opt_in", e.target.checked ? "1" : "0");
        toast(e.target.checked ? "Crash reports on (no note content)" : "Crash reports off", "info");
      }}
    />
  );
}

function WebDavSettings() {
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  useEffect(() => {
    (async () => {
      setUrl((await api.settingsGet("webdav.url")) || "");
      setUser((await api.settingsGet("webdav.user")) || "");
    })();
  }, []);
  return (
    <>
      <input
        className="field"
        placeholder="https://cloud.example/remote.php/dav/files/user/"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <input
        className="field"
        placeholder="Username"
        value={user}
        onChange={(e) => setUser(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="Password / app password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          await api.settingsSet("webdav.url", url);
          await api.settingsSet("webdav.user", user);
          if (pass) await api.settingsSet("webdav.pass", pass);
          toast("WebDAV settings saved", "success");
        }}
      >
        Save WebDAV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!url || !user}
        onClick={async () => {
          try {
            const list = await api.webdavList({
              url,
              username: user,
              password: pass || (await api.settingsGet("webdav.pass")) || "",
              path: "/",
            });
            toast(`WebDAV ok · ${list.length} entries`, "success");
          } catch (e: any) {
            toast(e?.message || "WebDAV failed", "error");
          }
        }}
      >
        Test connection
      </Button>
    </>
  );
}
