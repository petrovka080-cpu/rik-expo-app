import materialPricesJson from "../../../data/estimate/pricebook/material-prices.json";
import laborRatesJson from "../../../data/estimate/pricebook/labor-rates.json";
import equipmentRatesJson from "../../../data/estimate/pricebook/equipment-rates.json";
import serviceRatesJson from "../../../data/estimate/pricebook/service-rates.json";
import transportRatesJson from "../../../data/estimate/pricebook/transport-rates.json";
import priceSourcesJson from "../../../data/estimate/pricebook/price-sources.json";
import { normalizeCanonicalProfessionalBoqUnit } from "./canonicalUnits";
import type { ProfessionalCostRowType } from "./professionalCostingContract";
import type {
  ProfessionalPriceItemType,
  ProfessionalPriceRecord,
  ProfessionalPriceSourceDataFile,
  ProfessionalPriceSourceRecord,
  ProfessionalPricebookDataFile,
} from "./professionalPricebookContract";

type PricebookIndex = {
  records: ProfessionalPriceRecord[];
  sources: ProfessionalPriceSourceRecord[];
  byPriceId: Map<string, ProfessionalPriceRecord>;
  byNomenclatureId: Map<string, ProfessionalPriceRecord>;
  sourcesById: Map<string, ProfessionalPriceSourceRecord>;
};

let cachedIndex: PricebookIndex | null = null;

export function professionalPricebookItemTypeForCostRowType(
  rowType: ProfessionalCostRowType | string,
): ProfessionalPriceItemType {
  if (rowType === "material") return "material";
  if (rowType === "equipment") return "equipment";
  if (rowType === "transport" || rowType === "mobilization") return "transport";
  if (rowType === "service" || rowType === "overhead") return "service";
  return "labor";
}

export function professionalPricebookNomenclatureId(input: {
  normFamilyId: string;
  itemType: ProfessionalPriceItemType;
  unit: string;
}): string {
  const unit = normalizeCanonicalProfessionalBoqUnit(input.unit) ?? input.unit.trim();
  return `${input.normFamilyId.trim()}|${input.itemType}|${unit}`;
}

function dataRecords(file: unknown): ProfessionalPriceRecord[] {
  return (file as ProfessionalPricebookDataFile).records ?? [];
}

function sourceRecords(file: unknown): ProfessionalPriceSourceRecord[] {
  return (file as ProfessionalPriceSourceDataFile).sources ?? [];
}

export function loadProfessionalPricebookRecords(): ProfessionalPriceRecord[] {
  return [
    ...dataRecords(materialPricesJson),
    ...dataRecords(laborRatesJson),
    ...dataRecords(equipmentRatesJson),
    ...dataRecords(serviceRatesJson),
    ...dataRecords(transportRatesJson),
  ];
}

export function loadProfessionalPriceSources(): ProfessionalPriceSourceRecord[] {
  return sourceRecords(priceSourcesJson);
}

export function loadProfessionalPricebookIndex(): PricebookIndex {
  if (cachedIndex) return cachedIndex;
  const records = loadProfessionalPricebookRecords();
  const sources = loadProfessionalPriceSources();
  cachedIndex = {
    records,
    sources,
    byPriceId: new Map(records.map((record) => [record.priceId, record])),
    byNomenclatureId: new Map(records.map((record) => [record.nomenclatureId, record])),
    sourcesById: new Map(sources.map((source) => [source.sourceId, source])),
  };
  return cachedIndex;
}

export function clearProfessionalPricebookRegistryCache(): void {
  cachedIndex = null;
}

export function getProfessionalPriceSource(sourceId: string | null | undefined): ProfessionalPriceSourceRecord | null {
  if (!sourceId) return null;
  return loadProfessionalPricebookIndex().sourcesById.get(sourceId) ?? null;
}

export function resolveProfessionalPriceRecord(input: {
  nomenclatureId?: string | null;
  normFamilyId?: string | null;
  rowType: ProfessionalCostRowType | string;
  unit: string;
}): ProfessionalPriceRecord | null {
  const index = loadProfessionalPricebookIndex();
  if (input.nomenclatureId) {
    const explicit = index.byNomenclatureId.get(input.nomenclatureId);
    if (explicit) return explicit;
  }
  if (!input.normFamilyId?.trim()) return null;
  const itemType = professionalPricebookItemTypeForCostRowType(input.rowType);
  const nomenclatureId = professionalPricebookNomenclatureId({
    normFamilyId: input.normFamilyId,
    itemType,
    unit: input.unit,
  });
  return index.byNomenclatureId.get(nomenclatureId) ?? null;
}
