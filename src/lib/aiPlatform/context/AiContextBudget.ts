export const AI_CONTEXT_DEFAULT_MAX_INPUT_CHARS = 6000;

export function enforceAiContextBudget(input: {
  text: string;
  maxInputChars?: number;
}) {
  const maxInputChars = input.maxInputChars ?? AI_CONTEXT_DEFAULT_MAX_INPUT_CHARS;
  const text = input.text.length > maxInputChars
    ? input.text.slice(0, maxInputChars)
    : input.text;
  return {
    text,
    budget: {
      inputChars: text.length,
      maxInputChars,
      truncated: input.text.length > maxInputChars,
    },
  };
}
