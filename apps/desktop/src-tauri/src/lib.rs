use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{self, Receiver};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, State, WindowEvent,
};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopRuntime {
    app_version: String,
    platform: String,
    tray_enabled: bool,
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show VoidMix", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide window", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit VoidMix", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

    let mut tray = TrayIconBuilder::new();
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

struct PiRunner {
    child: Child,
    stdin: ChildStdin,
    responses: Receiver<serde_json::Value>,
}

impl Drop for PiRunner {
    fn drop(&mut self) {
        let _ = self.child.kill();
    }
}

#[derive(Default)]
struct PiState {
    authorized_project: Mutex<Option<String>>,
    runner: Mutex<Option<PiRunner>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PiRuntimeStatus {
    availability: String,
    provider: Option<String>,
    authorized_project: Option<String>,
    reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProjectPath {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSession {
    project_path: Option<String>,
    prompt: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionId {
    session_id: String,
    message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PiSession {
    id: String,
    project_path: String,
    status: String,
    provider: String,
}

fn pi_runner_path() -> Option<String> {
    std::env::var("VOIDMIX_PI_RUNNER")
        .ok()
        .filter(|value| !value.trim().is_empty())
}

fn call_pi_runner(
    state: &PiState,
    request: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let path = pi_runner_path().ok_or_else(|| {
        "PI_PROVIDER_UNAVAILABLE: set VOIDMIX_PI_RUNNER to the local runner executable".to_string()
    })?;
    let mut runner_guard = state
        .runner
        .lock()
        .map_err(|_| "Pi runner state unavailable".to_string())?;
    if runner_guard.is_none() {
        let mut child = Command::new(path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("PI_RUNNER_START_FAILED: {e}"))?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "PI_RUNNER_START_FAILED: stdin unavailable".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "PI_RUNNER_START_FAILED: stdout unavailable".to_string())?;
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
                    let _ = tx.send(value);
                }
            }
        });
        *runner_guard = Some(PiRunner {
            child,
            stdin,
            responses: rx,
        });
    }
    let runner = runner_guard.as_mut().expect("runner initialized");
    let request_id = request
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    writeln!(runner.stdin, "{request}").map_err(|e| format!("PI_RUNNER_WRITE_FAILED: {e}"))?;
    runner
        .stdin
        .flush()
        .map_err(|e| format!("PI_RUNNER_WRITE_FAILED: {e}"))?;
    loop {
        let response = runner
            .responses
            .recv()
            .map_err(|_| "PI_RUNNER_FAILED: process exited".to_string())?;
        if response.get("id").and_then(|v| v.as_str()) == Some(request_id.as_str()) {
            return Ok(response);
        }
        // Events belong to an active session and are intentionally consumed here;
        // the Desktop UI receives authoritative state through the cloud event journal.
    }
}

#[tauri::command]
fn pi_runtime_status(state: State<'_, PiState>) -> PiRuntimeStatus {
    if pi_runner_path().is_some() {
        return PiRuntimeStatus {
            availability: "ready".into(),
            provider: Some("pi".into()),
            authorized_project: state.authorized_project.lock().ok().and_then(|p| p.clone()),
            reason: None,
        };
    }
    PiRuntimeStatus {
        availability: "unavailable".into(),
        provider: None,
        authorized_project: state.authorized_project.lock().ok().and_then(|p| p.clone()),
        reason: Some("PI_PROVIDER_UNAVAILABLE: local Pi runner is not connected".into()),
    }
}

#[tauri::command]
fn authorize_project_folder(
    input: ProjectPath,
    state: State<'_, PiState>,
) -> Result<PiRuntimeStatus, String> {
    let path = PathBuf::from(&input.path);
    if !path.is_dir() {
        return Err("Project folder does not exist or is not a directory".into());
    }
    let canonical = path
        .canonicalize()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();
    *state
        .authorized_project
        .lock()
        .map_err(|_| "Pi state unavailable".to_string())? = Some(canonical.clone());
    Ok(PiRuntimeStatus {
        availability: "unavailable".into(),
        provider: None,
        authorized_project: Some(canonical),
        reason: Some("Folder authorized; configure a local Pi provider to run sessions.".into()),
    })
}

#[tauri::command]
fn pi_session_create(input: CreateSession, state: State<'_, PiState>) -> Result<PiSession, String> {
    let project = input
        .project_path
        .or_else(|| state.authorized_project.lock().ok().and_then(|p| p.clone()))
        .ok_or_else(|| "Authorize a project folder first".to_string())?;
    let response = call_pi_runner(
        &state,
        serde_json::json!({"id":"create","type":"create","projectId":"local","cwd":project,"prompt":input.prompt}),
    )?;
    if response.get("ok") != Some(&serde_json::Value::Bool(true)) {
        return Err(response
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("PI_RUNNER_FAILED")
            .into());
    }
    serde_json::from_value(response["session"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
fn pi_session_steer(input: SessionId, state: State<'_, PiState>) -> Result<PiSession, String> {
    let response = call_pi_runner(
        &state,
        serde_json::json!({
            "id": format!("steer-{}", input.session_id),
            "type": "steer",
            "sessionId": input.session_id,
            "prompt": input.message.unwrap_or_default(),
        }),
    )?;
    if response.get("ok") != Some(&serde_json::Value::Bool(true)) {
        return Err(response
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("PI_RUNNER_FAILED")
            .into());
    }
    Ok(PiSession {
        id: response
            .get("sessionId")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .into(),
        project_path: String::new(),
        status: "running".into(),
        provider: "pi".into(),
    })
}
#[tauri::command]
fn pi_session_cancel(input: SessionId, state: State<'_, PiState>) -> Result<PiSession, String> {
    let response = call_pi_runner(
        &state,
        serde_json::json!({
            "id": format!("cancel-{}", input.session_id),
            "type": "cancel",
            "sessionId": input.session_id,
        }),
    )?;
    if response.get("ok") != Some(&serde_json::Value::Bool(true)) {
        return Err(response
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("PI_RUNNER_FAILED")
            .into());
    }
    Ok(PiSession {
        id: input.session_id,
        project_path: String::new(),
        status: "cancelled".into(),
        provider: "pi".into(),
    })
}

#[tauri::command]
fn desktop_runtime(app: AppHandle) -> DesktopRuntime {
    DesktopRuntime {
        app_version: app.package_info().version.to_string(),
        platform: std::env::consts::OS.to_string(),
        tray_enabled: true,
    }
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or_else(|| "Main window is not available".to_owned())?
        .hide()
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            build_tray(app)?;
            Ok(())
        })
        .manage(PiState::default())
        .invoke_handler(tauri::generate_handler![
            desktop_runtime,
            hide_main_window,
            pi_runtime_status,
            authorize_project_folder,
            pi_session_create,
            pi_session_steer,
            pi_session_cancel
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running VoidMix desktop application");
}
