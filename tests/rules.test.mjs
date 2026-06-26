import test from 'node:test'
import assert from 'node:assert/strict'

import { matchRuleForUrl } from '../lib/rules.mjs'

test('matchRuleForUrl 按优先级选择匹配规则', () => {
  const rules = [
    { id: 'a', enabled: true, priority: 10, urlIncludes: ['starling'], presetId: 'p1' },
    { id: 'b', enabled: true, priority: 100, urlIncludes: ['starling', '/create'], presetId: 'p2' }
  ]
  const r = matchRuleForUrl(rules, 'https://x/starling/task/create')
  assert.equal(r.id, 'b')
})

test('matchRuleForUrl 支持 regex 且忽略非法 regex', () => {
  const rules = [
    { id: 'bad', enabled: true, priority: 200, urlRegex: '(**', presetId: 'p0' },
    { id: 'ok', enabled: true, priority: 10, urlRegex: 'starling.*create', presetId: 'p1' }
  ]
  const r = matchRuleForUrl(rules, 'https://corp/starling/task/create')
  assert.equal(r.id, 'ok')
})

test('matchRuleForUrl 无匹配返回 null', () => {
  const rules = [{ id: 'a', enabled: true, priority: 1, urlIncludes: ['abc'], presetId: 'p' }]
  assert.equal(matchRuleForUrl(rules, 'https://x/starling'), null)
})

