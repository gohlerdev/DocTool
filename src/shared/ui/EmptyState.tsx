import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

type Props = {
  icon?: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Plain top-aligned empty — no icon card / marketing hero */
export function EmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <div className="ui-empty">
      <span className="ui-empty__title">{title}</span>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="ui-empty__action">
          {actionLabel}
        </Button>
      )}
      {body && <p className="ui-empty__body">{body}</p>}
    </div>
  );
}
