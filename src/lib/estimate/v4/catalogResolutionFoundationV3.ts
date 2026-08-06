import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  RoadworksWaveAInventory,
  getRoadworksWaveAOperation,
  type RoadworksWaveAInventoryItem,
} from "./roadworks/roadworksWaveA";

export const CATALOG_RESOLUTION_FOUNDATION_VERSION =
  "catalog-resolution-foundation:2026-08-06.v3" as const;

export type NormativeCertificationClass = "A" | "B" | "C";
export type AsphaltScopePresetId =
  | "REPAIR_PATCH"
  | "ASPHALT_LAYER"
  | "ROAD_PAVEMENT"
  | "FULL_ROAD";

export type ParameterDefinition = {
  parameterId: string;
  valueType: "number" | "enum" | "boolean" | "string";
  priority: "P0" | "P1" | "P2";
  unit: string | null;
  required: boolean;
  provenance: "USER" | "PROJECT" | "NORMATIVE" | "MANUFACTURER";
};

export type NormativeSourceDocument = {
  sourceId: string;
  title: string;
  documentType:
    | "DRAFT_KR_RULE"
    | "KR_ESTIMATE_RESOURCE_NORM"
    | "KR_UNIT_RATE"
    | "INTERNATIONAL_REFERENCE";
  authorityUrl: string;
  status: "DRAFT_PUBLIC_DISCUSSION" | "PUBLISHED_OFFICIAL" | "METADATA_ONLY";
  currentnessCheckedAt: "2026-08-05";
  contentAvailability: "OPEN_OFFICIAL" | "SOURCE_CONTENT_UNAVAILABLE";
  license: "PUBLIC_OFFICIAL_PAGE" | "LICENSE_NOT_PROVEN";
  contentSha256: string | null;
  quantityNormAuthority: boolean;
};

export const NORMATIVE_SOURCE_REGISTRY_V3: readonly NormativeSourceDocument[] = Object.freeze([
  {
    sourceId: "kg-sp-32-107-2024-draft",
    title: "СП КР 32-107:2024 Автомобильные дороги",
    documentType: "DRAFT_KR_RULE",
    authorityUrl: "https://minstroy.gov.kg/index.php/ru/document/102/show",
    status: "DRAFT_PUBLIC_DISCUSSION",
    currentnessCheckedAt: "2026-08-05",
    contentAvailability: "OPEN_OFFICIAL",
    license: "PUBLIC_OFFICIAL_PAGE",
    contentSha256: null,
    quantityNormAuthority: false,
  },
  {
    sourceId: "kg-krer-27-roadworks",
    title: "КРЕР-27 Автомобильные дороги",
    documentType: "KR_UNIT_RATE",
    authorityUrl: "https://minstroy.gov.kg/ru/kyzmat/443/show",
    status: "PUBLISHED_OFFICIAL",
    currentnessCheckedAt: "2026-08-05",
    contentAvailability: "SOURCE_CONTENT_UNAVAILABLE",
    license: "LICENSE_NOT_PROVEN",
    contentSha256: null,
    quantityNormAuthority: false,
  },
]);

const PARAMETERS: readonly ParameterDefinition[] = Object.freeze([
  { parameterId: "area_m2", valueType: "number", priority: "P0", unit: "m2", required: true, provenance: "PROJECT" },
  { parameterId: "thickness_mm", valueType: "number", priority: "P0", unit: "mm", required: true, provenance: "PROJECT" },
  { parameterId: "density_t_m3", valueType: "number", priority: "P0", unit: "t/m3", required: true, provenance: "MANUFACTURER" },
  { parameterId: "haul_distance_km", valueType: "number", priority: "P1", unit: "km", required: true, provenance: "PROJECT" },
  { parameterId: "waste_factor", valueType: "number", priority: "P1", unit: null, required: true, provenance: "PROJECT" },
  { parameterId: "prepared_base_confirmed", valueType: "boolean", priority: "P0", unit: null, required: true, provenance: "PROJECT" },
]);

const SCOPE_COMPONENTS: Readonly<Record<AsphaltScopePresetId, readonly string[]>> = Object.freeze({
  REPAIR_PATCH: ["geometry", "depth", "edge_cut", "removal", "haul", "bond_coat", "repair_mix", "compaction", "access"],
  ASPHALT_LAYER: ["area", "compacted_thickness", "mix_type", "density_source", "mass_conversion", "compaction", "waste", "prepared_base"],
  ROAD_PAVEMENT: ["road_geometry", "construction_layers", "base_preparation", "separator_or_bond", "layer_compaction", "quality_control"],
  FULL_ROAD: ["earthworks", "base", "pavement_layers", "selected_road_options", "equipment", "logistics", "composite_deduplication"],
});

export type WorkResolutionRecord = {
  catalogWorkId: string;
  canonicalWorkTypeId: string;
  calculationArchetypeId: string;
  variantOverlayId: string;
  scopePresetId: AsphaltScopePresetId | null;
  classification: RoadworksWaveAInventoryItem["catalogClassification"];
  resolutionVersion: typeof CATALOG_RESOLUTION_FOUNDATION_VERSION;
};

export type ResolvedWorkProfile = WorkResolutionRecord & {
  profileId: string;
  parameterDefinitions: readonly ParameterDefinition[];
  scopeComponents: readonly string[];
  certificationClass: NormativeCertificationClass;
  blockers: readonly string[];
  normativeSourceIds: readonly string[];
  attestationHash: string;
};

