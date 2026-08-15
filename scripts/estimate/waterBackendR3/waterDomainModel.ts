import { createHash } from "node:crypto";

import {
  compileFormulaGraph,
  type FormulaAst,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  buildGlobalCatalogInventoryV1,
  type GlobalCatalogInventoryRowV1,
} from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import { WATER_BACKEND_EXPANDED_OWNED_FAMILIES } from "./waterOwnedFamilies";
import { buildWaterR5ProfessionalPlan } from "./waterR5ProfessionalModel";

export const WATER_BACKEND_CONTENT_VERSION = "batch006-water-backend-r3.r5.2026-08-15" as const;
export const WATER_BACKEND_DOMAIN = "water_supply_sewerage" as const;
export const WATER_BACKEND_EXPECTED_CATALOG_IDS = 845 as const;

export type JsonRecord = Record<string, unknown>;
export type WaterTechnologyKind =
  | "FIXTURE"
  | "INTERNAL_PRESSURE"
  | "INTERNAL_GRAVITY"
  | "EXTERNAL_PRESSURE"
  | "EXTERNAL_GRAVITY"
  | "DRAINAGE"
  | "CHAMBER"
  | "PUMP"
  | "TREATMENT"
  | "STORAGE"
  | "TESTING";

export type WaterProfile = {
  kind: WaterTechnologyKind;
  outputParameterId: "route_length_m" | "component_count" | "process_unit_count";
  outputUnitId: "m" | "item";
  networkLocation: "INTERNAL" | "EXTERNAL" | "FACILITY";
  pressureMode: "PRESSURE" | "GRAVITY" | "ATMOSPHERIC" | "MIXED";
  fluid: "POTABLE_WATER" | "TECHNICAL_WATER" | "DOMESTIC_WASTEWATER" | "STORMWATER" | "SLUDGE";
  materialVariants: readonly string[];
  primaryNormSourceId: string;
  primaryNormLocator: string;
  priceSourceId: string;
  requiredStages: readonly string[];
  optionalStages: readonly string[];
};

export type WaterParameter = {
  catalogId: string;
  parameterId: string;
  ordinal: number;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: unknown;
  constraints: JsonRecord;
};

export type WaterFormula = {
  catalogId: string;
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst;
  inputParameterIds: string[];
};

export type WaterResource = {
  catalogId: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service" | "waste" | "other";
  unitId: string;
  formulaId: string;
  inclusionAst: JsonRecord;
  resourceGraph: JsonRecord;
  semanticOwner: string;
  costOwnerId: string;
  procurementEligible: boolean;
  sourceMetadata: JsonRecord;
};

export type WaterDefinition = {
  work: {
    catalogId: string;
    namespace: "global";
    domain: typeof WATER_BACKEND_DOMAIN;
    sourceIdentity: string;
    workKey: string;
    titleRu: string;
    denominatorEligible: true;
    definitionVersion: 1;
    passport: JsonRecord;
    applicability: JsonRecord;
    sourceMetadata: JsonRecord;
  };
  parameters: WaterParameter[];
  formulas: WaterFormula[];
  resources: WaterResource[];
};

export type NormativeSource = {
  sourceId: string;
  documentCode: string;
  titleRu: string;
  authority: string;
  officialUrl: string;
  artifactFile: string;
  artifactSha256: string;
  effectiveFrom: string;
  status: "EFFECTIVE" | "REFERENCE_RATE_BASE";
  applicability: string;
};

export const WATER_OFFICIAL_SOURCES: readonly NormativeSource[] = Object.freeze([
  {
    sourceId: "sn_kr_40_04_2025",
    documentCode: "СН КР 40-04:2025",
    titleRu: "Внутренний водопровод и канализация зданий",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/document/148/show",
    artifactFile: "sn-kr-40-04-2025.pdf",
    artifactSha256: "f762f74d7a15b45681b96405a154a8f495fce9f66208d58e57efaaee421a2948",
    effectiveFrom: "2025-02-10",
    status: "EFFECTIVE",
    applicability: "Internal cold/hot water, DHW circulation, internal sewer and internal drains",
  },
  {
    sourceId: "sn_sp_kr_40_01_40_02_40_03_2023",
    documentCode: "СН КР 40-01:2023; СН КР 40-02:2023; СП КР 40-03:2023",
    titleRu: "Наружные сети водоснабжения, канализации и сооружения",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/document/41/show",
    artifactFile: "sn-kr-40-01-40-02-sp-40-03-2023-order-64.pdf",
    artifactSha256: "24b006722a3563d33ad2ea6f9e9d0204e6fb1583c24d6094c1605d4ffc03639a",
    effectiveFrom: "2023-12-14",
    status: "EFFECTIVE",
    applicability: "External water supply, sewerage, stormwater, drainage and treatment facilities",
  },
  {
    sourceId: "sp_kr_40_101_2023",
    documentCode: "СП КР 40-101:2023",
    titleRu: "Системы водоснабжения и канализации сельских населённых пунктов",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/document/40/show",
    artifactFile: "sp-kr-40-101-2023-order-222.pdf",
    artifactSha256: "5ab2a0b65a0147bc307d916e90dba087c1c14e30e6584e5d560bede0aaeb8389",
    effectiveFrom: "2023-12-29",
    status: "EFFECTIVE",
    applicability: "Only rural settlements with population up to 5000; never applied silently outside this condition",
  },
  {
    sourceId: "kg_krer16_2015",
    documentCode: "КРЕР №16",
    titleRu: "Трубопроводы внутренние",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/432/show",
    artifactFile: "krer-16-internal-pipelines.pdf",
    artifactSha256: "4fb2b609cf72486f9ef5f110cd606f6632fba3302cd3d52015f41dac24cbd17b",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Internal pipelines, fittings, valves, supports, flushing and hydraulic testing",
  },
  {
    sourceId: "kg_krer17_2015",
    documentCode: "КРЕР №17",
    titleRu: "Водопровод и канализация — внутренние устройства",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/433/show",
    artifactFile: "krer-17-internal-water-sewer.pdf",
    artifactSha256: "1a7a3d7745a7eddf9cd794f96dba805b706aa0a97de58efa39b51a28489bec99",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Sanitary fixtures, mixers, drains, water heaters and internal devices",
  },
  {
    sourceId: "kg_krer22_2015",
    documentCode: "КРЕР №22",
    titleRu: "Водопровод — наружные сети",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/438/show",
    artifactFile: "krer-22-external-water.pdf",
    artifactSha256: "84bd0f140b1d5a95968654757d58516bc7ec479ddae8b7aac77a354c75a5dbd9",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "External pressure water pipelines, valves, chambers, tests and associated operations",
  },
  {
    sourceId: "kg_krer23_2015",
    documentCode: "КРЕР №23",
    titleRu: "Канализация — наружные сети",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/439/show",
    artifactFile: "krer-23-external-sewer.pdf",
    artifactSha256: "98b20488c92084fe3ca329b48032eca0f3ac6f163ebbfc81729adeae12d402bf",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "External gravity and pressure sewerage, stormwater and drainage networks",
  },
  {
    sourceId: "kg_krerp09_2015",
    documentCode: "КРЕРп №9",
    titleRu: "Сооружения водоснабжения и канализации — пусконаладочные работы",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/412/show",
    artifactFile: "krerp-09-water-sewer-commissioning.pdf",
    artifactSha256: "0f2ee596013b839b82a42aa9534d76d176e5e8c93ab148cb73a4ef6e1275a0f4",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Commissioning of water-supply and sewerage facilities and process equipment",
  },
  {
    sourceId: "kg_price_book16_2015",
    documentCode: "Сборник средних сметных цен, книга 16",
    titleRu: "Трубы и фасонные части",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/267/show",
    artifactFile: "price-book-16-pipes-fittings.pdf",
    artifactSha256: "52e7f7a4d8613200bae78e846cd8684b8bdc709767b1806c751cddf0ab737f0a",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Price route for pipes and fittings; current snapshot still required for commercial total",
  },
  {
    sourceId: "kg_price_book17_2015",
    documentCode: "Сборник средних сметных цен, книга 17",
    titleRu: "Арматура трубопроводная",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/268/show",
    artifactFile: "price-book-17-valves.pdf",
    artifactSha256: "f7b5ad37a262dea995cb977b60238660de1c6046f10a36d76c9987e307414763",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Price route for valves and pipeline fittings",
  },
  {
    sourceId: "kg_price_book19_2015",
    documentCode: "Сборник средних сметных цен, книга 19",
    titleRu: "Насосы и насосное оборудование",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/270/show",
    artifactFile: "price-book-19-pumps.pdf",
    artifactSha256: "fcf004535a26388420dabde42971e05af2621196c5926596b37eb9248511590d",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Price route for pumps and pump equipment",
  },
  {
    sourceId: "kg_price_book21_2015",
    documentCode: "Сборник средних сметных цен, книга 21",
    titleRu: "Материалы и изделия водоснабжения и канализации",
    authority: "Министерство строительства Кыргызской Республики",
    officialUrl: "https://minstroy.gov.kg/ru/kyzmat/272/show",
    artifactFile: "price-book-21-water-sewer-materials.pdf",
    artifactSha256: "fb2bf716bd8d9a94dd4305eebb41a52fba7204fc6cd7f82b47df808c74c20ba8",
    effectiveFrom: "2015-01-01",
    status: "REFERENCE_RATE_BASE",
    applicability: "Price route for water-supply and sewerage materials and products",
  },
]);

