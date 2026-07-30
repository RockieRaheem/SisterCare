import type { SupportedLanguageCode } from "@/lib/sunbird";

/**
 * An explicit language request in the message applies to that reply. Otherwise
 * the chat selector is authoritative, followed by the saved account setting.
 * Automatic detection is only a fallback when no explicit preference exists.
 */
export function resolveChatLanguage(input: {
  requestedLanguage?: SupportedLanguageCode;
  clientLanguage?: SupportedLanguageCode;
  storedLanguage?: SupportedLanguageCode;
  inferredLanguage?: SupportedLanguageCode;
}): SupportedLanguageCode {
  return (
    input.requestedLanguage ||
    input.clientLanguage ||
    input.storedLanguage ||
    input.inferredLanguage ||
    "eng"
  );
}
