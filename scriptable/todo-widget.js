// Awense to-do — Scriptable lock screen widget.
// Setup: install Scriptable, paste this file into a new script, fill in the two values below.
// API_KEY is your Siri Shortcuts key (ss_...) from the "Siri Shortcuts" page in Awense.
const SERVER_BASE_URL = "https://YOUR-SERVER" // same host the Apple Pay Shortcut uses, no trailing slash
const API_KEY = "ss_PASTE_YOUR_KEY"
const APP_URL = "https://awense.com/todo"

const CACHE_FILE = "awense-todo-cache.json"
const MAX_TASKS = 3

const fm = FileManager.local()
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE)

async function load() {
  try {
    const req = new Request(`${SERVER_BASE_URL}/v1/ss/todo`)
    req.headers = { "x-api-key": API_KEY }
    const json = await req.loadJSON()
    if (req.response.statusCode !== 200 || !json.data) throw new Error("bad response")
    fm.writeString(cachePath, JSON.stringify(json.data))
    return { data: json.data, stale: false }
  } catch (e) {
    // Offline or request failed: show the last result we saw.
    if (fm.fileExists(cachePath)) return { data: JSON.parse(fm.readString(cachePath)), stale: true }
    return { data: null, stale: true }
  }
}

const { data, stale } = await load()

const w = new ListWidget()
w.url = APP_URL
w.setPadding(4, 4, 4, 4)

const addLine = (text, opts = {}) => {
  const t = w.addText(text)
  t.font = opts.font ?? Font.systemFont(13)
  t.lineLimit = 1
  t.textOpacity = opts.opacity ?? 1
  return t
}

if (!data) {
  addLine("To-do unavailable", { opacity: 0.6 })
} else if (!data.tasks.length) {
  addLine("All clear", { font: Font.semiboldSystemFont(14) })
} else {
  data.tasks.slice(0, MAX_TASKS).forEach((title) => addLine(`• ${title}`))
  if (stale) addLine("offline", { font: Font.systemFont(9), opacity: 0.5 })
}

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  // Running the script in the app previews the lock screen size.
  await w.presentAccessoryRectangular()
}
Script.complete()