const OWNED_EXPANDED = new Set<string>([
  ...WATER_BACKEND_EXPANDED_OWNED_FAMILIES,
]);

const EXTERNAL_PRESSURE = new Set([
  "distribution_pipeline", "house_connection_water", "pressure_pipeline", "pressure_sewer_pipeline",
  "settlement_water_network", "site_water_connection", "village_water_supply",
]);
const EXTERNAL_GRAVITY = new Set([
  "gravity_sewer_collector", "outfall_structure", "site_sewer_connection", "stormwater_drainage",
  "village_sewer_network",
]);
const CHAMBER = new Set([
  "inspection_chambers", "inspection_wells", "manholes", "rainwater_inlets", "valves_chambers", "water_meter_chambers",
]);
const PUMP = new Set(["booster_pumping_station", "pumping_station", "sewer_pumping_station"]);
const TREATMENT = new Set([
  "aeration_tanks", "chlorination_station", "filtration_station", "septic_treatment_facility",
  "sewage_treatment_tanks", "sludge_dewatering", "wastewater_treatment_plant", "water_treatment_plant",
]);
const STORAGE = new Set([
  "borehole_water_supply", "reservoir_clean_water", "water_intake", "water_reservoir", "water_tower", "well_construction",
]);
const TESTING = new Set(["flushing_disinfection", "pressure_testing_disinfection"]);

function family(row: GlobalCatalogInventoryRowV1): string | null {
  return row.domain_id.startsWith("expanded:") ? row.domain_id.slice("expanded:".length) : null;
}

function profileFor(row: GlobalCatalogInventoryRowV1): WaterProfile {
  const expanded = family(row);
  if (expanded) {
    const base = {
      outputParameterId: "route_length_m" as const,
      outputUnitId: "m" as const,
      networkLocation: "EXTERNAL" as const,
      pressureMode: "GRAVITY" as const,
      fluid: "DOMESTIC_WASTEWATER" as const,
      materialVariants: ["PVC_SN8", "PP_CORRUGATED", "RC_PIPE"] as const,
      primaryNormSourceId: "kg_krer23_2015",
      primaryNormLocator: "tables:23-01-001_to_23-01-020;technical_part:sections_1_and_2",
      priceSourceId: "kg_price_book21_2015",
      requiredStages: ["SURVEY", "INSTALLATION", "TESTING", "DOCUMENTATION"],
      optionalStages: ["EARTHWORKS", "TRENCHLESS", "RESTORATION", "CCTV"],
    };
    if (expanded === "drainage_channel" || expanded === "drainage_prism") {
      return { ...base, kind: "DRAINAGE", fluid: "STORMWATER", materialVariants: ["PRECAST_CONCRETE", "POLYMER_CONCRETE", "GEOCOMPOSITE"] };
    }
    if (EXTERNAL_PRESSURE.has(expanded)) {
      return {
        ...base,
        kind: "EXTERNAL_PRESSURE",
        pressureMode: "PRESSURE",
        fluid: expanded.includes("sewer") ? "DOMESTIC_WASTEWATER" : "POTABLE_WATER",
        materialVariants: ["PE100_SDR17", "DUCTILE_IRON", "STEEL_COATED"],
        primaryNormSourceId: "kg_krer22_2015",
        primaryNormLocator: "tables:22-01-001_to_22-04-003;technical_part:sections_1_and_2",
        priceSourceId: "kg_price_book16_2015",
      };
    }
    if (EXTERNAL_GRAVITY.has(expanded)) return { ...base, kind: "EXTERNAL_GRAVITY", fluid: expanded.includes("storm") || expanded.includes("outfall") ? "STORMWATER" : "DOMESTIC_WASTEWATER" };
    if (CHAMBER.has(expanded)) {
      return {
        ...base,
        kind: "CHAMBER",
        outputParameterId: "component_count",
        outputUnitId: "item",
        materialVariants: ["PRECAST_RC", "CAST_IN_SITU_RC", "POLYMER_CHAMBER"],
      };
    }
    if (PUMP.has(expanded)) {
      return {
        ...base,
        kind: "PUMP",
        outputParameterId: "process_unit_count",
        outputUnitId: "item",
        networkLocation: "FACILITY",
        pressureMode: "PRESSURE",
        fluid: expanded.includes("sewer") ? "DOMESTIC_WASTEWATER" : "TECHNICAL_WATER",
        materialVariants: ["DRY_INSTALLED_PUMP", "SUBMERSIBLE_PUMP", "VERTICAL_TURBINE_PUMP"],
        primaryNormSourceId: "kg_krerp09_2015",
        primaryNormLocator: "collection:09;water_supply_and_sewerage_facilities:commissioning_tables",
        priceSourceId: "kg_price_book19_2015",
      };
    }
    if (TREATMENT.has(expanded)) {
      return {
        ...base,
        kind: "TREATMENT",
        outputParameterId: "process_unit_count",
        outputUnitId: "item",
        networkLocation: "FACILITY",
        pressureMode: "MIXED",
        fluid: expanded.includes("water_treatment") || expanded.includes("chlorination") || expanded.includes("filtration") ? "POTABLE_WATER" : "DOMESTIC_WASTEWATER",
        materialVariants: ["FACTORY_PACKAGE", "SITE_ASSEMBLED_STEEL", "REINFORCED_CONCRETE_PROCESS_UNIT"],
        primaryNormSourceId: "kg_krerp09_2015",
        primaryNormLocator: "collection:09;water_supply_and_sewerage_facilities:commissioning_tables",
        priceSourceId: "kg_price_book21_2015",
      };
    }
    if (STORAGE.has(expanded)) {
      return {
        ...base,
        kind: "STORAGE",
        outputParameterId: "process_unit_count",
        outputUnitId: "item",
        networkLocation: "FACILITY",
        pressureMode: "ATMOSPHERIC",
        fluid: "POTABLE_WATER",
        materialVariants: ["REINFORCED_CONCRETE", "COATED_STEEL", "FACTORY_POLYMER"],
        primaryNormSourceId: "kg_krer22_2015",
        primaryNormLocator: "technical_part:water_supply_structures;project_rate_selection_required",
      };
    }
    if (TESTING.has(expanded)) {
      return {
        ...base,
        kind: "TESTING",
        pressureMode: "PRESSURE",
        fluid: "POTABLE_WATER",
        materialVariants: ["INSTALLED_NETWORK"] as const,
        primaryNormSourceId: "kg_krer16_2015",
        primaryNormLocator: "technical_part:clause_1.7;calculation_rules:clause_2.5",
      };
    }
    throw new Error(`WATER_PROFILE_EXPANDED_FAMILY_UNCLASSIFIED:${row.catalog_id}`);
  }

  const system = row.primary_material_or_system;
  if (["BATH", "MIXER", "SHOWER", "SINK", "TOILET"].includes(system)) {
    return {
      kind: "FIXTURE", outputParameterId: "component_count", outputUnitId: "item", networkLocation: "INTERNAL",
      pressureMode: system === "TOILET" ? "MIXED" : "PRESSURE", fluid: system === "TOILET" ? "DOMESTIC_WASTEWATER" : "POTABLE_WATER",
      materialVariants: ["PROJECT_FIXTURE_STANDARD", "PROJECT_FIXTURE_ACCESSIBLE", "PROJECT_FIXTURE_HEAVY_DUTY"],
      primaryNormSourceId: "kg_krer17_2015", primaryNormLocator: "tables:17-01-001_to_17-01-009;technical_part:clauses_1.0_to_1.8",
      priceSourceId: "kg_price_book21_2015", requiredStages: ["ACCEPTANCE", "INSTALLATION", "CONNECTION", "TESTING", "DOCUMENTATION"],
      optionalStages: ["PENETRATIONS", "DEMOLITION", "ACCESSIBILITY_FRAME"],
    };
  }
  if (system === "SEWER") {
    return {
      kind: "INTERNAL_GRAVITY", outputParameterId: "route_length_m", outputUnitId: "m", networkLocation: "INTERNAL",
      pressureMode: "GRAVITY", fluid: "DOMESTIC_WASTEWATER", materialVariants: ["PVC_INTERNAL", "PP_LOW_NOISE", "CAST_IRON_SML"],
      primaryNormSourceId: "kg_krer16_2015", primaryNormLocator: "tables:16-04-001_to_16-04-005;technical_part:clauses_1.1_and_2.1_to_2.5",
      priceSourceId: "kg_price_book16_2015", requiredStages: ["ROUTE", "SUPPORTS", "JOINTS", "FLOW_TEST", "DOCUMENTATION"],
      optionalStages: ["ACOUSTIC_INSULATION", "PENETRATIONS", "CCTV", "DEMOLITION"],
    };
  }
  if (["PPR_PIPE", "PND_PIPE", "WATER_PIPE", "RISER"].includes(system)) {
    return {
      kind: "INTERNAL_PRESSURE", outputParameterId: "route_length_m", outputUnitId: "m", networkLocation: "INTERNAL",
      pressureMode: "PRESSURE", fluid: "POTABLE_WATER", materialVariants: system === "PPR_PIPE"
        ? ["PPR_PN20", "PPR_FIBER_REINFORCED", "PPR_ALUMINIUM_REINFORCED"]
        : system === "PND_PIPE" ? ["PE100_SDR17", "PE100_SDR11", "PE_RT"] : ["GALVANIZED_STEEL", "COPPER", "MULTILAYER_PEX_AL_PEX"],
      primaryNormSourceId: "kg_krer16_2015", primaryNormLocator: "tables:16-02-001_to_16-03-002;technical_part:clauses_1.1_and_2.1_to_2.5",
      priceSourceId: "kg_price_book16_2015", requiredStages: ["ROUTE", "SUPPORTS", "JOINTS", "PRESSURE_TEST", "FLUSHING", "DOCUMENTATION"],
      optionalStages: ["THERMAL_INSULATION", "PENETRATIONS", "DISINFECTION", "DEMOLITION"],
    };
  }
  if (["BOILER", "COLLECTOR", "FILTER", "METER", "PUMP", "INSTALLATION"].includes(system)) {
    return {
      kind: "PUMP", outputParameterId: "component_count", outputUnitId: "item", networkLocation: "INTERNAL",
      pressureMode: "PRESSURE", fluid: "POTABLE_WATER", materialVariants: [`${system}_PROJECT_DUTY`, `${system}_DUTY_STANDBY`, `${system}_HIGH_EFFICIENCY`],
      primaryNormSourceId: system === "METER" ? "kg_krer17_2015" : "kg_krer16_2015",
      primaryNormLocator: system === "METER" ? "tables:17-01-003_to_17-01-009;project_duty_selection_required" : "tables:16-05-001_to_16-05-005;project_duty_selection_required",
      priceSourceId: system === "PUMP" ? "kg_price_book19_2015" : "kg_price_book21_2015",
      requiredStages: ["PACKAGE_ACCEPTANCE", "INSTALLATION", "PIPING", "TESTING", "DOCUMENTATION"],
      optionalStages: ["VIBRATION_ISOLATION", "ELECTRICAL_AUTOMATION_TYPED_CHILD", "INSULATION", "DEMOLITION"],
    };
  }
  throw new Error(`WATER_PROFILE_BASE_SYSTEM_UNCLASSIFIED:${row.catalog_id}:${system}`);
}

