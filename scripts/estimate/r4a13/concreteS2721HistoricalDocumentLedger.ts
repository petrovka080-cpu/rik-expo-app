export type ConcreteHistoricalCandidateRow = {
  catalogId: string;
  definitionVersionId: string;
  definitionSha256: string;
  rowId: string;
  rowSha256: string;
  section: string;
  category: string;
  operation: string;
  formulaId: string;
  formulaAstSha256: string;
  inputParameterIds: readonly string[];
};

export type ConcreteS2721HistoricalDocumentLedgerRow = {
  contract: "rik-expo-app.s27-21.concrete-historical-document-ledger-row.v1";
  candidateOnly: true;
  sourceCurrentParityVerified: false;
  disposition: "INCLUDED_DOCUMENT_CANDIDATE_NOT_SEPARATELY_SUMMED_IF_SOURCE_PARITY_RESTORED";
  catalogId: string;
  definitionVersionId: string;
  definitionSha256: string;
  rowId: string;
  rowSha256: string;
  formulaId: string;
  formulaAstSha256: string;
  exclusiveDocumentParameterId: string;
  retainedQuantityParameterId: string;
  operation: "record" | "protocol";
};

export function isConcreteS2721HistoricalDocumentRow(
  row: Pick<ConcreteHistoricalCandidateRow, "section" | "category" | "operation">,
): boolean {
  return row.section === "Документация"
    && row.category === "DOCUMENT"
    && (row.operation === "record" || row.operation === "protocol");
}

export function toConcreteS2721HistoricalDocumentLedgerRow(
  row: ConcreteHistoricalCandidateRow,
): ConcreteS2721HistoricalDocumentLedgerRow {
  if (!isConcreteS2721HistoricalDocumentRow(row)) {
    throw new Error(`STOP_S2721_CONCRETE_LEDGER_NOT_DOCUMENT:${row.catalogId}:${row.rowId}`);
  }
  const documentParameters = row.inputParameterIds
    .filter((parameterId) => parameterId.endsWith("_document_lot"));
  const retainedQuantityParameters = row.inputParameterIds
    .filter((parameterId) => parameterId.endsWith("_quantity"));
  if (documentParameters.length !== 1 || retainedQuantityParameters.length !== 1
    || row.inputParameterIds.length !== 2) {
    throw new Error(`STOP_S2721_CONCRETE_LEDGER_INPUT_SHAPE:${row.catalogId}:${row.rowId}`);
  }
  return {
    contract: "rik-expo-app.s27-21.concrete-historical-document-ledger-row.v1",
    candidateOnly: true,
    sourceCurrentParityVerified: false,
    disposition: "INCLUDED_DOCUMENT_CANDIDATE_NOT_SEPARATELY_SUMMED_IF_SOURCE_PARITY_RESTORED",
    catalogId: row.catalogId,
    definitionVersionId: row.definitionVersionId,
    definitionSha256: row.definitionSha256,
    rowId: row.rowId,
    rowSha256: row.rowSha256,
    formulaId: row.formulaId,
    formulaAstSha256: row.formulaAstSha256,
    exclusiveDocumentParameterId: documentParameters[0]!,
    retainedQuantityParameterId: retainedQuantityParameters[0]!,
    operation: row.operation as "record" | "protocol",
  };
}
