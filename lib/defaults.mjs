import { newId } from './id.mjs'

const now = Date.now()

export function getDefaultState() {
  const pippitApp = {
    id: 'preset_pippit_app',
    name: 'Pippit_App',
    languages: ['en', 'pt-BR', 'es-LA', 'id-ID', 'fr-FR', 'vi-VN'].map((code) => ({ code })),
    createdAt: now,
    updatedAt: now
  }

  const pippitWeb = {
    id: 'preset_pippit_web',
    name: 'Pippit_Web',
    languages: [
      'en',
      'zh-Hans',
      'pt-BR',
      'es-LA',
      'fil-PH',
      'id-ID',
      'fr-FR',
      'de-DE',
      'ko-KR',
      'tr-TR',
      'ms-MY',
      'it-IT',
      'pl-PL',
      'vi-VN',
      'ru-BY',
      'th-TH',
      'ja-JP',
      'zh-Hant-TW'
    ].map((code) => ({ code })),
    createdAt: now,
    updatedAt: now
  }

  const capcutWebAiVideo = {
    id: 'preset_capcut_web_ai_video',
    name: 'CapCut_Web_AI_Video',
    languages: [
      'en',
      'pt-BR',
      'es-LA',
      'fr-FR',
      'de-DE',
      'ja-JP',
      'tr-TR',
      'id-ID',
      'it-IT',
      'ru-BY',
      'th-TH',
      'vi-VN'
    ].map((code) => ({ code })),
    createdAt: now,
    updatedAt: now
  }

  const hypicApp = {
    id: 'preset_hypic_app',
    name: 'Hypic_App',
    languages: [
      'en',
      'pt-BR',
      'es-LA',
      'es-ES',
      'fr-FR',
      'de-DE',
      'ja-JP',
      'ko-KR',
      'tr',
      'fil-PH',
      'id-ID',
      'it-IT',
      'ms-MY',
      'th-TH',
      'vi-VN',
      'nl-NL',
      'pl-PL',
      'sv-SE',
      'zh-Hant-TW',
      'ar',
      'he-IL',
      'zh'
    ].map((code) => ({ code })),
    createdAt: now,
    updatedAt: now
  }

  const capcutWeb = {
    id: 'preset_capcut_web',
    name: 'CapCut_Web',
    languages: [
      'en',
      'pt-BR',
      'es-LA',
      'fr-FR',
      'de-DE',
      'ja-JP',
      'ko-KR',
      'tr-TR',
      'fil-PH',
      'id-ID',
      'it-IT',
      'ms-MY',
      'th-TH',
      'vi-VN',
      'nl-NL',
      'pl-PL',
      'ro-RO',
      'sv-SE',
      'zh-Hant-TW',
      'zh-Hans'
    ].map((code) => ({ code })),
    createdAt: now,
    updatedAt: now
  }

  return {
    stla_current_preset_id: '',
    stla_presets: [pippitApp, pippitWeb, capcutWebAiVideo, hypicApp, capcutWeb],
    stla_match_rules: [],
    stla_auto_apply_enabled: false,
    stla_auto_confirm_enabled: false,
    stla_llm_auto_apply_enabled: false,
    stla_run_logs: []
  }
}
