import {
  evaluateMaterialCompleteness,
  type MaterialCompletenessContract,
  type MaterialCompletenessEvaluation,
} from "../../materialCompletenessContract";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import {
  compileAsphaltProfessionalEstimateV4,
  type AsphaltProfessionalEstimateCompilationV4,
} from "./compileAsphaltProfessionalEstimateV4";
import type { AsphaltAssemblyProfileIdV4 } from "./asphaltPreliminaryAssemblyPolicyV4";
import { ASPHALT_WORK_ID_V4 } from "./asphaltV4Constants";

export type ParkingMaterialProfileIdV5 = Extract<
  AsphaltAssemblyProfileIdV4,
  "parking_full_construction" | "parking_surfacing_only" | "overlay_on_existing_pavement" | "local_patch_repair"
>;

export type ParkingMaterialRoleV5 =
  | "SAND_SUBBASE"
  | "CRUSHED_STONE_BASE_LOWER"
  | "CRUSHED_STONE_BASE_UPPER_OR_GRADING"
  | "TECHNOLOGICAL_WATER"
  | "BASE_PRIME_OR_TACK"
  | "ASPHALT_BINDER_OR_REPAIR_LAYER"
  | "INTERLAYER_TACK"
  | "ASPHALT_WEARING_LAYER"
  | "JOINT_SEALING"
  | "GEOTEXTILE"
  | "CURB_STONE"
  | "DRAINAGE"
  | "ROAD_MARKING_MATERIAL"
  | "PATCHING_OR_LEVELING_MIX";

export type AsphaltParkingMaterialProfileV5 = {
  profileId: string;
  profileVersion: "asphalt-parking-material-profile:v5";
  scopeProfile: ParkingMaterialProfileIdV5;
  contract: MaterialCompletenessContract;
  roleBindings: Readonly<Partial<Record<ParkingMaterialRoleV5, readonly string[]>>>;
  baseAcceptanceEvidenceRequired: boolean;
};

const CONDITIONAL_ROLES: readonly ParkingMaterialRoleV5[] = [
  "JOINT_SEALING",
  "GEOTEXTILE",
  "CURB_STONE",
  "DRAINAGE",
  "ROAD_MARKING_MATERIAL",
  "PATCHING_OR_LEVELING_MIX",
];

const FULL_REQUIRED: readonly ParkingMaterialRoleV5[] = [
  "SAND_SUBBASE",
  "CRUSHED_STONE_BASE_LOWER",
  "CRUSHED_STONE_BASE_UPPER_OR_GRADING",
  "TECHNOLOGICAL_WATER",
  "BASE_PRIME_OR_TACK",
  "ASPHALT_BINDER_OR_REPAIR_LAYER",
  "INTERLAYER_TACK",
  "ASPHALT_WEARING_LAYER",
];

const PAVEMENT_REQUIRED: readonly ParkingMaterialRoleV5[] = [
  "BASE_PRIME_OR_TACK",
  "ASPHALT_BINDER_OR_REPAIR_LAYER",
  "INTERLAYER_TACK",
  "ASPHALT_WEARING_LAYER",
];

const SINGLE_LAYER_REQUIRED: readonly ParkingMaterialRoleV5[] = [
  "BASE_PRIME_OR_TACK",
  "ASPHALT_WEARING_LAYER",
];

const ALL_ROLES: readonly ParkingMaterialRoleV5[] = [
  ...FULL_REQUIRED,
  ...CONDITIONAL_ROLES,
];

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function requiredRoles(scope: ParkingMaterialProfileIdV5): readonly ParkingMaterialRoleV5[] {
  if (scope === "parking_full_construction") return FULL_REQUIRED;
  if (scope === "parking_surfacing_only") return PAVEMENT_REQUIRED;
  return SINGLE_LAYER_REQUIRED;
}

function forbiddenRoles(scope: ParkingMaterialProfileIdV5): readonly ParkingMaterialRoleV5[] {
  if (scope === "parking_full_construction") return [];
  return ["SAND_SUBBASE", "CRUSHED_STONE_BASE_LOWER", "CRUSHED_STONE_BASE_UPPER_OR_GRADING", "GEOTEXTILE"];
}

