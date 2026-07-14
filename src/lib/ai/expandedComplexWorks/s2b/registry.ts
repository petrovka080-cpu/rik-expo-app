import type {
  ExpandedComplexBoqRow,
  ExpandedComplexLineType,
  ExpandedComplexUnit,
  ExpandedComplexWorkFamilyDefinition,
} from "../index";
import { S2B_BRIDGES_TUNNELS_RETAINING_DOMAIN_PACKS } from "./domains/bridgesTunnelsRetaining";
import { S2B_ELECTRICAL_ENERGY_DOMAIN_PACKS } from "./domains/electricalEnergy";
import { S2B_ROADS_DOMAIN_PACKS } from "./domains/roads";
import { S2B_VENTILATION_PIPELINES_BOILERS_DOMAIN_PACKS } from "./domains/ventilationPipelinesBoilers";
import { S2B_WATER_SEWER_STORM_DOMAIN_PACKS } from "./domains/waterSewerStorm";
import { S2B_WELLS_RENEWABLES_DOMAIN_PACKS } from "./domains/wellsRenewables";
import type { S2BComponent, S2BDomainPack, S2BExpandedRowFactory, S2BWave2Kind } from "./types";
import { S2B_PROFESSIONAL_MIN_ROWS } from "./types";
import { assertS2BDomainPack } from "./validators";

const PACKS: Record<S2BWave2Kind, S2BDomainPack> = {
  ...S2B_ROADS_DOMAIN_PACKS,
  ...S2B_WATER_SEWER_STORM_DOMAIN_PACKS,
  ...S2B_BRIDGES_TUNNELS_RETAINING_DOMAIN_PACKS,
  ...S2B_ELECTRICAL_ENERGY_DOMAIN_PACKS,
  ...S2B_VENTILATION_PIPELINES_BOILERS_DOMAIN_PACKS,
  ...S2B_WELLS_RENEWABLES_DOMAIN_PACKS,
};

const S2B_DEPTH_BASE_KEYS = [
  "road_area_m2",
  "deck_area_m2",
  "wall_face_area_m2",
  "length_m",
  "area_m2",
  "capacity_mw",
  "capacity_kw",
  "depth_m",
  "poles_count",
  "voltage_kv",
  "diameter_mm",
] as const;

function positiveNumber(value: number | string | boolean | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return null;
}

function depthBase(parameters: Record<string, number | string | boolean | null>): { key: string; value: number } {
  for (const key of S2B_DEPTH_BASE_KEYS) {
    const value = positiveNumber(parameters[key]);
    if (value) return { key, value };
  }
  return { key: "work_package", value: 1 };
}

function quantityFor(unit: ExpandedComplexUnit, base: number, index: number): number {
  if (unit === "set") return 1;
  if (unit === "pcs") return Math.max(1, Math.ceil(base / (35 + index * 8)));
  if (unit === "shift") return Math.max(1, Math.ceil(base / (260 + index * 30)));
  if (unit === "trip") return Math.max(1, Math.ceil(base / (180 + index * 20)));
  if (unit === "hour") return Math.max(1, base * (0.035 + index * 0.002));
  if (unit === "m") return Math.max(1, base * (0.12 + index * 0.01));
  if (unit === "m2") return Math.max(1, base * (0.08 + index * 0.004));
  if (unit === "m3") return Math.max(0.1, base * (0.018 + index * 0.002));
  if (unit === "kg") return Math.max(1, base * (0.7 + index * 0.05));
  if (unit === "t") return Math.max(0.05, base * (0.002 + index * 0.0002));
  if (unit === "l") return Math.max(1, base * (0.18 + index * 0.01));
  if (unit === "m3_day" || unit === "m3_h") return Math.max(1, base * 0.01);
  return Math.max(1, base);
}

function rowSpec(input: {
  pack: S2BDomainPack;
  component: S2BComponent;
  componentIndex: number;
  lineType: ExpandedComplexLineType;
  suffix: string;
  titlePrefix: string;
  group: string;
  unit: ExpandedComplexUnit;
  baseKey: string;
  baseValue: number;
  materialKey?: string;
  procurement?: boolean;
  createRow: S2BExpandedRowFactory;
}): ExpandedComplexBoqRow {
  const quantity = quantityFor(input.unit, input.baseValue, input.componentIndex);
  return input.createRow({
    code: `${input.pack.prefix}_${input.component.code}_${input.suffix}`,
    titleRu: `${input.titlePrefix}: ${input.component.titleRu}`,
    lineType: input.lineType,
    group: input.group,
    quantity,
    unit: input.unit,
    formula: `${input.baseKey} driven quantity for ${input.pack.prefix}_${input.component.code}_${input.suffix}`,
    materialKey: input.materialKey,
    procurement: input.procurement,
    sourceParameters: {
      s2bWave2ProfessionalDepth: true,
      s2bComponent: input.component.code,
      s2bBaseParameterKey: input.baseKey,
      s2bBaseParameterValue: input.baseValue,
    },
  });
}

