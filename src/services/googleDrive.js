/**
 * Google Drive Backup Service
 *
 * Uses Google Identity Services (GIS) Token Model for client-side-only OAuth.
 * Backs up notes to Drive's hidden appDataFolder (not visible in user's Drive UI).
 *
 * Requirements:
 *   1. A Google Cloud OAuth Client ID (free to create at console.cloud.google.com)
 *   2. Enable Google Drive API in the Cloud project
 *   3. Add the app's origin to Authorized JavaScript origins
 *   4. User grants consent once per browser session
 *
 * Session-aware authorization:
 *   - If the user is already signed into Google in the browser, the consent popup
 *     will show their logged-in account. They just click "Allow" — no re-entry of
 *     credentials is needed.
 *   - Access tokens are short-lived (1 hour) and managed per-session.
 *   - No refresh tokens or backend server required.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
const BACKUP_FILENAME = "notecache-backup.json";
const CLIENT_ID_KEY = "noteapp_gdrive_client_id";

let tokenClient = null;
let accessToken = null;

// ── Helpers ──

function getClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || "";
}

export function setClientId(id) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
  tokenClient = null; // reset so it's re-initialized with new ID
}

export function isConfigured() {
  return !!getClientId();
}

export function isAuthorized() {
  return !!accessToken;
}

/** Load the GIS library if not already loaded */
function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

/** Initialize token client and request access */
export async function authorize() {
  const clientId = getClientId();
  if (!clientId) throw new Error("Google OAuth Client ID not configured.");

  await loadGisScript();

  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          accessToken = null;
          reject(new Error(response.error_description || response.error));
          return;
        }
        accessToken = response.access_token;
        resolve(response);
      },
      error_callback: (err) => {
        accessToken = null;
        reject(new Error(err.message || "Authorization cancelled"));
      },
    });
    tokenClient.requestAccessToken();
  });
}

/** Revoke access and clear token */
export async function disconnect() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
  tokenClient = null;
}

// ── Drive API Helpers ──

async function driveRequest(url, options = {}) {
  if (!accessToken) throw new Error("Not authorized. Please sign in first.");
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    accessToken = null;
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API error (${res.status}): ${text}`);
  }
  return res;
}

/** Find backup file in appDataFolder */
async function findBackupFile() {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${BACKUP_FILENAME}' and trashed=false`,
    fields: "files(id,name,modifiedTime,size)",
    pageSize: "1",
  });
  const res = await driveRequest(`${DRIVE_API}/files?${params}`);
  const data = await res.json();
  return data.files?.[0] || null;
}

// ── Public API ──

/**
 * Backup all notes to Google Drive appDataFolder.
 * @param {Array} notes - All notes from current workspace
 * @param {string} workspaceName - Current workspace name
 * @returns {Object} { fileId, modifiedTime }
 */
export async function backupToDrive(notes, workspaceName) {
  const backup = {
    version: 1,
    app: "NoteCache",
    workspace: workspaceName,
    exportedAt: new Date().toISOString(),
    noteCount: notes.length,
    notes: notes.map(({ noteid, title, body, tags, created_at, updated_at, pinned }) => ({
      noteid, title, body, tags, created_at, updated_at, pinned,
    })),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });

  // Check if backup file already exists, update it; otherwise create new
  const existing = await findBackupFile();

  if (existing) {
    // Update existing file content
    const res = await driveRequest(
      `${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=media`,
      { method: "PATCH", body: blob, headers: { "Content-Type": "application/json" } }
    );
    const data = await res.json();
    return { fileId: data.id, modifiedTime: data.modifiedTime };
  }

  // Create new file with multipart upload (metadata + content)
  const metadata = JSON.stringify({
    name: BACKUP_FILENAME,
    parents: ["appDataFolder"],
  });
  const boundary = "notecache_boundary_" + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${await blob.text()}\r\n` +
    `--${boundary}--`;

  const res = await driveRequest(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
    {
      method: "POST",
      body,
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    }
  );
  const data = await res.json();
  return { fileId: data.id, modifiedTime: data.modifiedTime };
}

/**
 * Restore notes from Google Drive backup.
 * @returns {Object|null} The backup data or null if no backup found
 */
export async function restoreFromDrive() {
  const file = await findBackupFile();
  if (!file) return null;

  const res = await driveRequest(`${DRIVE_API}/files/${file.id}?alt=media`);
  const data = await res.json();
  return data;
}

/**
 * Get info about the existing backup without downloading it.
 * @returns {Object|null} { fileId, name, modifiedTime, size } or null
 */
export async function getBackupInfo() {
  return findBackupFile();
}
