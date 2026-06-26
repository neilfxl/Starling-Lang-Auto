import { ensureDefaults, getState, setState } from '../lib/storage.mjs'
import { parseLanguageLines } from '../lib/parse.mjs'
import { newId } from '../lib/id.mjs'

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v)
    else node.setAttribute(k, String(v))
  }
  for (const c of children) node.append(c)
  return node
}

function sectionTitle(text) {
  return el('div', { style: 'font-size:14px;font-weight:700;margin-bottom:10px;', text })
}

function btn(text, onClick, kind = 'secondary') {
  const base =
    'border-radius:10px;padding:8px 10px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);'
  const style =
    kind === 'primary'
      ? `${base}background:#3B82F6;color:white;border:none;font-weight:600;`
      : `${base}background:transparent;color:#E5E7EB;`
  return el('button', { style, text, onclick: onClick })
}

function miniBtn(text, onClick, kind = 'secondary') {
  const base =
    'border-radius:8px;padding:2px 6px;font-size:11px;cursor:pointer;border:1px solid rgba(255,255,255,0.12);'
  const style =
    kind === 'primary'
      ? `${base}background:#3B82F6;color:white;border:none;font-weight:600;`
      : kind === 'danger'
        ? `${base}background:transparent;color:#FCA5A5;`
        : `${base}background:transparent;color:#E5E7EB;`
  return el('button', { style, text, onclick: onClick })
}

function input(attrs) {
  const base =
    'width:100%;box-sizing:border-box;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#E5E7EB;'
  return el('input', { ...attrs, style: `${base}${attrs.style ?? ''}` })
}

function textarea(attrs) {
  const base =
    'width:100%;box-sizing:border-box;border-radius:10px;padding:8px 10px;min-height:160px;resize:vertical;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#E5E7EB;'
  return el('textarea', { ...attrs, style: `${base}${attrs.style ?? ''}` })
}

function hr() {
  return el('div', { style: 'height:1px;background:rgba(255,255,255,0.08);margin:12px 0;' })
}

async function render() {
  await ensureDefaults()
  const s = await getState()

  renderPresets(s)
  renderManual(s)
  renderRules(s)
  renderImportExport(s)
  renderAbout()
}

