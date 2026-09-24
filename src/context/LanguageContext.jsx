import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LOCALE,
  LANG_STORAGE_KEY,
  LOCALES,
  normalizeLocale,
  translate,
} from '../lib/i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return normalizeLocale(localStorage.getItem(LANG_STORAGE_KEY))
    } catch {
      return DEFAULT_LOCALE
    }
  })

  useEffect(() => {
    document.documentElement.lang = LOCALES[locale].html
    try {
      localStorage.setItem(LANG_STORAGE_KEY, locale)
    } catch {
      /* ignore quota / private mode */
    }
  }, [locale])

  const value = useMemo(() => {
    function t(key, vars) {
      return translate(locale, key, vars)
    }
    function setLocale(next) {
      setLocaleState(normalizeLocale(next))
    }
    return {
      locale,
      dateLocale: LOCALES[locale].date,
      setLocale,
      t,
    }
  }, [locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
