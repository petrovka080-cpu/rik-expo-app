export const ESTIMATE_PDF_FORBIDDEN_MOJIBAKE_MARKERS = ["РЎ", "Рџ", "Р°", "Рµ", "РЅ", "Ð", "Ñ", "�"] as const;

export function estimatePdfTextHasMojibake(text: string): boolean {
  return ESTIMATE_PDF_FORBIDDEN_MOJIBAKE_MARKERS.some((marker) => text.includes(marker));
}
