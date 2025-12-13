"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { 
  Language, 
  languages, 
  translations, 
  getNestedValue, 
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY 
} from '@/lib/i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  languages: typeof languages
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
    if (savedLanguage && translations[savedLanguage]) {
      setLanguageState(savedLanguage)
    }
    setIsInitialized(true)
  }, [])

  // Save language to localStorage when changed
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    
    // Update html lang attribute
    document.documentElement.lang = lang
  }, [])

  // Translation function with parameter support
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[language], key)
    
    if (!params) return translation
    
    // Replace {{paramName}} with actual values
    return Object.entries(params).reduce(
      (str, [key, value]) => str.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
      translation
    )
  }, [language])

  // Prevent flash of wrong language
  if (!isInitialized) {
    return null
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Shorthand hook for just translations
export function useTranslation() {
  const { t, language } = useLanguage()
  return { t, language }
}
