import en from './translations/en.json'
import fr from './translations/fr.json'
import es from './translations/es.json'
import de from './translations/de.json'

export type Language = 'en' | 'fr' | 'es' | 'de'
export type SpeechLanguage = 'en-US' | 'en-GB' | 'fr-FR' | 'es-ES' | 'de-DE' | 'pt-BR' | 'it-IT' | 'ja-JP' | 'zh-CN' | 'ko-KR'

export const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
]

// Speech languages for voice training (both recognition and synthesis)
export const speechLanguages: { code: SpeechLanguage; name: string; nativeName: string; flag: string }[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-BR', name: 'Portuguese (BR)', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
]

export const translations: Record<Language, typeof en> = {
  en,
  fr,
  es,
  de,
}

export type TranslationKeys = typeof en

// Helper to get nested translation value
export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || path
}

export const DEFAULT_LANGUAGE: Language = 'en'
export const DEFAULT_SPEECH_LANGUAGE: SpeechLanguage = 'en-US'
export const LANGUAGE_STORAGE_KEY = 'jobpilot-language'
export const SPEECH_LANGUAGE_STORAGE_KEY = 'jobpilot-speech-language'
