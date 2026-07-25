use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub mtime: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub mtime: Option<String>,
}

pub fn list_dir(path: &str) -> AppResult<Vec<DirEntry>> {
    let p = PathBuf::from(path);
    if !p.exists() {
        return Err(AppError::NotFound);
    }
    if !p.is_dir() {
        return Err(AppError::validation("not a directory"));
    }
    let mut entries = Vec::new();
    for ent in fs::read_dir(&p)? {
        let ent = ent?;
        let meta = ent.metadata()?;
        let name = ent.file_name().to_string_lossy().to_string();
        let full = ent.path().to_string_lossy().to_string();
        let mtime = meta.modified().ok().and_then(|t| {
            t.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|d| d.as_secs().to_string())
        });
        entries.push(DirEntry {
            name,
            path: full,
            is_dir: meta.is_dir(),
            size: if meta.is_file() {
                Some(meta.len())
            } else {
                None
            },
            mtime,
        });
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

pub fn read_file(path: &str) -> AppResult<Vec<u8>> {
    let p = Path::new(path);
    if !p.exists() {
        return Err(AppError::NotFound);
    }
    Ok(fs::read(p)?)
}

pub fn write_file(path: &str, data: &[u8]) -> AppResult<()> {
    let p = Path::new(path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = p.with_extension("doctool.tmp");
    fs::write(&tmp, data)?;
    fs::rename(&tmp, p).or_else(|_| {
        fs::write(p, data)?;
        let _ = fs::remove_file(&tmp);
        Ok::<(), std::io::Error>(())
    })?;
    Ok(())
}

pub fn mkdir(path: &str) -> AppResult<()> {
    fs::create_dir_all(path)?;
    Ok(())
}

pub fn remove_path(path: &str) -> AppResult<()> {
    let p = Path::new(path);
    if !p.exists() {
        return Err(AppError::NotFound);
    }
    if p.is_dir() {
        fs::remove_dir_all(p)?;
    } else {
        fs::remove_file(p)?;
    }
    Ok(())
}

pub fn rename_path(from: &str, to: &str) -> AppResult<()> {
    fs::rename(from, to)?;
    Ok(())
}

pub fn stat_path(path: &str) -> AppResult<FileStat> {
    let p = Path::new(path);
    let meta = fs::metadata(p).map_err(|_| AppError::NotFound)?;
    let mtime = meta.modified().ok().and_then(|t| {
        t.duration_since(std::time::UNIX_EPOCH)
            .ok()
            .map(|d| d.as_secs().to_string())
    });
    Ok(FileStat {
        path: path.to_string(),
        is_dir: meta.is_dir(),
        size: meta.len(),
        mtime,
    })
}

pub fn default_docs_dir() -> PathBuf {
    #[cfg(target_os = "android")]
    {
        let p = PathBuf::from("/data/data/com.doctool.app/files/documents");
        let _ = std::fs::create_dir_all(&p);
        return p;
    }
    #[cfg(not(target_os = "android"))]
    {
        dirs::document_dir()
            .or_else(dirs::home_dir)
            .unwrap_or_else(|| PathBuf::from("."))
    }
}
