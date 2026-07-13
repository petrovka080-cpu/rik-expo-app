import {
  buildNormPackCitationForRow,
  type NormPackCitation,
} from "../../lib/estimate/normPackCitationContract";
import type {
  ProfessionalBoqRecipeRow,
  ProfessionalWorkPassport,
} from "../../lib/estimate/workPassportContract";

export type BuyerHandoffSourceTraceRow = {
  row_id: string;
  title: string;
  row_type: string;
  quantity_formula: string;
  quantity_trace: string;
  norm_source_id: string;
  registry_source_id: string;
  citation: string;
  preliminary_disclosure_required: boolean;
};

export type BuyerHandoffSourceTrace = {
  procurement_rows_count: number;
  work_or_labor_rows_excluded: boolean;
  rows: BuyerHandoffSourceTraceRow[];
};

function isBuyerHandoffRow(row: ProfessionalBoqRecipeRow): boolean {
  return row.buyerHandoffRole === "procurement_item" && row.rowType !== "work" && row.rowType !== "labor";
}

function rowTrace(row: ProfessionalBoqRecipeRow, citation: NormPackCitation): BuyerHandoffSourceTraceRow {
  return {
    row_id: row.rowId,
    title: row.titleRu,
    row_type: row.rowType,
    quantity_formula: row.quantityFormula,
    quantity_trace: row.calculationTraceTemplate,
    norm_source_id: row.normSourceId,
    registry_source_id: citation.registrySourceId,
    citation: citation.sourceCitation,
    preliminary_disclosure_required: citation.preliminaryDisclosureRequired,
  };
}

export function renderBuyerHandoffSourceTrace(input: {
  passport?: ProfessionalWorkPassport;
  rows?: readonly ProfessionalBoqRecipeRow[];
}): BuyerHandoffSourceTrace {
  const rows = input.rows ?? input.passport?.boqRecipe.allRows ?? [];
  const procurementRows = rows.filter(isBuyerHandoffRow);
  return {
    procurement_rows_count: procurementRows.length,
    work_or_labor_rows_excluded: procurementRows.every((row) => row.rowType !== "work" && row.rowType !== "labor"),
    rows: procurementRows.map((row) => rowTrace(row, buildNormPackCitationForRow(row))),
  };
}
