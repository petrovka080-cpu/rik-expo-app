import baseManifestJson from "../../../../../../data/estimate-templates/estimate-10000-readiness-manifest.json";

import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { ProfessionalCatalogBindingV1 } from "../../domainFactory";
import { INTERIOR_FINISHES_WAVE_1_INVENTORY } from "../interiorFinishesWave1";

export const INTERIOR_FINISHES_COMPLETE_DOMAIN_ID = "interior_finishes" as const;
export const INTERIOR_FINISHES_COMPLETE_DOMAIN_VERSION = "1.0.0" as const;
export const INTERIOR_FINISHES_COMPLETE_RECORD_COUNT = 2_250 as const;
export const INTERIOR_FINISHES_COMPLETE_WAVE1_COUNT = 84 as const;

export const INTERIOR_FINISHES_OWNED_SOURCE_DOMAINS = Object.freeze([
  "plaster_paint",
  "drywall_ceiling",
  "flooring",
  "tile_stone",
] as const);

export type InteriorFinishesOwnedSourceDomain =
  typeof INTERIOR_FINISHES_OWNED_SOURCE_DOMAINS[number];

export const INTERIOR_FINISHES_SCOPE_CAPABILITIES = Object.freeze([
  "standard",
  "small_area",
  "large_area",
  "wet_zone",
  "technical_room",
  "high_load",
  "repair",
] as const);

export type InteriorFinishesScopeCapability =
  typeof INTERIOR_FINISHES_SCOPE_CAPABILITIES[number];

type BaseManifestRow = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  calculator_family_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  unit_policy_id: string;
  category: string;
  work_type: string;
  localized_name_ru: string;
};

export type InteriorFinishesDomainInventoryRow = BaseManifestRow & {
  catalog_id: string;
  source_domain_id: InteriorFinishesOwnedSourceDomain;
  scope_capability: InteriorFinishesScopeCapability;
  canonical_technology_id: string;
  wave1_status: "WAVE_1_REFERENCE" | "COMPLETE_DOMAIN_NEW";
  record_role: "PRIMARY";
  equivalence_group_id: null;
  source_hash: string;
};

const wave1ByCatalogId = new Map(INTERIOR_FINISHES_WAVE_1_INVENTORY.map((row) => [row.catalog_id, row]));

export function interiorFinishesScopeOf(workKey: string): InteriorFinishesScopeCapability {
  const scope = INTERIOR_FINISHES_SCOPE_CAPABILITIES.find((candidate) => workKey.endsWith(`_${candidate}`));
  if (!scope) throw new Error(`INTERIOR_FINISHES_SCOPE_UNRECOGNIZED:${workKey}`);
  return scope;
}

export function interiorFinishesCompleteTechnologyId(workKey: string): string {
  return wave1ByCatalogId.get(workKey)?.canonical_technology_id ??
    `${INTERIOR_FINISHES_COMPLETE_DOMAIN_ID}:technology:${workKey}`;
}

const sourceRows = (baseManifestJson as { templates: BaseManifestRow[] }).templates
  .filter((row): row is BaseManifestRow & { category: InteriorFinishesOwnedSourceDomain } =>
    INTERIOR_FINISHES_OWNED_SOURCE_DOMAINS.includes(row.category as InteriorFinishesOwnedSourceDomain))
  .sort((left, right) => left.work_key.localeCompare(right.work_key));

export const INTERIOR_FINISHES_DOMAIN_INVENTORY: readonly InteriorFinishesDomainInventoryRow[] = Object.freeze(
  sourceRows.map((row) => {
    const wave1 = wave1ByCatalogId.get(row.work_key);
    const withoutHash = {
      ...row,
      catalog_id: row.work_key,
      source_domain_id: row.category,
      scope_capability: interiorFinishesScopeOf(row.work_key),
      canonical_technology_id: interiorFinishesCompleteTechnologyId(row.work_key),
      wave1_status: wave1 ? "WAVE_1_REFERENCE" as const : "COMPLETE_DOMAIN_NEW" as const,
      record_role: "PRIMARY" as const,
      equivalence_group_id: null,
    };
    return { ...withoutHash, source_hash: estimateDeterministicHash(withoutHash) };
  }),
);

export const INTERIOR_FINISHES_NEW_INVENTORY = Object.freeze(
  INTERIOR_FINISHES_DOMAIN_INVENTORY.filter((row) => row.wave1_status === "COMPLETE_DOMAIN_NEW"),
);

export const INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS: readonly ProfessionalCatalogBindingV1[] = Object.freeze(
  INTERIOR_FINISHES_DOMAIN_INVENTORY.map((row) => ({
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    canonical_technology_id: row.canonical_technology_id,
    scope_capability: row.scope_capability,
    alias_of: null,
    exact_identity_required: true as const,
  })),
);

const domainCounts = Object.fromEntries(INTERIOR_FINISHES_OWNED_SOURCE_DOMAINS.map((domainId) => [
  domainId,
  INTERIOR_FINISHES_DOMAIN_INVENTORY.filter((row) => row.source_domain_id === domainId).length,
]));

if (
  INTERIOR_FINISHES_DOMAIN_INVENTORY.length !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT ||
  INTERIOR_FINISHES_NEW_INVENTORY.length !== 2_166 ||
  wave1ByCatalogId.size !== INTERIOR_FINISHES_COMPLETE_WAVE1_COUNT ||
  domainCounts.plaster_paint !== 650 ||
  domainCounts.drywall_ceiling !== 500 ||
  domainCounts.flooring !== 600 ||
  domainCounts.tile_stone !== 500
) {
  throw new Error(`INTERIOR_FINISHES_DENOMINATOR_MISMATCH:${JSON.stringify(domainCounts)}`);
}

if (new Set(INTERIOR_FINISHES_DOMAIN_INVENTORY.map((row) => row.catalog_id)).size !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT) {
  throw new Error("INTERIOR_FINISHES_DUPLICATE_CATALOG_ID");
}

if (new Set(INTERIOR_FINISHES_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT) {
  throw new Error("INTERIOR_FINISHES_UNPROVEN_FAN_IN");
}
