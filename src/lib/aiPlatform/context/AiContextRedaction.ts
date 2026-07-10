const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const TOKEN_PATTERN = /\b(?:sk|pk|ghp|glpat|xoxb|ya29|AIza)[A-Za-z0-9_\-]{12,}\b/g;

export function redactAiContextText(value: string): { text: string; redactedFields: string[] } {
  let text = String(value ?? "");
  const redactedFields: string[] = [];
  if (TOKEN_PATTERN.test(text)) {
    text = text.replace(TOKEN_PATTERN, "[redacted_token]");
    redactedFields.push("token");
  }
  TOKEN_PATTERN.lastIndex = 0;
  if (EMAIL_PATTERN.test(text)) {
    text = text.replace(EMAIL_PATTERN, "[redacted_email]");
    redactedFields.push("email");
  }
  EMAIL_PATTERN.lastIndex = 0;
  PHONE_PATTERN.lastIndex = 0;
  if (PHONE_PATTERN.test(text)) {
    text = text.replace(PHONE_PATTERN, "[redacted_phone]");
    redactedFields.push("phone");
  }
  TOKEN_PATTERN.lastIndex = 0;
  return { text, redactedFields };
}

export function aiContextRedactionPassed(value: string): boolean {
  return !EMAIL_PATTERN.test(value) && !PHONE_PATTERN.test(value) && !TOKEN_PATTERN.test(value);
}
