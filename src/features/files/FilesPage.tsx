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
  ChevronLeft,
  Eye,
  FileCode,
  FileText,
  FileType,
  Folder,
  Save,
} from "lucide-react";
import {
  api,
  b64Decode,
  b64Encode,
  b64DecodeBytes,
  b64EncodeBytes,
  DirEntry,
} from "../../shared/lib/invoke";
import {
  AppBar,
  Button,
  ErrorBanner,
  IconButton,
  ListRow,
  ListSkeleton,
  SegmentedControl,
  Sheet,
  toast,
} from "../../shared/ui";
import { CoachBanner } from "../../shared/ui/CoachBanner";
import { friendlyError } from "../../shared/lib/errors";

type Source = "local" | "sftp" | "vault" | "webdav";

type Props = {
  onEditorModeChange?: (editing: boolean) => void;
};

function fileIcon(name: string, isDir: boolean) {
  if (isDir) return Folder;
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "markdown" || ext === "txt") return FileText;
  if (ext === "pdf") return FileType;
  return FileCode;
}

export function FilesPage({ onEditorModeChange }: Props) {
  const [source, setSource] = useState<Source>("local");
  const [root, setRoot] = useState("");
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(true);
  const [sftpId, setSftpId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [hostKey, setHostKey] = useState<string | null>(null);
  const [pendingSftpId, setPendingSftpId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [transferProgress, setTransferProgress] = useState<string | null>(null);
  const [recents, setRecents] = useState<{ uri: string; title?: string; openedAt: string }[]>([]);
  const [sftpConnected, setSftpConnected] = useState(false);

  useEffect(() => {
    onEditorModeChange?.(!!filePath);
    return () => onEditorModeChange?.(false);
  }, [filePath, onEditorModeChange]);

  useEffect(() => {
    api.recentsList().then(setRecents).catch(() => {});
  }, [filePath]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.fsDefaultRoot();
        setRoot(r);
        setPath(r);
        setProfiles(await api.sftpProfilesList());
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
      setLoading(true);
      setEntries(await api.fsList(p));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
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
        setPdfBytes(bytes);
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
      toast("Saved", "success");
    } catch (e: any) {
      setError(e?.message || String(e));
      toast(e?.message || "Save failed", "error");
    }
  }

  async function connectSftp(id: string, trust?: string) {
    try {
      setError(null);
      const res = await api.sftpConnect(id, trust);
      if (res.status === "hostKeyRequired") {
        setHostKey(res.fingerprint);
        setPendingSftpId(id);
        return;
      }
      setHostKey(null);
      setPendingSftpId(null);
      setSftpId(id);
      setSource("sftp");
      setSftpConnected(true);
      const prof = profiles.find((p) => p.id === id);
      const start = prof?.defaultPath || "/";
      setPath(start);
      setLoading(true);
      setEntries(await api.sftpList(id, start));
      setLoading(false);
      toast("Connected", "success");
    } catch (e: any) {
      setSftpConnected(false);
      setError(friendlyError(e));
      setLoading(false);
    }
  }

  async function loadWebdav(path = "/") {
    try {
      setSource("webdav");
      setError(null);
      setLoading(true);
      const url = (await api.settingsGet("webdav.url")) || "";
      const username = (await api.settingsGet("webdav.user")) || "";
      const password = (await api.settingsGet("webdav.pass")) || "";
      if (!url) {
        setError("Configure WebDAV under Settings first");
        setEntries([]);
        return;
      }
      setEntries(await api.webdavList({ url, username, password, path }));
      setPath(path);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function openSftpEntry(e: DirEntry) {
    if (!sftpId) return;
    if (e.isDir) {
      setPath(e.path);
      setLoading(true);
      setEntries(await api.sftpList(sftpId, e.path));
      setLoading(false);
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
      setLoading(true);
      const list = await api.vaultList();
      setEntries(
        list
          .filter((x: any) => !x.deleted)
          .map((x: any) => ({
            name: x.logicalPath?.split("/").pop() || x.logicalPath,
            path: x.logicalPath,
            isDir: false,
            size: x.sizePlain,
            mtime: x.updatedAt,
          }))
      );
      setPath("vault://");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
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
    if (["js", "jsx", "ts", "tsx", "mjs"].includes(ext || ""))
      return [javascript({ typescript: ext?.startsWith("ts") })];
    return [markdown()];
  })();

  const rawCrumbs = path === "vault://" ? ["vault"] : path.split("/").filter(Boolean);
  // Show only last 3 segments so mobile chrome doesn't flood with /data/data/...
  const crumbs =
    rawCrumbs.length > 3
      ? (["…", ...rawCrumbs.slice(-3)] as string[])
      : rawCrumbs;
  const crumbFull = rawCrumbs;

  if (filePath) {
    return (
      <div className="editor-page">
        <AppBar
          title={filePath.split("/").pop() || filePath}
          leading={
            <IconButton
              icon={ChevronLeft}
              label="Back"
              onClick={() => {
                setFilePath(null);
                setPdfUrl(null);
              }}
            />
          }
          trailing={
            <>
              {!pdfUrl && isMd && (
                <IconButton
                  icon={Eye}
                  label="Toggle preview"
                  variant={preview ? "accent" : "ghost"}
                  onClick={() => setPreview((p) => !p)}
                />
              )}
              {!pdfUrl && (
                <IconButton
                  icon={Save}
                  label="Save"
                  variant={dirty ? "accent" : "ghost"}
                  disabled={!dirty}
                  onClick={saveFile}
                />
              )}
            </>
          }
        />
        {error && <ErrorBanner message={error} />}
        {pdfUrl ? (
          <div className="pdf-wrap">
            <iframe className="pdf-frame" src={pdfUrl} title="PDF" />
            {pdfBytes && (
              <div className="pdf-tools">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      setTransferProgress("Annotating…");
                      // F4: stamp a simple annotation note page via pdf-lib
                      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
                      const doc = await PDFDocument.load(pdfBytes);
                      const page = doc.addPage();
                      const font = await doc.embedFont(StandardFonts.Helvetica);
                      page.drawText("DocTool annotation", {
                        x: 50,
                        y: page.getHeight() - 50,
                        size: 14,
                        font,
                        color: rgb(0.2, 0.3, 0.8),
                      });
                      page.drawText(`Highlighted session ${new Date().toISOString()}`, {
                        x: 50,
                        y: page.getHeight() - 74,
                        size: 10,
                        font,
                        color: rgb(0.3, 0.3, 0.3),
                      });
                      const out = await doc.save();
                      const outU8 = out instanceof Uint8Array ? out : new Uint8Array(out);
                      const b64 = b64EncodeBytes(outU8);
                      if (source === "local" && filePath) {
                        await api.fsWrite(filePath, b64);
                      }
                      const blob = new Blob([outU8], { type: "application/pdf" });
                      setPdfBytes(outU8);
                      setPdfUrl(URL.createObjectURL(blob));
                      toast("Annotation page saved", "success");
                    } catch (e: any) {
                      setError(friendlyError(e));
                    } finally {
                      setTransferProgress(null);
                    }
                  }}
                >
                  Add annotation page & save
                </Button>
              </div>
            )}
          </div>
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
    );
  }

  return (
    <div className="page-gap">
      <AppBar title="Files" />

      <SegmentedControl
        ariaLabel="File source"
        value={source}
        onChange={(v) => {
          if (v === "local") {
            setSource("local");
            setSftpId(null);
            setPath(root || path);
          } else if (v === "vault") {
            setSftpId(null);
            loadVault();
          } else if (v === "webdav") {
            setSftpId(null);
            void loadWebdav("/");
          } else {
            setSource("sftp");
            setSftpId(null);
            setEntries([]);
            setLoading(false);
            setError(null);
          }
        }}
        options={[
          { value: "local", label: "Local" },
          { value: "sftp", label: "Servers" },
          { value: "vault", label: "Vault" },
          { value: "webdav", label: "WebDAV" },
        ]}
      />

      {source === "sftp" && <CoachBanner id="sftp" />}

      {source === "sftp" && sftpId && !sftpConnected && (
        <div className="sync-banner">
          Disconnected
          <Button size="sm" variant="secondary" onClick={() => sftpId && void connectSftp(sftpId)}>
            Reconnect
          </Button>
        </div>
      )}

      {transferProgress && <p className="muted">{transferProgress}</p>}

      {source === "webdav" && (
        <div className="panel stack">
          <Button variant="primary" size="sm" onClick={() => void loadWebdav("/")}>
            Connect WebDAV
          </Button>
        </div>
      )}

      {recents.length > 0 && source === "local" && !loading && (
        <div className="recents-block">
          <p className="section-label">Recents</p>
          {recents.slice(0, 5).map((r) => (
            <button
              key={r.uri}
              type="button"
              className="recent-row"
              onClick={() => {
                if (r.uri.startsWith("local://")) {
                  const p = r.uri.replace("local://", "");
                  void openLocalFile(p, r.title || p.split("/").pop() || p);
                }
              }}
            >
              <span>{r.title || r.uri}</span>
              <span className="muted">{r.uri.split("://")[0]}</span>
            </button>
          ))}
        </div>
      )}

      {source === "sftp" && (
        <div className="chip-scroll">
          {profiles.length === 0 && (
            <span className="muted">Add a server in Settings</span>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`profile-chip ${sftpId === p.id ? "is-active" : ""}`}
              onClick={() => connectSftp(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={() => loadLocal(path)} />}

      {/* Local only: path crumbs. SFTP only when connected. Never mix. */}
      {source === "local" && (
        <div className="breadcrumb" aria-label="Path">
          <button type="button" className="crumb" onClick={() => setPath(root)}>
            ~
          </button>
          {crumbs.map((c, i) => {
            const isEllipsis = c === "…";
            const fullIdx = isEllipsis ? -1 : crumbFull.length - (crumbs.length - i);
            return (
              <button
                key={`${c}-${i}`}
                type="button"
                className="crumb"
                disabled={isEllipsis}
                onClick={() => {
                  if (isEllipsis || fullIdx < 0) return;
                  setPath("/" + crumbFull.slice(0, fullIdx + 1).join("/"));
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}
      {source === "sftp" && sftpId && (
        <div className="breadcrumb" aria-label="Remote path">
          <button
            type="button"
            className="crumb"
            onClick={() => {
              setPath("/");
              api.sftpList(sftpId, "/").then(setEntries);
            }}
          >
            /
          </button>
          {rawCrumbs
            .filter((c) => c !== "vault")
            .map((c, i, arr) => (
              <button
                key={`${c}-${i}`}
                type="button"
                className="crumb"
                onClick={() => {
                  const next = "/" + arr.slice(0, i + 1).join("/");
                  setPath(next);
                  api.sftpList(sftpId, next).then(setEntries);
                }}
              >
                {c}
              </button>
            ))}
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : entries.length === 0 ? (
        <div className="ui-empty">
          <span className="ui-empty__title">
            {source === "sftp" && !sftpId
              ? "No server selected"
              : source === "vault"
                ? "Vault empty"
                : "Folder empty"}
          </span>
          {(source === "sftp" && !sftpId) && (
            <p className="ui-empty__body">Connect a server to browse files.</p>
          )}
        </div>
      ) : (
        <div className="ui-list">
          {entries.map((e) => (
            <ListRow
              key={e.path}
              icon={fileIcon(e.name, e.isDir)}
              title={e.name}
              meta={e.isDir ? undefined : e.size != null ? `${e.size} B` : undefined}
              onClick={() => {
                if (source === "local") {
                  if (e.isDir) setPath(e.path);
                  else openLocalFile(e.path, e.name);
                } else if (source === "sftp") openSftpEntry(e);
                else openVaultFile(e.path);
              }}
            />
          ))}
        </div>
      )}

      <Sheet
        open={!!hostKey && !!pendingSftpId}
        title="Verify this server"
        onClose={() => {
          setHostKey(null);
          setPendingSftpId(null);
        }}
        footer={
          <>
            <Button
              block
              variant="secondary"
              onClick={() => {
                setHostKey(null);
                setPendingSftpId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              block
              variant="primary"
              onClick={() => pendingSftpId && hostKey && connectSftp(pendingSftpId, hostKey)}
            >
              Trust & connect
            </Button>
          </>
        }
      >
        <p className="muted">Fingerprint (SHA-256 style identifier from the server key):</p>
        <div className="recovery-key">{hostKey}</div>
      </Sheet>
    </div>
  );
}
