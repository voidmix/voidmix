const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron')
const { readFile, writeFile, rm } = require('node:fs/promises')
const path = require('node:path')
const apiUrl = new URL(process.env.VOIDMIX_API_URL || 'http://localhost:3000')
if (apiUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(apiUrl.hostname))
  throw new Error('The API requires HTTPS outside localhost')
app.setName('Voidmix')
app.setPath('userData', path.join(app.getPath('appData'), 'Voidmix'))
function encryptionAvailable() {
  return (
    safeStorage.isEncryptionAvailable() &&
    (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text')
  )
}
let window
const credentialPath = () => path.join(app.getPath('userData'), 'session.enc')
async function readCredential() {
  if (!encryptionAvailable()) throw new Error('OS credential encryption is unavailable')
  try {
    return safeStorage.decryptString(await readFile(credentialPath()))
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}
function handle(channel, callback) {
  ipcMain.handle(channel, (event, ...args) => {
    if (event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted IPC caller')
    return callback(...args)
  })
}
app.whenReady().then(async () => {
  window = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  handle('api-request', async (input) => {
    if (
      !input ||
      typeof input.path !== 'string' ||
      !input.path.startsWith('/api/') ||
      input.path.includes('\\') ||
      input.body?.length > 65536 ||
      !['GET', 'POST', 'DELETE'].includes(input.method)
    )
      throw new Error('Invalid API request')
    const url = new URL(input.path, apiUrl)
    if (url.origin !== apiUrl.origin || !url.pathname.startsWith('/api/'))
      throw new Error('Invalid API origin')
    const token = await readCredential()
    const response = await fetch(url, {
      method: input.method,
      body: input.body,
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return { status: response.status, body: await response.text() }
  })
  handle('open-external', async (value) => {
    const url = new URL(value)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    )
      throw new Error('Invalid external URL')
    await shell.openExternal(url.href)
  })
  handle('save-credential', async (value) => {
    if (typeof value !== 'string' || value.length > 4096 || !encryptionAvailable())
      throw new Error('Cannot securely store credential')
    await writeFile(credentialPath(), safeStorage.encryptString(value), { mode: 0o600 })
  })
  handle('clear-credential', () => rm(credentialPath(), { force: true }))
  if (process.env.VOIDMIX_DESKTOP_DEV === '1') await window.loadURL('http://localhost:1420')
  else await window.loadFile(path.join(__dirname, '../dist/index.html'))
})
app.on('window-all-closed', () => app.quit())
