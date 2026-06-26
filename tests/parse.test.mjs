import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeCode, parseLanguageLines } from '../lib/parse.mjs'

test('normalizeCode 解析 code 与 [code] 形式', () => {
  assert.equal(normalizeCode('en'), 'en')
  assert.equal(normalizeCode('[en]'), 'en')
  assert.equal(normalizeCode(' ar-EG '), 'ar-EG')
  assert.equal(normalizeCode('阿拉伯语（埃及） [ar-EG]'), 'ar-EG')
  assert.equal(normalizeCode(''), '')
  assert.equal(normalizeCode('中文'), '')
})

test('parseLanguageLines 去重并保留 displayName', () => {
  const input = ['英语 [en]', 'en', '阿拉伯语（埃及） [ar-EG]', '  ar-EG  ', '坏数据'].join('\n')
  const { ok, bad } = parseLanguageLines(input)
  assert.equal(ok.length, 2)
  assert.equal(ok[0].code, 'en')
  assert.equal(ok[0].displayName, '英语')
  assert.equal(ok[1].code, 'ar-EG')
  assert.equal(ok[1].displayName, '阿拉伯语（埃及）')
  assert.equal(bad.length, 1)
})