function sha256(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(text).digest("hex");
}

const literal = (value: boolean): JsonRecord => ({ kind: "literal", value });
const equals = (parameterId: string, value: unknown): JsonRecord => ({ kind: "equals", parameterId, value });
const enabled = (parameterId: string): JsonRecord => ({ kind: "parameter", id: parameterId });
const and = (...operands: JsonRecord[]): JsonRecord => ({ kind: "and", operands });

function parametersFor(row: GlobalCatalogInventoryRowV1, profile: WaterProfile): WaterParameter[] {
  const parameters: Omit<WaterParameter, "catalogId" | "ordinal">[] = [];
  const add = (
    parameterId: string,
    valueType: WaterParameter["valueType"],
    unitId: string | null,
    titleRu: string,
    required: boolean,
    defaultValue: unknown,
    constraints: JsonRecord,
  ) => parameters.push({ parameterId, valueType, unitId, titleRu, required, defaultValue, constraints });
  const outputTitle = profile.outputParameterId === "route_length_m" ? "Проектная длина трассы"
    : profile.outputParameterId === "component_count" ? "Количество компонентов или узлов" : "Количество технологических линий или установок";
  add(profile.outputParameterId, profile.outputParameterId === "route_length_m" ? "decimal" : "integer", profile.outputUnitId, outputTitle, true, null, { min: 0.001, max: 1_000_000, semantic: "PROJECT_MEASURED_OUTPUT" });
  add("project_review_count", "integer", "service", "Проверка проектных исходных данных", true, null, { min: 1, max: 100, semantic: "EXPLICIT_PROJECT_REVIEW_SCOPE" });
  add("mobilization_count", "integer", "service", "Количество мобилизаций", true, null, { min: 1, max: 100 });
  add("material_factor", "decimal", null, "Коэффициент расхода основного материала", true, null, { min: 0.001, max: 10, semantic: "PROJECT_OR_RATE_DERIVED" });
  add("waste_percent", "decimal", "percent", "Отходы основного материала", true, null, { min: 0, max: 25, semantic: "EXPLICIT_NO_HIDDEN_WASTE" });
  add("joint_count", "integer", "item", "Количество стыков", true, null, { min: 0, max: 10_000_000 });
  add("fitting_count", "integer", "item", "Количество фасонных частей", true, null, { min: 0, max: 10_000_000 });
  add("valve_count", "integer", "item", "Количество единиц арматуры", true, null, { min: 0, max: 1_000_000 });
  add("support_count", "integer", "item", "Количество креплений и опор", true, null, { min: 0, max: 10_000_000 });
  add("delivery_distance_km", "decimal", "km", "Дальность доставки", true, null, { min: 0, max: 10_000 });
  add("delivery_mass_t_per_output", "decimal", "t_per_output", "Масса доставки на единицу результата", true, null, { min: 0, max: 1_000 });
  add("crew_productivity_output_per_hour", "decimal", `${profile.outputUnitId}_per_man_hour`, "Производительность монтажной бригады", true, null, { min: 0.000001, max: 1_000_000 });
  add("tool_productivity_output_per_machine_hour", "decimal", `${profile.outputUnitId}_per_machine_hour`, "Производительность инструмента и механизмов", true, null, { min: 0.000001, max: 1_000_000 });
  add("test_section_count", "integer", "test", "Количество участков испытания", true, null, { min: 1, max: 1_000_000 });
  add("documentation_set_count", "integer", "set", "Количество комплектов исполнительной документации", true, null, { min: 1, max: 100_000 });
  add("material_variant", "enum", null, "Проектный вариант основного материала или оборудования", true, null, { values: [...profile.materialVariants], mutuallyExclusiveGroup: "PRIMARY_MATERIAL_VARIANT" });
  add("include_insulation", "boolean", null, "Включить изоляцию", true, false, { branch: "INSULATION" });
  add("insulation_quantity_per_output", "decimal", `m2_per_${profile.outputUnitId}`, "Площадь изоляции на единицу результата", false, null, { min: 0.000001, max: 10_000, requiredWhen: { parameterId: "include_insulation", equals: true } });
  add("include_penetrations", "boolean", null, "Включить проходки и заделки", true, false, { branch: "PENETRATIONS" });
  add("penetration_count", "integer", "item", "Количество проходок", false, null, { min: 1, max: 1_000_000, requiredWhen: { parameterId: "include_penetrations", equals: true } });
  const intrinsicDemolition = ["REPAIR", "REPLACE"].includes(row.operation_class);
  add("include_demolition", "boolean", null, "Включить отключение и демонтаж", true, intrinsicDemolition, { branch: "DEMOLITION", semanticDefault: intrinsicDemolition ? "REQUIRED_BY_OPERATION_CLASS" : "NOT_INCLUDED_WITHOUT_PROJECT_SCOPE" });
  add("demolition_quantity", "decimal", profile.outputUnitId, "Объём демонтажа", false, null, { min: 0.001, max: 1_000_000, requiredWhen: { parameterId: "include_demolition", equals: true } });
  add("include_temporary_bypass", "boolean", null, "Включить временную схему или байпас", true, false, { branch: "TEMPORARY_BYPASS" });
  add("temporary_bypass_quantity", "decimal", profile.outputUnitId, "Объём временной схемы", false, null, { min: 0.001, max: 1_000_000, requiredWhen: { parameterId: "include_temporary_bypass", equals: true } });

  if (profile.pressureMode === "PRESSURE" || profile.pressureMode === "MIXED") {
    add("operating_pressure_mpa", "decimal", "MPa", "Рабочее давление", true, null, { min: 0.001, max: 25 });
    add("test_pressure_mpa", "decimal", "MPa", "Испытательное давление", true, null, { min: 0.001, max: 40, greaterThanOrEqualParameter: "operating_pressure_mpa" });
  }
  if (profile.pressureMode === "GRAVITY" || profile.kind === "DRAINAGE") {
    add("start_elevation_m", "decimal", "m", "Начальная отметка", true, null, { min: -1_000, max: 10_000 });
    add("end_elevation_m", "decimal", "m", "Конечная отметка", true, null, { min: -1_000, max: 10_000, lessThanParameter: "start_elevation_m" });
    add("include_cctv", "boolean", null, "Включить CCTV-инспекцию", true, false, { branch: "CCTV" });
    add("cctv_length_m", "decimal", "m", "Длина CCTV-инспекции", false, null, { min: 0.001, max: 1_000_000, requiredWhen: { parameterId: "include_cctv", equals: true } });
  }
  if (profile.fluid === "POTABLE_WATER") {
    add("include_disinfection", "boolean", null, "Включить дезинфекцию и лабораторный контроль", true, false, { branch: "DISINFECTION" });
    add("disinfection_water_m3_per_output", "decimal", `m3_per_${profile.outputUnitId}`, "Вода для промывки и дезинфекции", false, null, { min: 0.000001, max: 10_000, requiredWhen: { parameterId: "include_disinfection", equals: true } });
  }
  if (profile.networkLocation === "EXTERNAL") {
    add("installation_method", "enum", null, "Способ прокладки", true, null, { values: ["OPEN_TRENCH", "TRENCHLESS"], mutuallyExclusiveGroup: "INSTALLATION_METHOD" });
    add("trench_width_m", "decimal", "m", "Ширина траншеи", false, null, { min: 0.2, max: 30, requiredWhen: { parameterId: "installation_method", equals: "OPEN_TRENCH" } });
    add("trench_depth_m", "decimal", "m", "Глубина траншеи", false, null, { min: 0.2, max: 100, requiredWhen: { parameterId: "installation_method", equals: "OPEN_TRENCH" } });
    add("bedding_thickness_m", "decimal", "m", "Толщина постели", false, null, { min: 0.01, max: 5, requiredWhen: { parameterId: "installation_method", equals: "OPEN_TRENCH" }, lessThanParameter: "trench_depth_m" });
    add("include_dewatering", "boolean", null, "Включить водоотлив", true, false, { branch: "EARTHWORKS_TYPED_CHILD" });
    add("dewatering_machine_hours", "decimal", "machine_hour", "Машино-часы водоотлива", false, null, { min: 0.001, max: 1_000_000, requiredWhen: { parameterId: "include_dewatering", equals: true } });
    add("include_surface_restoration", "boolean", null, "Включить восстановление нарушенной поверхности", true, false, { branch: "RESTORATION_TYPED_CHILD" });
    add("restoration_width_m", "decimal", "m", "Ширина восстановления", false, null, { min: 0.1, max: 100, requiredWhen: { parameterId: "include_surface_restoration", equals: true } });
  }
  if (["PUMP", "TREATMENT", "STORAGE"].includes(profile.kind)) {
    add("include_electrical_automation", "boolean", null, "Включить typed-child электропитания и автоматики", true, false, { branch: "ELECTRICAL_AUTOMATION_TYPED_CHILD" });
    add("electrical_point_count", "integer", "point", "Количество электрических и контрольных точек", false, null, { min: 1, max: 1_000_000, requiredWhen: { parameterId: "include_electrical_automation", equals: true } });
    add("include_vibration_isolation", "boolean", null, "Включить виброизоляцию", true, false, { branch: "VIBRATION_ISOLATION" });
    add("vibration_mount_count", "integer", "item", "Количество виброопор", false, null, { min: 1, max: 100_000, requiredWhen: { parameterId: "include_vibration_isolation", equals: true } });
  }

  return parameters.map((parameter, ordinal) => ({ catalogId: row.catalog_id, ordinal, ...parameter }));
}

