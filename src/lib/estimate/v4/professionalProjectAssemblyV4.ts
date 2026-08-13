import { estimateDeterministicHash } from "../estimateDeterministicHash";
import type { BoqCategoryV4 } from "./professionalEstimateV4Contract";

export type ProfessionalEstimateScopeModeV4 =
  | "MINIMAL_EXPLICIT_SCOPE"
  | "FULL_APPLICABLE_SCOPE";

export type ProfessionalValueSourceTypeV4 =
  | "USER_EXPLICIT"
  | "PROJECT_DOCUMENT"
  | "SURVEY_MEASUREMENT"
  | "LAB_RESULT"
  | "MATERIAL_PASSPORT"
  | "APPLICABLE_NORM"
  | "VERIFIED_RATEBOOK";

export type ProfessionalParameterValueV4 = {
  value: string | number | boolean;
  unit_id: string | null;
  source_type: ProfessionalValueSourceTypeV4;
  source_id: string;
  captured_at: string;
  confidence: "high" | "medium";
  applicability: string;
};

export type ProfessionalAssemblyParameterRoleV4 =
  | "SCOPE_TRIGGER"
  | "PROJECT_QUANTITY"
  | "MATERIAL_PASSPORT_VALUE"
  | "NORM_RATE"
  | "LOGISTICS_VALUE"
  | "CONTROL_PLAN_VALUE"
  | "PRICE_INPUT"
  | "PRICE_SOURCE_REFERENCE"
  | "DEPENDENCY_REFERENCE";

export type ProfessionalAssemblyParameterDefinitionV4 = {
  parameter_id: string;
  title_ru: string;
  role: ProfessionalAssemblyParameterRoleV4;
  unit_id: string | null;
  required_for: readonly ProfessionalEstimateScopeModeV4[];
};

export type ProfessionalAssemblyCostOwnershipV4 =
  | "priced_resource"
  | "priced_unit_rate"
  | "informational_output";

export type ProfessionalAssemblyFormulaV4 = {
  formula_id: string;
  expression: string;
  input_parameter_ids: readonly string[];
  output_unit_id: string;
  calculate: (values: Readonly<Record<string, number>>) => number;
};

export type ProfessionalNormativeRowTraceV3 = {
  source_id: string;
  document_code: string;
  edition: string;
  exact_locator: string;
  source_role: "QUANTITY_NORM" | "WORK_EXECUTION" | "QUALITY_ACCEPTANCE" | "PROJECT_INPUT";
  applicability: string;
  foreign_mandatory_for_kg: false;
};

export type ProfessionalAssemblyPriceRouteV3 =
  | {
    kind: "RUNTIME_VALIDATED_INPUT";
    unit_price_parameter_id: string;
    price_basis_reference_parameter_id: string;
    price_basis_date_parameter_id: string;
    currency_from_request: true;
    minimum_exclusive: 0;
  }
  | {
    kind: "NOT_APPLICABLE_INFORMATIONAL_OUTPUT";
    reason: string;
  };

export type ProfessionalResourceGraphNodeV3 = {
  graph_version: "ProfessionalResourceGraphV3";
  typed_child_boundary: "FRAME" | "ALIGN" | "CLAD";
  resource_class: string;
  dependency_ids: readonly string[];
  non_cost_dependencies_only: boolean;
  context_parameter_ids: readonly string[];
  forbidden_cost_scopes: readonly string[];
};

export type ProfessionalAssemblyRowDefinitionV4 = {
  row_id: string;
  section: string;
  category: BoqCategoryV4;
  title_ru: string;
  formula: ProfessionalAssemblyFormulaV4;
  cost_ownership: ProfessionalAssemblyCostOwnershipV4;
  cost_owner_id: string;
  semantic_owner: string;
  normative_source_ids: readonly string[];
  inclusion_condition: string;
  procurement_eligible: boolean;
  normative_trace_v3?: readonly ProfessionalNormativeRowTraceV3[];
  price_route_v3?: ProfessionalAssemblyPriceRouteV3;
  resource_graph_node_v3?: ProfessionalResourceGraphNodeV3;
  normative_proof_bundle_id_v3?: string;
  professional_proof_bundle_id_v3?: string;
};

