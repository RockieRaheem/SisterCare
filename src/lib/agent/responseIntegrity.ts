const TRUNCATION_REASONS = new Set([
  "length",
  "max_tokens",
  "max_output_tokens",
  "max_tokens_reached",
]);

/**
 * Providers use different names for token-limit termination. A partial answer
 * is never a valid chat response, particularly for a health-support service.
 */
export function wasResponseTruncated(finishReason?: string): boolean {
  if (!finishReason) return false;
  return TRUNCATION_REASONS.has(finishReason.trim().toLowerCase());
}

/**
 * Catch obvious mid-sentence responses when an upstream provider does not
 * supply a finish reason. This deliberately avoids requiring punctuation,
 * because users and models do not consistently use it in every language.
 */
export function isClearlyIncompleteResponse(text: string): boolean {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return true;

  const finalWord = normalized
    .replace(/[\s,;:([{"'“”]+$/g, "")
    .split(" ")
    .at(-1)
    ?.toLocaleLowerCase() || "";

  return new Set([
    "and",
    "or",
    "because",
    "if",
    "when",
    "that",
    "with",
    "for",
    "to",
    "the",
    "a",
    "an",
    "kuba",
    "kubanga",
    "era",
    "nga",
    "ng'oli",
    "nti",
    "naye",
    "olwo",
    "kale",
  ]).has(finalWord);
}

export function assertCompleteResponse(
  text: string,
  finishReason?: string,
): void {
  if (wasResponseTruncated(finishReason)) {
    throw new Error(`Model response was truncated (${finishReason})`);
  }
  if (isClearlyIncompleteResponse(text)) {
    throw new Error("Model response ended mid-sentence");
  }
}
