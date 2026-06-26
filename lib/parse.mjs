export function normalizeCode(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const m = s.match(/^\[?([a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)\]?$/)
  if (m) return m[1]
  const m2 = s.match(/\[\s*([a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)\s*\]/)
  if (m2) return m2[1]
  return ''
}

export function parseLanguageLines(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const ok = []
  const bad = []

  for (const line of lines) {
    const code = normalizeCode(line)
    if (!code) {
      bad.push({ raw: line, reason: '无法解析语言 code' })
      continue
    }

    const displayName = line.replace(/\[\s*([a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)\s*\]/, '').trim()
    ok.push({ code, displayName })
  }

  const dedup = []
  const seen = new Set()
  for (const item of ok) {
    const key = item.code.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    dedup.push(item)
  }

  return { ok: dedup, bad }
}

