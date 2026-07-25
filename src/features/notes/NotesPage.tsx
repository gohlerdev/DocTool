import { useCallback, useEffect, useState } from "react";
import { api, NoteSummary } from "../../shared/lib/invoke";
import { NoteEditor } from "./NoteEditor";

const COLORS = ["default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "gray"];

export function NotesPage() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null | "new">(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = query.trim()
        ? await api.notesSearch(query.trim())
        : await api.notesList({ archived: showArchived });
      setNotes(list);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, [query, showArchived]);

  useEffect(() => {
    load();
  }, [load]);

  if (editingId !== null) {
    return (
      <NoteEditor
        noteId={editingId === "new" ? undefined : editingId}
        onClose={() => {
          setEditingId(null);
          load();
        }}
      />
    );
  }

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  return (
    <div>
      <div className="page-header">
        <h1>Notes</h1>
        <div className="row">
          <button className="ghost" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Active" : "Archive"}
          </button>
          <button className="primary" onClick={() => setEditingId("new")}>
            New
          </button>
        </div>
      </div>
      <div className="search-row">
        <input
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && <div className="error">{error}</div>}
      {notes.length === 0 ? (
        <div className="empty">
          <h2>Capture a thought</h2>
          <p className="muted">Keep-style notes, offline-first, encrypted vault sync.</p>
          <button className="primary" onClick={() => setEditingId("new")}>
            Create your first note
          </button>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <p className="muted">Pinned</p>
              <div className="notes-grid">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} onClick={() => setEditingId(n.id)} />
                ))}
              </div>
              <p className="muted" style={{ marginTop: "1rem" }}>
                Others
              </p>
            </>
          )}
          <div className="notes-grid">
            {rest.map((n) => (
              <NoteCard key={n.id} note={n} onClick={() => setEditingId(n.id)} />
            ))}
          </div>
        </>
      )}
      <button className="fab" aria-label="New note" onClick={() => setEditingId("new")}>
        +
      </button>
    </div>
  );
}

function NoteCard({ note, onClick }: { note: NoteSummary; onClick: () => void }) {
  const color = COLORS.includes(note.color) ? note.color : "default";
  return (
    <button className={`note-card color-${color}`} onClick={onClick}>
      <h3>
        {note.pinned ? "📌 " : ""}
        {note.title || "Untitled"}
      </h3>
      <p>{note.snippet || " "}</p>
      <div className="chip-row">
        {note.labels.map((l) => (
          <span className="chip" key={l}>
            {l}
          </span>
        ))}
        {note.syncStatus !== "local_only" && note.syncStatus !== "synced" && (
          <span className="chip">{note.syncStatus}</span>
        )}
      </div>
    </button>
  );
}
