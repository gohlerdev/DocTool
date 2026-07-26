import { useEffect, useState } from "react";
import {
  Folder,
  Settings as SettingsIcon,
  Shield,
  StickyNote,
} from "lucide-react";
import { NotesPage } from "./features/notes/NotesPage";
import { FilesPage } from "./features/files/FilesPage";
import { VaultPage } from "./features/vault/VaultPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import {
  OnboardingLesson,
  isOnboardingComplete,
} from "./features/onboarding/OnboardingLesson";
import {
  CommandPalette,
  useCommandPaletteHotkey,
} from "./features/command/CommandPalette";
import { api, VaultStatus } from "./shared/lib/invoke";
import { initAutoLock } from "./shared/lib/autoLock";
import { BottomNav, type TabId, StatusHost, toast } from "./shared/ui";
import { Icon } from "./shared/ui/Icon";
import {
  AppearancePrefs,
  DEFAULT_PREFS,
  loadAppearancePrefs,
  watchSystemAppearance,
} from "./design/themes";
import { useKeyboardInset } from "./design/motion";
import "./styles.css";

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
  const [tab, setTab] = useState<TabId>("notes");
  const [hideNav, setHideNav] = useState(false);
  const mobile = useMobile();
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newNoteToken, setNewNoteToken] = useState(0);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useCommandPaletteHotkey(setPaletteOpen);

  useEffect(() => {
    loadAppearancePrefs().then((p) => {
      setPrefs(p);
      setTab(p.defaultTab);
      setReady(true);
    });
    const stopKb = useKeyboardInset();
    void initAutoLock({
      onLocked: () => {
        toast("Vault locked", "info");
        api.vaultStatus().then(setVault).catch(() => {});
      },
    });
    // U6 dynamic type — respect root font from system where possible
    document.documentElement.style.setProperty(
      "--user-font-scale",
      "1"
    );
    return stopKb;
  }, []);

  useEffect(() => {
    isOnboardingComplete()
      .then((done) => {
        setShowOnboarding(!done);
        setOnboardingChecked(true);
      })
      .catch(() => {
        setShowOnboarding(false);
        setOnboardingChecked(true);
      });
  }, []);

  useEffect(() => watchSystemAppearance(prefs, () => setPrefs({ ...prefs })), [prefs]);

  useEffect(() => {
    api.vaultStatus().then(setVault).catch(() => {});
    const t = setInterval(() => {
      api.vaultStatus().then(setVault).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onOff = () => setOffline(!navigator.onLine);
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  // U3 — history stack for predictive back (editor mode pops to list first)
  useEffect(() => {
    if (hideNav) {
      history.pushState({ doctool: "editor" }, "");
    }
    const onPop = () => {
      if (hideNav) {
        // NotesPage/FilesPage listen via synthetic event
        window.dispatchEvent(new CustomEvent("doctool:back"));
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hideNav]);

  function handleOnboardingFinished(opts: { openVault: boolean }) {
    setShowOnboarding(false);
    if (opts.openVault) {
      setTab("vault");
    } else {
      setTab("notes");
    }
  }

  function startOnboardingReplay() {
    setShowOnboarding(true);
  }

  if (!ready || !onboardingChecked) {
    return (
      <div className="mobile-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <p className="muted">Loading DocTool…</p>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="mobile-shell">
        <OnboardingLesson onFinished={handleOnboardingFinished} />
        <StatusHost />
      </div>
    );
  }

  const content = (
    <>
      {tab === "notes" && (
        <NotesPage
          onEditorModeChange={setHideNav}
          notesLayout={prefs.notesLayout}
          onNavigateTab={setTab}
          openNewNoteToken={newNoteToken}
        />
      )}
      {tab === "files" && <FilesPage onEditorModeChange={setHideNav} />}
      {tab === "vault" && <VaultPage />}
      {tab === "settings" && (
        <SettingsPage
          prefs={prefs}
          onPrefsChange={setPrefs}
          onReplayOnboarding={startOnboardingReplay}
        />
      )}
    </>
  );

  const vaultLabel = vault?.unlocked
    ? "Vault unlocked"
    : vault?.configured
      ? "Vault locked"
      : "Vault setup";
  const vaultPill = vault?.unlocked ? "ok" : vault?.configured ? "lock" : "warn";

  const shellExtras = (
    <>
      {offline && (
        <div className="global-offline" role="status">
          Offline
        </div>
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setTab}
        onNewNote={() => {
          setTab("notes");
          setNewNoteToken((n) => n + 1);
        }}
      />
      <StatusHost />
    </>
  );

  if (mobile) {
    return (
      <div className="mobile-shell">
        <div className={`mobile-body ${hideNav ? "is-editor" : ""}`}>{content}</div>
        <BottomNav
          active={tab}
          onChange={setTab}
          hidden={hideNav}
          variant={prefs.layoutNav}
        />
        {shellExtras}
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
          type="button"
          className={`nav-item ${tab === "notes" ? "is-active" : ""}`}
          onClick={() => setTab("notes")}
        >
          <Icon icon={StickyNote} size={20} /> Notes
        </button>
        <button
          type="button"
          className={`nav-item ${tab === "files" ? "is-active" : ""}`}
          onClick={() => setTab("files")}
        >
          <Icon icon={Folder} size={20} /> Files
        </button>
        <button
          type="button"
          className={`nav-item ${tab === "vault" ? "is-active" : ""}`}
          onClick={() => setTab("vault")}
        >
          <Icon icon={Shield} size={20} /> Vault
        </button>
        <button
          type="button"
          className={`nav-item ${tab === "settings" ? "is-active" : ""}`}
          onClick={() => setTab("settings")}
        >
          <Icon icon={SettingsIcon} size={20} /> Settings
        </button>
        <div className="sidebar-footer">
          <span className={`status-pill status-pill--${vaultPill}`}>{vaultLabel}</span>
          <button
            type="button"
            className="muted"
            style={{ fontSize: "0.7rem", textAlign: "left" }}
            onClick={() => setPaletteOpen(true)}
          >
            ⌘K commands
          </button>
          <span>MIT · v0.1.0</span>
        </div>
      </aside>
      <main className="main">
        <div className="main-content">{content}</div>
      </main>
      {shellExtras}
    </div>
  );
}