function renderPresets(s) {
  const root = document.getElementById('page-presets')
  root.innerHTML = ''
  root.append(sectionTitle('预设管理'))

  const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px;' })
  for (const p of s.stla_presets ?? []) {
    const meta = `${p.languages?.length ?? 0} 项`
    const detail = el('div', {
      style:
        'display:none;padding:12px;border:1px dashed rgba(255,255,255,0.08);border-radius:12px;background:rgba(255,255,255,0.02);'
    })
    const toggleBtn = btn('查看', () => {
      const show = detail.style.display === 'none'
      detail.style.display = show ? 'block' : 'none'
      toggleBtn.textContent = show ? '收起' : '查看'
    })

    const langItems = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;' })
    const languages = p.languages ?? []
    if (languages.length === 0) {
      langItems.append(el('div', { style: 'font-size:12px;color:#9CA3AF;', text: '暂无语言' }))
    } else {
      for (const lang of languages) {
        const label = `${lang.displayName ? lang.displayName + ' ' : ''}[${lang.code}]`
        const tag = el(
          'div',
          {
            style:
              'display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid rgba(255,255,255,0.08);border-radius:999px;font-size:12px;color:#E5E7EB;'
          },
          [
            el('span', { text: label }),
            miniBtn(
              '移除',
              async () => {
                const nextLangs = (p.languages ?? []).filter((x) => x.code !== lang.code)
                const nextPresets = (s.stla_presets ?? []).map((x) =>
                  x.id === p.id ? { ...x, languages: nextLangs, updatedAt: Date.now() } : x
                )
                await setState({ stla_presets: nextPresets })
                await render()
              },
              'danger'
            )
          ]
        )
        langItems.append(tag)
      }
    }

    const addArea = textarea({
      placeholder: '追加语言，每行一个：可填 code（en）或 显示名 [code]（英语 [en]）',
      style: 'min-height:120px;'
    })
    const addMsg = el('div', { style: 'font-size:12px;color:#9CA3AF;min-height:18px;margin-top:6px;' })
    const addBtn = btn(
      '追加语言',
      async () => {
        addMsg.textContent = ''
        const parsed = parseLanguageLines(addArea.value)
        const existing = new Set((p.languages ?? []).map((x) => x.code.toLowerCase()))
        const nextLangs = [...(p.languages ?? [])]
        let added = 0
        for (const item of parsed.ok) {
          const key = item.code.toLowerCase()
          if (!existing.has(key)) {
            nextLangs.push(item)
            existing.add(key)
            added += 1
          }
        }
        if (added === 0) {
          addMsg.textContent = parsed.ok.length === 0 ? '没有可追加的语言' : '没有新增语言'
          return
        }
        const nextPresets = (s.stla_presets ?? []).map((x) =>
          x.id === p.id ? { ...x, languages: nextLangs, updatedAt: Date.now() } : x
        )
        await setState({ stla_presets: nextPresets })
        await render()
      },
      'primary'
    )
    const clearBtn = btn(
      '清空语言',
      async () => {
        const nextPresets = (s.stla_presets ?? []).map((x) =>
          x.id === p.id ? { ...x, languages: [], updatedAt: Date.now() } : x
        )
        await setState({ stla_presets: nextPresets })
        await render()
      }
    )

    detail.append(
      el('div', { style: 'font-weight:700;font-size:13px;', text: '已选语言' }),
      langItems,
      hr(),
      el('div', { style: 'font-weight:700;font-size:13px;', text: '管理语言' }),
      addArea,
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;' }, [addBtn, clearBtn]),
      addMsg
    )

    const row = el(
      'div',
      {
        style:
          'display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;'
      },
      [
        el('div', {}, [
          el('div', { style: 'font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;' }, [
            el('span', { text: p.name }),
            p.id === s.stla_current_preset_id
              ? el('span', {
                  style:
                    'font-size:11px;color:#60A5FA;border:1px solid rgba(96,165,250,0.4);border-radius:999px;padding:2px 6px;',
                  text: '当前'
                })
              : el('span', { style: 'display:none;' })
          ]),
          el('div', { style: 'font-size:12px;color:#9CA3AF;margin-top:4px;', text: meta })
        ]),
        el('div', { style: 'display:flex;gap:8px;' }, [
          toggleBtn,
          btn('设为当前', async () => {
            await setState({ stla_current_preset_id: p.id })
            await render()
          }),
          btn('删除', async () => {
            const next = (s.stla_presets ?? []).filter((x) => x.id !== p.id)
            const current = s.stla_current_preset_id === p.id ? next[0]?.id ?? '' : s.stla_current_preset_id
            await setState({ stla_presets: next, stla_current_preset_id: current })
            await render()
          })
        ])
      ]
    )
    list.append(el('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [row, detail]))
  }
  root.append(list)
  root.append(hr())

  const llmToggle = el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:12px;' }, [
    el('input', {
      type: 'checkbox',
      checked: s.stla_llm_auto_apply_enabled ? 'checked' : undefined,
      onchange: async (e) => {
        await setState({ stla_llm_auto_apply_enabled: Boolean(e.target.checked) })
      }
    }),
    el('span', { text: '在 Gemini/GPT 翻译弹窗自动勾选语种' })
  ])
  root.append(
    el('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
      el('div', { style: 'font-weight:700;font-size:13px;', text: 'LLM 自动勾选' }),
      llmToggle,
      el('div', { style: 'font-size:12px;color:#9CA3AF;line-height:1.4;', text: '仅在 LLM 弹窗出现时生效，与预设无关。' })
    ])
  )
  root.append(hr())

  const autoApplyToggle = el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:12px;' }, [
    el('input', {
      type: 'checkbox',
      checked: s.stla_auto_apply_enabled ? 'checked' : undefined,
      onchange: async (e) => {
        await setState({ stla_auto_apply_enabled: Boolean(e.target.checked) })
      }
    }),
    el('span', { text: '进入匹配页面后自动应用' })
  ])
  const autoConfirmToggle = el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:12px;' }, [
    el('input', {
      type: 'checkbox',
      checked: s.stla_auto_confirm_enabled ? 'checked' : undefined,
      onchange: async (e) => {
        await setState({ stla_auto_confirm_enabled: Boolean(e.target.checked) })
      }
    }),
    el('span', { text: '自动点击“确定/保存”' })
  ])
  root.append(
    el('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
      el('div', { style: 'font-weight:700;font-size:13px;', text: '自动应用' }),
      autoApplyToggle,
      autoConfirmToggle
    ])
  )
  root.append(hr())

  const name = input({ placeholder: '新预设名称', id: 'newPresetName' })
  const langs = textarea({
    placeholder: '每行一个：可填 code（en）或 显示名 [code]（英语 [en]）',
    id: 'newPresetLines'
  })
  const msg = el('div', { style: 'font-size:12px;color:#9CA3AF;min-height:18px;margin-top:8px;' })
  const save = btn(
    '创建预设',
    async () => {
      msg.textContent = ''
      const presetName = name.value.trim()
      const parsed = parseLanguageLines(langs.value)
      if (!presetName) {
        msg.textContent = '请填写预设名称'
        return
      }
      if (parsed.ok.length === 0) {
        msg.textContent = '请至少添加 1 个语言'
        return
      }
      const now = Date.now()
      const preset = {
        id: newId('preset'),
        name: presetName,
        languages: parsed.ok,
        createdAt: now,
        updatedAt: now
      }
      await setState({ stla_presets: [...(s.stla_presets ?? []), preset] })
      await render()
    },
    'primary'
  )

  root.append(
    el('div', { style: 'display:flex;flex-direction:column;gap:10px;' }, [
      el('div', { style: 'font-weight:700;font-size:13px;', text: '新建预设' }),
      name,
      langs,
      save,
      msg
    ])
  )
}

