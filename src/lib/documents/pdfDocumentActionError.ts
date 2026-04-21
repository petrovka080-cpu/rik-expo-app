export function getPdfFlowErrorMessage(
  error: unknown,
  fallback = "Не удалось открыть PDF",
): string {
  if (error && typeof error === "object") {
    const maybeMessage =
      "message" in error ? (error as { message?: unknown }).message : undefined;
    const text = typeof maybeMessage === "string" ? maybeMessage.trim() : "";
    if (text) return text;
  }
  const text = String(error ?? "").trim();
  return text && text !== "[object Object]" ? text : fallback;
}

export function getPdfDocumentActionErrorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    return String((error as { name?: unknown }).name || "");
  }
  return "";
}

export function classifyPdfDocumentActionErrorKind(
  error: unknown,
): "cancelled" | "failure" {
  const name = getPdfDocumentActionErrorName(error).toLowerCase();
  const message = getPdfFlowErrorMessage(error, "").toLowerCase();
  const haystack = `${name} ${message}`.trim();
  if (
    haystack.includes("cancel") ||
    haystack.includes("dismiss") ||
    haystack.includes("aborted")
  ) {
    return "cancelled";
  }
  return "failure";
}

export function normalizePdfDocumentActionError(
  error: unknown,
  fallback: string,
): Error {
  if (error instanceof Error) return error;
  return new Error(getPdfFlowErrorMessage(error, fallback));
}
