import type { ReactNode } from "react";
import { Pin } from "lucide-react";
import { Icon } from "./Icon";
import type { NoteSummary } from "../lib/invoke";

const COLORS = new Set([
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "gray",
]);

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Props = {
  note: NoteSummary;
  onClick: () => void;
  highlightQuery?: string;
};

function markText(text: string): ReactNode {
  // Backend wraps hits in «…»
  const parts = text.split(/(«[^»]+»)/g);
  return parts.map((p, i) => {
    if (p.startsWith("«") && p.endsWith("»")) {
      return (
        <mark key={i} className="search-hit">
          {p.slice(1, -1)}
        </mark>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function NoteCard({ note, onClick }: Props) {
  const color = COLORS.has(note.color) ? note.color : "default";
  const title = (note.title || "").trim();
  const snippet = (note.snippet || "").trim();
  // Prefer real title; if empty, first line of snippet as title and rest as body
  const displayTitle = title || snippet.split(/\n/)[0] || "Untitled";
  const displaySnippet =
    title && snippet
      ? snippet
      : title
        ? ""
        : snippet.includes("\n")
          ? snippet.split(/\n/).slice(1).join(" ").trim()
          : "";

  return (
    <button type="button" className={`ui-note-card note-wash--${color}`} onClick={onClick}>
      <div className="ui-note-card__head">
        <h3 className="ui-note-card__title">{displayTitle}</h3>
        {note.pinned && <Icon icon={Pin} size={14} className="ui-note-card__pin" />}
      </div>
      {displaySnippet ? (
        <p className="ui-note-card__snippet">{markText(displaySnippet)}</p>
      ) : null}
      <div className="ui-note-card__foot">
        <div className="ui-chip-row">
          {note.labels.slice(0, 3).map((l) => (
            <span className="ui-chip" key={l}>
              {l}
            </span>
          ))}
          {note.syncStatus !== "local_only" && note.syncStatus !== "synced" && (
            <span className="ui-chip ui-chip--muted">{note.syncStatus}</span>
          )}
        </div>
        <span className="ui-note-card__time">{relativeTime(note.updatedAt)}</span>
      </div>
    </button>
  );
}
