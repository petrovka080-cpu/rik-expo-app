import baseManifestJson from "../../../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedTemplatesJson from "../../../../data/estimate-catalog/expanded-complex/templates.json";

import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "./multiDomainReferencePassportsV4";

export type CatalogProfessionalCoverageStateV4 =
  | "DISTINCT_PROFESSIONAL_PASSPORT"
  | "SCOPE_PRESET"
  | "PARAMETERIZED_VARIANT"
  | "SEARCH_ALIAS"
  | "DOMAIN_REVIEW_REQUIRED";

export type CatalogProfessionalCoverageResolutionV4 =
  | "PROFESSIONAL_ESTIMATE"
  | "REQUIRED_INPUT_REQUEST";

export type CatalogProfessionalCoverageRowV4 = {
  catalogId: string;
  catalogKind: "base_10000" | "expanded_complex_1610";
  state: CatalogProfessionalCoverageStateV4;
  semanticOwnerId: string;
  canonicalCatalogId: string | null;
  referencePassportCatalogWorkId: string | null;
  resolution: CatalogProfessionalCoverageResolutionV4;
  requiredInputs: readonly string[];
  reason: string;
  sourceBinding: string;
};

export type CatalogProfessionalCoverageLedgerV4 = {
  schema: "catalog-professional-coverage-ledger-v4";
  catalogTotal: 11610;
  rows: readonly CatalogProfessionalCoverageRowV4[];
  counts: Readonly<Record<CatalogProfessionalCoverageStateV4, number>>;
  unclassifiedCatalogIds: readonly string[];
  duplicateCatalogIds: readonly string[];
  brokenCanonicalTargets: readonly string[];
  referencePassportBindingsTotal: number;
  checksum: string;
};

type BaseManifestRow = {
  work_key: string;
  template_id: string;
  category: string;
  work_family_id: string;
  localized_name_ru: string;
};

type ExpandedTemplateRow = {
  template_id: string;
  work_family_id: string;
  template_level:
    | "ROM_CONCEPT"
    | "PRELIMINARY_BOQ"
    | "DETAILED_BOQ_FROM_DRAWINGS"
    | "TENDER_BOQ"
    | "AS_BUILT_ESTIMATE";
  requiredInputs: string[];
};

const baseRows = (baseManifestJson as { templates: BaseManifestRow[] }).templates;
const expandedRows = expandedTemplatesJson as ExpandedTemplateRow[];

const SCOPE_SUFFIXES = [
  "small_area",
  "large_area",
  "wet_zone",
  "technical_room",
] as const;

const REFERENCE_PASSPORT_CATALOG_BINDINGS = {
  building_structure_demolition: "demolition_interior_partition_remove_standard",
  trench_excavation: "earthworks_interior_trench_excavate_standard",
  strip_foundation: "concrete_foundation_interior_strip_foundation_pour_standard",
  monolithic_slab_concreting: "concrete_foundation_interior_concrete_slab_pour_standard",
  masonry_wall: "masonry_interior_brick_wall_lay_standard",
  wall_plaster: "plaster_paint_interior_wall_plaster_apply_standard",
  roll_roofing: "roofing_interior_soft_roof_install_standard",
  water_pipe_installation: "plumbing_interior_water_pipe_install_standard",
  sewer_pipe_installation: "plumbing_interior_sewer_install_standard",
  power_cable_laying: "electrical_interior_power_cable_lay_standard",
  heating_appliance_installation: "heating_hvac_interior_radiator_install_standard",
  asphalt_pavement: "paving_roads_landscape_interior_asphalt_lay_standard",
} as const satisfies Record<string, string>;

const referencePassportByCatalogId = new Map<string, string>(
  Object.entries(REFERENCE_PASSPORT_CATALOG_BINDINGS)
    .map(([referencePassportCatalogWorkId, catalogId]) => [
      catalogId,
      referencePassportCatalogWorkId,
    ] as const),
);

const baseCatalogIds = new Set(baseRows.map((row) => row.work_key));
const expandedCatalogIds = new Set(
  expandedRows.map((row) => `expanded-template:${row.template_id}`),
);
const allCatalogIds = new Set([...baseCatalogIds, ...expandedCatalogIds]);

