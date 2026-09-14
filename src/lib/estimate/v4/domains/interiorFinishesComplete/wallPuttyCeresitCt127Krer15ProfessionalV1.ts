import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalParameterValueV4,
} from "../../professionalProjectAssemblyV4";
import type {
  ProfessionalCanonicalTechnologyV1,
  ProfessionalDomainParameterDefinitionV1,
  ProfessionalDomainParameterSchemaV1,
  ProfessionalFormulaPackV1,
  ProfessionalNormativeProfileV1,
  ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory/professionalEstimateDomainFactoryV1";
import {
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
} from "../../domainFactory/professionalPhysicalNormApplicabilityV1";
import type { InteriorFinishesDomainInventoryRow } from "./inventory";

export const WALL_PUTTY_CT127_KRER15_WORK_KEY =
  "plaster_paint_interior_wall_putty_apply_standard" as const;
export const WALL_PUTTY_CT127_KRER15_SOURCE_ID =
  "kg_krer_15_04_027_01_wall_third_putty" as const;
export const WALL_PUTTY_CT127_KRER15_RATE_CODE = "15-04-027-01" as const;
export const WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID =
  "krer_15_04_027_01_wall_third_putty_confirmed" as const;
export const WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256 =
  "58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc" as const;
export const WALL_PUTTY_CT127_KRER15_OFFICIAL_PAGE =
  "https://minstroy.gov.kg/ru/kyzmat/431/show" as const;
export const WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF =
  "https://minstroy.gov.kg/ru/state_program/download-pdf/no15otdelocnyeraboty_compressed-1690836cdcb7429.33503474.pdf" as const;

export const WALL_PUTTY_CT127_KRER15_RATES = Object.freeze({
  measurement_basis_m2: 100,
  construction_worker_man_hours: 12.1,
  machine_operator_man_hours: 0.01,
  cargo_lift_machine_hours: 0.01,
  flatbed_truck_machine_hours: 0.02,
  sanding_sheet_m2: 0.0003,
  rags_kg: 0.1,
});

const SOURCE_CAPTURED_AT = "2026-09-14T00:00:00.000Z";
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const KEEP_PARAMETER_IDS = new Set([
  "work_included",
  "estimate_scope_mode",
  "scope_capability",
  "funding_source",
  "project_type",
  "area_m2",
  "length_m",
  "width_m",
  "surface_type",
  "product_profile_id",
  "normative_rate_code",
  "layer_thickness_mm",
  "putty_net_quantity_kg",
  "putty_procurement_quantity_kg",
  "substrate_type",
  "substrate_absorbency",
  "substrate_load_bearing_dry_clean_confirmed",
  "substrate_preparation_system",
  "selected_consumption_kg_m2",
  "dry_interior_no_permanent_humidity_confirmed",
  "application_temperature_confirmed",
  "selected_bag_size_kg",
]);

export type WallPuttyCt127Krer15PackagePartsV1 = {
  technology: ProfessionalCanonicalTechnologyV1;
  schema: ProfessionalDomainParameterSchemaV1;
  normative_profile: ProfessionalNormativeProfileV1;
  formula_pack: ProfessionalFormulaPackV1;
  assembly_profile: {
    assembly_profile_id: string;
    assembly_profile_version: string;
    technology_id: string;
    child_assemblies: readonly ProfessionalChildAssemblyV4[];
  };
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

function formula(
  formulaId: string,
  expression: string,
  inputParameterIds: readonly string[],
  outputUnitId: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return {
    formula_id: formulaId,
    expression,
    input_parameter_ids: inputParameterIds,
    output_unit_id: outputUnitId,
    calculate,
  };
}

function assemblyParameter(
  parameterId: string,
  titleRu: string,
  role: ProfessionalAssemblyParameterDefinitionV4["role"],
  unitId: string | null,
): ProfessionalAssemblyParameterDefinitionV4 {
  return {
    parameter_id: parameterId,
    title_ru: titleRu,
    role,
    unit_id: unitId,
    required_for: BOTH_SCOPES,
  };
}

function krerRow(
  technologyId: string,
  rowId: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  titleRu: string,
  rate: number,
  outputUnitId: string,
  procurementEligible = false,
): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: `${technologyId}:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: formula(
      `${technologyId}:krer-15-04-027-01:${rowId}:v1`,
      `area_m2 × ${rate} ÷ ${WALL_PUTTY_CT127_KRER15_RATES.measurement_basis_m2}`,
      ["area_m2"],
      outputUnitId,
      (values) => values.area_m2 * rate / WALL_PUTTY_CT127_KRER15_RATES.measurement_basis_m2,
    ),
    cost_ownership: "priced_resource",
    cost_owner_id: `${technologyId}:krer-15-04-027-01:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:krer-15-04-027-01:semantic-owner:${rowId}`,
    normative_source_ids: [WALL_PUTTY_CT127_KRER15_SOURCE_ID],
    inclusion_condition: "work_included=true",
    procurement_eligible: procurementEligible,
    normative_trace_v3: [{
      source_id: WALL_PUTTY_CT127_KRER15_SOURCE_ID,
      document_code: "КРЕР-2015 №15",
      edition: "2015",
      exact_locator: `таблица 15-04-027, строка ${WALL_PUTTY_CT127_KRER15_RATE_CODE}, стр. 191–192, измеритель 100 м²`,
      source_role: "QUANTITY_NORM",
      applicability: "Третья шпаклёвка стен при высококачественной окраске; нанесение и шлифование.",
      foreign_mandatory_for_kg: false,
    }],
  };
}

function materialRow(technologyId: string): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: `${technologyId}:row:primary_material`,
    section: "Материалы",
    category: "material",
    title_ru: "Ceresit CT 127: чистая потребность до округления фасовки",
    formula: formula(
      `${technologyId}:ceresit-ct127-net-material:v1`,
      "putty_net_quantity_kg",
      ["putty_net_quantity_kg"],
      "kg",
      (values) => values.putty_net_quantity_kg,
    ),
    cost_ownership: "priced_resource",
    cost_owner_id: `${technologyId}:ceresit-ct127:cost-owner:primary_material`,
    semantic_owner: `${technologyId}:ceresit-ct127:semantic-owner:primary_material`,
    normative_source_ids: [CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID],
    inclusion_condition: "work_included=true",
    procurement_eligible: true,
    normative_trace_v3: [{
      source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
      document_code: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.tds_identifier,
      edition: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_document_version,
      exact_locator: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.exact_locator,
      source_role: "QUANTITY_NORM",
      applicability: "CT 127, сухое внутреннее помещение, слой до 2 мм; проектный расход явно выбран в диапазоне TDS 0,4–1,2 кг/м².",
      foreign_mandatory_for_kg: false,
    }],
  };
}

function exactSchema(
  baseSchema: ProfessionalDomainParameterSchemaV1,
): ProfessionalDomainParameterSchemaV1 {
  const retained = baseSchema.parameters
    .filter((parameter) => KEEP_PARAMETER_IDS.has(parameter.parameter_id))
    .map((parameter): ProfessionalDomainParameterDefinitionV1 => {
      if (parameter.parameter_id === "normative_rate_code") {
        return { ...parameter, source_ownership: ["APPLICABLE_NORM"] };
      }
      if (parameter.parameter_id === "selected_bag_size_kg") {
        return { ...parameter, source_ownership: ["MATERIAL_PASSPORT"] };
      }
      if (parameter.parameter_id === "product_profile_id") {
        return {
          ...parameter,
          source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT"],
        };
      }
      return parameter;
    });
  const applicability: ProfessionalDomainParameterDefinitionV1 = {
    parameter_id: WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID,
    label_ru: "Подтверждена строка КРЕР 15-04-027-01: третья шпаклёвка стен под высококачественную окраску",
    unit_id: null,
    priority: "P0",
    input_type: "boolean",
    visible_when: { kind: "ALWAYS" },
    required_when: { kind: "ALWAYS" },
    formula_consumers: [],
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT"],
  };
  return {
    ...baseSchema,
    schema_version: "2.0.0",
    parameters: [...retained, applicability],
  };
}

export function isWallPuttyCt127Krer15Target(
  inventory: Pick<InteriorFinishesDomainInventoryRow, "work_key">,
): boolean {
  return inventory.work_key === WALL_PUTTY_CT127_KRER15_WORK_KEY;
}

export function buildWallPuttyCt127Krer15ProfessionalPackagePartsV1(input: {
  inventory: InteriorFinishesDomainInventoryRow;
  baseTechnology: ProfessionalCanonicalTechnologyV1;
  baseSchema: ProfessionalDomainParameterSchemaV1;
}): WallPuttyCt127Krer15PackagePartsV1 | null {
  if (!isWallPuttyCt127Krer15Target(input.inventory)) return null;
  const technologyId = input.inventory.canonical_technology_id;
  const schema = exactSchema(input.baseSchema);
  const rows = [
    materialRow(technologyId),
    krerRow(technologyId, "construction_worker_labor", "Затраты труда", "labor", "Рабочие-строители, средний разряд 3,9", WALL_PUTTY_CT127_KRER15_RATES.construction_worker_man_hours, "man_hour"),
    krerRow(technologyId, "machine_operator_labor", "Затраты труда", "labor", "Затраты труда машинистов", WALL_PUTTY_CT127_KRER15_RATES.machine_operator_man_hours, "man_hour"),
    krerRow(technologyId, "cargo_lift", "Машины и механизмы", "equipment", "Подъёмник грузоподъёмностью до 500 кг, высота подъёма 45 м", WALL_PUTTY_CT127_KRER15_RATES.cargo_lift_machine_hours, "machine_hour"),
    krerRow(technologyId, "flatbed_truck", "Машины и механизмы", "equipment", "Автомобиль бортовой грузоподъёмностью до 5 т", WALL_PUTTY_CT127_KRER15_RATES.flatbed_truck_machine_hours, "machine_hour"),
    krerRow(technologyId, "sanding_sheet", "Материалы", "material", "Шкурка шлифовальная двуслойная с зернистостью 40/25", WALL_PUTTY_CT127_KRER15_RATES.sanding_sheet_m2, "m2", true),
    krerRow(technologyId, "rags", "Материалы", "material", "Ветошь", WALL_PUTTY_CT127_KRER15_RATES.rags_kg, "kg", true),
  ];
  const childAssembly: ProfessionalChildAssemblyV4 = {
    child_passport_id: `${technologyId}:krer-15-04-027-01-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: "interior_finishes",
    assembly_id: `${technologyId}:krer-15-04-027-01-assembly:v1`,
    title_ru: "Третья шпаклёвка стен под высококачественную окраску, CT 127",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("work_included", "Работа включена", "SCOPE_TRIGGER", null),
      assemblyParameter("area_m2", "Площадь окрашиваемой поверхности", "PROJECT_QUANTITY", "m2"),
      assemblyParameter("putty_net_quantity_kg", "Чистая потребность CT 127", "MATERIAL_PASSPORT_VALUE", "kg"),
    ],
    rows,
  };
  return {
    technology: {
      ...input.baseTechnology,
      method: `KRER15:${WALL_PUTTY_CT127_KRER15_RATE_CODE}:CERESIT_CT127`,
      required_stages: [
        "SUBSTRATE_ACCEPTANCE",
        "THIRD_PUTTY_APPLICATION",
        "SANDING",
        "HIGH_QUALITY_PAINT_FINISH_CONTROL",
      ],
      optional_stages: [],
      forbidden_stages: [
        "GENERIC_INSTALLATION",
        "UNSOURCED_ONE_BUNDLE_RESOURCE",
        "UNSOURCED_TRANSPORT_ASSUMPTION",
        "UNSOURCED_WASTE_ASSUMPTION",
      ],
    },
    schema,
    normative_profile: {
      profile_id: input.baseTechnology.normative_profile_ids[0],
      profile_version: "2.0.0",
      technology_id: technologyId,
      jurisdiction: "KG",
      requested_source_ids: [WALL_PUTTY_CT127_KRER15_SOURCE_ID],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["ru_gesn_15", "ru_fer_15"],
    },
    formula_pack: {
      formula_pack_id: input.baseTechnology.formula_pack_id,
      formula_pack_version: "2.0.0",
      technology_id: technologyId,
      formula_ids: rows.map((row) => row.formula.formula_id),
      unit_trace_contract: [
        "formula_expression",
        "input_parameter_ids",
        "input_values_with_sources",
        "output_unit",
        "substitution_trace",
      ],
    },
    assembly_profile: {
      assembly_profile_id: input.baseTechnology.assembly_profile_id,
      assembly_profile_version: "2.0.0",
      technology_id: technologyId,
      child_assemblies: [childAssembly],
    },
    resource_policy: {
      policy_id: input.baseTechnology.resource_completeness_policy_id,
      technology_id: technologyId,
      required_categories: ["material", "labor", "equipment"],
      optional_categories: ["testing", "documentation", "transport", "waste"],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}

function sourceManagedValue(
  value: string | number,
  unitId: string | null,
  sourceType: "APPLICABLE_NORM" | "MATERIAL_PASSPORT",
  sourceId: string,
  applicability: string,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: sourceType,
    source_id: sourceId,
    captured_at: SOURCE_CAPTURED_AT,
    confidence: "high",
    applicability,
  };
}