type AddResource = (
  key: string,
  section: string,
  category: string,
  titleRu: string,
  rowType: WaterResource["rowType"],
  unitId: string,
  formula: string,
  condition?: JsonRecord,
  procurementEligible?: boolean,
  owner?: string,
  normOverride?: { sourceId: string; locator: string; priceSourceId?: string },
) => void;

function resourcesFor(row: GlobalCatalogInventoryRowV1, profile: WaterProfile): { formulas: WaterFormula[]; resources: WaterResource[] } {
  const formulas: WaterFormula[] = [];
  const resources: WaterResource[] = [];
  const q = profile.outputParameterId;
  const designSourceId = profile.networkLocation === "INTERNAL" ? "sn_kr_40_04_2025" : "sn_sp_kr_40_01_40_02_40_03_2023";
  const add: AddResource = (
    key, section, category, titleRu, rowType, unitId, expression, condition = literal(true),
    procurementEligible = rowType === "material" || rowType === "equipment", owner = key, normOverride,
  ) => {
    const compiled = compileFormulaGraph(expression);
    const formulaId = `water:${row.catalog_id}:${key}:formula:r3`;
    formulas.push({
      catalogId: row.catalog_id,
      formulaId,
      outputUnitId: unitId,
      expressionSource: compiled.source,
      ast: compiled.ast,
      inputParameterIds: compiled.inputParameterIds,
    });
    const sourceId = normOverride?.sourceId ?? profile.primaryNormSourceId;
    const locator = normOverride?.locator ?? profile.primaryNormLocator;
    const priceSourceId = normOverride?.priceSourceId ?? profile.priceSourceId;
    const normativeTrace: JsonRecord[] = [
      {
        source_id: sourceId,
        document_code: WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === sourceId)?.documentCode,
        authority: WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === sourceId)?.authority,
        locator,
        applicability: `catalog_id=${row.catalog_id};kind=${profile.kind};location=${profile.networkLocation}`,
        source_role: "RESOURCE_ESTIMATE_NORM_OR_POST_ROW_LOCATOR",
      },
      {
        source_id: designSourceId,
        document_code: WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === designSourceId)?.documentCode,
        authority: WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === designSourceId)?.authority,
        locator: profile.networkLocation === "INTERNAL" ? "scope:internal_water_sewer_and_drains;project_applicability_required" : "scope:external_networks_and_facilities;project_applicability_required",
        applicability: profile.networkLocation,
        source_role: "DESIGN_APPLICABILITY",
      },
    ];
    if (/village_|settlement_/.test(row.catalog_id)) {
      normativeTrace.push({
        source_id: "sp_kr_40_101_2023",
        document_code: "СП КР 40-101:2023",
        authority: WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === "sp_kr_40_101_2023")?.authority,
        locator: "scope:population_up_to_5000_only",
        applicability: "REQUIRES_EXPLICIT_PROJECT_PARAMETER:rural_population_lte_5000",
        source_role: "CONDITIONAL_DESIGN_APPLICABILITY",
      });
    }
    const ordinal = resources.length;
    resources.push({
      catalogId: row.catalog_id,
      rowId: `water:${row.catalog_id}:${key}`,
      ordinal,
      section,
      category,
      titleRu,
      rowType,
      unitId,
      formulaId,
      inclusionAst: condition,
      resourceGraph: {
        version: "ResourceGraph.water.r3",
        catalogId: row.catalog_id,
        technologyKind: profile.kind,
        expectedScopeSlot: key,
        quantityBasis: compiled.source,
        parameterSources: compiled.inputParameterIds,
        inclusionAst: condition,
        semanticOwner: owner,
        parentChildDoubleCountGuard: owner.startsWith("typed-child:") ? "CHILD_OWNER_EXCLUSIVE" : "WATER_OWNER_EXCLUSIVE",
      },
      semanticOwner: owner,
      costOwnerId: `price:${priceSourceId}:${profile.kind.toLocaleLowerCase("en-US")}:${key}`,
      procurementEligible,
      sourceMetadata: {
        sourceVersion: WATER_BACKEND_CONTENT_VERSION,
        sourceCatalogRowHash: row.row_hash,
        normativeTrace,
        priceRoute: {
          sourceId: priceSourceId,
          routePolicy: "VERSIONED_BACKEND_SNAPSHOT_OR_EXPLICIT_MANUAL_PRICE",
          hiddenPriceDefault: false,
          currency: "KGS",
        },
        outputRounding: "ROUND_HALF_UP_9",
        paddingRow: false,
      },
    });
  };

  add("project_review", "Подготовка", "engineering", "Проверка проекта, спецификаций и границ ответственности", "service", "service", "project_review_count", literal(true), false);
  add("mobilization", "Подготовка", "mobilization", "Мобилизация бригады, инструмента и безопасной рабочей зоны", "service", "service", "mobilization_count", literal(true), false);
  add("setting_out", "Подготовка", "survey", "Разбивка трассы, осей, отметок и мест установки", "labor", profile.outputUnitId, q, literal(true), false);

  for (const [index, variant] of profile.materialVariants.entries()) {
    add(`primary_${variant.toLocaleLowerCase("en-US")}`, "Основные материалы", "primary_material", `Основной проектный ресурс: ${variant}`,
      profile.kind === "PUMP" || profile.kind === "TREATMENT" || profile.kind === "STORAGE" ? "equipment" : "material",
      profile.outputUnitId, `${q} * material_factor * (1 + waste_percent / 100)`, equals("material_variant", variant), true, `primary-material:${variant}`,
      { sourceId: profile.primaryNormSourceId, locator: `${profile.primaryNormLocator};material_variant_index:${index}`, priceSourceId: profile.priceSourceId });
  }

  add("elbows", "Фасонные части", "fitting", "Отводы проектного типа и диаметра", "material", "item", "fitting_count * 0.3", literal(true), true, "fittings:elbows", { sourceId: profile.primaryNormSourceId, locator: profile.primaryNormLocator, priceSourceId: "kg_price_book16_2015" });
  add("tees", "Фасонные части", "fitting", "Тройники проектного типа и диаметра", "material", "item", "fitting_count * 0.2", literal(true), true, "fittings:tees", { sourceId: profile.primaryNormSourceId, locator: profile.primaryNormLocator, priceSourceId: "kg_price_book16_2015" });
  add("couplings", "Фасонные части", "fitting", "Муфты, раструбные или фланцевые соединители", "material", "item", "fitting_count * 0.3", literal(true), true, "fittings:couplings", { sourceId: profile.primaryNormSourceId, locator: profile.primaryNormLocator, priceSourceId: "kg_price_book16_2015" });
  add("reducers", "Фасонные части", "fitting", "Переходы проектных диаметров", "material", "item", "fitting_count * 0.1", literal(true), true, "fittings:reducers", { sourceId: profile.primaryNormSourceId, locator: profile.primaryNormLocator, priceSourceId: "kg_price_book16_2015" });
  add("adapters", "Фасонные части", "fitting", "Адаптеры к оборудованию, приборам и существующим сетям", "material", "item", "fitting_count * 0.1", literal(true), true, "fittings:adapters", { sourceId: profile.primaryNormSourceId, locator: profile.primaryNormLocator, priceSourceId: "kg_price_book16_2015" });
  add("joint_seals", "Соединения", "seal", "Прокладки, уплотнительные кольца и герметик точных соединений", "material", "item", "joint_count", literal(true), true, "joints:seals");
  add("joint_fasteners", "Соединения", "fastener", "Болты, гайки, шайбы или сварочные материалы соединений", "material", "item", "joint_count * 4", literal(true), true, "joints:fasteners");
  add("joint_installation", "Соединения", "installation", "Сборка, сварка или герметизация точных стыков", "labor", "man_hour", "joint_count / crew_productivity_output_per_hour", literal(true), false, "joints:installation");
  add("isolation_valves", "Арматура", "valve", "Запорная арматура проектного типа", "material", "item", "valve_count * 0.6", literal(true), true, "valves:isolation", { sourceId: profile.primaryNormSourceId, locator: `${profile.primaryNormLocator};valves`, priceSourceId: "kg_price_book17_2015" });
  add("check_valves", "Арматура", "valve", "Обратная арматура проектного типа", "material", "item", "valve_count * 0.2", literal(true), true, "valves:check", { sourceId: profile.primaryNormSourceId, locator: `${profile.primaryNormLocator};valves`, priceSourceId: "kg_price_book17_2015" });
  add("regulating_valves", "Арматура", "valve", "Регулирующая и балансировочная арматура", "material", "item", "valve_count * 0.2", literal(true), true, "valves:regulating", { sourceId: profile.primaryNormSourceId, locator: `${profile.primaryNormLocator};valves`, priceSourceId: "kg_price_book17_2015" });
  add("support_brackets", "Крепления", "support", "Кронштейны и несущие опоры", "material", "item", "support_count", literal(true), true, "supports:brackets");
  add("support_clamps", "Крепления", "support", "Хомуты с проектными вкладышами", "material", "item", "support_count", literal(true), true, "supports:clamps");
  add("support_anchors", "Крепления", "fastener", "Анкеры креплений и опор", "material", "item", "support_count * 2", literal(true), true, "supports:anchors");

  add("penetration_sleeves", "Проходки", "penetration", "Гильзы проходок точного диаметра", "material", "item", "penetration_count", enabled("include_penetrations"), true, "penetrations:sleeves");
  add("penetration_seals", "Проходки", "penetration", "Эластичная водо- и газонепроницаемая заделка проходок", "material", "item", "penetration_count", enabled("include_penetrations"), true, "penetrations:seals");
  add("penetration_firestop", "Проходки", "typed_child", "Противопожарная заделка проходок по отдельному Fire Protection owner", "service", "item", "penetration_count", enabled("include_penetrations"), false, "typed-child:FIRE_PROTECTION");
  add("penetration_labor", "Проходки", "installation", "Монтаж гильз и заделка проходок", "labor", "man_hour", "penetration_count / crew_productivity_output_per_hour", enabled("include_penetrations"), false, "penetrations:labor");

  add("insulation_material", "Изоляция", "insulation", "Проектная тепло-, шумо- или противоконденсатная изоляция", "material", "m2", `${q} * insulation_quantity_per_output`, enabled("include_insulation"), true, "typed-child:INSULATION");
  add("insulation_vapor_barrier", "Изоляция", "insulation", "Пароизоляционный слой", "material", "m2", `${q} * insulation_quantity_per_output`, enabled("include_insulation"), true, "typed-child:INSULATION");
  add("insulation_cover", "Изоляция", "insulation", "Защитный покров изоляции", "material", "m2", `${q} * insulation_quantity_per_output`, enabled("include_insulation"), true, "typed-child:INSULATION");
  add("insulation_labor", "Изоляция", "installation", "Труд монтажа изоляции и защитного покрова", "labor", "man_hour", `${q} * insulation_quantity_per_output / crew_productivity_output_per_hour`, enabled("include_insulation"), false, "typed-child:INSULATION");

  add("installation_plumber", "Монтаж", "labor", "Труд монтажника санитарно-технических систем", "labor", "man_hour", `${q} / crew_productivity_output_per_hour`, literal(true), false, "labor:plumber");
  add("installation_assistant", "Монтаж", "labor", "Труд помощника монтажника", "labor", "man_hour", `${q} / crew_productivity_output_per_hour * 0.6`, literal(true), false, "labor:assistant");
  add("installation_supervision", "Монтаж", "labor", "Мастер и технический контроль монтажа", "labor", "man_hour", `${q} / crew_productivity_output_per_hour * 0.15`, literal(true), false, "labor:supervision");
  add("hand_tools", "Механизмы", "small_tools", "Механизированный и ручной монтажный инструмент", "equipment", "machine_hour", `${q} / tool_productivity_output_per_machine_hour`, literal(true), false, "equipment:hand-tools");
  add("lifting_equipment", "Механизмы", "lifting", "Подъём и позиционирование материалов или оборудования", "equipment", "machine_hour", `${q} / tool_productivity_output_per_machine_hour * 0.25`, literal(true), false, "equipment:lifting");
  add("temporary_protection", "Монтаж", "temporary_work", "Временные заглушки, защита открытых концов и установленных изделий", "material", "item", "test_section_count * 2", literal(true), true, "temporary:protection");
  add("identification_labels", "Монтаж", "labeling", "Маркировка трубопровода, арматуры, узлов или оборудования", "material", "item", "support_count * 0.25 + valve_count", literal(true), true, "identification:labels");

  add("pressure_or_leak_test", "Испытания", "testing", "Гидравлическое, пневматическое или герметичностное испытание по применимости", "service", "test", "test_section_count", literal(true), false, "testing:integrity", { sourceId: profile.primaryNormSourceId, locator: profile.pressureMode === "PRESSURE" ? `${profile.primaryNormLocator};hydraulic_test` : `${profile.primaryNormLocator};leak_and_flow_test` });
  add("test_pump", "Испытания", "equipment", "Испытательная установка, насос или контрольные приборы", "equipment", "machine_hour",
    profile.pressureMode === "PRESSURE" || profile.pressureMode === "MIXED"
      ? "test_section_count * test_pressure_mpa / operating_pressure_mpa / tool_productivity_output_per_machine_hour"
      : "test_section_count / tool_productivity_output_per_machine_hour",
    literal(true), false, "testing:equipment");
  add("flushing", "Испытания", "commissioning", "Промывка или технологическая очистка системы", "service", profile.outputUnitId, q, literal(true), false, "commissioning:flushing", { sourceId: "kg_krer16_2015", locator: "technical_part:clause_1.7;calculation_rules:clause_2.5" });
  if (profile.fluid === "POTABLE_WATER") {
    add("disinfection_water", "Испытания", "commissioning", "Вода и реагент для промывки и дезинфекции", "material", "m3", `${q} * disinfection_water_m3_per_output`, enabled("include_disinfection"), true, "commissioning:disinfection");
    add("disinfection_laboratory", "Испытания", "laboratory", "Отбор проб и лабораторное подтверждение качества воды", "service", "test", "test_section_count", enabled("include_disinfection"), false, "commissioning:laboratory");
  }
  if (profile.pressureMode === "GRAVITY" || profile.kind === "DRAINAGE") {
    add("slope_control", "Испытания", "survey", "Контроль перепада отметок, уклона и самотечного режима", "service", "m", "start_elevation_m - end_elevation_m", literal(true), false, "testing:slope");
    add("cctv_inspection", "Испытания", "diagnostics", "CCTV-инспекция смонтированного трубопровода", "service", "m", "cctv_length_m", enabled("include_cctv"), false, "testing:cctv");
  }

  add("material_delivery", "Логистика", "transport", "Доставка основных материалов и оборудования", "service", "t_km", `${q} * delivery_mass_t_per_output * delivery_distance_km`, literal(true), false, "logistics:delivery");
  add("site_handling", "Логистика", "handling", "Приёмка, разгрузка, складирование и внутриплощадочное перемещение", "labor", "man_hour", `${q} * delivery_mass_t_per_output / crew_productivity_output_per_hour`, literal(true), false, "logistics:handling");
  add("material_loss", "Отходы", "waste", "Технологические обрезки и потери основного материала", "waste", profile.outputUnitId, `${q} * material_factor * waste_percent / 100`, literal(true), false, "waste:material-loss");
  add("packaging_waste", "Отходы", "waste", "Упаковка и вспомогательные отходы", "waste", "kg", `${q} * delivery_mass_t_per_output * 1000 * 0.01`, literal(true), false, "waste:packaging");

  add("demolition_labor", "Демонтаж", "demolition", "Отключение, слив, разборка и демонтаж существующего элемента", "labor", "man_hour", "demolition_quantity / crew_productivity_output_per_hour", enabled("include_demolition"), false, "demolition:water-owner");
  add("demolition_waste", "Демонтаж", "waste", "Демонтированные материалы с раздельным учётом", "waste", "kg", "demolition_quantity * delivery_mass_t_per_output * 1000", enabled("include_demolition"), false, "demolition:waste");
  add("demolition_haul", "Демонтаж", "transport", "Погрузка и вывоз демонтированных материалов", "service", "t_km", "demolition_quantity * delivery_mass_t_per_output * delivery_distance_km", enabled("include_demolition"), false, "demolition:haul");
  add("temporary_bypass_material", "Временная схема", "temporary_work", "Материалы временного байпаса или отвода стоков", "material", profile.outputUnitId, "temporary_bypass_quantity", enabled("include_temporary_bypass"), true, "temporary:bypass");
  add("temporary_bypass_labor", "Временная схема", "temporary_work", "Монтаж, переключение и демонтаж временной схемы", "labor", "man_hour", "temporary_bypass_quantity / crew_productivity_output_per_hour * 2", enabled("include_temporary_bypass"), false, "temporary:bypass");

  if (profile.networkLocation === "EXTERNAL") {
    const open = equals("installation_method", "OPEN_TRENCH");
    const trenchless = equals("installation_method", "TRENCHLESS");
    add("trench_excavation", "Земляные работы", "earthworks", "Разработка траншеи по проектному профилю", "service", "m3", `${q} * trench_width_m * trench_depth_m`, open, false, "typed-child:EARTHWORKS", { sourceId: profile.primaryNormSourceId, locator: `${profile.primaryNormLocator};open_trench` });
    add("trench_shoring", "Земляные работы", "temporary_work", "Крепление стенок траншеи по условиям проекта", "service", "m2", `${q} * trench_depth_m * 2`, open, false, "typed-child:EARTHWORKS");
    add("bedding_sand", "Земляные работы", "bedding", "Песчаная постель проектной толщины", "material", "m3", `${q} * trench_width_m * bedding_thickness_m`, open, true, "typed-child:EARTHWORKS");
    add("bedding_compaction", "Земляные работы", "compaction", "Планировка и уплотнение постели", "equipment", "machine_hour", `${q} * trench_width_m * bedding_thickness_m / tool_productivity_output_per_machine_hour`, open, false, "typed-child:EARTHWORKS");
    add("initial_backfill", "Земляные работы", "backfill", "Первичная защитная засыпка трубопровода", "material", "m3", `${q} * trench_width_m * bedding_thickness_m * 2`, open, true, "typed-child:EARTHWORKS");
    add("general_backfill", "Земляные работы", "backfill", "Обратная засыпка траншеи с послойным уплотнением", "service", "m3", `${q} * trench_width_m * (trench_depth_m - bedding_thickness_m * 3)`, open, false, "typed-child:EARTHWORKS");
    add("backfill_compaction", "Земляные работы", "compaction", "Послойное механизированное уплотнение обратной засыпки", "equipment", "machine_hour", `${q} * trench_width_m * (trench_depth_m - bedding_thickness_m * 3) / tool_productivity_output_per_machine_hour`, open, false, "typed-child:EARTHWORKS");
    add("dewatering", "Земляные работы", "dewatering", "Водоотлив с учётом отдельного Earthworks owner", "equipment", "machine_hour", "dewatering_machine_hours", enabled("include_dewatering"), false, "typed-child:EARTHWORKS");
    add("surface_restoration", "Восстановление", "restoration", "Восстановление нарушенной поверхности по проектной конструкции", "service", "m2", `${q} * restoration_width_m`, enabled("include_surface_restoration"), false, "typed-child:SURFACE_OWNER");
    add("surface_restoration_material", "Восстановление", "restoration", "Материалы восстановления покрытия", "material", "m2", `${q} * restoration_width_m`, enabled("include_surface_restoration"), true, "typed-child:SURFACE_OWNER");
    add("trenchless_pilot", "Бестраншейный переход", "trenchless", "Пилотное бурение по проектной траектории", "service", "m", q, trenchless, false, "water:trenchless");
    add("trenchless_reaming", "Бестраншейный переход", "trenchless", "Расширение скважины до проектного диаметра", "service", "m", q, trenchless, false, "water:trenchless");
    add("trenchless_pullback", "Бестраншейный переход", "trenchless", "Протяжка трубопровода или футляра", "service", "m", q, trenchless, false, "water:trenchless");
    add("trenchless_fluid", "Бестраншейный переход", "material", "Буровой раствор с управляемым сбором", "material", "m3", `${q} * material_factor * 0.05`, trenchless, true, "water:trenchless");
    add("trenchless_entry_exit_pits", "Бестраншейный переход", "typed_child", "Стартовый и приёмный котлованы по typed-child Earthworks contract", "service", "item", "2", trenchless, false, "typed-child:EARTHWORKS");
  }

  if (["PUMP", "TREATMENT", "STORAGE"].includes(profile.kind)) {
    add("facility_earthworks_interface", "Оборудование", "typed_child", "Проектное основание и подземная часть передаются Earthworks owner без повторного учёта", "service", "item", q, literal(true), false, "typed-child:EARTHWORKS");
    add("equipment_base_interface", "Оборудование", "typed_child", "Проверка основания, рамы и анкерной схемы; бетон учитывает Concrete owner", "service", "item", q, literal(true), false, "typed-child:CONCRETE");
    add("equipment_piping", "Оборудование", "piping", "Точная обвязка всасывающих, напорных, дренажных и переливных линий", "material", "item", `${q} * 4`, literal(true), true, "equipment:piping");
    add("equipment_valves", "Оборудование", "valve", "Арматура технологической обвязки", "material", "item", `${q} * 3`, literal(true), true, "equipment:valves", { sourceId: profile.primaryNormSourceId, locator: profile.primaryNormLocator, priceSourceId: "kg_price_book17_2015" });
    add("vibration_mounts", "Оборудование", "vibration", "Виброопоры и гибкие вставки", "material", "item", "vibration_mount_count", enabled("include_vibration_isolation"), true, "equipment:vibration");
    add("electrical_points", "Электрика и автоматика", "typed_child", "Силовые и контрольные точки по Electrical/Automation typed-child owner", "service", "point", "electrical_point_count", enabled("include_electrical_automation"), false, "typed-child:ELECTRICAL_AUTOMATION");
    add("equipment_commissioning", "Пусконаладка", "commissioning", "Индивидуальные и комплексные испытания оборудования", "service", "item", q, literal(true), false, "commissioning:equipment", { sourceId: "kg_krerp09_2015", locator: "collection:09;water_supply_and_sewerage_facilities:commissioning_tables" });
  }

  if (profile.kind === "FIXTURE") {
    add("fixture_mounting_kit", "Сантехнический прибор", "fixture", "Монтажный комплект конкретного санитарного прибора", "material", "item", q, literal(true), true, "fixture:mounting-kit", { sourceId: "kg_krer17_2015", locator: "tables:17-01-001_to_17-01-004" });
    add("fixture_water_connectors", "Сантехнический прибор", "connector", "Подводки холодной и горячей воды по применимости", "material", "item", `${q} * 2`, literal(true), true, "fixture:water-connectors");
    add("fixture_trap_outlet", "Сантехнический прибор", "drainage", "Сифон, выпуск и канализационное присоединение по применимости", "material", "item", q, literal(true), true, "fixture:trap-outlet");
    add("fixture_sealing", "Сантехнический прибор", "seal", "Санитарная герметизация примыкания", "material", "m", `${q} * 2`, literal(true), true, "fixture:sealing");
  }
  if (profile.kind === "TREATMENT") {
    add("process_media", "Технологический процесс", "process_media", "Фильтрующая загрузка, реагент или технологическая среда по проекту", "material", "kg", `${q} * material_factor * 100`, literal(true), true, "treatment:process-media");
    add("process_sampling", "Технологический процесс", "laboratory", "Пусковой лабораторный контроль технологического процесса", "service", "test", "test_section_count", literal(true), false, "treatment:sampling", { sourceId: "kg_krerp09_2015", locator: "collection:09;process_sampling_and_commissioning" });
  }
  if (profile.kind === "DRAINAGE") {
    add("drainage_filter_layer", "Дренаж", "filter", "Фильтрующий слой из проектного зернистого материала", "material", "m3", `${q} * material_factor * 0.2`, literal(true), true, "drainage:filter-layer");
    add("drainage_geotextile", "Дренаж", "geotextile", "Разделительный и фильтрующий геотекстиль", "material", "m2", `${q} * material_factor * 2`, literal(true), true, "drainage:geotextile");
    add("drainage_outlets", "Дренаж", "outlet", "Выпуски, торцевые элементы и присоединения дренажа", "material", "item", "fitting_count", literal(true), true, "drainage:outlets");
  }

  add("hidden_work_records", "Документация", "documentation", "Акты скрытых работ и освидетельствования", "service", "set", "documentation_set_count", literal(true), false, "documentation:hidden-work");
  add("test_protocols", "Документация", "documentation", "Протоколы испытаний, промывки и лабораторного контроля", "service", "set", "documentation_set_count", literal(true), false, "documentation:test-protocols");
  add("as_built_scheme", "Документация", "documentation", "Исполнительная схема с отметками и привязками", "service", "set", "documentation_set_count", literal(true), false, "documentation:as-built");
  add("product_passports", "Документация", "documentation", "Паспорта, сертификаты и подтверждение материалов", "service", "set", "documentation_set_count", literal(true), false, "documentation:passports");
  add("handover_package", "Документация", "documentation", "Комплект сдачи системы заказчику и эксплуатационной службе", "service", "set", "documentation_set_count", literal(true), false, "documentation:handover");

  return { formulas, resources };
}

