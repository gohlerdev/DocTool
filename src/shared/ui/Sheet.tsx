import { useEffect } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Sheet({ open, title, onClose, children, footer }: Props) {
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
    <div className="ui-sheet-root" role="presentation">
      <button type="button" className="ui-sheet-scrim" aria-label="Dismiss" onClick={onClose} />
      <div className="ui-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ui-sheet__handle" aria-hidden />
        <div className="ui-sheet__header">
          <h3 className="ui-sheet__title">{title}</h3>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="ui-sheet__body">{children}</div>
        {footer && <div className="ui-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}
