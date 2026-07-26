import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, VaultStatus } from "../../shared/lib/invoke";
import { IconButton } from "../../shared/ui";
import {
  CHECKLIST_ITEMS,
  ONBOARDING_CHECKLIST_KEY,
  type ChecklistItemId,
} from "./lessons";
import type { TabId } from "../../shared/ui/BottomNav";

type Props = {
  onNavigate: (tab: TabId) => void;
  noteCount?: number;
};

export function GettingStartedChecklist({ onNavigate, noteCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(true);
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [sftpCount, setSftpCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await api.settingsGet(ONBOARDING_CHECKLIST_KEY);
      if (d === "1" || d === "true") {
        setDismissed(true);
        return;
      }
      setDismissed(false);
      const [v, profiles] = await Promise.all([
        api.vaultStatus().catch(() => null),
        api.sftpProfilesList().catch(() => []),
      ]);
      setVault(v);
      setSftpCount(Array.isArray(profiles) ? profiles.length : 0);
    } catch {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function dismiss() {
    await api.settingsSet(ONBOARDING_CHECKLIST_KEY, "1");
    setDismissed(true);
  }

  function done(id: ChecklistItemId): boolean {
    switch (id) {
      case "create_note":
        return noteCount >= 1;
      case "setup_vault":
        return !!vault?.configured;
      case "add_sftp":
        return sftpCount > 0;
      case "try_theme":
        return false; // soft goal — never auto-completes; user dismisses card
      default:
        return false;
    }
  }

  if (dismissed) return null;

  const remaining = CHECKLIST_ITEMS.filter((i) => !done(i.id));
  // Hide entirely when only soft theme goal remains and vault+note done, or all hard goals done
  const hardLeft = remaining.filter((i) => i.id !== "try_theme");
  if (hardLeft.length === 0 && noteCount >= 1 && vault?.configured) {
    return null;
  }

  return (
    <div className="getting-started" role="region" aria-label="Getting started">
      <div className="getting-started__head">
        <div>
          <strong className="getting-started__title">Getting started</strong>
          <p className="getting-started__sub muted">
            {hardLeft.length === 0
              ? "Optional polish"
              : `${hardLeft.length} tip${hardLeft.length === 1 ? "" : "s"} left`}
          </p>
        </div>
        <IconButton icon={X} label="Dismiss checklist" size="sm" onClick={() => void dismiss()} />
      </div>
      <ul className="getting-started__list">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = done(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`getting-started__item ${isDone ? "is-done" : ""}`}
                onClick={() => item.tab && onNavigate(item.tab)}
              >
                <span className="getting-started__check" aria-hidden>
                  {isDone ? "✓" : "○"}
                </span>
                <span>
                  <span className="getting-started__item-title">{item.title}</span>
                  <span className="muted">{item.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