export function asphaltParkingMaterialRoleForRowV5(
  scope: ParkingMaterialProfileIdV5,
  rowId: string,
): ParkingMaterialRoleV5 | null {
  if (rowId === "sand_material") return "SAND_SUBBASE";
  if (rowId === "crushed_layer_1_material") return "CRUSHED_STONE_BASE_LOWER";
  if (rowId === "crushed_layer_2_material") return "CRUSHED_STONE_BASE_UPPER_OR_GRADING";
  if (/^(?:sand|crushed_layer_\d+)_moistening_water$/u.test(rowId)) return "TECHNOLOGICAL_WATER";
  if (rowId === "base_emulsion_material") return "BASE_PRIME_OR_TACK";
  if (rowId === "emulsion_interface_1_2") return "INTERLAYER_TACK";
  if (rowId === "asphalt_layer_1_material") {
    return scope === "parking_full_construction" || scope === "parking_surfacing_only"
      ? "ASPHALT_BINDER_OR_REPAIR_LAYER"
      : "ASPHALT_WEARING_LAYER";
  }
  if (/^asphalt_layer_[2-9]_material$/u.test(rowId)) return "ASPHALT_WEARING_LAYER";
  if (rowId === "joint_sealing_material") return "JOINT_SEALING";
  if (rowId === "geotextile_material") return "GEOTEXTILE";
  if (rowId === "curb_material") return "CURB_STONE";
  if (/^(?:drainage|storm_).*material$/u.test(rowId)) return "DRAINAGE";
  if (/^(?:road_marking|marking_).*material$/u.test(rowId)) return "ROAD_MARKING_MATERIAL";
  if (/^(?:patching|leveling).*material$/u.test(rowId)) return "PATCHING_OR_LEVELING_MIX";
  return null;
}

export function getAsphaltParkingMaterialProfileV5(
  scope: ParkingMaterialProfileIdV5,
): AsphaltParkingMaterialProfileV5 {
  const required = requiredRoles(scope);
  const forbidden = forbiddenRoles(scope);
  const conditional = CONDITIONAL_ROLES.filter((role) => !forbidden.includes(role));
  const roleBindings = Object.fromEntries(ALL_ROLES.map((role) => [role, []])) as unknown as Record<
    ParkingMaterialRoleV5,
    readonly string[]
  >;
  return Object.freeze({
    profileId: `asphalt-parking:${scope}:material-profile:v5`,
    profileVersion: "asphalt-parking-material-profile:v5" as const,
    scopeProfile: scope,
    contract: {
      contractId: `asphalt-parking:${scope}:material-completeness:v5`,
      contractVersion: "material-completeness-contract:v1" as const,
      ownerWorkKey: ASPHALT_WORK_ID_V4,
      scopeId: scope.toUpperCase(),
      requiredMaterialRoles: required,
      conditionalMaterialRoles: conditional,
      forbiddenMaterialRoles: forbidden,
      materialRoleConditions: Object.fromEntries(conditional.map((role) => [role,
        role === "JOINT_SEALING"
          ? "Present only when length, width, paver pass width, paving sequence and layer count produce joints."
          : "Present only after explicit project/applicability confirmation.",
      ])),
      materialRoleExclusionReasons: Object.fromEntries(unique([...conditional, ...forbidden]).map((role) => [role,
        forbidden.includes(role)
          ? `Role ${role} belongs to a new base and is forbidden in ${scope}.`
          : `Role ${role} is not included without explicit project/applicability confirmation.`,
      ])),
    },
    roleBindings,
    baseAcceptanceEvidenceRequired: scope === "parking_surfacing_only",
  });
}