function r5ContentFor(row: GlobalCatalogInventoryRowV1, profile: WaterProfile): {
  parameters: WaterParameter[];
  formulas: WaterFormula[];
  resources: WaterResource[];
  plan: ReturnType<typeof buildWaterR5ProfessionalPlan>;
} {
  const plan = buildWaterR5ProfessionalPlan(row, profile);
  const parameters = plan.inputs.map((parameter, ordinal): WaterParameter => ({
    catalogId: row.catalog_id,
    parameterId: parameter.parameterId,
    ordinal,
    valueType: parameter.valueType,
    unitId: parameter.unitId,
    titleRu: parameter.titleRu,
    required: parameter.required,
    defaultValue: parameter.defaultValue,
    constraints: parameter.constraints,
  }));
  const formulas: WaterFormula[] = [];
  const resources: WaterResource[] = [];
  const designSourceId = profile.networkLocation === "INTERNAL" ? "sn_kr_40_04_2025" : "sn_sp_kr_40_01_40_02_40_03_2023";
  for (const [ordinal, obligation] of plan.obligations.entries()) {
    const compiled = compileFormulaGraph(obligation.expression);
    const formulaId = `water:${row.catalog_id}:${obligation.key}:formula:r5`;
    formulas.push({
      catalogId: row.catalog_id,
      formulaId,
      outputUnitId: obligation.unitId,
      expressionSource: compiled.source,
      ast: compiled.ast,
      inputParameterIds: compiled.inputParameterIds,
    });
    const rateSource = WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === obligation.sourceId);
    const designSource = WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === designSourceId);
    const priceSource = WATER_OFFICIAL_SOURCES.find((source) => source.sourceId === obligation.priceSourceId);
    if (!rateSource || !designSource || !priceSource) {
      throw new Error(`WATER_R5_SOURCE_ROUTE_RED:${row.catalog_id}:${obligation.key}`);
    }
    resources.push({
      catalogId: row.catalog_id,
      rowId: `water:${row.catalog_id}:${obligation.key}`,
      ordinal,
      section: obligation.section,
      category: obligation.category,
      titleRu: obligation.titleRu,
      rowType: obligation.rowType,
      unitId: obligation.unitId,
      formulaId,
      inclusionAst: obligation.condition as unknown as JsonRecord,
      resourceGraph: {
        version: "ResourceGraph.water.r5",
        catalogId: row.catalog_id,
        exactWorkIdentity: row.work_key,
        operationClass: row.operation_class,
        estimateMaturity: plan.estimateMaturity,
        complexity: plan.complexity,
        technologyKind: profile.kind,
        componentKey: obligation.componentKey,
        componentRole: obligation.componentRole,
        actionKey: obligation.actionKey,
        quantityBasis: compiled.source,
        parameterSources: compiled.inputParameterIds,
        inclusionAst: obligation.condition,
        semanticOwner: obligation.semanticOwner,
        parentChildDoubleCountGuard: obligation.semanticOwner.startsWith("typed-child:")
          ? "TYPED_CHILD_SCOPE_TRANSFER_NO_COST_DUPLICATION"
          : "WATER_BACKEND_OWNER_EXCLUSIVE",
      },
      semanticOwner: obligation.semanticOwner,
      costOwnerId: `price:${obligation.priceSourceId}:${obligation.componentKey}:${obligation.actionKey}`,
      procurementEligible: obligation.procurementEligible,
      sourceMetadata: {
        sourceVersion: WATER_BACKEND_CONTENT_VERSION,
        sourceCatalogRowHash: row.row_hash,
        exactWorkIdentity: row.catalog_id,
        normativeTrace: [
          {
            source_id: rateSource.sourceId,
            document_code: rateSource.documentCode,
            authority: rateSource.authority,
            official_artifact_sha256: rateSource.artifactSha256,
            locator: obligation.locator,
            applicability: obligation.applicability,
            source_role: "EXACT_RESOURCE_OR_OPERATION_LOCATOR",
          },
          {
            source_id: designSource.sourceId,
            document_code: designSource.documentCode,
            authority: designSource.authority,
            official_artifact_sha256: designSource.artifactSha256,
            locator: profile.networkLocation === "INTERNAL"
              ? "scope:internal_water_sewer_and_drains;explicit_project_applicability"
              : "scope:external_networks_and_facilities;explicit_project_applicability",
            applicability: obligation.applicability,
            source_role: "DESIGN_APPLICABILITY",
          },
        ],
        priceRoute: {
          sourceId: priceSource.sourceId,
          documentCode: priceSource.documentCode,
          artifactSha256: priceSource.artifactSha256,
          routePolicy: priceSource.status === "REFERENCE_RATE_BASE"
            ? "SIGNED_RATE_RESOURCE_OR_VERSIONED_BACKEND_PRICE_SNAPSHOT"
            : "VERSIONED_BACKEND_PRICE_SNAPSHOT_OR_EXPLICIT_MANUAL_PRICE",
          hiddenPriceDefault: false,
          currency: "KGS",
        },
        engineeringInputPolicy: "EXPLICIT_PROJECT_OR_SIGNED_NORM_INPUT",
        outputRounding: "ROUND_HALF_UP_9",
        paddingRow: false,
        miscellaneousPercentageRow: false,
      },
    });
  }
  return { parameters, formulas, resources, plan };
}

