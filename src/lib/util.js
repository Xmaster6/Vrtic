// Kompresija slike u pregledniku prije uploada (max 1920px, JPEG 0.9)
export async function compressImage(file, maxSize = 1920, quality = 0.9) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Jednostavan CSV parser (podržava navodnike, , ili ; kao separator)
export function parseCsv(text) {
  const clean = text.replace(/^﻿/, '')
  const sep = (clean.split('\n')[0].match(/;/g) || []).length > (clean.split('\n')[0].match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (q) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()))
  const keys = head.map((h) => h.trim().toLowerCase())
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])))
}

export function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(10); crypto.getRandomValues(a)
  return Array.from(a, (n) => chars[n % chars.length]).join('')
}

export const fmtDate = (d) => new Date(d).toLocaleString('hr-HR', { dateStyle: 'medium', timeStyle: 'short' })
export const ROLE_LABEL = { admin: 'Admin', odgajatelj: 'Odgajatelj', roditelj: 'Roditelj' }
export const TYPE_LABEL = { objava: '📢 Objava', izgubljeno: '🧸 Izgubljeno', zdravlje: '🩺 Zdravlje' }
