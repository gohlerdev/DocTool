use crate::crypto::header::VaultHeader;
use crate::crypto::keys::MasterKey;
use crate::error::AppResult;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct VaultSession {
    pub master_key: MasterKey,
    pub header: VaultHeader,
    /// logical_path -> object_id
    pub manifest: HashMap<String, ManifestEntry>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ManifestEntry {
    pub logical_path: String,
    pub object_id: String,
    pub kind: String,
    pub size_plain: u64,
    pub updated_at: String,
    pub content_hash: Option<String>,
    pub deleted: bool,
}

impl VaultSession {
    pub fn new(master_key: MasterKey, header: VaultHeader) -> Self {
        Self {
            master_key,
            header,
            manifest: HashMap::new(),
        }
    }

    pub fn load_manifest_json(&mut self, json: &str) -> AppResult<()> {
        let v: Value = serde_json::from_str(json).unwrap_or(serde_json::json!({"entries":[]}));
        let mut map = HashMap::new();
        if let Some(entries) = v.get("entries").and_then(|e| e.as_array()) {
            for e in entries {
                if let Ok(entry) = serde_json::from_value::<ManifestEntry>(e.clone()) {
                    map.insert(entry.logical_path.clone(), entry);
                }
            }
        }
        self.manifest = map;
        Ok(())
    }

    pub fn manifest_json(&self) -> String {
        let entries: Vec<&ManifestEntry> = self.manifest.values().collect();
        serde_json::json!({
            "v": 1,
            "updated_at": chrono::Utc::now().to_rfc3339(),
            "entries": entries,
        })
        .to_string()
    }
}
