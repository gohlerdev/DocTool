import { useEffect, useState } from "react";
import { NotesPage } from "./features/notes/NotesPage";
import { FilesPage } from "./features/files/FilesPage";
import { VaultPage } from "./features/vault/VaultPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { api, VaultStatus } from "./shared/lib/invoke";
import "./styles.css";

type Tab = "notes" | "files" | "vault" | "settings";

function useMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : true
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("notes");
  const mobile = useMobile();
  const [vault, setVault] = useState<VaultStatus | null>(null);

  useEffect(() => {
    api.vaultStatus().then(setVault).catch(() => {});
    const t = setInterval(() => {
      api.vaultStatus().then(setVault).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const content = (
    <>
      {tab === "notes" && <NotesPage />}
      {tab === "files" && <FilesPage />}
      {tab === "vault" && <VaultPage />}
      {tab === "settings" && <SettingsPage />}
    </>
  );

  const vaultDot = vault?.unlocked ? "ok" : vault?.configured ? "lock" : "warn";

  if (mobile) {
    return (
      <div className="mobile-shell">
        <div className="mobile-body">{content}</div>
        <nav className="bottom-nav">
          <button className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>
            <span className="ico">📝</span>Notes
          </button>
          <button className={tab === "files" ? "active" : ""} onClick={() => setTab("files")}>
            <span className="ico">📁</span>Files
          </button>
          <button className={tab === "vault" ? "active" : ""} onClick={() => setTab("vault")}>
            <span className="ico">🔒</span>Vault
          </button>
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            <span className="ico">⚙</span>Settings
          </button>
        </nav>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Doc<span>Tool</span>
        </div>
        <button
          className={`nav-item ${tab === "notes" ? "active" : ""}`}
          onClick={() => setTab("notes")}
        >
          📝 Notes
        </button>
        <button
          className={`nav-item ${tab === "files" ? "active" : ""}`}
          onClick={() => setTab("files")}
        >
          📁 Files
        </button>
        <button
          className={`nav-item ${tab === "vault" ? "active" : ""}`}
          onClick={() => setTab("vault")}
        >
          🔒 Vault
        </button>
        <button
          className={`nav-item ${tab === "settings" ? "active" : ""}`}
          onClick={() => setTab("settings")}
        >
          ⚙ Settings
        </button>
        <div className="sidebar-footer">
          <span className={`status-dot ${vaultDot}`} />
          Vault {vault?.unlocked ? "unlocked" : vault?.configured ? "locked" : "setup"}
          <br />
          MIT · v0.1.0
        </div>
      </aside>
      <main className="main">
        <div className="main-content">{content}</div>
      </main>
    </div>
  );
}
