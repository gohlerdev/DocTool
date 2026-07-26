import { useEffect, useState } from "react";

type Toast = { id: number; message: string; kind?: "info" | "success" | "error" };

let pushToast: ((message: string, kind?: Toast["kind"]) => void) | null = null;
let seq = 0;

export function toast(message: string, kind: Toast["kind"] = "info") {
  pushToast?.(message, kind);
}

export function StatusHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushToast = (message, kind = "info") => {
      const id = ++seq;
      setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="ui-toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`ui-toast ui-toast--${t.kind ?? "info"}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
