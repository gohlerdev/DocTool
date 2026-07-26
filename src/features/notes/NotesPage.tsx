import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  CheckSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { api, NoteSummary } from "../../shared/lib/invoke";
import { friendlyError } from "../../shared/lib/errors";
import {
  AppBar,
  EmptyState,
  ErrorBanner,
  IconButton,
  NoteCard,
  NoteSkeletonGrid,
  SearchField,
  SegmentedControl,
  Button,
  toast,
} from "../../shared/ui";
import type { TabId } from "../../shared/ui/BottomNav";
import { GettingStartedChecklist } from "../onboarding/GettingStartedChecklist";
import { NoteEditor } from "./NoteEditor";
import type { NotesLayout } from "../../design/themes";

type Props = {
  onEditorModeChange?: (editing: boolean) => void;
  notesLayout?: NotesLayout;
  onNavigateTab?: (tab: TabId) => void;
  openNewNoteToken?: number;
};

type MenuState = {
  note: NoteSummary;
  x: number;
  y: number;
} | null;

export function NotesPage({
  onEditorModeChange,
  notesLayout = "list",
  onNavigateTab,
  openNewNoteToken,
}: Props) {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null | "new">(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<MenuState>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      if (showTrash) {
        setNotes(await api.notesTrash());
      } else if (query.trim()) {
        setNotes(await api.notesSearchRanked(query.trim()));
      } else {
        setNotes(
          await api.notesList({
            archived: showArchived,
            label: labelFilter || undefined,
          })
        );
      }
      setAllLabels(await api.notesLabels().catch(() => []));
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [query, showArchived, showTrash, labelFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onEditorModeChange?.(editingId !== null);
    return () => onEditorModeChange?.(false);
  }, [editingId, onEditorModeChange]);

  useEffect(() => {
    if (openNewNoteToken && openNewNoteToken > 0) {
      setEditingId("new");
    }
  }, [openNewNoteToken]);

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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(action: "archive" | "delete" | "pin" | "color", color?: string) {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      if (action === "delete") await api.notesBulk({ ids, delete: true });
      else if (action === "archive") await api.notesBulk({ ids, archived: true });
      else if (action === "pin") await api.notesBulk({ ids, pinned: true });
      else if (action === "color" && color) await api.notesBulk({ ids, color });
      toast(`Updated ${ids.length} notes`, "success");
      setSelected(new Set());
      setSelectMode(false);
      await load();
    } catch (e: any) {
      setError(friendlyError(e));
    }
  }

  async function ctxAction(
    note: NoteSummary,
    action: "pin" | "archive" | "delete" | "color",
    color?: string
  ) {
    setMenu(null);
    try {
      if (action === "delete") {
        await api.notesDelete(note.id, false);
        toast("Moved to trash", "info");
      } else {
        const full = await api.notesGet(note.id);
        await api.notesUpsert({
          id: full.id,
          title: full.title,
          body: full.body,
          color: action === "color" ? color : full.color,
          pinned: action === "pin" ? !full.pinned : full.pinned,
          archived: action === "archive" ? !full.archived : full.archived,
          labels: full.labels,
        });
      }
      await load();
    } catch (e: any) {
      setError(friendlyError(e));
    }
  }

  function onCardPointerDown(note: NoteSummary, e: React.PointerEvent) {
    if (selectMode) return;
    if (e.button === 2) return;
    longPressTimer.current = setTimeout(() => {
      setMenu({ note, x: e.clientX, y: e.clientY });
      if (navigator.vibrate) navigator.vibrate(12);
    }, 480);
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // Virtualization-lite: window large lists via CSS content-visibility
  const renderCard = (n: NoteSummary) => (
    <div
      key={n.id}
      className={`note-card-wrap ${selected.has(n.id) ? "is-selected" : ""}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 88px" }}
      onPointerDown={(e) => onCardPointerDown(n, e)}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ note: n, x: e.clientX, y: e.clientY });
      }}
    >
      {selectMode && (
        <label className="note-select-check">
          <input
            type="checkbox"
            checked={selected.has(n.id)}
            onChange={() => toggleSelect(n.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      )}
      <NoteCard
        note={n}
        highlightQuery={query.trim() || undefined}
        onClick={() => {
          if (selectMode) toggleSelect(n.id);
          else if (showTrash) {
            /* open restore handled below via menu */
            setMenu({ note: n, x: 80, y: 160 });
          } else setEditingId(n.id);
        }}
      />
    </div>
  );

  return (
    <div className="page-gap page-gap--tight" data-notes-layout={notesLayout} ref={listRef}>
      <AppBar
        title={showTrash ? "Trash" : "Notes"}
        trailing={
          <>
            <IconButton
              icon={CheckSquare}
              label={selectMode ? "Exit select" : "Select"}
              variant={selectMode ? "accent" : "ghost"}
              onClick={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
            />
            <IconButton
              icon={Trash2}
              label={showTrash ? "Hide trash" : "Trash"}
              variant={showTrash ? "accent" : "ghost"}
              onClick={() => {
                setShowTrash((v) => !v);
                setShowArchived(false);
              }}
            />
            <IconButton
              icon={Archive}
              label={showArchived ? "Show active" : "Show archive"}
              variant={showArchived ? "accent" : "ghost"}
              onClick={() => {
                setShowArchived((v) => !v);
                setShowTrash(false);
              }}
            />
            <IconButton
              icon={Plus}
              label="New note"
              variant="accent"
              onClick={() => setEditingId("new")}
            />
          </>
        }
      />

      <SearchField
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
      />

      {/* N1 label chips */}
      {allLabels.length > 0 && !showTrash && (
        <div className="label-filter-row" role="listbox" aria-label="Filter by label">
          <button
            type="button"
            className={`ui-chip ${!labelFilter ? "is-active" : ""}`}
            onClick={() => setLabelFilter(null)}
          >
            All
          </button>
          {allLabels.map((l) => (
            <button
              key={l}
              type="button"
              className={`ui-chip ${labelFilter === l ? "is-active" : ""}`}
              onClick={() => setLabelFilter(labelFilter === l ? null : l)}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {onNavigateTab && !showArchived && !showTrash && !query.trim() && (
        <GettingStartedChecklist onNavigate={onNavigateTab} noteCount={notes.length} />
      )}

      {selectMode && selected.size > 0 && (
        <div className="bulk-bar">
          <span className="muted">{selected.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => void bulk("pin")}>
            Pin
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void bulk("archive")}>
            Archive
          </Button>
          <Button size="sm" variant="danger" onClick={() => void bulk("delete")}>
            Delete
          </Button>
          <IconButton
            icon={X}
            label="Clear"
            size="sm"
            onClick={() => setSelected(new Set())}
          />
        </div>
      )}

      <div className="desktop-only">
        <SegmentedControl
          ariaLabel="Note filter"
          value={showTrash ? "trash" : showArchived ? "archived" : "active"}
          onChange={(v) => {
            setShowTrash(v === "trash");
            setShowArchived(v === "archived");
          }}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archive" },
            { value: "trash", label: "Trash" },
          ]}
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <NoteSkeletonGrid count={4} />
      ) : notes.length === 0 ? (
        <EmptyState
          title={
            showTrash ? "Trash empty" : showArchived ? "Archive empty" : "No notes"
          }
          actionLabel={showArchived || showTrash ? undefined : "Write one"}
          onAction={showArchived || showTrash ? undefined : () => setEditingId("new")}
        />
      ) : (
        <>
          {pinned.length > 0 && !showTrash && (
            <>
              <p className="section-label">Pinned</p>
              <div className="notes-grid">{pinned.map(renderCard)}</div>
              {rest.length > 0 && <p className="section-label">Other</p>}
            </>
          )}
          <div className="notes-grid">
            {(pinned.length > 0 && !showTrash ? rest : notes).map(renderCard)}
          </div>
        </>
      )}

      {showTrash && notes.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await api.notesPurgeTrash(30);
            toast("Purged items older than 30 days", "info");
            load();
          }}
        >
          Purge trash older than 30 days
        </Button>
      )}

      {menu && (
        <div
          className="ctx-menu"
          style={{ left: Math.min(menu.x, window.innerWidth - 180), top: menu.y }}
          role="menu"
        >
          {showTrash ? (
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                await api.notesRestore(menu.note.id);
                toast("Restored", "success");
                setMenu(null);
                load();
              }}
            >
              Restore
            </button>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => void ctxAction(menu.note, "pin")}>
                {menu.note.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void ctxAction(menu.note, "archive")}
              >
                {menu.note.archived ? "Unarchive" : "Archive"}
              </button>
              {["red", "yellow", "green", "blue", "purple"].map((c) => (
                <button
                  key={c}
                  type="button"
                  role="menuitem"
                  onClick={() => void ctxAction(menu.note, "color", c)}
                >
                  Color {c}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => void ctxAction(menu.note, "delete")}
              >
                Delete
              </button>
            </>
          )}
          <button type="button" role="menuitem" onClick={() => setMenu(null)}>
            Cancel
          </button>
        </div>
      )}
      {menu && (
        <button type="button" className="ctx-menu-scrim" aria-label="Close menu" onClick={() => setMenu(null)} />
      )}
    </div>
  );
}
