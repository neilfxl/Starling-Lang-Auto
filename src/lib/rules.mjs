export function matchRuleForUrl(rules, url) {
  const list = Array.isArray(rules) ? rules : []
  const u = String(url ?? '')

  const enabled = list.filter((r) => r && r.enabled)
  enabled.sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))

  for (const rule of enabled) {
    if (rule.urlRegex) {
      try {
        const re = new RegExp(rule.urlRegex)
        if (!re.test(u)) continue
        return rule
      } catch {
        continue
      }
    }

    if (Array.isArray(rule.urlIncludes) && rule.urlIncludes.length > 0) {
      const ok = rule.urlIncludes.every((token) => u.includes(String(token)))
      if (!ok) continue
      return rule
    }
  }

  return null
}