function renderManual(s) {
  const root = document.getElementById('page-manual')
  root.innerHTML = ''
  root.append(sectionTitle('手动配置'))

  const ta = textarea({ placeholder: '粘贴语言列表，每行一个。示例：\n英语 [en]\nar\nar-EG' })
  const preview = el('div', { style: 'margin-top:10px;font-size:12px;color:#9CA3AF;white-space:pre-wrap;' })
  const presetName = input({ placeholder: '保存为预设：名称（可选）' })
  const out = el('div', { style: 'margin-top:10px;font-size:12px;min-height:18px;' })

  const run = btn('解析预览', () => {
    const parsed = parseLanguageLines(ta.value)
    preview.textContent =
      `可用：${parsed.ok.length} 项\n` +
      (parsed.ok.length ? parsed.ok.map((x) => `- ${x.displayName ? x.displayName + ' ' : ''}[${x.code}]`).join('\n') : '') +
      (parsed.bad.length ? `\n\n失败：${parsed.bad.length} 项\n` + parsed.bad.map((x) => `- ${x.raw}（${x.reason}）`).join('\n') : '')
  })

  const save = btn(
    '保存为预设',
    async () => {
      out.textContent = ''
      const name = presetName.value.trim()
      const parsed = parseLanguageLines(ta.value)
      if (!name) {
        out.style.color = '#EF4444'
        out.textContent = '请填写预设名称'
        return
      }
      if (parsed.ok.length === 0) {
        out.style.color = '#EF4444'
        out.textContent = '没有可用语言'
        return
      }
      const now = Date.now()
      const preset = { id: newId('preset'), name, languages: parsed.ok, createdAt: now, updatedAt: now }
      await setState({ stla_presets: [...(s.stla_presets ?? []), preset] })
      out.style.color = '#22C55E'
      out.textContent = '已保存'
      await render()
    },
    'primary'
  )

  root.append(
    el('div', { style: 'display:flex;flex-direction:column;gap:10px;' }, [
      ta,
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' }, [run, save]),
      presetName,
      preview,
      out
    ])
  )
}

function renderRules(s) {
  const root = document.getElementById('page-rules')
  root.innerHTML = ''
  root.append(sectionTitle('站点匹配规则'))

  const table = el('div', { style: 'display:flex;flex-direction:column;gap:8px;' })

  for (const r of s.stla_match_rules ?? []) {
    const preset = (s.stla_presets ?? []).find((p) => p.id === r.presetId)
    const summary = r.urlRegex
      ? `正则：${r.urlRegex}`
      : `包含：${(r.urlIncludes ?? []).join(' & ') || '（空）'}`

    table.append(
      el(
        'div',
        {
          style:
            'display:grid;grid-template-columns:70px 90px 1fr 160px 120px;gap:8px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;'
        },
        [
          el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:12px;' }, [
            el('input', {
              type: 'checkbox',
              checked: r.enabled ? 'checked' : undefined,
              onchange: async (e) => {
                const next = (s.stla_match_rules ?? []).map((x) =>
                  x.id === r.id ? { ...x, enabled: Boolean(e.target.checked) } : x
                )
                await setState({ stla_match_rules: next })
                await render()
              }
            }),
            el('span', { text: '启用' })
          ]),
          el('div', { style: 'font-size:12px;color:#9CA3AF;', text: `优先级 ${r.priority ?? 0}` }),
          el('div', { style: 'font-size:12px;', text: summary }),
          el('div', { style: 'font-size:12px;color:#9CA3AF;', text: `预设：${preset?.name ?? '未找到'}` }),
          el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;' }, [
            btn('删除', async () => {
              const next = (s.stla_match_rules ?? []).filter((x) => x.id !== r.id)
              await setState({ stla_match_rules: next })
              await render()
            })
          ])
        ]
      )
    )
  }
  root.append(table)
  root.append(hr())

  const includes = input({ placeholder: 'URL 包含关键词（用逗号分隔），例如：starling,/task' })
  const regex = input({ placeholder: '或填写 URL 正则（可选，高级），例如：starling\\.corp\\.com' })
  const priority = input({ placeholder: '优先级（数字，越大越优先）', value: '100' })
  const presetSel = el('select', {
    style:
      'width:100%;box-sizing:border-box;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#E5E7EB;'
  })
  presetSel.append(el('option', { value: '', text: '请选择预设' }))
  for (const p of s.stla_presets ?? []) {
    presetSel.append(el('option', { value: p.id, text: p.name }))
  }
  presetSel.value = s.stla_current_preset_id || ''
  const out = el('div', { style: 'margin-top:8px;font-size:12px;min-height:18px;color:#9CA3AF;' })
  const add = btn(
    '新增规则',
    async () => {
      out.textContent = ''
      const inc = includes.value
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      const re = regex.value.trim()
      const pri = Number(priority.value)
      if (inc.length === 0 && !re) {
        out.style.color = '#EF4444'
        out.textContent = '请填写关键词包含或正则'
        return
      }
      if (!presetSel.value) {
        out.style.color = '#EF4444'
        out.textContent = '请选择预设'
        return
      }
      const rule = {
        id: newId('rule'),
        enabled: true,
        priority: Number.isFinite(pri) ? pri : 0,
        urlIncludes: inc.length ? inc : undefined,
        urlRegex: re || undefined,
        presetId: presetSel.value
      }
      await setState({ stla_match_rules: [...(s.stla_match_rules ?? []), rule] })
      out.style.color = '#22C55E'
      out.textContent = '已新增'
      await render()
    },
    'primary'
  )

  root.append(
    el('div', { style: 'display:flex;flex-direction:column;gap:10px;' }, [
      el('div', { style: 'font-weight:700;font-size:13px;', text: '新增规则' }),
      includes,
      regex,
      el('div', { style: 'display:grid;grid-template-columns:160px 1fr;gap:10px;' }, [priority, presetSel]),
      add,
      out
    ])
  )
}

