import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { normalizeCanonicalProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { ProfessionalBoqRow } from "../../src/lib/estimate/estimateDraftRevisionContract";
import type { ProfessionalCostRowType } from "../../src/lib/estimate/professionalCostingContract";
import type {
  ProfessionalPriceItemType,
  ProfessionalPriceRecord,
  ProfessionalPriceSourceRecord,
} from "../../src/lib/estimate/professionalPricebookContract";
import type { ProfessionalBoqRecipeRow, WorkPassportRowType } from "../../src/lib/estimate/workPassportContract";
import { REAL_NAMED_BOQ_RUNTIME_CASES } from "./realNamedBoqCriticalCases";

const OUT_DIR = path.join("data", "estimate", "pricebook");
const RETRIEVED_AT = "2026-07-07T00:00:00+06:00";
const VALID_FROM = "2026-07-07";

type PricebookCoverageRow = {
  rowType: ProfessionalBoqRecipeRow["rowType"] | ProfessionalBoqRow["rowType"];
  titleRu: string;
  normFamilyId?: string | null;
  sourceUnit?: string | null;
  unit?: string | null;
};

function costRowType(row: PricebookCoverageRow): ProfessionalCostRowType {
  const text = `${row.titleRu} ${row.normFamilyId}`.toLowerCase();
  if (row.rowType === "transport" && /mobilization|mobilisation|delivery|logistics/.test(text)) return "mobilization";
  if (row.rowType === "service" && /overhead|site_overhead|tax|quality_control/.test(text)) return "overhead";
  if (
    row.rowType === "work" ||
    row.rowType === "material" ||
    row.rowType === "labor" ||
    row.rowType === "service" ||
    row.rowType === "equipment" ||
    row.rowType === "transport"
  ) {
    return row.rowType as WorkPassportRowType;
  }
  return "service";
}

function priceItemTypeForCostRowType(rowType: ProfessionalCostRowType): ProfessionalPriceItemType {
  if (rowType === "material") return "material";
  if (rowType === "equipment") return "equipment";
  if (rowType === "transport" || rowType === "mobilization") return "transport";
  if (rowType === "service" || rowType === "overhead") return "service";
  return "labor";
}

function pricebookNomenclatureId(input: {
  normFamilyId: string;
  itemType: ProfessionalPriceItemType;
  unit: string;
}): string {
  return `${input.normFamilyId.trim()}|${input.itemType}|${input.unit.trim()}`;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function safeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42) || "record";
}

function familyFactor(normFamilyId: string): number {
  const bucket = hashText(normFamilyId) % 51;
  return (85 + bucket) / 100;
}

function baseUnitPrice(itemType: ProfessionalPriceItemType, unit: string): number {
  const key = `${itemType}:${unit}`;
  const table: Record<string, number> = {
    "material:m": 240,
    "material:lm": 260,
    "material:m2": 420,
    "material:m3": 1800,
    "material:pcs": 75,
    "material:set": 1200,
    "material:kg": 95,
    "material:t": 52000,
    "material:l": 180,
    "material:point": 650,
    "labor:m": 160,
    "labor:lm": 180,
    "labor:m2": 280,
    "labor:m3": 900,
    "labor:pcs": 650,
    "labor:set": 2500,
    "labor:kg": 45,
    "labor:point": 850,
    "labor:machine_hour": 350,
    "equipment:m2": 180,
    "equipment:pcs": 900,
    "equipment:set": 5000,
    "equipment:t": 1500,
    "equipment:trip": 5500,
    "equipment:machine_hour": 9500,
    "service:m": 90,
    "service:m2": 120,
    "service:m3": 300,
    "service:pcs": 500,
    "service:set": 3500,
    "service:trip": 4000,
    "service:point": 400,
    "service:machine_hour": 1000,
    "transport:set": 4500,
    "transport:trip": 5000,
    "transport:m3": 650,
    "transport:machine_hour": 2200,
  };
  return table[key] ?? 1000;
}

function sourceIdFor(itemType: ProfessionalPriceItemType): string {
  return `kg_preliminary_${itemType}_market_assumption_2026_07`;
}

function buildSources(): ProfessionalPriceSourceRecord[] {
  return (["material", "labor", "service", "equipment", "transport"] as ProfessionalPriceItemType[]).map((itemType) => ({
    sourceId: sourceIdFor(itemType),
    sourceType: "market_assumption",
    sourceLabel: `KG preliminary ${itemType} market assumption, internal costing governance metadata`,
    region: "KG",
    currency: "KGS",
    retrievedAt: RETRIEVED_AT,
    notes: "Preliminary-only internal market assumption. It may support preliminary cost coverage but never a contract total.",
  }));
}