const detailedExpandedOwnerByFamily = new Map(
  expandedRows
    .filter((row) => row.template_level === "DETAILED_BOQ_FROM_DRAWINGS")
    .map((row) => [
      row.work_family_id,
      `expanded-template:${row.template_id}`,
    ] as const),
);

function scopePresetOwner(workKey: string): string | null {
  for (const suffix of SCOPE_SUFFIXES) {
    const marker = `_${suffix}`;
    if (!workKey.endsWith(marker)) continue;
    const candidate = `${workKey.slice(0, -marker.length)}_standard`;
    return baseCatalogIds.has(candidate) ? candidate : null;
  }
  return null;
}

function baseCoverageRow(row: BaseManifestRow): CatalogProfessionalCoverageRowV4 {
  const referencePassportCatalogWorkId = referencePassportByCatalogId.get(row.work_key) ?? null;
  if (referencePassportCatalogWorkId) {
    return {
      catalogId: row.work_key,
      catalogKind: "base_10000",
      state: "DISTINCT_PROFESSIONAL_PASSPORT",
      semanticOwnerId: `multi-domain-reference-passport:v4:${referencePassportCatalogWorkId}`,
      canonicalCatalogId: row.work_key,
      referencePassportCatalogWorkId,
      resolution: "PROFESSIONAL_ESTIMATE",
      requiredInputs: [],
      reason: "Curated reference passport has an independent formula graph, decomposed resources, P0/P1/P2 inputs, source bindings, goldens and product projection.",
      sourceBinding: `multiDomainReferencePassportsV4:${referencePassportCatalogWorkId}`,
    };
  }

  const presetOwner = scopePresetOwner(row.work_key);
  if (presetOwner) {
    return {
      catalogId: row.work_key,
      catalogKind: "base_10000",
      state: "SCOPE_PRESET",
      semanticOwnerId: `catalog-scope-owner:v4:${presetOwner}`,
      canonicalCatalogId: presetOwner,
      referencePassportCatalogWorkId: null,
      resolution: "REQUIRED_INPUT_REQUEST",
      requiredInputs: ["quantity", "unit", "scope_modifier_confirmation"],
      reason: "The catalog record changes a declared scope modifier but does not yet prove an independent professional passport.",
      sourceBinding: `estimate-10000-readiness-manifest:${row.template_id}`,
    };
  }

  return {
    catalogId: row.work_key,
    catalogKind: "base_10000",
    state: "DOMAIN_REVIEW_REQUIRED",
    semanticOwnerId: `domain-review:v4:${row.category}:${row.work_key}`,
    canonicalCatalogId: null,
    referencePassportCatalogWorkId: null,
    resolution: "REQUIRED_INPUT_REQUEST",
    requiredInputs: ["quantity", "unit", "scope_confirmation", "domain_expert_review"],
    reason: "The record is technically implemented, but independent professional-passport ownership and normative applicability are not yet proven.",
    sourceBinding: `estimate-10000-readiness-manifest:${row.template_id}`,
  };
}

function expandedCoverageRow(row: ExpandedTemplateRow): CatalogProfessionalCoverageRowV4 {
  const catalogId = `expanded-template:${row.template_id}`;
  const detailedOwner = detailedExpandedOwnerByFamily.get(row.work_family_id) ?? null;
  if (row.template_level !== "DETAILED_BOQ_FROM_DRAWINGS" && detailedOwner) {
    return {
      catalogId,
      catalogKind: "expanded_complex_1610",
      state: "PARAMETERIZED_VARIANT",
      semanticOwnerId: `expanded-family-owner:v4:${row.work_family_id}`,
      canonicalCatalogId: detailedOwner,
      referencePassportCatalogWorkId: null,
      resolution: "REQUIRED_INPUT_REQUEST",
      requiredInputs: [
        ...new Set([
          ...row.requiredInputs,
          "estimate_level",
          "quantity_and_units",
          row.template_level === "ROM_CONCEPT" ? "concept_scope" : "supporting_project_inputs",
        ]),
      ],
      reason: "The record is an estimate-level projection of one expanded family; it is not counted as a separate professional passport.",
      sourceBinding: `expanded-complex/templates.json:${row.template_id}`,
    };
  }

  return {
    catalogId,
    catalogKind: "expanded_complex_1610",
    state: "DOMAIN_REVIEW_REQUIRED",
    semanticOwnerId: `domain-review:v4:expanded-family:${row.work_family_id}`,
    canonicalCatalogId: null,
    referencePassportCatalogWorkId: null,
    resolution: "REQUIRED_INPUT_REQUEST",
    requiredInputs: [
      ...new Set([
        ...row.requiredInputs,
        "quantity_and_units",
        "drawings_or_scope_basis",
        "domain_expert_review",
      ]),
    ],
    reason: "The family anchor is retained for deterministic routing, but source-backed professional ownership still requires domain review.",
    sourceBinding: `expanded-complex/templates.json:${row.template_id}`,
  };
}