export function buildWaterBackendDefinitions(): WaterDefinition[] {
  const inventory = buildGlobalCatalogInventoryV1();
  const rows = inventory.rows
    .filter((row) => row.domain_id === "plumbing" || (family(row) !== null && OWNED_EXPANDED.has(family(row)!)))
    .sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));
  if (rows.length !== WATER_BACKEND_EXPECTED_CATALOG_IDS || new Set(rows.map((row) => row.catalog_id)).size !== rows.length) {
    throw new Error(`WATER_BACKEND_ID_SET_MISMATCH:${rows.length}`);
  }
  const definitions = rows.map((row): WaterDefinition => {
    const profile = profileFor(row);
    const { parameters, formulas, resources, plan } = r5ContentFor(row, profile);
    const usedParameters = new Set([
      ...formulas.flatMap((formula) => formula.inputParameterIds),
      ...resources.flatMap((resource) => {
        const ast = JSON.stringify(resource.inclusionAst);
        return parameters.filter((parameter) => ast.includes(`"${parameter.parameterId}"`)).map((parameter) => parameter.parameterId);
      }),
    ]);
    const unusedVisibleParameters = parameters.filter((parameter) => !usedParameters.has(parameter.parameterId));
    if (unusedVisibleParameters.length) {
      throw new Error(`WATER_UNUSED_VISIBLE_PARAMETERS:${row.catalog_id}:${unusedVisibleParameters.map((parameter) => parameter.parameterId).join(",")}`);
    }
    if (resources.length < 10) throw new Error(`WATER_RESOURCE_PROFESSIONAL_MINIMUM_RED:${row.catalog_id}:${resources.length}`);
    const familyId = family(row);
    const passport = {
      passportId: `water-professional-passport:${row.catalog_id}:r3`,
      passportVersion: WATER_BACKEND_CONTENT_VERSION,
      catalogId: row.catalog_id,
      exactWorkIdentity: {
        workKey: row.work_key,
        titleRu: row.title_ru,
        sourceDomainId: row.domain_id,
        operationClass: row.operation_class,
        constructionMethod: row.construction_method,
        primaryMaterialOrSystem: row.primary_material_or_system,
        scopeCapabilities: row.scope_capabilities,
      },
      technology: profile,
      quantityContract: {
        outputParameterId: profile.outputParameterId,
        outputUnitId: profile.outputUnitId,
        hiddenQuantityDefaults: false,
        formulaGraphOwner: "BACKEND_ONLY",
        resourceGraphOwner: "BACKEND_ONLY",
      },
      professionalObligations: {
        complexityClass: plan.complexity,
        estimateMaturity: plan.estimateMaturity,
        requiredStages: plan.requiredStages,
        optionalStages: plan.optionalStages,
        physicalComponentCount: plan.components.length,
        obligationUniverseCount: plan.obligationUniverse.length,
        obligationUniverseSha256: sha256(plan.obligationUniverse),
        resourceRowCount: resources.length,
        rowSemanticOwnersUnique: new Set(resources.map((resource) => resource.semanticOwner)).size,
        exactNormativePostRowLocator: true,
        exactPriceRoutePerRow: true,
        paddingRows: 0,
        miscellaneousPercentageRows: 0,
        hiddenEngineeringDefaults: 0,
      },
      ownerBoundaries: {
        electricalAutomation: "TYPED_CHILD_ELECTRICAL_AUTOMATION",
        earthworks: "TYPED_CHILD_EARTHWORKS_WHEN_STANDALONE",
        concrete: "TYPED_CHILD_CONCRETE_WHEN_STANDALONE",
        surfaceRestoration: "TYPED_CHILD_SURFACE_OWNER_WHEN_STANDALONE",
        fireProtection: "TYPED_CHILD_FIRE_PROTECTION_ONLY",
      },
      ruralApplicability: /village_|settlement_/.test(row.catalog_id)
        ? "SP_KR_40_101_2023_REQUIRES_EXPLICIT_POPULATION_LTE_5000"
        : "SP_KR_40_101_2023_NOT_APPLIED",
    };
    return {
      work: {
        catalogId: row.catalog_id,
        namespace: "global",
        domain: WATER_BACKEND_DOMAIN,
        sourceIdentity: row.catalog_id,
        workKey: row.work_key,
        titleRu: row.title_ru,
        denominatorEligible: true,
        definitionVersion: 1,
        passport,
        applicability: {
          country: "KG",
          networkLocation: profile.networkLocation,
          pressureMode: profile.pressureMode,
          fluid: profile.fluid,
          complexityClass: plan.complexity,
          estimateMaturity: plan.estimateMaturity,
          sourceDomainId: row.domain_id,
          expandedFamily: familyId,
          exactCatalogIdRequired: true,
        },
        sourceMetadata: {
          sourceVersion: WATER_BACKEND_CONTENT_VERSION,
          globalInventoryHash: inventory.inventory_hash,
          globalInventoryRowHash: row.row_hash,
          originalClientR2Status: "SUPERSEDED_DO_NOT_EXECUTE",
          backendOwner: true,
        },
      },
      parameters,
      formulas,
      resources,
    };
  });
  const aggregate = {
    works: definitions.length,
    parameters: definitions.reduce((sum, definition) => sum + definition.parameters.length, 0),
    formulas: definitions.reduce((sum, definition) => sum + definition.formulas.length, 0),
    resources: definitions.reduce((sum, definition) => sum + definition.resources.length, 0),
    rowSetHash: sha256(definitions.flatMap((definition) => definition.resources.map((resource) => resource.rowId)).join("\n")),
  };
  if (aggregate.formulas !== aggregate.resources) throw new Error("WATER_FORMULA_RESOURCE_CARDINALITY_MISMATCH");
  return definitions;
}
