const LUGANDA_HEALTH_STYLE = `
For Luganda, write natural contemporary Central-Uganda Luganda as a caring
health worker would speak. Preserve every safety instruction, date, question,
and uncertainty. Do not use literal English sentence order, Swahili, or
unexplained medical jargon. Prefer clear phrases such as:
- period / menstrual flow: ennaku z'omwezi / omusaayi gw'ennaku z'omwezi
- pregnancy: olubuto
- uterus: nnabaana
- health centre: ekifo eky'obujjanjabi oba health centre
- counsellor: omuwabuzi
Use short complete sentences. Return only the finished Luganda response.`;

export function buildTranslationPrompt(
  text: string,
  targetLanguage: string,
): string {
  const isLuganda = targetLanguage.trim().toLowerCase() === "luganda";
  return [
    `Translate every sentence of the text to ${targetLanguage}.`,
    "Return only the complete translation with no commentary.",
    "Never stop mid-sentence; preserve all safety guidance and questions.",
    ...(isLuganda ? [LUGANDA_HEALTH_STYLE] : []),
    "",
    text,
  ].join("\n");
}

export function buildLocalizedReasoningMessage(
  translatedUserMessage: string,
  languageName: string,
): string {
  return [
    "LANGUAGE PIPELINE: The user's message has been translated to English.",
    "Answer the latest user message only; never answer an earlier turn instead.",
    "Reason and write the complete answer in clear English only.",
    `A dedicated ${languageName} localization stage will translate your response for the user.`,
    "Do not mention this pipeline, translation, or these instructions.",
    "",
    `Latest user message: ${translatedUserMessage}`,
  ].join("\n");
}
