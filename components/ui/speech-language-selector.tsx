"use client"

import { useState, useEffect } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  speechLanguages, 
  SpeechLanguage, 
  DEFAULT_SPEECH_LANGUAGE,
  SPEECH_LANGUAGE_STORAGE_KEY 
} from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface SpeechLanguageSelectorProps {
  value?: SpeechLanguage
  onChange?: (lang: SpeechLanguage) => void
  variant?: 'default' | 'compact' | 'full'
  className?: string
}

export function SpeechLanguageSelector({ 
  value, 
  onChange, 
  variant = 'default', 
  className 
}: SpeechLanguageSelectorProps) {
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>(
    value || DEFAULT_SPEECH_LANGUAGE
  )

  // Load from localStorage on mount
  useEffect(() => {
    if (!value) {
      const saved = localStorage.getItem(SPEECH_LANGUAGE_STORAGE_KEY) as SpeechLanguage | null
      if (saved && speechLanguages.some(l => l.code === saved)) {
        setSpeechLanguage(saved)
      }
    }
  }, [value])

  // Sync with external value
  useEffect(() => {
    if (value) {
      setSpeechLanguage(value)
    }
  }, [value])

  const handleChange = (lang: SpeechLanguage) => {
    setSpeechLanguage(lang)
    localStorage.setItem(SPEECH_LANGUAGE_STORAGE_KEY, lang)
    onChange?.(lang)
  }

  const currentLanguage = speechLanguages.find(l => l.code === speechLanguage)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={variant === 'compact' ? 'icon' : 'default'}
          className={cn(
            "gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20",
            variant === 'compact' && "h-9 w-9",
            className
          )}
        >
          {variant === 'compact' ? (
            <span className="text-lg">{currentLanguage?.flag}</span>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              <span className="text-sm">{currentLanguage?.flag} {currentLanguage?.nativeName}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Voice Language
        </div>
        {speechLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              speechLanguage === lang.code && "bg-accent"
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <div className="flex flex-col">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </div>
            {speechLanguage === lang.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Hook to get current speech language
export function useSpeechLanguage() {
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>(() => {
    if (typeof window === 'undefined') return DEFAULT_SPEECH_LANGUAGE
    const saved = localStorage.getItem(SPEECH_LANGUAGE_STORAGE_KEY) as SpeechLanguage | null
    if (saved && speechLanguages.some(l => l.code === saved)) {
      return saved
    }
    return DEFAULT_SPEECH_LANGUAGE
  })

  useEffect(() => {

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SPEECH_LANGUAGE_STORAGE_KEY && e.newValue) {
        setSpeechLanguage(e.newValue as SpeechLanguage)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setLanguage = (lang: SpeechLanguage) => {
    setSpeechLanguage(lang)
    localStorage.setItem(SPEECH_LANGUAGE_STORAGE_KEY, lang)
  }

  return { speechLanguage, setSpeechLanguage: setLanguage }
}
