"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  Language,
  LANGUAGES,
  getTranslations,
  getTranslation,
  LANGUAGE_STORAGE_KEY,
  getDefaultLanguage,
  isLanguageSupported,
  TranslationKeys,
} from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  translate: (path: string, fallback?: string) => string;
  languages: typeof LANGUAGES;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getDefaultLanguage());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && isLanguageSupported(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
    setIsLoading(false);
  }, []);

  // Set language and persist to localStorage
  const setLanguage = useCallback((lang: Language) => {
    if (isLanguageSupported(lang)) {
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      // Update document direction if needed (for RTL languages in future)
      document.documentElement.setAttribute("lang", lang);
    }
  }, []);

  // Get all translations for current language
  const t = getTranslations(language);

  // Get a specific translation by path
  const translate = useCallback(
    (path: string, fallback?: string) => {
      return getTranslation(language, path, fallback);
    },
    [language]
  );

  // Don't render until we've loaded the saved language preference
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translate,
        languages: LANGUAGES,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access the language context
 * Returns translations and language utilities
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

/**
 * Hook for simple translation access
 * Shorthand for useLanguage().t
 */
export function useTranslations() {
  const { t } = useLanguage();
  return t;
}
