export interface PrintGroup {
  room: string
  items: { name: string; size: string }[]
}

export interface PrintData {
  title: string
  subtitle: string
  imageUrl: string
  groups: PrintGroup[]
  labels: { furniture: string; total: string; footer: string }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** Prints the plan picture with a room legend and a furniture list; the browser's print dialog also saves it as a PDF. */
export function printPlan(d: PrintData) {
  const total = d.groups.reduce((n, g) => n + g.items.length, 0)
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.title)}</title><style>
    @page { margin: 14mm; }
    body { font: 12px/1.4 -apple-system, "Segoe UI", Roboto, "Noto Sans SC", sans-serif; color: #1c1c1c; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    .sub { color: #666; margin-bottom: 12px; }
    img { width: 100%; max-height: 150mm; object-fit: contain; border: 1px solid #ddd; border-radius: 6px; }
    h2 { font-size: 13px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    td, th { text-align: left; padding: 3px 6px; border-bottom: 1px solid #e5e5e5; }
    th { background: #f4f4f4; font-weight: 600; }
    td.size { white-space: nowrap; color: #555; }
    .room-row th { background: #fff; border-bottom: 2px solid #999; padding-top: 10px; }
    .foot { margin-top: 14px; color: #888; font-size: 10px; }
    tr, .room-row { break-inside: avoid; }
  </style></head><body>
    <h1>${esc(d.title)}</h1><div class="sub">${esc(d.subtitle)}</div>
    <img src="${d.imageUrl}" alt="">
    <h2>${esc(d.labels.furniture)} (${esc(d.labels.total.replace('{n}', String(total)))})</h2>
    <table>${d.groups
      .map((g) => `<tr class="room-row"><th colspan="2">${esc(g.room)} (${g.items.length})</th></tr>${g.items.map((i) => `<tr><td>${esc(i.name)}</td><td class="size">${esc(i.size)}</td></tr>`).join('')}`)
      .join('')}</table>
    <div class="foot">${esc(d.labels.footer)}</div>
  </body></html>`

  const frame = document.createElement('iframe')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(frame)
  const win = frame.contentWindow
  const doc = win?.document
  if (!win || !doc) {
    frame.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const go = () => {
    win.focus()
    win.print()
    setTimeout(() => frame.remove(), 60_000)
  }
  const img = doc.querySelector('img')
  if (img && !img.complete) img.addEventListener('load', go, { once: true })
  else setTimeout(go, 50)
}
