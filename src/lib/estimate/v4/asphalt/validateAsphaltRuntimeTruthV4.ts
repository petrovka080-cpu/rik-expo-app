import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../../estimateDraftRevisionContract";
import {
  ASPHALT_PARAMETER_SCHEMA_ID_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
} from "./asphaltV4Constants";
import { ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4 } from "./asphaltWorkSpecificParameterSchemaV4";

export type AsphaltRuntimeRowProjectionV4 = {
  row_id: string;
  category: string | null;
  quantity: number;
  unit_id: string;
};

export type AsphaltRuntimeTruthCountersV4 = {
  work_id_mismatch: number;
  template_id_mismatch: number;
  parameter_schema_mismatch: number;
  parameter_signature_mismatch: number;
  compiled_boq_signature_mismatch: number;
  ui_boq_signature_mismatch: number;
  pdf_boq_signature_mismatch: number;
  procurement_source_signature_mismatch: number;
  procurement_output_signature_mismatch: number;
  row_count_mismatch: number;
  legacy_rows: number;
};

function professionalRowProjection(row: ProfessionalBoqRow): AsphaltRuntimeRowProjectionV4 {
  return {
    row_id: row.rowId,
    category: row.category ?? null,
    quantity: row.quantity,
    unit_id: row.unit,
  };
}

export function asphaltRuntimeRowSignatureV4(rows: readonly AsphaltRuntimeRowProjectionV4[]): string {
  return estimateDeterministicHash(rows.map((row) => ({
    row_id: row.row_id,
    category: row.category,
    quantity: row.quantity,
    unit_id: row.unit_id,
  })));
}

export function projectAsphaltRevisionRowsV4(
  revision: EstimateDraftRevision,
): AsphaltRuntimeRowProjectionV4[] {
  return revision.boq.rows.map(professionalRowProjection);
}

function stringArrayEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateAsphaltRuntimeTruthV4(input: {
  revision: EstimateDraftRevision;
  compiled_rows?: readonly AsphaltRuntimeRowProjectionV4[];
  ui_rows: readonly AsphaltRuntimeRowProjectionV4[];
  pdf_rows: readonly AsphaltRuntimeRowProjectionV4[];
  procurement_source_row_ids: readonly string[];
  procurement_output_row_ids: readonly string[];
}) {
  const coreRows = projectAsphaltRevisionRowsV4(input.revision);
  const coreSignature = asphaltRuntimeRowSignatureV4(coreRows);
  const expectedParameters = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.map((parameter) => parameter.parameter_id);
  const coreRowIds = coreRows.map((row) => row.row_id);
  const expectedProcurementIds = input.revision.boq.rows
    .filter((row) => row.includedInProcurement)
    .map((row) => row.rowId);
  const compiledSignature = input.compiled_rows ? asphaltRuntimeRowSignatureV4(input.compiled_rows) : coreSignature;
  const counters: AsphaltRuntimeTruthCountersV4 = {
    work_id_mismatch: input.revision.professionalWorkId === ASPHALT_WORK_ID_V4 &&
      input.revision.matchedFamily === ASPHALT_WORK_ID_V4 ? 0 : 1,
    template_id_mismatch: input.revision.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ? 0 : 1,
    parameter_schema_mismatch: input.revision.workSpecificParameterSchemaId === ASPHALT_PARAMETER_SCHEMA_ID_V4 ? 0 : 1,
    parameter_signature_mismatch: stringArrayEqual(input.revision.workSpecificParameterSignature ?? [], expectedParameters) ? 0 : 1,
    compiled_boq_signature_mismatch: compiledSignature === coreSignature ? 0 : 1,
    ui_boq_signature_mismatch: asphaltRuntimeRowSignatureV4(input.ui_rows) === coreSignature ? 0 : 1,
    pdf_boq_signature_mismatch: asphaltRuntimeRowSignatureV4(input.pdf_rows) === coreSignature ? 0 : 1,
    procurement_source_signature_mismatch: stringArrayEqual(input.procurement_source_row_ids, coreRowIds) ? 0 : 1,
    procurement_output_signature_mismatch: stringArrayEqual(input.procurement_output_row_ids, expectedProcurementIds) ? 0 : 1,
    row_count_mismatch: new Set([
      coreRows.length,
      input.ui_rows.length,
      input.pdf_rows.length,
      input.procurement_source_row_ids.length,
    ]).size === 1 ? 0 : 1,
    legacy_rows: input.revision.boq.rows.filter((row) => row.sourceParameters?.asphaltV4 !== true).length,
  };
  const green = Object.values(counters).every((value) => value === 0);
  return {
    status: green ? "GREEN_ASPHALT_RUNTIME_TRUTH_INVARIANTS" as const : "STOP_ASPHALT_RUNTIME_TRUTH_INVARIANTS" as const,
    counters,
    signatures: {
      core: coreSignature,
      compiled: compiledSignature,
      ui: asphaltRuntimeRowSignatureV4(input.ui_rows),
      pdf: asphaltRuntimeRowSignatureV4(input.pdf_rows),
      procurement_source: estimateDeterministicHash(input.procurement_source_row_ids),
      procurement_output: estimateDeterministicHash(input.procurement_output_row_ids),
    },
    row_counts: {
      core: coreRows.length,
      ui: input.ui_rows.length,
      pdf: input.pdf_rows.length,
      procurement_source: input.procurement_source_row_ids.length,
      procurement_output: input.procurement_output_row_ids.length,
    },
  };
}
