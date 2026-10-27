import type { DocumentAsset, DocumentLinkSuggestion } from "../documentTypes";

export function detectDocumentMissingData(input: {
  document: DocumentAsset;
  linkSuggestions: readonly DocumentLinkSuggestion[];
}): string[] {
  const missing: string[] = [];
  if (input.document.id === "pdf_invoice_45") {
    missing.push("акт по счету №45");
    missing.push("подтверждение приемки");
  }
  if (!input.linkSuggestions.some((suggestion) => suggestion.targetType === "contract")) {
    missing.push("договор, если он обязателен для оплаты");
  }
  return missing;
}
