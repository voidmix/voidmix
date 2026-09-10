#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::{Deserialize, Serialize};
use url::Url;
struct Api {
    origin: Url,
    client: reqwest::Client,
}
fn credential() -> Result<keyring::Entry, String> {
    keyring::Entry::new("com.voidmix.desktop", "session")
        .map_err(|_| "Credential store unavailable".into())
}
#[derive(Deserialize)]
struct ApiInput {
    path: String,
    method: String,
    body: Option<String>,
}
#[derive(Serialize)]
struct ApiResponse {
    status: u16,
    body: String,
}
#[tauri::command]
async fn api_request(api: tauri::State<'_, Api>, input: ApiInput) -> Result<ApiResponse, String> {
    if !input.path.starts_with("/api/")
        || input.path.contains('\\')
        || input.body.as_ref().map_or(false, |v| v.len() > 65536)
    {
        return Err("Invalid request".into());
    }
    let target = api.origin.join(&input.path).map_err(|_| "Invalid path")?;
    if target.origin() != api.origin.origin() || !target.path().starts_with("/api/") {
        return Err("Invalid origin".into());
    }
    let method = match input.method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Err("Unsupported method".into()),
    };
    let mut request = api
        .client
        .request(method, target)
        .header("Content-Type", "application/json");
    match credential()?.get_password() {
        Ok(token) => request = request.bearer_auth(token),
        Err(keyring::Error::NoEntry) => (),
        Err(_) => return Err("Credential store unavailable".into()),
    }
    if let Some(body) = input.body {
        request = request.body(body);
    }
    let response = request.send().await.map_err(|_| "API unavailable")?;
    let status = response.status().as_u16();
    let body = response.text().await.map_err(|_| "Invalid response")?;
    Ok(ApiResponse { status, body })
}
#[tauri::command]
fn save_credential(value: String) -> Result<(), String> {
    if value.len() > 4096 {
        return Err("Invalid credential".into());
    }
    credential()?
        .set_password(&value)
        .map_err(|_| "Could not save credential".into())
}
#[tauri::command]
fn clear_credential() -> Result<(), String> {
    match credential()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Could not remove credential".into()),
    }
}
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    let target = Url::parse(&url).map_err(|_| "Invalid URL")?;
    let local = matches!(target.host_str(), Some("localhost") | Some("127.0.0.1"));
    if target.scheme() != "https" && !(target.scheme() == "http" && local) {
        return Err("Invalid URL scheme".into());
    }
    webbrowser::open(target.as_str()).map_err(|_| "Could not open browser".into())
}
fn main() {
    let origin = Url::parse(
        &std::env::var("VOIDMIX_API_URL").unwrap_or_else(|_| "http://localhost:3000".into()),
    )
    .expect("Invalid API URL");
    assert!(
        origin.scheme() == "https"
            || (origin.scheme() == "http"
                && matches!(origin.host_str(), Some("localhost") | Some("127.0.0.1"))),
        "API requires HTTPS outside localhost"
    );
    let api = Api {
        origin,
        client: reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("HTTP client"),
    };
    tauri::Builder::default()
        .manage(api)
        .invoke_handler(tauri::generate_handler![
            api_request,
            save_credential,
            clear_credential,
            open_external
        ])
        .run(tauri::generate_context!())
        .expect("Desktop application failed");
}
