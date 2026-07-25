import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { api } from "../../shared/lib/invoke";

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
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [id, setId] = useState<string | undefined>(noteId);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!noteId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Write something…" }),
    ],
    content: emptyDoc,
    onUpdate: () => setStatus("Unsaved"),
  });

  useEffect(() => {
    if (!noteId) return;
    (async () => {
      try {
        const n = await api.notesGet(noteId);
        setId(n.id);
        setTitle(n.title);
        setColor(n.color || "default");
        setPinned(n.pinned);
        setLabels(n.labels || []);
        editor?.commands.setContent(n.body || emptyDoc);
        setLoaded(true);
        setStatus("Saved");
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, [noteId, editor]);

  async function save() {
    if (!editor) return;
    try {
      setError(null);
      setStatus("Saving…");
      const note = await api.notesUpsert({
        id,
        title,
        body: editor.getJSON(),
        color,
        pinned,
        labels,
      });
      setId(note.id);
      setStatus("Saved");
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus("Error");
    }
  }

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      if (status === "Unsaved") save();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, color, pinned, labels, status, loaded]);

  async function remove() {
    if (!id) {
      onClose();
      return;
    }
    if (!confirm("Delete this note?")) return;
    await api.notesDelete(id, false);
    onClose();
  }

  function addLabel() {
    const l = labelInput.trim();
    if (!l || labels.includes(l)) return;
    setLabels([...labels, l]);
    setLabelInput("");
    setStatus("Unsaved");
  }

  if (!loaded && noteId) return <p className="muted">Loading…</p>;

  return (
    <div className="editor-page">
      <div className="editor-toolbar">
        <button onClick={onClose}>← Back</button>
        <button className="primary" onClick={save}>
          Save
        </button>
        <button onClick={() => setPinned((p) => !p)}>{pinned ? "Unpin" : "Pin"}</button>
        <button className="danger" onClick={remove}>
          Delete
        </button>
        <span className="muted" style={{ marginLeft: "auto" }}>
          {status}
        </span>
      </div>
      {error && <div className="error">{error}</div>}
      <input
        className="title-input"
        placeholder="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setStatus("Unsaved");
        }}
      />
      <div className="color-picker">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-swatch color-${c} ${color === c ? "selected" : ""}`}
            style={{ background: "var(--bg-elevated)" }}
            title={c}
            onClick={() => {
              setColor(c);
              setStatus("Unsaved");
            }}
          />
        ))}
      </div>
      <div className="row">
        <input
          placeholder="Add label"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLabel()}
          style={{ maxWidth: 180 }}
        />
        <button onClick={addLabel}>Add</button>
        {labels.map((l) => (
          <span className="chip" key={l}>
            {l}{" "}
            <button
              className="ghost"
              style={{ padding: 0, border: "none" }}
              onClick={() => {
                setLabels(labels.filter((x) => x !== l));
                setStatus("Unsaved");
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="editor-toolbar">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
        <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button onClick={() => editor?.chain().focus().toggleTaskList().run()}>☑ Tasks</button>
        <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>Code</button>
      </div>
      <div className="tiptap-wrap">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
