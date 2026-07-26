import { useEffect, useMemo, useState } from "react";
import type { TabId } from "../../shared/ui/BottomNav";
import { api } from "../../shared/lib/invoke";
import { toast } from "../../shared/ui";

export type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
  onNewNote?: () => void;
};

/** U1 — Desktop command palette */
export function CommandPalette({ open, onClose, onNavigate, onNewNote }: Props) {
  const [q, setQ] = useState("");

  const actions: PaletteAction[] = useMemo(
    () => [
      {
        id: "notes",
        label: "Go to Notes",
        hint: "g n",
        run: () => onNavigate("notes"),
      },
      {
        id: "files",
        label: "Go to Files",
        hint: "g f",
        run: () => onNavigate("files"),
      },
      {
        id: "vault",
        label: "Go to Vault",
        hint: "g v",
        run: () => onNavigate("vault"),
      },
      {
        id: "settings",
        label: "Go to Settings",
        hint: "g s",
        run: () => onNavigate("settings"),
      },
      {
        id: "new-note",
        label: "New note",
        hint: "c",
        run: () => {
          onNavigate("notes");
          onNewNote?.();
        },
      },
      {
        id: "lock",
        label: "Lock vault",
        run: async () => {
          await api.vaultLock();
          toast("Vault locked", "info");
        },
      },
      {
        id: "sync",
        label: "Sync notes now",
        run: async () => {
          const r = await api.notesSyncNow();
          toast(`Synced · ${r.pushed}↑ ${r.pulled}↓`, "success");
        },
      },
    ],
    [onNavigate, onNewNote]
  );

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(q.trim().toLowerCase())
  );

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-palette-root" role="presentation">
      <button type="button" className="cmd-palette-scrim" aria-label="Close" onClick={onClose} />
      <div className="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          className="field cmd-palette__input"
          autoFocus
          placeholder="Type a command…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) {
              void filtered[0].run();
              onClose();
            }
          }}
        />
        <ul className="cmd-palette__list">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="cmd-palette__item"
                onClick={() => {
                  void a.run();
                  onClose();
                }}
              >
                <span>{a.label}</span>
                {a.hint && <kbd>{a.hint}</kbd>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="muted cmd-palette__empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}

export function useCommandPaletteHotkey(setOpen: (v: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
