import baseManifestJson from "../../../../../../data/estimate-templates/estimate-10000-readiness-manifest.json";

import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { ProfessionalCatalogBindingV1 } from "../../domainFactory";

type BaseManifestRow = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  category: string;
  work_type: string;
  localized_name_ru: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  unit_policy_id: string;
};

export const INTERIOR_FINISHES_WAVE_1_DOMAIN_ID = "interior_finishes_wave_1" as const;

export const INTERIOR_FINISHES_WAVE_1_SCOPE_CAPABILITIES = [
  "standard",
  "small_area",
  "large_area",
  "wet_zone",
  "technical_room",
  "high_load",
  "repair",
] as const;

export type InteriorFinishesWave1ScopeCapability =
  typeof INTERIOR_FINISHES_WAVE_1_SCOPE_CAPABILITIES[number];

const rows = (baseManifestJson as { templates: BaseManifestRow[] }).templates
  .filter((row) => row.category === "plaster_paint" && row.work_type === "apply")
  .sort((left, right) => left.work_key.localeCompare(right.work_key));

export function interiorWave1ScopeOf(workKey: string): InteriorFinishesWave1ScopeCapability {
  const scope = INTERIOR_FINISHES_WAVE_1_SCOPE_CAPABILITIES.find((candidate) => workKey.endsWith(`_${candidate}`));
  if (!scope) throw new Error(`INTERIOR_WAVE1_SCOPE_UNRECOGNIZED:${workKey}`);
  return scope;
}

export function canonicalBaseWorkKey(workKey: string): string {
  const scope = interiorWave1ScopeOf(workKey);
  return workKey.slice(0, -(scope.length + 1));
}

export function interiorWave1TechnologyId(workKey: string): string {
  return `${INTERIOR_FINISHES_WAVE_1_DOMAIN_ID}:technology:${workKey}`;
}

export type InteriorFinishesWave1InventoryRow = BaseManifestRow & {
  catalog_id: string;
  scope_capability: InteriorFinishesWave1ScopeCapability;
  canonical_technology_id: string;
  source_hash: string;
};

export const INTERIOR_FINISHES_WAVE_1_INVENTORY: readonly InteriorFinishesWave1InventoryRow[] = Object.freeze(
  rows.map((row) => ({
    ...row,
    catalog_id: row.work_key,
    scope_capability: interiorWave1ScopeOf(row.work_key),
    canonical_technology_id: interiorWave1TechnologyId(row.work_key),
    source_hash: estimateDeterministicHash(row),
  })),
);

if (INTERIOR_FINISHES_WAVE_1_INVENTORY.length !== 84) {
  throw new Error(`INTERIOR_WAVE1_DENOMINATOR_MISMATCH:${INTERIOR_FINISHES_WAVE_1_INVENTORY.length}`);
}

export const INTERIOR_FINISHES_WAVE_1_CANONICAL_TECHNOLOGY_IDS: readonly string[] = Object.freeze(
  [...new Set(INTERIOR_FINISHES_WAVE_1_INVENTORY.map((row) => row.canonical_technology_id))].sort(),
);

if (INTERIOR_FINISHES_WAVE_1_CANONICAL_TECHNOLOGY_IDS.length !== 84) {
  throw new Error(`INTERIOR_WAVE1_TECHNOLOGY_DENOMINATOR_MISMATCH:${INTERIOR_FINISHES_WAVE_1_CANONICAL_TECHNOLOGY_IDS.length}`);
}

export const INTERIOR_FINISHES_WAVE_1_CATALOG_BINDINGS: readonly ProfessionalCatalogBindingV1[] = Object.freeze(
  INTERIOR_FINISHES_WAVE_1_INVENTORY.map((row) => ({
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    canonical_technology_id: row.canonical_technology_id,
    scope_capability: row.scope_capability,
    alias_of: null,
    exact_identity_required: true as const,
  })),
);
