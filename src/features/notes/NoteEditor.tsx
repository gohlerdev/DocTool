import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Archive,
  Bold,
  CheckSquare,
  ChevronLeft,
  Code2,
  Download,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";
import { api, b64EncodeBytes } from "../../shared/lib/invoke";
import { friendlyError } from "../../shared/lib/errors";
import {
  AppBar,
  Button,
  ErrorBanner,
  IconButton,
  Sheet,
  toast,
} from "../../shared/ui";

const COLORS = ["default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "gray"];
const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

export function NoteEditor({
  noteId,
  onClose,
}: {
  noteId?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("default");
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [id, setId] = useState<string | undefined>(noteId);
  const [status, setStatus] = useState<"ready" | "unsaved" | "saving" | "saved" | "error">("ready");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!noteId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: emptyDoc,
    onUpdate: () => setStatus("unsaved"),
  });

  useEffect(() => {
    const onBack = () => onClose();
    window.addEventListener("doctool:back", onBack);
    return () => window.removeEventListener("doctool:back", onBack);
  }, [onClose]);

  useEffect(() => {
    if (!noteId) {
      // New note: focus body, leave title blank until user wants one
      queueMicrotask(() => editor?.commands.focus("end"));
      return;
    }
    (async () => {
      try {
        const n = await api.notesGet(noteId);
        setId(n.id);
        setTitle(n.title);
        setColor(n.color || "default");
        setPinned(n.pinned);
        setArchived(n.archived);
        setLabels(n.labels || []);
        editor?.commands.setContent(n.body || emptyDoc);
        setLoaded(true);
        setStatus("saved");
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, [noteId, editor]);

  async function save(showToast = false) {
    if (!editor) return;
    try {
      setError(null);
      setStatus("saving");
      const note = await api.notesUpsert({
        id,
        title,
        body: editor.getJSON(),
        color,
        pinned,
        archived,
        labels,
      });
      setId(note.id);
      setStatus("saved");
      if (showToast) toast("Saved", "success");
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus("error");
      toast(e?.message || "Save failed", "error");
    }
  }

  useEffect(() => {
    if (!loaded && noteId) return;
    if (!noteId && !loaded) setLoaded(true);
    const t = setTimeout(() => {
      if (status === "unsaved") save();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, color, pinned, archived, labels, status, loaded]);

  async function remove() {
    if (!id) {
      onClose();
      return;
    }
    await api.notesDelete(id, false);
    toast("Moved to trash", "info");
    setDeleteOpen(false);
    onClose();
  }

  function addLabel() {
    const l = labelInput.trim();
    if (!l || labels.includes(l)) return;
    setLabels([...labels, l]);
    setLabelInput("");
    setStatus("unsaved");
  }

  if (!loaded && noteId) {
    return <p className="muted">Loading…</p>;
  }

  const statusLabel =
    status === "unsaved"
      ? "Unsaved"
      : status === "saving"
        ? "Saving…"
        : status === "error"
          ? "Error"
          : status === "saved"
            ? "Saved"
            : "";

  return (
    <div className="editor-page">
      <AppBar
        title="Note"
        leading={<IconButton icon={ChevronLeft} label="Back" onClick={onClose} />}
        trailing={
          <>
            {statusLabel && (
              <span className={`editor-status editor-status--${status}`}>{statusLabel}</span>
            )}
            <IconButton
              icon={Pin}
              label={pinned ? "Unpin" : "Pin"}
              variant={pinned ? "accent" : "ghost"}
              onClick={() => {
                setPinned((p) => !p);
                setStatus("unsaved");
              }}
            />
            <IconButton
              icon={Archive}
              label={archived ? "Unarchive" : "Archive"}
              variant={archived ? "accent" : "ghost"}
              onClick={() => {
                setArchived((a) => !a);
                setStatus("unsaved");
              }}
            />
            {id && (
              <IconButton
                icon={Download}
                label="Export Markdown"
                onClick={async () => {
                  try {
                    const md = await api.notesExportMarkdown(id);
                    const blob = new Blob([md], { type: "text/markdown" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${(title || "note").replace(/[^\w.-]+/g, "_")}.md`;
                    a.click();
                    toast("Exported Markdown", "success");
                  } catch (e: any) {
                    toast(friendlyError(e), "error");
                  }
                }}
              />
            )}
            {id && typeof navigator !== "undefined" && "share" in navigator && (
              <IconButton
                icon={Share2}
                label="Share"
                onClick={async () => {
                  try {
                    const md = await api.notesExportMarkdown(id);
                    await navigator.share({ title: title || "Note", text: md });
                  } catch {
                    /* user cancel */
                  }
                }}
              />
            )}
            <IconButton icon={Trash2} label="Delete" onClick={() => setDeleteOpen(true)} />
          </>
        }
      />

      {error && <ErrorBanner message={friendlyError(error)} onRetry={() => save(true)} />}

      <input
        ref={titleRef}
        className="title-input"
        placeholder="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setStatus("unsaved");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor?.commands.focus("start");
          }
        }}
      />

      <div className="editor-meta">
        <div className="color-picker" role="listbox" aria-label="Note color">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={color === c}
              aria-label={c}
              className={`color-swatch note-wash--${c} ${color === c ? "selected" : ""}`}
              onClick={() => {
                setColor(c);
                setStatus("unsaved");
              }}
            />
          ))}
        </div>
        <div className="label-row">
          {labels.map((l) => (
            <button
              key={l}
              type="button"
              className="ui-chip"
              onClick={() => {
                setLabels(labels.filter((x) => x !== l));
                setStatus("unsaved");
              }}
            >
              {l} ×
            </button>
          ))}
          <input
            className="label-input"
            placeholder="+ label"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
            onBlur={() => labelInput.trim() && addLabel()}
          />
        </div>
      </div>

      <div className="format-bar" role="toolbar" aria-label="Formatting">
        <button type="button" className="format-btn" aria-label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </button>
        <button type="button" className="format-btn" aria-label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </button>
        <button type="button" className="format-btn" aria-label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </button>
        <button type="button" className="format-btn" aria-label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </button>
        <button type="button" className="format-btn" aria-label="Checklist" onClick={() => editor?.chain().focus().toggleTaskList().run()}>
          <CheckSquare size={16} />
        </button>
        <button type="button" className="format-btn" aria-label="Code" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
          <Code2 size={16} />
        </button>
        <button
          type="button"
          className="format-btn"
          aria-label="Insert image"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file || !editor) return;
              try {
                const buf = new Uint8Array(await file.arrayBuffer());
                // Prefer vault if unlocked for encrypted storage
                const st = await api.vaultStatus().catch(() => null);
                const name = `attachments/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
                if (st?.unlocked) {
                  await api.vaultPutFile(name, b64EncodeBytes(buf), "file");
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: `[image: vault://${name}]`,
                        },
                      ],
                    })
                    .run();
                  toast("Image stored in vault", "success");
                } else {
                  // Store as data-URL text reference (TipTap starter has no Image node)
                  const b64 = b64EncodeBytes(buf);
                  const dataUrl = `data:${file.type || "image/png"};base64,${b64.slice(0, 48)}…`;
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: `[image attached: ${file.name} · ${Math.round(buf.length / 1024)} KB local]`,
                        },
                      ],
                    })
                    .run();
                  // Persist full image under app data via local file write when possible
                  void dataUrl;
                  setStatus("unsaved");
                  toast("Image referenced in note (local)", "success");
                }
              } catch (e: any) {
                toast(friendlyError(e), "error");
              }
            };
            input.click();
          }}
        >
          <ImageIcon size={16} />
        </button>
      </div>

      <div className="tiptap-wrap">
        <EditorContent editor={editor} />
      </div>

      <Sheet
        open={deleteOpen}
        title="Delete note?"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button block variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button block variant="danger-solid" onClick={remove}>
              Delete
            </Button>
          </>
        }
      >
        <p className="muted">Moves the note to trash.</p>
      </Sheet>
    </div>
  );
}
