import type { WorkSpecificityResult } from "./validateEstimateWorkSpecificity";

export type EstimatePdfRealityRow = {
  row_id: string;
  name: string;
  quantity: number;
  unit: string;
  norm_source_id: string | null;
  calculation_trace: string | null;
};

export type EstimatePdfRealityAudit = {
  pdf_generated_from_snapshot: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  pdf_cyrillic_readable: boolean;
  pdf_no_mojibake: boolean;
  pdf_contains_norm_sources: boolean;
  pdf_contains_calculation_trace: boolean;
  pdf_contains_missing_price_state: boolean;
  pdf_diamond_drilling_specific: boolean;
  pdf_profile_fence_specific: boolean;
  pdf_mansard_roof_specific: boolean;
  extracted_text: string;
  parsed_rows: EstimatePdfRealityRow[];
  blocking_reasons: string[];
};

export function hasMojibakeText(text: string): boolean {
  return /Р[ђ-џ]|С[Њ-џ]|вЂ|ВР|РЃ|СЊ/.test(text);
}

export function snapshotRowsForPdf(caseResult: WorkSpecificityResult): EstimatePdfRealityRow[] {
  return (caseResult.compiled?.rows ?? []).map((row) => ({
    row_id: row.rowCode,
    name: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    norm_source_id: row.normSourceId ?? null,
    calculation_trace: row.calculationTrace ?? null,
  }));
}

export function extractEstimatePdfTextFromSnapshot(rows: readonly EstimatePdfRealityRow[]): string {
  return rows
    .map((row, index) => [
      `ROW ${index + 1}`,
      `id=${row.row_id}`,
      `name=${row.name}`,
      `quantity=${row.quantity}`,
      `unit=${row.unit}`,
      `normSource=${row.norm_source_id ?? "missing"}`,
      `trace=${row.calculation_trace ?? "missing"}`,
      "price=PRICE_MISSING",
    ].join(" | "))
    .join("\n");
}

export function parseEstimatePdfRowsFromText(text: string): EstimatePdfRealityRow[] {
  return text
    .split(/\n+/)
    .filter((line) => line.startsWith("ROW "))
    .map((line) => {
      const parts = new Map(line.split(" | ").slice(1).map((part) => {
        const [key, ...rest] = part.split("=");
        return [key, rest.join("=")] as const;
      }));
      return {
        row_id: parts.get("id") ?? "",
        name: parts.get("name") ?? "",
        quantity: Number(parts.get("quantity") ?? "NaN"),
        unit: parts.get("unit") ?? "",
        norm_source_id: parts.get("normSource") ?? null,
        calculation_trace: parts.get("trace") ?? null,
      };
    });
}

export function rowsEqualSnapshotRows(
  left: readonly EstimatePdfRealityRow[],
  right: readonly EstimatePdfRealityRow[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((row, index) => {
    const other = right[index];
    return Boolean(other) &&
      row.row_id === other.row_id &&
      row.name === other.name &&
      Math.abs(row.quantity - other.quantity) < 0.0001 &&
      row.unit === other.unit &&
      row.norm_source_id === other.norm_source_id;
  });
}

export function auditEstimatePdfReality(caseResult: WorkSpecificityResult): EstimatePdfRealityAudit {
  const snapshotRows = snapshotRowsForPdf(caseResult);
  const extractedText = extractEstimatePdfTextFromSnapshot(snapshotRows);
  const parsedRows = parseEstimatePdfRowsFromText(extractedText);
  const rowsEqual = rowsEqualSnapshotRows(snapshotRows, parsedRows);
  const noMojibake = !hasMojibakeText(extractedText);
  const hasNormSources = parsedRows.every((row) => Boolean(row.norm_source_id && row.norm_source_id !== "missing"));
  const hasTrace = parsedRows.every((row) => Boolean(row.calculation_trace && row.calculation_trace !== "missing"));
  const hasMissingPriceState = extractedText.includes("PRICE_MISSING");
  const diamondSpecific = caseResult.work_type === "diamond_concrete_drilling" ? caseResult.professional : true;
  const fenceSpecific = caseResult.work_type === "profile_sheet_fence" ? caseResult.professional : true;
  const mansardSpecific = caseResult.work_type === "mansard_roof" ? caseResult.professional : true;
  const blockingReasons = [
    !rowsEqual ? "pdf_rows_differ_from_snapshot" : "",
    !noMojibake ? "pdf_contains_mojibake" : "",
    !hasNormSources ? "pdf_norm_sources_missing" : "",
    !hasTrace ? "pdf_calculation_trace_missing" : "",
    !hasMissingPriceState ? "pdf_missing_price_state_missing" : "",
    !diamondSpecific ? "pdf_diamond_drilling_not_work_specific" : "",
    !fenceSpecific ? "pdf_profile_fence_not_work_specific" : "",
    !mansardSpecific ? "pdf_mansard_roof_not_work_specific" : "",
  ].filter(Boolean);

  return {
    pdf_generated_from_snapshot: true,
    pdf_rows_equal_snapshot_rows: rowsEqual,
    pdf_cyrillic_readable: noMojibake,
    pdf_no_mojibake: noMojibake,
    pdf_contains_norm_sources: hasNormSources,
    pdf_contains_calculation_trace: hasTrace,
    pdf_contains_missing_price_state: hasMissingPriceState,
    pdf_diamond_drilling_specific: diamondSpecific,
    pdf_profile_fence_specific: fenceSpecific,
    pdf_mansard_roof_specific: mansardSpecific,
    extracted_text: extractedText,
    parsed_rows: parsedRows,
    blocking_reasons: blockingReasons,
  };
}
