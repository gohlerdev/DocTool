# DocTool — Notes Dual-Sync Protocol

**ADR:** ADR-005  
**Depends on:** [vault-format.md](./vault-format.md), [data-model.md](./data-model.md)

---

## 1. Goals

1. Instant local note create/edit/search (Google Keep UX).  
2. Multi-device via encrypted Google Drive vault.  
3. Never block UI on network.  
4. Never upload plaintext notes.  
5. Predictable conflict behavior.

---

## 2. Roles

| Store | Role |
|-------|------|
| Local SQLite | **Primary** for UX; always complete for this device’s known notes |
| Vault objects + manifest | **Encrypted replica** / multi-device transport |
| sync_queue | Durable work list for upsert/delete ops |

---

## 3. Note payload (plaintext before encrypt)

```json
{
  "schema": 1,
  "id": "01HZYEXAMPLE00000000000000",
  "title": "Shopping",
  "body": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Milk" }]
      }
    ]
  },
  "color": "yellow",
  "pinned": true,
  "labels": ["personal"],
  "archived": false,
  "deleted_at": null,
  "created_at": "2026-07-25T12:00:00.000Z",
  "updated_at": "2026-07-25T12:05:00.000Z",
  "device_id": "01HZDEV…"
}
```

- `body`: Tiptap/ProseMirror JSON.  
- `device_id`: stable per install (for debugging conflicts).  
- Extra fields with unknown keys: preserve on round-trip if possible (`schema` bump when breaking).

### 3.1 Content hash

```
content_hash = hex(SHA-256(canonical_json_bytes))
```

Canonical JSON: UTF-8, sorted keys at all objects, no insignificant whitespace (use a single serde/JSON stable serializer).

---

## 4. Local row fields (sync-related)

| Column | Meaning |
|--------|---------|
| `sync_status` | `local_only` \| `pending_upload` \| `synced` \| `pending_delete` \| `conflict` \| `error` |
| `remote_object_id` | Drive object id when known |
| `content_hash` | Last local canonical hash |
| `last_synced_at` | Last successful sync time |
| `remote_updated_at` | Last known remote `updated_at` |

---

## 5. State machine

```
                 create/edit
    ┌──────────────────────────────────────┐
    ▼                                      │
 local_only ──(vault ready)──► pending_upload ──success──► synced
    ▲                              │  ▲                     │
    │                              │  │                     │ edit
    │                              fail                     │
    │                              ▼                        ▼
    │                            error              pending_upload
    │
    └── soft-delete local only (never synced)

 synced ──delete──► pending_delete ──success──► (row purged or tombstone local)

 any ──conflict detected──► conflict ──user/auto resolve──► pending_upload | synced
```

---

## 6. When vault is “ready”

All must be true:

1. Vault configured (`vault_state.configured`).  
2. Session unlocked (MK in memory).  
3. Drive linked and token valid (refresh if needed).  
4. Network available (best-effort detect).

If not ready: notes stay `local_only` or `pending_upload` without failing user actions.

---

## 7. Upload algorithm (`upsert`)

```
1. Load note from SQLite
2. Build payload JSON; compute content_hash
3. If remote_object_id set:
     encrypt → overwrite object (or new object id + delete old — prefer new id immutable, update manifest)
   Else:
     encrypt → new object_id
4. Update manifest entry notes/{id}.json with wrapped DEK, hashes, updated_at
5. Upload object then manifest
6. Set sync_status=synced, last_synced_at=now, remote_object_id, remote_updated_at
7. Remove queue job
```

**Immutable objects preference:** always write new `object_id`, point manifest to it, mark old deleted (simpler integrity; GC later).

---

## 8. Delete algorithm

**Soft delete local:** set `deleted_at`, `sync_status=pending_delete` if was synced.  
**Remote:** mark manifest entry `deleted=true` or remove entry; optionally delete object blob.  
**Hard purge:** after N days (default 30) local vacuum; remote already tombstoned.

---

## 9. Pull algorithm (on unlock / foreground / manual sync)

```
1. Download + decrypt manifest
2. For each entry kind=note, deleted=false:
   a. Find local by id
   b. If no local: decrypt object → insert local, status=synced
   c. If local exists: compare updated_at and content_hash (see conflicts)
3. For each entry deleted=true:
   a. If local exists and local not newer dirty: soft-delete or purge local
4. For each local pending_upload: run upload
5. Emit notes://changed
```

---

## 10. Conflict rules (normative)

Let `L` = local, `R` = remote entry/payload.

| Condition | Action |
|-----------|--------|
| `L.updated_at > R.updated_at` | Upload L (overwrite remote) |
| `R.updated_at > L.updated_at` and L not dirty pending | Apply R to local |
| `R.updated_at > L.updated_at` and L dirty (`pending_upload`) | **Conflict** |
| Same `updated_at`, different hash | **Conflict** |
| Same hash | Mark synced; no-op |

### 10.1 Auto conflict resolution (v1 default)

1. Keep **local** as the primary note (user’s current device intent).  
2. Create new note from remote: title `"{title} (conflict)"`, new id, labels include `conflict`.  
3. Upload both.  
4. Clear conflict status.

UI: toast “Conflict resolved — duplicate created.”

### 10.2 Future (P2)

Manual picker UI.

---

## 11. Queue worker

Table `sync_queue`:

| Column | Description |
|--------|-------------|
| id | ULID |
| entity_type | `note` |
| entity_id | note id |
| op | `upsert` \| `delete` |
| attempts | int |
| last_error | text |
| next_attempt_at | ISO time |
| created_at | ISO time |

**Backoff:** 1s, 2s, 5s, 15s, 60s, 5m, then 15m cap.  
**Max attempts:** 50 then `sync_status=error` surface in UI.  
**Coalesce:** multiple upserts for same note → single latest job.

Worker tick: every 2s while unlocked + every event.

---

## 12. Triggers

| Trigger | Actions |
|---------|---------|
| Note save | Local write; enqueue upsert; debounce 1.5s |
| Vault unlock | Full pull then drain queue |
| App foreground | Pull if last pull > 60s |
| Manual “Sync now” | Pull + drain |
| Network restored | Drain queue |
| Vault lock | Stop worker mid-flight safely |

---

## 13. Security

- Payload encrypted per vault-format.  
- Search FTS is **local only** (Drive cannot search plaintext).  
- Note titles in OS notifications: avoid showing body; title OK with user setting.  
- Logs: note ids OK; never log body.

---

## 14. Offline scenarios

| Scenario | Behavior |
|----------|----------|
| Airplane mode create | Local only; pending when online |
| Unlock without network | Local notes work; pull fails soft |
| Token expired | Refresh; if fail status error “Reconnect Drive” |
| Quota exceeded | error status; user message |

---

## 15. Testing matrix

- [ ] Create offline → go online → appears on Drive as ciphertext  
- [ ] Device B pull sees note  
- [ ] Concurrent edit conflict creates duplicate  
- [ ] Delete syncs tombstone  
- [ ] Password lock mid-upload does not corrupt manifest  
- [ ] 1000 notes pull performance budget documented  

---

## 16. Non-goals

- Partial field sync  
- Real-time collab cursors  
- Sharing one note to another user without shared MK (no v1 sharing)