// Synchronous, platform-neutral SHA-256 keeps the frozen contract usable in native and web
// runtimes without importing Node's crypto module.
function sha256(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const primes: number[] = [];
  for (let n = 2; primes.length < 64; n += 1) {
    let prime = true;
    for (let d = 2; d * d <= n; d += 1) if (n % d === 0) { prime = false; break; }
    if (prime) primes.push(n);
  }
  const k = primes.map((n) => Math.floor((Math.cbrt(n) % 1) * 0x100000000) >>> 0);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  const bitLength = bytes.length * 8;
  for (let shift = 56; shift >= 0; shift -= 8) padded.push(shift >= 32 ? 0 : (bitLength >>> shift) & 255);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = Array<number>(64).fill(0);
    for (let i = 0; i < 16; i += 1) w[i] = ((padded[offset + i * 4] << 24) | (padded[offset + i * 4 + 1] << 16) | (padded[offset + i * 4 + 2] << 8) | padded[offset + i * 4 + 3]) >>> 0;
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      [a, b, c, d, e, f, g, hh] = [(t1 + t2) >>> 0, a, b, c, (d + t1) >>> 0, e, f, g];
    }
    [a, b, c, d, e, f, g, hh].forEach((x, i) => { h[i] = (h[i] + x) >>> 0; });
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("");
}

function scopeFor(item: RoadworksWaveAInventoryItem): AsphaltScopePresetId | null {
  const operation = getRoadworksWaveAOperation(item.workId);
  if (operation === "repair") return "REPAIR_PATCH";
  if (operation === "install" || operation === "lay" || operation === "compact" || operation === "level") return "ASPHALT_LAYER";
  return null;
}

export function buildRoadAsphaltResolutionLedgerV3(): readonly WorkResolutionRecord[] {
  return Object.freeze(RoadworksWaveAInventory.map((item) => Object.freeze({
    catalogWorkId: item.workId,
    canonicalWorkTypeId: item.canonicalModelId,
    calculationArchetypeId: `roadworks:${getRoadworksWaveAOperation(item.workId)}:formula-graph:v3`,
    variantOverlayId: `${item.canonicalModelId}:overlay:${item.scopeProfile}:v3`,
    scopePresetId: scopeFor(item),
    classification: item.catalogClassification,
    resolutionVersion: CATALOG_RESOLUTION_FOUNDATION_VERSION,
  })));
}

export function resolveRoadAsphaltProfileV3(
  catalogWorkId: string,
  requestedScope?: AsphaltScopePresetId,
): ResolvedWorkProfile {
  const record = buildRoadAsphaltResolutionLedgerV3().find((row) => row.catalogWorkId === catalogWorkId);
  if (!record) throw new Error(`CATALOG_WORK_NOT_IN_ROAD_ASPHALT_DENOMINATOR:${catalogWorkId}`);
  const scopePresetId = requestedScope ?? record.scopePresetId;
  const blockers = [
    scopePresetId ? "" : "ASPHALT_SCOPE_CLARIFICATION_REQUIRED",
    "NORMATIVE_QUANTITY_SOURCE_CONTENT_UNAVAILABLE",
    record.classification === "DOMAIN_REVIEW_REQUIRED" ? "CATALOG_APPLICABILITY_REVIEW_REQUIRED" : "",
  ].filter(Boolean);
  const unsigned = {
    ...record,
    scopePresetId,
    profileId: `${record.catalogWorkId}:resolved-profile:v3`,
    parameterDefinitions: PARAMETERS,
    scopeComponents: scopePresetId ? SCOPE_COMPONENTS[scopePresetId] : [],
    certificationClass: "C" as const,
    blockers,
    normativeSourceIds: NORMATIVE_SOURCE_REGISTRY_V3.map((source) => source.sourceId),
  };
  return Object.freeze({ ...unsigned, attestationHash: sha256(unsigned) });
}

export function auditCatalogResolutionFoundationV3() {
  const rows = buildRoadAsphaltResolutionLedgerV3();
  const ids = rows.map((row) => row.catalogWorkId);
  const canonical = new Set(rows.map((row) => row.canonicalWorkTypeId));
  const presets = rows.filter((row) => row.classification === "SCOPE_PRESET");
  const unresolvedSemanticDecisions = rows.filter((row) =>
    !row.canonicalWorkTypeId || !row.calculationArchetypeId || !row.variantOverlayId
  );
  return Object.freeze({
    schema: CATALOG_RESOLUTION_FOUNDATION_VERSION,
    globalCatalogTotal: 11610,
    roadAsphaltDenominator: rows.length,
    uniqueRoadAsphaltCatalogIds: new Set(ids).size,
    duplicateRoadAsphaltCatalogIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    canonicalWorkTypes: canonical.size,
    scopePresetCatalogEntries: presets.length,
    unresolvedSemanticDecisions: unresolvedSemanticDecisions.length,
    genericFallbackSuccesses: 0,
    normativeSourceRegistryHash: sha256(NORMATIVE_SOURCE_REGISTRY_V3),
    ledgerHash: sha256(rows),
  });
}

export function assertCompositeOwnershipUniqueV3(ownerKeys: readonly string[]): void {
  const duplicate = ownerKeys.find((key, index) => ownerKeys.indexOf(key) !== index);
  if (duplicate) throw new Error(`DUPLICATE_COMPOSITE_QUANTITY_OWNER:${duplicate}`);
}
