import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  PEDESTAL_REPAIR_FORMULAS,
  PEDESTAL_REPAIR_GUIDE_SOURCE_ID,
  PEDESTAL_REPAIR_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_REPAIR_NORM_ID,
  PEDESTAL_REPAIR_PARAMETERS,
  PEDESTAL_REPAIR_RESOURCES,
  PEDESTAL_REPAIR_SOURCE_ID,
  PEDESTAL_REPAIR_SOURCE_METADATA,
  PEDESTAL_REPAIR_TARGETS,
  pedestalRepairAcceptanceInputR1,
  type PedestalRepairContextKey,
} from "./pedestalRepairR1";
import type { ConcreteSlabRepairInputValueR1 } from "./concreteSlabRepairR1";

type Json = Record<string, unknown>;

function pileCapText(value: string): string {
  return value
    .replaceAll("бетонного пьедестала", "ростверка")
    .replaceAll("бетонным пьедесталом", "ростверком")
    .replaceAll("бетонном пьедестале", "ростверке")
    .replaceAll("бетонный пьедестал", "ростверк")
    .replaceAll("Бетонный пьедестал", "Ростверк")
    .replaceAll("pedestal-repair", "pile-cap-repair")
    .replaceAll("project_pedestal_repair_schedule", "project_pile_cap_repair_schedule")
    .replaceAll("REPAIR_EXISTING_CONCRETE_PEDESTAL", "REPAIR_EXISTING_CONCRETE_PILE_CAP")
    .replaceAll("PEDESTAL", "PILE-CAP");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return pileCapText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
    ) as T;
  }
  return value;
}

export const PILE_CAP_REPAIR_TARGETS = Object.freeze(
  PEDESTAL_REPAIR_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_pedestal_repair_", "_pile_cap_repair_"),
    titleRu: pileCapText(target.titleRu),
  })),
);

export type PileCapRepairContextKey =
  (typeof PILE_CAP_REPAIR_TARGETS)[number]["contextKey"];

export const PILE_CAP_REPAIR_PARAMETERS = Object.freeze(
  PEDESTAL_REPAIR_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: pileCapText(parameter.title_ru),
  })),
);

// ACI 562/546 method selection and the direct-quantity graph remain shared.
export const PILE_CAP_REPAIR_FORMULAS = PEDESTAL_REPAIR_FORMULAS;

export const PILE_CAP_REPAIR_RESOURCES = Object.freeze(
  PEDESTAL_REPAIR_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("pedestal-repair", "pile-cap-repair"),
    title_ru: pileCapText(resource.title_ru),
  })),
);

export const PILE_CAP_REPAIR_NORMATIVE_PARAMETER_IDS =
  PEDESTAL_REPAIR_NORMATIVE_PARAMETER_IDS;
export const PILE_CAP_REPAIR_SOURCE_ID = PEDESTAL_REPAIR_SOURCE_ID;
export const PILE_CAP_REPAIR_GUIDE_SOURCE_ID = PEDESTAL_REPAIR_GUIDE_SOURCE_ID;
export const PILE_CAP_REPAIR_NORM_ID = PEDESTAL_REPAIR_NORM_ID;
export const PILE_CAP_REPAIR_SOURCE_METADATA = Object.freeze({
  ...PEDESTAL_REPAIR_SOURCE_METADATA,
  operation_class: "REPAIR_EXISTING_CONCRETE_PILE_CAP",
  quantity_basis: "APPROVED_REPAIR_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
  documentary_references_optional: true,
  repair_technology_and_material_designation_required: true,
  conditional_branch_quantities_never_invented: true,
  calculation_inputs_never_invented: true,
});

export function pileCapRepairAcceptanceInputR1(
  contextKey: PileCapRepairContextKey,
): Readonly<Record<string, ConcreteSlabRepairInputValueR1>> {
  const target = PILE_CAP_REPAIR_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_REPAIR_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...pedestalRepairAcceptanceInputR1(contextKey as PedestalRepairContextKey),
    condition_assessment_reference: `ASSESS-PILE-CAP-REPAIR-${reference}-REV-A`,
    approved_repair_design_reference: `DESIGN-PILE-CAP-REPAIR-${reference}-REV-A`,
    approved_repair_method_designation: `METHOD-PILE-CAP-REPAIR-${reference}`,
    repair_method_statement_reference: `MS-PILE-CAP-REPAIR-${reference}-REV-A`,
    repair_material_designation: `MATERIAL-PILE-CAP-REPAIR-${reference}-REV-A`,
    quality_plan_reference: `QP-PILE-CAP-REPAIR-${reference}-REV-A`,
  });
}

export async function compilePileCapRepairR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PILE_CAP_REPAIR_TARGETS[0].catalogId;
  if (!PILE_CAP_REPAIR_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PILE_CAP_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pile-cap-repair-r1",
    catalogId,
    primaryMeasureParameterId: "repair_scope_volume_m3",
    parameterDefinitions: [...PILE_CAP_REPAIR_PARAMETERS],
    formulaDefinitions: [...PILE_CAP_REPAIR_FORMULAS],
    resourceDefinitions: [...PILE_CAP_REPAIR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