export function evaluateAsphaltParkingMaterialCompletenessV5(
  compilation: AsphaltProfessionalEstimateCompilationV4,
): MaterialCompletenessEvaluation & {
  scopeProfile: ParkingMaterialProfileIdV5;
  baseAcceptanceEvidencePresent: boolean;
  unknownMaterialRowIds: readonly string[];
} {
  const scope = compilation.preliminary_assembly_policy.profile_id;
  if (!["parking_full_construction", "parking_surfacing_only", "overlay_on_existing_pavement", "local_patch_repair"].includes(scope)) {
    throw new Error(`ASPHALT_PARKING_MATERIAL_PROFILE_UNSUPPORTED:${scope}`);
  }
  const typedScope = scope as ParkingMaterialProfileIdV5;
  const profile = getAsphaltParkingMaterialProfileV5(typedScope);
  const materialRows = compilation.compiled_rows.filter((row) => row.definition.category === "material");
  const unknownMaterialRowIds: string[] = [];
  const rows = materialRows.flatMap((row) => {
    const role = asphaltParkingMaterialRoleForRowV5(typedScope, row.definition.row_id);
    if (!role) {
      unknownMaterialRowIds.push(row.definition.row_id);
      return [];
    }
    if (!row.definition.semantic_owner_id) {
      throw new Error(`ASPHALT_PARKING_MATERIAL_SEMANTIC_OWNER_MISSING:${row.definition.row_id}`);
    }
    return [{
      rowId: row.definition.row_id,
      materialRoleId: role,
      semanticOwnerId: row.definition.semantic_owner_id,
      formulaId: row.definition.formula_id,
      sourceIds: unique([row.definition.source_id, ...row.assumption_ids].filter((value): value is string => Boolean(value))),
    }];
  });
  const applicableConditionalRoles = unique(rows
    .map((row) => row.materialRoleId)
    .filter((role) => profile.contract.conditionalMaterialRoles.includes(role)));
  const evaluation = evaluateMaterialCompleteness({
    contract: profile.contract,
    rows,
    applicableConditionalRoles,
  });
  const baseAcceptanceEvidencePresent = !profile.baseAcceptanceEvidenceRequired ||
    compilation.compiled_rows.some((row) => row.definition.row_id === "base_acceptance");
  return Object.freeze({
    ...evaluation,
    status: evaluation.status === "COMPLETE" && baseAcceptanceEvidencePresent && unknownMaterialRowIds.length === 0
      ? "COMPLETE"
      : "BLOCKED",
    scopeProfile: typedScope,
    baseAcceptanceEvidencePresent,
    unknownMaterialRowIds: Object.freeze(unknownMaterialRowIds.sort()),
  });
}

export function auditAsphaltParkingMaterialScenariosV5() {
  const scopes: readonly ParkingMaterialProfileIdV5[] = [
    "parking_full_construction",
    "parking_surfacing_only",
    "overlay_on_existing_pavement",
    "local_patch_repair",
  ];
  const scenarios = scopes.map((scope) => {
    const compilation = compileAsphaltProfessionalEstimateV4({
      raw_text: "Парковка 73 × 9 м, площадь 657 м²",
      parameter_overrides: {
        scope_profile: scope,
        geometry_method: "length_width",
        length_m: 73,
        width_m: 9,
        exclusions_m2: 0,
        geotextile_required: false,
        curb_required: false,
        drainage_required: false,
        road_marking_required: false,
      },
    });
    const evaluation = evaluateAsphaltParkingMaterialCompletenessV5(compilation);
    return Object.freeze({
      scope,
      area_m2: compilation.quantity_basis.area_m2,
      rows: compilation.compiled_rows.length,
      materialEvaluation: evaluation,
      scenarioHash: estimateDeterministicHash({
        scope,
        area: compilation.quantity_basis.area_m2,
        rows: compilation.compiled_rows.map((row) => ({
          id: row.definition.row_id,
          quantity: row.quantity,
          formula: row.definition.formula_id,
        })),
      }),
    });
  });
  return Object.freeze({
    scenarios: Object.freeze(scenarios),
    scope_selector: scenarios.length,
    complete: scenarios.filter((scenario) => scenario.materialEvaluation.status === "COMPLETE").length,
    missing_required_roles: scenarios.reduce((sum, scenario) => sum + scenario.materialEvaluation.missingMaterialRoles.length, 0),
    unexpected_roles: scenarios.reduce((sum, scenario) => sum + scenario.materialEvaluation.unexpectedMaterialRoles.length, 0),
    duplicate_material_owners: scenarios.reduce((sum, scenario) => sum + scenario.materialEvaluation.duplicateMaterialOwners.length, 0),
    unknown_material_rows: scenarios.reduce((sum, scenario) => sum + scenario.materialEvaluation.unknownMaterialRowIds.length, 0),
  });
}
