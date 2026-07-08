import type { ProfessionalBoqRowsArtifactSet } from "./professionalBoqMaterialCompletenessContract";

export type ProfessionalBoqNoTruncationValidation = {
  passed: boolean;
  calculatorRowsCount: number;
  snapshotRowsCount: number;
  detailDrawerRowsCount: number;
  pdfRowsCount: number;
  buyerHandoffRowsCount: number;
  expectedProcurementRowsCount: number;
  backendRowCapDetected: boolean;
  snapshotTruncationDetected: boolean;
  detailDrawerTruncationDetected: boolean;
  pdfTruncationDetected: boolean;
  buyerHandoffTruncationDetected: boolean;
  calculatorRowsEqualSnapshotRows: boolean;
  snapshotRowsEqualDetailDrawerRows: boolean;
  snapshotRowsEqualPdfRows: boolean;
  buyerHandoffProcurementSubsetComplete: boolean;
  buyerHandoffMissingProcurementRowIds: string[];
};

function pdfRowsCountFromBody(body: string, rowIds: readonly string[]): number {
  if (!body) return 0;
  return rowIds.filter((rowId) => body.includes(rowId)).length;
}

function expectedProcurementRowIds(input: ProfessionalBoqRowsArtifactSet): string[] {
  return input.calculatorRows
    .filter((row) => row.includedInProcurement)
    .filter((row) => row.rowType !== "work" && row.rowType !== "labor")
    .map((row) => row.rowId);
}

export function validateProfessionalBoqNoTruncation(
  input: ProfessionalBoqRowsArtifactSet,
): ProfessionalBoqNoTruncationValidation {
  const calculatorRowsCount = input.calculatorRows.length;
  const snapshotRows = input.snapshotRows ?? input.calculatorRows;
  const snapshotRowsCount = snapshotRows.length;
  const detailDrawerRowsCount = input.detailDrawerRowsCount ?? snapshotRowsCount;
  const pdfRowsCount = input.pdfRowsCount ?? pdfRowsCountFromBody(
    input.pdfBody ?? "",
    snapshotRows.map((row) => row.rowId),
  );
  const buyerIds = new Set(input.buyerHandoffRowIds ?? []);
  const expectedBuyerRowIds = expectedProcurementRowIds(input);
  const missingBuyerRowIds = expectedBuyerRowIds.filter((rowId) => !buyerIds.has(rowId));
  const buyerHandoffRowsCount = input.buyerHandoffRowIds?.length ?? 0;
  const snapshotTruncationDetected = snapshotRowsCount < calculatorRowsCount;
  const detailDrawerTruncationDetected = detailDrawerRowsCount < snapshotRowsCount;
  const pdfTruncationDetected = pdfRowsCount < snapshotRowsCount;
  const buyerHandoffTruncationDetected = missingBuyerRowIds.length > 0;
  const backendRowCapDetected =
    calculatorRowsCount === 45 &&
    snapshotTruncationDetected &&
    detailDrawerTruncationDetected &&
    pdfTruncationDetected;

  return {
    passed: !backendRowCapDetected &&
      !snapshotTruncationDetected &&
      !detailDrawerTruncationDetected &&
      !pdfTruncationDetected &&
      !buyerHandoffTruncationDetected,
    calculatorRowsCount,
    snapshotRowsCount,
    detailDrawerRowsCount,
    pdfRowsCount,
    buyerHandoffRowsCount,
    expectedProcurementRowsCount: expectedBuyerRowIds.length,
    backendRowCapDetected,
    snapshotTruncationDetected,
    detailDrawerTruncationDetected,
    pdfTruncationDetected,
    buyerHandoffTruncationDetected,
    calculatorRowsEqualSnapshotRows: calculatorRowsCount === snapshotRowsCount,
    snapshotRowsEqualDetailDrawerRows: snapshotRowsCount === detailDrawerRowsCount,
    snapshotRowsEqualPdfRows: snapshotRowsCount === pdfRowsCount,
    buyerHandoffProcurementSubsetComplete: missingBuyerRowIds.length === 0,
    buyerHandoffMissingProcurementRowIds: missingBuyerRowIds,
  };
}