function renderImportExport(s) {
  const root = document.getElementById('page-import')
  root.innerHTML = ''
  root.append(sectionTitle('导入导出'))

  const ta = textarea({ placeholder: '这里会显示导出的 JSON，或粘贴 JSON 进行导入', style: 'min-height:220px;' })
  const out = el('div', { style: 'margin-top:8px;font-size:12px;min-height:18px;color:#9CA3AF;' })

  const exportBtn = btn(
    '导出配置到文本框',
    () => {
      ta.value = JSON.stringify(s, null, 2)
      out.style.color = '#22C55E'
      out.textContent = '已导出'
    },
    'primary'
  )

  const importBtn = btn('从文本框导入（覆盖）', async () => {
    out.textContent = ''
    try {
      const obj = JSON.parse(ta.value)
      const patch = {
        stla_current_preset_id: obj.stla_current_preset_id ?? '',
        stla_presets: obj.stla_presets ?? [],
        stla_match_rules: obj.stla_match_rules ?? [],
        stla_auto_apply_enabled: Boolean(obj.stla_auto_apply_enabled),
        stla_auto_confirm_enabled: Boolean(obj.stla_auto_confirm_enabled),
        stla_llm_auto_apply_enabled: Boolean(obj.stla_llm_auto_apply_enabled),
        stla_run_logs: obj.stla_run_logs ?? []
      }
      await setState(patch)
      out.style.color = '#22C55E'
      out.textContent = '已导入'
      await render()
    } catch (e) {
      out.style.color = '#EF4444'
      out.textContent = `导入失败：${String(e?.message ?? e)}`
    }
  })

  const resetBtn = btn('重置为默认', async () => {
    await chrome.storage.local.clear()
    await ensureDefaults()
    out.style.color = '#22C55E'
    out.textContent = '已重置'
    await render()
  })
  resetBtn.style.borderColor = 'rgba(239,68,68,0.5)'
  resetBtn.style.color = '#EF4444'

  root.append(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;' }, [exportBtn, importBtn, resetBtn]))
  root.append(ta)
  root.append(out)
}

function renderAbout() {
  const root = document.getElementById('page-about')
  root.innerHTML = ''
  root.append(sectionTitle('关于'))
  root.append(
    el('div', {
      style: 'font-size:12px;color:#9CA3AF;line-height:1.6;white-space:pre-wrap;',
      text:
        '版本：0.1.0\n\n说明：\n- 本扩展离线运行，不需要任何服务端。\n- 所有配置与日志仅存储在本地（chrome.storage.local）。\n- 若 Starling 页面结构调整导致失效，可在设置页调整规则与语言列表，或更新内容脚本的匹配策略。'
    })
  )
}

function switchPage(key) {
  for (const btn of document.querySelectorAll('.navItem')) {
    btn.dataset.active = btn.dataset.page === key ? '1' : '0'
  }
  for (const sec of document.querySelectorAll('.panel')) {
    sec.hidden = sec.id !== `page-${key}`
  }
}

document.querySelectorAll('.navItem').forEach((b) => {
  b.addEventListener('click', () => switchPage(b.dataset.page))
})

switchPage('presets')
render()
