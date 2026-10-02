import {
  isConcreteS2721HistoricalDocumentRow,
  toConcreteS2721HistoricalDocumentLedgerRow,
  type ConcreteHistoricalCandidateRow,
} from "../../scripts/estimate/r4a13/concreteS2721HistoricalDocumentLedger";

const documentRow: ConcreteHistoricalCandidateRow = {
  catalogId: "concrete_fixture",
  definitionVersionId: "definition-id",
  definitionSha256: "a".repeat(64),
  rowId: "concrete-r5:concrete_fixture:component_protocol",
  rowSha256: "b".repeat(64),
  section: "Документация",
  category: "DOCUMENT",
  operation: "protocol",
  formulaId: "concrete-r5:concrete_fixture:component_protocol:formula",
  formulaAstSha256: "c".repeat(64),
  inputParameterIds: ["component_document_lot", "component_quantity"],
};

describe("S27.21 BATCH008 historical document ledger", () => {
  it("classifies only exact document record/protocol rows", () => {
    expect(isConcreteS2721HistoricalDocumentRow(documentRow)).toBe(true);
    expect(isConcreteS2721HistoricalDocumentRow({
      ...documentRow,
      section: "Контроль качества",
      category: "TEST",
      operation: "test",
    })).toBe(false);
  });

  it("keeps candidate-only provenance and separates the exclusive document input", () => {
    expect(toConcreteS2721HistoricalDocumentLedgerRow(documentRow)).toEqual(expect.objectContaining({
      candidateOnly: true,
      sourceCurrentParityVerified: false,
      exclusiveDocumentParameterId: "component_document_lot",
      retainedQuantityParameterId: "component_quantity",
      operation: "protocol",
    }));
  });

  it("fails closed for ambiguous formula input shapes", () => {
    expect(() => toConcreteS2721HistoricalDocumentLedgerRow({
      ...documentRow,
      inputParameterIds: ["component_quantity"],
    })).toThrow("STOP_S2721_CONCRETE_LEDGER_INPUT_SHAPE");
  });
});
