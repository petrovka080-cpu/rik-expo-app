import { validateAiGrounding } from "./validateAiGrounding";

export function validateEstimateGrounding(text: string, input: { missingPrice?: boolean; insufficientInput?: boolean } = {}) {
  return validateAiGrounding({ text, ...input });
}