export function s2bWave2KindForFamily(family: ExpandedComplexWorkFamilyDefinition): S2BWave2Kind | null {
  const id = family.work_family_id;
  if (family.categoryGroup === "transport") return id === "road_lighting" ? "lighting" : "road";
  if (family.categoryGroup === "bridges_tunnels") {
    if (/tunnel/.test(id)) return "tunnel";
    if (/retaining|gabion/.test(id)) return "retaining_wall";
    return "bridge";
  }
  if (family.categoryGroup === "water_supply") {
    if (/well|borehole/.test(id)) return "well";
    return "water";
  }
  if (family.categoryGroup === "sewer_wastewater") {
    if (/stormwater|rainwater|drainage_channel/.test(id)) return "stormwater";
    return "sewer";
  }
  if (family.categoryGroup === "hydraulic") return "hydraulic";
  if (family.categoryGroup === "electrical_infrastructure") {
    if (/substation|switchgear|transformer/.test(id)) return "substation";
    if (/lighting/.test(id)) return "lighting";
    return "electrical";
  }
  if (family.categoryGroup === "utility_connections") return "external_networks";
  if (family.categoryGroup === "gas_heat_pipelines") {
    if (/technological|process|industrial/.test(id)) return "pipeline";
    return "pipeline";
  }
  if (family.categoryGroup === "energy") {
    if (/boiler/.test(id)) return "boiler";
    if (/solar|wind|battery/.test(id)) return "solar";
    if (/substation|transformer/.test(id)) return "substation";
    return "substation";
  }
  if (family.categoryGroup === "mep_building") {
    if (/ventilation|smoke|HVAC|cooling/i.test(id)) return "heating_ventilation";
    return "electrical";
  }
  return null;
}

export function isS2BWave2Family(family: ExpandedComplexWorkFamilyDefinition): boolean {
  return s2bWave2KindForFamily(family) !== null;
}

export function isS2BRegulatedKind(kind: S2BWave2Kind): boolean {
  return ["bridge", "tunnel", "substation", "pipeline", "boiler", "well", "hydraulic"].includes(kind);
}

export function ensureS2BProfessionalDepth(input: {
  family: ExpandedComplexWorkFamilyDefinition;
  rows: readonly ExpandedComplexBoqRow[];
  parameters: Record<string, number | string | boolean | null>;
  createRow: S2BExpandedRowFactory;
}): ExpandedComplexBoqRow[] | null {
  const kind = s2bWave2KindForFamily(input.family);
  if (!kind) return null;

  const pack = PACKS[kind];
  assertS2BDomainPack(kind, pack);
  const { key: baseKey, value: baseValue } = depthBase(input.parameters);
  const rows = [...input.rows];
  const existingCodes = new Set(rows.map((row) => row.code));

  for (let index = 0; index < pack.components.length; index += 1) {
    const component = pack.components[index];
    const candidates = [
      rowSpec({
        pack,
        component,
        componentIndex: index,
        lineType: "work",
        suffix: "work",
        titlePrefix: "Работы",
        group: `${kind}_process`,
        unit: pack.workUnit,
        baseKey,
        baseValue,
        createRow: input.createRow,
      }),
      rowSpec({
        pack,
        component,
        componentIndex: index,
        lineType: "material",
        suffix: "material",
        titlePrefix: "Материалы",
        group: `${kind}_materials`,
        unit: component.materialUnit,
        baseKey,
        baseValue,
        materialKey: component.materialKey,
        createRow: input.createRow,
      }),
      rowSpec({
        pack,
        component,
        componentIndex: index,
        lineType: "equipment",
        suffix: "equipment",
        titlePrefix: "Техника",
        group: `${kind}_equipment`,
        unit: "shift",
        baseKey,
        baseValue,
        materialKey: `${component.materialKey}_equipment`,
        procurement: true,
        createRow: input.createRow,
      }),
      rowSpec({
        pack,
        component,
        componentIndex: index,
        lineType: "service",
        suffix: "test_doc",
        titlePrefix: "Испытания и документация",
        group: `${kind}_testing_documentation`,
        unit: "set",
        baseKey,
        baseValue,
        procurement: true,
        createRow: input.createRow,
      }),
    ];

    for (const candidate of candidates) {
      if (existingCodes.has(candidate.code)) continue;
      existingCodes.add(candidate.code);
      rows.push(candidate);
    }
  }

  if (rows.filter((row) => row.quantity > 0).length < S2B_PROFESSIONAL_MIN_ROWS) {
    throw new Error(`S2B_PROFESSIONAL_DEPTH_INCOMPLETE:${input.family.work_family_id}`);
  }
  return rows;
}
