mod commands;
mod crypto;
mod db;
mod error;
mod fs_ops;
mod notes;
mod sftp;
mod state;

use state::AppState;
use std::path::PathBuf;
use tauri::Manager;

fn fallback_data_dir() -> PathBuf {
    // Android package-private files dir (works when CWD is read-only)
    #[cfg(target_os = "android")]
    {
        return PathBuf::from("/data/data/com.doctool.app/files");
    }
    #[cfg(not(target_os = "android"))]
    {
        dirs::data_dir()
            .or_else(dirs::home_dir)
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.doctool.app")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,doctool=debug".into()),
        )
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| fallback_data_dir());
            tracing::info!(path = %dir.display(), "DocTool data directory");
            let state = AppState::new(dir).map_err(|e| {
                tracing::error!("failed to init app state: {e}");
                e
            })?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::app_info,
            commands::settings_get,
            commands::settings_set,
            commands::notes_list,
            commands::notes_get,
            commands::notes_upsert,
            commands::notes_delete,
            commands::notes_search,
            commands::notes_sync_now,
            commands::fs_default_root,
            commands::fs_list,
            commands::fs_read,
            commands::fs_write,
            commands::fs_mkdir,
            commands::fs_remove,
            commands::fs_rename,
            commands::fs_stat,
            commands::recents_list,
            commands::recents_add,
            commands::sftp_profiles_list,
            commands::sftp_profile_save,
            commands::sftp_profile_delete,
            commands::sftp_connect,
            commands::sftp_disconnect,
            commands::sftp_list,
            commands::sftp_read,
            commands::sftp_write,
            commands::sftp_mkdir,
            commands::sftp_remove,
            commands::sftp_reset_host_key,
            commands::vault_status,
            commands::vault_create,
            commands::vault_unlock,
            commands::vault_lock,
            commands::vault_list,
            commands::vault_put_file,
            commands::vault_get_file,
            commands::crypto_info,
            commands::notes_labels,
            commands::notes_restore,
            commands::notes_trash,
            commands::notes_purge_trash,
            commands::notes_bulk,
            commands::notes_export_markdown,
            commands::notes_search_ranked,
            commands::notes_seed_sample,
            commands::vault_set_auto_lock,
            commands::vault_get_auto_lock,
            commands::crypto_recommend_kdf,
            commands::vault_export_backup,
            commands::vault_import_backup,
            commands::drive_status,
            commands::drive_set_linked,
            commands::drive_store_token,
            commands::webdav_list,
            commands::db_vacuum,
            commands::app_network_hint,
            commands::vault_change_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DocTool");
}