export type ProfessionalChildAssemblyV4 = {
  child_passport_id: string;
  child_passport_version: string;
  domain_owner: string;
  assembly_id: string;
  title_ru: string;
  scope_trigger_parameter: string;
  scope_trigger_values: readonly (string | boolean)[];
  supported_scope_modes: readonly ProfessionalEstimateScopeModeV4[];
  parameters: readonly ProfessionalAssemblyParameterDefinitionV4[];
  rows: readonly ProfessionalAssemblyRowDefinitionV4[];
};

export type ProfessionalProjectAssemblyRequestV4 = {
  project_assembly_id: string;
  parent_passport_id: string;
  parent_revision_id: string | null;
  requested_catalog_id: string;
  requested_work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
};

export type ProfessionalAssemblyRequirementV4 = {
  code:
    | "SCOPE_CONFIRMATION_REQUIRED"
    | "PROJECT_VALUE_REQUIRED"
    | "NORM_RATE_REQUIRED"
    | "PRICE_INPUT_REQUIRED"
    | "PRICE_SOURCE_REQUIRED";
  child_passport_id: string;
  parameter_id: string;
  title_ru: string;
  unit_id: string | null;
  role: ProfessionalAssemblyParameterRoleV4;
};

export type CompiledProfessionalAssemblyRowV4 = {
  parent_project_revision_id: string | null;
  child_passport_id: string;
  child_passport_version: string;
  child_revision_id: string;
  scope_trigger_parameter: string;
  row_number: number;
  row_id: string;
  section: string;
  category: BoqCategoryV4;
  title_ru: string;
  quantity: number;
  unit_id: string;
  formula_id: string;
  formula_expression: string;
  formula_input_values: Readonly<Record<string, number>>;
  calculation_trace: string;
  cost_ownership: ProfessionalAssemblyCostOwnershipV4;
  cost_owner_id: string;
  semantic_owner: string;
  normative_source_ids: readonly string[];
  parameter_source_ids: readonly string[];
  inclusion_condition: string;
  procurement_eligible: boolean;
  unit_price: number | null;
  price_source_id: string | null;
  price_basis_reference: string | null;
  price_basis_date: string | null;
  normative_trace_v3: readonly ProfessionalNormativeRowTraceV3[];
  price_route_v3: ProfessionalAssemblyPriceRouteV3 | null;
  resource_graph_node_v3: ProfessionalResourceGraphNodeV3 | null;
  normative_proof_bundle_id_v3: string | null;
  professional_proof_bundle_id_v3: string | null;
};

export type ProfessionalProjectAssemblyCompilationV4 = {
  contract_version: "professional-project-assembly:v4.1";
  project_assembly_id: string;
  parent_passport_id: string;
  parent_revision_id: string | null;
  requested_catalog_id: string;
  requested_work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  selected_child_passport_ids: readonly string[];
  compiled_rows: readonly CompiledProfessionalAssemblyRowV4[];
  requirements: readonly ProfessionalAssemblyRequirementV4[];
  assumptions_count: number;
  hidden_quantity_defaults: number;
  deterministic_hash: string;
};

function isTriggered(
  assembly: ProfessionalChildAssemblyV4,
  value: ProfessionalParameterValueV4 | undefined,
): boolean {
  return value != null && (typeof value.value === "string" || typeof value.value === "boolean") &&
    assembly.scope_trigger_values.includes(value.value);
}

