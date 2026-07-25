import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { yaml } from "@codemirror/lang-yaml";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  api,
  b64Decode,
  b64Encode,
  b64DecodeBytes,
  DirEntry,
} from "../../shared/lib/invoke";

type Source = "local" | "sftp" | "vault";

export function FilesPage() {
  const [source, setSource] = useState<Source>("local");
  const [root, setRoot] = useState("");
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(true);
  const [sftpId, setSftpId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [hostKey, setHostKey] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.fsDefaultRoot();
        setRoot(r);
        setPath(r);
        const p = await api.sftpProfilesList();
        setProfiles(p);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (source === "local" && path) loadLocal(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, source]);

  async function loadLocal(p: string) {
    try {
      setError(null);
      setEntries(await api.fsList(p));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function openLocalFile(p: string, name: string) {
    try {
      setError(null);
      setPdfUrl(null);
      const b64 = await api.fsRead(p);
      await api.recentsAdd(`local://${p}`, name);
      if (name.toLowerCase().endsWith(".pdf")) {
        const bytes = b64DecodeBytes(b64);
        const blob = new Blob([bytes], { type: "application/pdf" });
        setPdfUrl(URL.createObjectURL(blob));
        setFilePath(p);
        setContent("");
        setDirty(false);
        return;
      }
      setContent(b64Decode(b64));
      setFilePath(p);
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function saveFile() {
    if (!filePath || pdfUrl) return;
    try {
      if (source === "local") {
        await api.fsWrite(filePath, b64Encode(content));
      } else if (source === "sftp" && sftpId) {
        await api.sftpWrite(sftpId, filePath, b64Encode(content));
      } else if (source === "vault") {
        await api.vaultPutFile(filePath, b64Encode(content), "file");
      }
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function connectSftp(id: string, trust?: string) {
    try {
      setError(null);
      const res = await api.sftpConnect(id, trust);
      if (res.status === "hostKeyRequired") {
        setHostKey(res.fingerprint);
        setSftpId(id);
        return;
      }
      setHostKey(null);
      setSftpId(id);
      setSource("sftp");
      const prof = profiles.find((p) => p.id === id);
      const start = prof?.defaultPath || "/";
      setPath(start);
      setEntries(await api.sftpList(id, start));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function openSftpEntry(e: DirEntry) {
    if (!sftpId) return;
    if (e.isDir) {
      setPath(e.path);
      setEntries(await api.sftpList(sftpId, e.path));
    } else {
      const b64 = await api.sftpRead(sftpId, e.path);
      setContent(b64Decode(b64));
      setFilePath(e.path);
      setPdfUrl(null);
      setDirty(false);
    }
  }

  async function loadVault() {
    try {
      setSource("vault");
      setError(null);
      const list = await api.vaultList();
      setEntries(
        list
          .filter((x: any) => !x.deleted)
          .map((x: any) => ({
            name: x.logicalPath,
            path: x.logicalPath,
            isDir: false,
            size: x.sizePlain,
            mtime: x.updatedAt,
          }))
      );
      setPath("vault://");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function openVaultFile(p: string) {
    const b64 = await api.vaultGetFile(p);
    setContent(b64Decode(b64));
    setFilePath(p);
    setPdfUrl(null);
    setDirty(false);
  }

  const isMd = filePath?.toLowerCase().endsWith(".md");
  const ext = (filePath || "").split(".").pop()?.toLowerCase();
  const extensions = (() => {
    if (ext === "md" || ext === "markdown") return [markdown()];
    if (ext === "json") return [json()];
    if (ext === "py") return [python()];
    if (ext === "rs") return [rust()];
    if (ext === "yml" || ext === "yaml") return [yaml()];
    if (["js", "jsx", "ts", "tsx", "mjs"].includes(ext || "")) return [javascript({ typescript: ext?.startsWith("ts") })];
    return [markdown()];
  })();

  const crumbs = path.split("/").filter(Boolean);

  return (
    <div>
      <div className="page-header">
        <h1>Files</h1>
        <div className="row">
          <button className={source === "local" ? "primary" : ""} onClick={() => { setSource("local"); setPath(root || path); }}>
            Local
          </button>
          <button className={source === "vault" ? "primary" : ""} onClick={loadVault}>
            Vault
          </button>
        </div>
      </div>

      {profiles.length > 0 && (
        <div className="row" style={{ marginBottom: "0.75rem" }}>
          <span className="muted">SFTP:</span>
          {profiles.map((p) => (
            <button key={p.id} onClick={() => connectSftp(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {hostKey && sftpId && (
        <div className="panel" style={{ marginBottom: "0.75rem" }}>
          <h3>Trust host key?</h3>
          <p className="muted">Fingerprint:</p>
          <div className="recovery-key">{hostKey}</div>
          <div className="row" style={{ marginTop: "0.75rem" }}>
            <button className="primary" onClick={() => connectSftp(sftpId, hostKey)}>
              Accept
            </button>
            <button onClick={() => setHostKey(null)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {filePath ? (
        <div className="editor-page">
          <div className="editor-toolbar">
            <button
              onClick={() => {
                setFilePath(null);
                setPdfUrl(null);
              }}
            >
              ← Browse
            </button>
            <strong style={{ fontSize: "0.9rem" }}>{filePath}</strong>
            {!pdfUrl && (
              <>
                <button className="primary" onClick={saveFile} disabled={!dirty}>
                  Save{dirty ? " •" : ""}
                </button>
                {isMd && (
                  <button onClick={() => setPreview((p) => !p)}>
                    {preview ? "Edit only" : "Preview"}
                  </button>
                )}
              </>
            )}
          </div>
          {pdfUrl ? (
            <iframe className="pdf-frame" src={pdfUrl} title="PDF" />
          ) : isMd && preview ? (
            <div className="split">
              <div className="cm-wrap">
                <CodeMirror
                  value={content}
                  height="60vh"
                  theme="dark"
                  extensions={extensions}
                  onChange={(v) => {
                    setContent(v);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="cm-wrap">
              <CodeMirror
                value={content}
                height="70vh"
                theme="dark"
                extensions={extensions}
                onChange={(v) => {
                  setContent(v);
                  setDirty(true);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="breadcrumb">
            <button
              onClick={() => {
                if (source === "local") setPath(root);
                else if (source === "sftp" && sftpId) {
                  setPath("/");
                  api.sftpList(sftpId, "/").then(setEntries);
                }
              }}
            >
              root
            </button>
            {crumbs.map((c, i) => (
              <span key={i}>
                /
                <button
                  onClick={() => {
                    const next = "/" + crumbs.slice(0, i + 1).join("/");
                    if (source === "local") setPath(next);
                    else if (source === "sftp" && sftpId) {
                      setPath(next);
                      api.sftpList(sftpId, next).then(setEntries);
                    }
                  }}
                >
                  {c}
                </button>
              </span>
            ))}
          </div>
          <ul className="file-list">
            {entries.map((e) => (
              <li key={e.path}>
                <button
                  onClick={() => {
                    if (source === "local") {
                      if (e.isDir) setPath(e.path);
                      else openLocalFile(e.path, e.name);
                    } else if (source === "sftp") openSftpEntry(e);
                    else openVaultFile(e.path);
                  }}
                >
                  <span>
                    {e.isDir ? "📁" : "📄"} {e.name}
                  </span>
                  <span className="muted">{e.isDir ? "" : e.size != null ? `${e.size} B` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
          {entries.length === 0 && <p className="muted">Empty folder</p>}
        </>
      )}
    </div>
  );
}
