/**
 * SisterCare Internationalization (i18n) System
 *
 * This module provides multi-language support for the SisterCare app.
 * Currently supports:
 * - English (en) - Default
 * - Luganda (lg) - Ugandan local language
 */

import { en, TranslationKeys } from "./translations/en";
import { lg } from "./translations/lg";

export type Language = "en" | "lg";

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] =
  [
    { code: "en", name: "English", nativeName: "English" },
    { code: "lg", name: "Luganda", nativeName: "Oluganda" },
  ];

const translations: Record<Language, TranslationKeys> = {
  en,
  lg,
};

/**
 * Get translations for a specific language
 */
export function getTranslations(language: Language): TranslationKeys {
  return translations[language] || translations.en;
}

/**
 * Get a nested translation value by dot notation path
 * e.g., t("common.save") returns "Save" in English or "Tereka" in Luganda
 */
export function getTranslation(
  language: Language,
  path: string,
  fallback?: string,
): string {
  const keys = path.split(".");
  let value: unknown = translations[language];

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      // Try fallback to English
      value = undefined;
      let enValue: unknown = translations.en;
      for (const k of keys) {
        if (enValue && typeof enValue === "object" && k in enValue) {
          enValue = (enValue as Record<string, unknown>)[k];
        } else {
          enValue = undefined;
          break;
        }
      }
      if (typeof enValue === "string") {
        return enValue;
      }
      break;
    }
  }

  if (typeof value === "string") {
    return value;
  }

  return fallback || path;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(code: string): code is Language {
  return code === "en" || code === "lg";
}

/**
 * Get the default language
 */
export function getDefaultLanguage(): Language {
  return "en";
}

/**
 * Storage key for persisting language preference
 */
export const LANGUAGE_STORAGE_KEY = "sistercare-language";

// Re-export types and translations
export type { TranslationKeys };
export { en, lg };