function numericValue(value: ProfessionalParameterValueV4 | undefined): number | null {
  if (!value) return null;
  if (typeof value.value === "number") return Number.isFinite(value.value) ? value.value : null;
  if (typeof value.value !== "string" || !value.value.trim()) return null;
  const parsed = Number(value.value.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function requirementCode(role: ProfessionalAssemblyParameterRoleV4): ProfessionalAssemblyRequirementV4["code"] {
  if (role === "SCOPE_TRIGGER") return "SCOPE_CONFIRMATION_REQUIRED";
  if (role === "NORM_RATE") return "NORM_RATE_REQUIRED";
  if (role === "PRICE_INPUT") return "PRICE_INPUT_REQUIRED";
  if (role === "PRICE_SOURCE_REFERENCE") return "PRICE_SOURCE_REQUIRED";
  return "PROJECT_VALUE_REQUIRED";
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function assertTraceableValue(parameterId: string, value: ProfessionalParameterValueV4): void {
  if (!value.source_id.trim() || !value.captured_at.trim() || !value.applicability.trim()) {
    throw new Error(`PROFESSIONAL_PARAMETER_PROVENANCE_INCOMPLETE:${parameterId}`);
  }
  if (
    (value.source_type === "APPLICABLE_NORM" || value.source_type === "VERIFIED_RATEBOOK") &&
    value.confidence !== "high"
  ) {
    throw new Error(`PROFESSIONAL_NORM_VALUE_NOT_VERIFIED:${parameterId}`);
  }
}

/**
 * Neutral Estimate V4 extension point for typed child passports. It compiles
 * only explicit project/norm values and never supplies a quantity default.
 */
export function compileProfessionalProjectAssemblyV4(
  request: ProfessionalProjectAssemblyRequestV4,
): ProfessionalProjectAssemblyCompilationV4 {
  const requirements: ProfessionalAssemblyRequirementV4[] = [];
  const compiledRows: CompiledProfessionalAssemblyRowV4[] = [];
  const selectedChildPassportIds: string[] = [];

  for (const [parameterId, value] of Object.entries(request.parameter_values)) {
    assertTraceableValue(parameterId, value);
  }

  for (const assembly of request.child_assemblies) {
    if (!assembly.supported_scope_modes.includes(request.scope_mode)) continue;
    const trigger = request.parameter_values[assembly.scope_trigger_parameter];
    if (!isTriggered(assembly, trigger)) continue;
    selectedChildPassportIds.push(assembly.child_passport_id);

    const parameterById = new Map(assembly.parameters.map((parameter) => [parameter.parameter_id, parameter]));
    const required = assembly.parameters.filter((parameter) => parameter.required_for.includes(request.scope_mode));
    for (const parameter of required) {
      const value = request.parameter_values[parameter.parameter_id];
      if (value == null || (parameter.unit_id !== null && numericValue(value) == null)) {
        requirements.push({
          code: requirementCode(parameter.role),
          child_passport_id: assembly.child_passport_id,
          parameter_id: parameter.parameter_id,
          title_ru: parameter.title_ru,
          unit_id: parameter.unit_id,
          role: parameter.role,
        });
      }
    }

    for (const row of assembly.rows) {
      const rowRequirements = row.formula.input_parameter_ids
        .map((parameterId) => parameterById.get(parameterId))
        .filter((parameter): parameter is ProfessionalAssemblyParameterDefinitionV4 => Boolean(parameter));
      const missing = rowRequirements.filter((parameter) => {
        const value = request.parameter_values[parameter.parameter_id];
        return value == null || numericValue(value) == null;
      });
      for (const parameter of missing) {
        if (!requirements.some((item) =>
          item.child_passport_id === assembly.child_passport_id && item.parameter_id === parameter.parameter_id
        )) {
          requirements.push({
            code: requirementCode(parameter.role),
            child_passport_id: assembly.child_passport_id,
            parameter_id: parameter.parameter_id,
            title_ru: parameter.title_ru,
            unit_id: parameter.unit_id,
            role: parameter.role,
          });
        }
      }
      if (missing.length > 0) continue;

      const inputValues = Object.fromEntries(row.formula.input_parameter_ids.map((parameterId) => {
        const value = numericValue(request.parameter_values[parameterId]);
        if (value == null) throw new Error(`PROFESSIONAL_FORMULA_INPUT_MISSING:${row.row_id}:${parameterId}`);
        return [parameterId, value];
      }));
      const quantity = round(row.formula.calculate(inputValues));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`PROFESSIONAL_FORMULA_QUANTITY_INVALID:${row.row_id}:${quantity}`);
      }
      const parameterSourceIds = row.formula.input_parameter_ids.map(
        (parameterId) => request.parameter_values[parameterId].source_id,
      );
      const substitution = row.formula.input_parameter_ids.map((parameterId) => {
        const value = request.parameter_values[parameterId];
        return `${parameterId}=${inputValues[parameterId]}${value.unit_id ? ` ${value.unit_id}` : ""}`;
      }).join("; ");
      const childRevisionId = `child-revision:${estimateDeterministicHash({
        passport: assembly.child_passport_id,
        version: assembly.child_passport_version,
        scope: request.scope_mode,
        values: inputValues,
      })}`;
      let unitPrice: number | null = null;
      let priceSourceId: string | null = null;
      let priceBasisReference: string | null = null;
      let priceBasisDate: string | null = null;
      if (row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT") {
        const priceValue = request.parameter_values[row.price_route_v3.unit_price_parameter_id];
        unitPrice = numericValue(priceValue);
        if (unitPrice == null || unitPrice <= row.price_route_v3.minimum_exclusive) {
          throw new Error(`PROFESSIONAL_PRICE_INPUT_INVALID:${row.row_id}:${row.price_route_v3.unit_price_parameter_id}`);
        }
        const referenceValue = request.parameter_values[row.price_route_v3.price_basis_reference_parameter_id];
        const dateValue = request.parameter_values[row.price_route_v3.price_basis_date_parameter_id];
        priceBasisReference = String(referenceValue?.value ?? "").trim() || null;
        priceBasisDate = String(dateValue?.value ?? "").trim() || null;
        if (!priceBasisReference || !priceBasisDate) {
          throw new Error(`PROFESSIONAL_PRICE_PROVENANCE_INVALID:${row.row_id}`);
        }
        priceSourceId = priceValue?.source_id ?? null;
      }
      compiledRows.push({
        parent_project_revision_id: request.parent_revision_id,
        child_passport_id: assembly.child_passport_id,
        child_passport_version: assembly.child_passport_version,
        child_revision_id: childRevisionId,
        scope_trigger_parameter: assembly.scope_trigger_parameter,
        row_number: compiledRows.length + 1,
        row_id: row.row_id,
        section: row.section,
        category: row.category,
        title_ru: row.title_ru,
        quantity,
        unit_id: row.formula.output_unit_id,
        formula_id: row.formula.formula_id,
        formula_expression: row.formula.expression,
        formula_input_values: inputValues,
        calculation_trace: `${row.formula.expression}; ${substitution}; результат=${quantity} ${row.formula.output_unit_id}`,
        cost_ownership: row.cost_ownership,
        cost_owner_id: row.cost_owner_id,
        semantic_owner: row.semantic_owner,
        normative_source_ids: row.normative_source_ids,
        parameter_source_ids: parameterSourceIds,
        inclusion_condition: row.inclusion_condition,
        procurement_eligible: row.procurement_eligible,
        unit_price: unitPrice,
        price_source_id: priceSourceId,
        price_basis_reference: priceBasisReference,
        price_basis_date: priceBasisDate,
        normative_trace_v3: row.normative_trace_v3 ?? [],
        price_route_v3: row.price_route_v3 ?? null,
        resource_graph_node_v3: row.resource_graph_node_v3 ?? null,
        normative_proof_bundle_id_v3: row.normative_proof_bundle_id_v3 ?? null,
        professional_proof_bundle_id_v3: row.professional_proof_bundle_id_v3 ?? null,
      });
    }
  }

  const withoutHash = {
    contract_version: "professional-project-assembly:v4.1" as const,
    project_assembly_id: request.project_assembly_id,
    parent_passport_id: request.parent_passport_id,
    parent_revision_id: request.parent_revision_id,
    requested_catalog_id: request.requested_catalog_id,
    requested_work_key: request.requested_work_key,
    scope_mode: request.scope_mode,
    selected_child_passport_ids: [...new Set(selectedChildPassportIds)].sort(),
    compiled_rows: compiledRows,
    requirements,
    assumptions_count: 0,
    hidden_quantity_defaults: 0,
  };
  return {
    ...withoutHash,
    deterministic_hash: estimateDeterministicHash(withoutHash),
  };
}