function stableChecksum(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function countStates(
  rows: readonly CatalogProfessionalCoverageRowV4[],
): Record<CatalogProfessionalCoverageStateV4, number> {
  const counts: Record<CatalogProfessionalCoverageStateV4, number> = {
    DISTINCT_PROFESSIONAL_PASSPORT: 0,
    SCOPE_PRESET: 0,
    PARAMETERIZED_VARIANT: 0,
    SEARCH_ALIAS: 0,
    DOMAIN_REVIEW_REQUIRED: 0,
  };
  for (const row of rows) counts[row.state] += 1;
  return counts;
}

let cachedLedger: CatalogProfessionalCoverageLedgerV4 | null = null;

export function buildCatalogProfessionalCoverageLedgerV4(): CatalogProfessionalCoverageLedgerV4 {
  if (cachedLedger) return cachedLedger;
  const rows = [
    ...baseRows.map(baseCoverageRow),
    ...expandedRows.map(expandedCoverageRow),
  ];
  const seen = new Set<string>();
  const duplicateCatalogIds: string[] = [];
  for (const row of rows) {
    if (seen.has(row.catalogId)) duplicateCatalogIds.push(row.catalogId);
    seen.add(row.catalogId);
  }
  const brokenCanonicalTargets = rows
    .filter((row) => row.canonicalCatalogId && !allCatalogIds.has(row.canonicalCatalogId))
    .map((row) => row.catalogId);
  const states = new Set<CatalogProfessionalCoverageStateV4>([
    "DISTINCT_PROFESSIONAL_PASSPORT",
    "SCOPE_PRESET",
    "PARAMETERIZED_VARIANT",
    "SEARCH_ALIAS",
    "DOMAIN_REVIEW_REQUIRED",
  ]);
  const unclassifiedCatalogIds = rows
    .filter((row) => !states.has(row.state))
    .map((row) => row.catalogId);
  const counts = countStates(rows);
  const checksum = stableChecksum(rows.map((row) => [
    row.catalogId,
    row.state,
    row.semanticOwnerId,
    row.canonicalCatalogId,
    row.referencePassportCatalogWorkId,
    row.resolution,
    row.requiredInputs,
  ]));
  cachedLedger = Object.freeze({
    schema: "catalog-professional-coverage-ledger-v4",
    catalogTotal: 11610,
    rows: Object.freeze(rows),
    counts: Object.freeze(counts),
    unclassifiedCatalogIds: Object.freeze(unclassifiedCatalogIds),
    duplicateCatalogIds: Object.freeze(duplicateCatalogIds),
    brokenCanonicalTargets: Object.freeze(brokenCanonicalTargets),
    referencePassportBindingsTotal: referencePassportByCatalogId.size,
    checksum,
  });
  return cachedLedger;
}

export function resolveCatalogProfessionalCoverageV4(
  catalogId: string,
): CatalogProfessionalCoverageRowV4 | null {
  return buildCatalogProfessionalCoverageLedgerV4().rows.find((row) => row.catalogId === catalogId) ?? null;
}

export function validateReferencePassportCatalogBindingsV4(): string[] {
  const passportIds = new Set(
    MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map((passport) => passport.catalogWorkId),
  );
  return Object.entries(REFERENCE_PASSPORT_CATALOG_BINDINGS)
    .flatMap(([passportId, catalogId]) => [
      passportIds.has(passportId) ? "" : `REFERENCE_PASSPORT_MISSING:${passportId}`,
      baseCatalogIds.has(catalogId) ? "" : `CATALOG_BINDING_MISSING:${catalogId}`,
    ])
    .filter(Boolean);
}