export function applyWallPuttyCt127Krer15SourceManagedValuesV1(input: {
  workKey: string;
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): Readonly<Record<string, ProfessionalParameterValueV4>> {
  if (
    input.workKey !== WALL_PUTTY_CT127_KRER15_WORK_KEY ||
    input.parameterValues.product_profile_id?.value !==
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID
  ) {
    return input.parameterValues;
  }
  const values = { ...input.parameterValues };
  const rate = values.normative_rate_code;
  if (!rate || rate.source_type === "VISIBLE_BASELINE_ASSUMPTION") {
    values.normative_rate_code = sourceManagedValue(
      WALL_PUTTY_CT127_KRER15_RATE_CODE,
      null,
      "APPLICABLE_NORM",
      WALL_PUTTY_CT127_KRER15_SOURCE_ID,
      "Exact KG KRER 15-04-027-01 rate selected by the canonical work owner.",
    );
  }
  const bag = values.selected_bag_size_kg;
  if (!bag || bag.source_type === "VISIBLE_BASELINE_ASSUMPTION") {
    values.selected_bag_size_kg = sourceManagedValue(
      String(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.documented_bag_size_kg),
      "kg",
      "MATERIAL_PASSPORT",
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
      "Documented CT 127 package size from the reviewed manufacturer TDS.",
    );
  }
  return Object.freeze(values);
}

export function validateWallPuttyCt127Krer15InputsV1(input: {
  workKey: string;
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): readonly string[] {
  if (input.workKey !== WALL_PUTTY_CT127_KRER15_WORK_KEY) return [];
  const values = input.parameterValues;
  const blockers: string[] = [];
  if (
    values.product_profile_id?.value !== CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID ||
    values.product_profile_id?.source_type === "VISIBLE_BASELINE_ASSUMPTION"
  ) {
    blockers.push(`PROJECT_VALUE_REQUIRED_EXPLICIT:product_profile_id=${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID}`);
  }
  if (values.normative_rate_code?.value !== WALL_PUTTY_CT127_KRER15_RATE_CODE) {
    blockers.push(`NORMATIVE_RATE_CODE_MISMATCH:${WALL_PUTTY_CT127_KRER15_SOURCE_ID}:${String(values.normative_rate_code?.value ?? "")}`);
  }
  const confirmation = values[WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID];
  if (confirmation?.value !== true || confirmation.source_type === "VISIBLE_BASELINE_ASSUMPTION") {
    blockers.push(`PROJECT_VALUE_REQUIRED_EXPLICIT:${WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID}=true`);
  }
  for (const parameterId of ["funding_source", "project_type"] as const) {
    const value = values[parameterId];
    if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") {
      blockers.push(`PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
    }
  }
  return Object.freeze([...new Set(blockers)]);
}
