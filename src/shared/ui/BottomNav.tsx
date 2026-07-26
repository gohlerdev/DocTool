import { Folder, Settings, Shield, StickyNote } from "lucide-react";
import { Icon } from "./Icon";
import type { LayoutNav } from "../../design/themes";

export type TabId = "notes" | "files" | "vault" | "settings";

const TABS: { id: TabId; label: string; icon: typeof StickyNote }[] = [
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "files", label: "Files", icon: Folder },
  { id: "vault", label: "Vault", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

type Props = {
  active: TabId;
  onChange: (id: TabId) => void;
  hidden?: boolean;
  variant?: LayoutNav;
};

export function BottomNav({ active, onChange, hidden, variant = "bottom" }: Props) {
  if (hidden) return null;
  return (
    <nav
      className={`ui-bottom-nav ui-bottom-nav--${variant}`}
      aria-label="Main"
      data-variant={variant}
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className={`ui-bottom-nav__item ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(t.id)}
          >
            <span className="ui-bottom-nav__icon-wrap">
              <Icon icon={t.icon} size={22} strokeWidth={isActive ? 2.25 : 2} />
            </span>
            <span className="ui-bottom-nav__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