function buildRecord(input: {
  row: PricebookCoverageRow & { normFamilyId: string };
  itemType: ProfessionalPriceItemType;
  unit: string;
}): ProfessionalPriceRecord {
  const nomenclatureId = pricebookNomenclatureId({
    normFamilyId: input.row.normFamilyId,
    itemType: input.itemType,
    unit: input.unit,
  });
  const hash = hashText(nomenclatureId).toString(16);
  const unitPrice = Math.round(baseUnitPrice(input.itemType, input.unit) * familyFactor(input.row.normFamilyId) * 100) / 100;
  return {
    priceId: `pb_${input.itemType}_${safeId(input.unit)}_${hash}`,
    nomenclatureId,
    itemType: input.itemType,
    name: input.row.titleRu,
    unit: input.unit,
    unitPrice,
    currency: "KGS",
    region: "KG",
    sourceId: sourceIdFor(input.itemType),
    sourceType: "market_assumption",
    sourceLabel: `${input.itemType} preliminary market assumption for ${input.row.normFamilyId}`,
    retrievedAt: RETRIEVED_AT,
    validFrom: VALID_FROM,
    trustLevel: "preliminary_only",
    notes: "Generated from explicit norm-family/type/unit coverage metadata; preliminary total only, contract total forbidden.",
  };
}

function addCoverageRow(
  byNomenclature: Map<string, ProfessionalPriceRecord>,
  row: PricebookCoverageRow,
): void {
  const normFamilyId = row.normFamilyId?.trim();
  if (!normFamilyId) return;
  const unit = normalizeCanonicalProfessionalBoqUnit(row.sourceUnit ?? row.unit);
  if (!unit) return;
  const itemType = priceItemTypeForCostRowType(costRowType(row));
  const nomenclatureId = pricebookNomenclatureId({
    normFamilyId,
    itemType,
    unit,
  });
  if (!byNomenclature.has(nomenclatureId)) {
    byNomenclature.set(nomenclatureId, buildRecord({ row: { ...row, normFamilyId }, itemType, unit }));
  }
}

function sortRecords(records: ProfessionalPriceRecord[]): ProfessionalPriceRecord[] {
  return [...records].sort((left, right) => left.nomenclatureId.localeCompare(right.nomenclatureId));
}

export function generateProfessionalPricebookData(): {
  recordsByType: Record<ProfessionalPriceItemType, ProfessionalPriceRecord[]>;
  sources: ProfessionalPriceSourceRecord[];
  recordsTotal: number;
} {
  const byNomenclature = new Map<string, ProfessionalPriceRecord>();
  const ids = listProfessionalWorkPassportTemplateIds();
  for (const [index, templateId] of ids.entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) continue;
    for (const row of passport.boqRecipe.allRows) {
      addCoverageRow(byNomenclature, row);
    }
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();
  for (const testCase of REAL_NAMED_BOQ_RUNTIME_CASES) {
    const revision = createEstimateDraftRevision({
      rawInput: testCase.prompt,
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    for (const row of revision.boq.rows) {
      if (row.rowType === "document" || row.rowType === "other") continue;
      addCoverageRow(byNomenclature, row);
    }
  }
  const recordsByType: Record<ProfessionalPriceItemType, ProfessionalPriceRecord[]> = {
    material: [],
    labor: [],
    service: [],
    equipment: [],
    transport: [],
  };
  for (const record of byNomenclature.values()) recordsByType[record.itemType].push(record);
  for (const itemType of Object.keys(recordsByType) as ProfessionalPriceItemType[]) {
    recordsByType[itemType] = sortRecords(recordsByType[itemType]);
  }
  return {
    recordsByType,
    sources: buildSources(),
    recordsTotal: byNomenclature.size,
  };
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/generateProfessionalPricebookData.ts")) {
  const generated = generateProfessionalPricebookData();
  mkdirSync(OUT_DIR, { recursive: true });
  writeJson(path.join(OUT_DIR, "material-prices.json"), { records: generated.recordsByType.material });
  writeJson(path.join(OUT_DIR, "labor-rates.json"), { records: generated.recordsByType.labor });
  writeJson(path.join(OUT_DIR, "equipment-rates.json"), { records: generated.recordsByType.equipment });
  writeJson(path.join(OUT_DIR, "service-rates.json"), { records: generated.recordsByType.service });
  writeJson(path.join(OUT_DIR, "transport-rates.json"), { records: generated.recordsByType.transport });
  writeJson(path.join(OUT_DIR, "price-sources.json"), { sources: generated.sources });
  console.log(JSON.stringify({
    pricebook_records: generated.recordsTotal,
    material: generated.recordsByType.material.length,
    labor: generated.recordsByType.labor.length,
    equipment: generated.recordsByType.equipment.length,
    service: generated.recordsByType.service.length,
    transport: generated.recordsByType.transport.length,
  }, null, 2));
}
