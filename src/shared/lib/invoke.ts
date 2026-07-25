import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e) {
      throw e as AppError;
    }
    throw { code: "Internal", message: String(e) } as AppError;
  }
}

export type NoteSummary = {
  id: string;
  title: string;
  snippet: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  updatedAt: string;
  labels: string[];
  syncStatus: string;
};

export type Note = {
  id: string;
  title: string;
  body: unknown;
  color: string;
  pinned: boolean;
  archived: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contentHash?: string;
  remoteObjectId?: string;
  syncStatus: string;
  labels: string[];
  lastError?: string | null;
};

export type DirEntry = {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mtime?: string;
};

export type VaultStatus = {
  configured: boolean;
  unlocked: boolean;
  driveLinked: boolean;
  lastSyncAt?: string;
  pendingJobs: number;
  entryCount: number;
};

export type AppInfo = {
  version: string;
  os: string;
  deviceId: string;
  dataDir: string;
};

export const api = {
  appInfo: () => invoke<AppInfo>("app_info"),
  settingsGet: (key: string) => invoke<string | null>("settings_get", { key }),
  settingsSet: (key: string, value: string) => invoke<void>("settings_set", { key, value }),

  notesList: (opts?: { query?: string; label?: string; archived?: boolean }) =>
    invoke<NoteSummary[]>("notes_list", opts ?? {}),
  notesGet: (id: string) => invoke<Note>("notes_get", { id }),
  notesUpsert: (input: {
    id?: string;
    title: string;
    body: unknown;
    color?: string;
    pinned?: boolean;
    archived?: boolean;
    labels?: string[];
  }) => invoke<Note>("notes_upsert", { input }),
  notesDelete: (id: string, hard?: boolean) => invoke<void>("notes_delete", { id, hard }),
  notesSearch: (query: string) => invoke<NoteSummary[]>("notes_search", { query }),
  notesSyncNow: () => invoke<{ pushed: number; pulled: number }>("notes_sync_now"),

  fsDefaultRoot: () => invoke<string>("fs_default_root"),
  fsList: (path: string) => invoke<DirEntry[]>("fs_list", { path }),
  fsRead: (path: string) => invoke<string>("fs_read", { path }),
  fsWrite: (path: string, dataBase64: string) =>
    invoke<number>("fs_write", { path, dataBase64 }),
  fsMkdir: (path: string) => invoke<void>("fs_mkdir", { path }),
  fsRemove: (path: string) => invoke<void>("fs_remove", { path }),
  recentsList: () => invoke<{ uri: string; title?: string; openedAt: string }[]>("recents_list"),
  recentsAdd: (uri: string, title?: string) => invoke<void>("recents_add", { uri, title }),

  sftpProfilesList: () => invoke<any[]>("sftp_profiles_list"),
  sftpProfileSave: (input: any) => invoke<string>("sftp_profile_save", { input }),
  sftpProfileDelete: (id: string) => invoke<void>("sftp_profile_delete", { id }),
  sftpConnect: (id: string, trustFingerprint?: string) =>
    invoke<any>("sftp_connect", { id, trustFingerprint }),
  sftpDisconnect: (id: string) => invoke<void>("sftp_disconnect", { id }),
  sftpList: (id: string, path: string) => invoke<DirEntry[]>("sftp_list", { id, path }),
  sftpRead: (id: string, path: string) => invoke<string>("sftp_read", { id, path }),
  sftpWrite: (id: string, path: string, dataBase64: string) =>
    invoke<void>("sftp_write", { id, path, dataBase64 }),
  sftpMkdir: (id: string, path: string) => invoke<void>("sftp_mkdir", { id, path }),
  sftpRemove: (id: string, path: string) => invoke<void>("sftp_remove", { id, path }),
  sftpResetHostKey: (id: string) => invoke<void>("sftp_reset_host_key", { id }),

  vaultStatus: () => invoke<VaultStatus>("vault_status"),
  vaultCreate: (password: string) =>
    invoke<{ recoveryKey: string }>("vault_create", { password }),
  vaultUnlock: (opts: { password?: string; recoveryKey?: string }) =>
    invoke<void>("vault_unlock", opts),
  vaultLock: () => invoke<void>("vault_lock"),
  vaultList: () => invoke<any[]>("vault_list"),
  vaultPutFile: (logicalPath: string, dataBase64: string, kind?: string) =>
    invoke<string>("vault_put_file", { logicalPath, dataBase64, kind }),
  vaultGetFile: (logicalPath: string) => invoke<string>("vault_get_file", { logicalPath }),
};

export function b64Encode(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

export function b64Decode(b64: string): string {
  return decodeURIComponent(escape(atob(b64)));
}

export function b64EncodeBytes(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

export function b64DecodeBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
