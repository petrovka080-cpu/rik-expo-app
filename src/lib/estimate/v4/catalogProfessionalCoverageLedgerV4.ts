import baseManifestJson from "../../../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedTemplatesJson from "../../../../data/estimate-catalog/expanded-complex/templates.json";

import { estimateDeterministicHash } from "../estimateDeterministicHash";
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

export const ESTIMATE_SCALE_FOUNDATION_SCHEMA =
  "estimate-scale-foundation-readiness:2026-07-29.v1" as const;
export const ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS = 11610 as const;
export const ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS = {
  workPassport: "work-passport-registry:2026-07-29.v1",
  canonicalParameterSchema: "canonical-parameter-schema-registry:2026-07-29.v1",
  familyCalculator: "family-calculator-registry:2026-07-29.v1",
  formulaGraph: "formula-graph-registry:2026-07-29.v1",
  normativeSource: "normative-source-registry:2026-07-29.v1",
  pricePolicy: "price-policy-registry:2026-07-29.v1",
  readinessLedger: ESTIMATE_SCALE_FOUNDATION_SCHEMA,
  deterministicCompiler: "deterministic-estimate-compiler:2026-07-29.v1",
  validator: "estimate-scale-readiness-validator:2026-07-29.v1",
  rollback: "estimate-scale-rollback-contract:2026-07-29.v1",
  revisionCompatibility: "estimate-scale-revision-compatibility:2026-07-29.v1",
} as const;
export const ESTIMATE_SCALE_FOUNDATION_REQUIRED_AUDITS = [
  "full11610WorkOutputAudit",
  "full11610TrustedCostingAudit",
  "full11610RealNamedBoqAudit",
  "full11610MaterialQuantityAccuracyAudit",
  "full11610MaterialCompletenessAudit",
] as const;

export type EstimateScaleFoundationAuditId =
  (typeof ESTIMATE_SCALE_FOUNDATION_REQUIRED_AUDITS)[number];

export type EstimateScaleFoundationAuditEvidence = {
  auditId: EstimateScaleFoundationAuditId;
  sourceSha: string;
  finalStatus: string;
  summaryPath: string;
  ledgerPath: string;
};

export type EstimateScaleReadinessLevel =
  | "L0_CATALOG_ONLY"
  | "L1_IDENTIFIED"
  | "L2_PARAMETERIZED"
  | "L3_QUANTITY_READY"
  | "L4_COST_READY"
  | "L5_NORMATIVELY_VERIFIED";

export type EstimateScaleFoundationWorkProof = {
  workId: string;
  catalogPresent: boolean;
  passportId: string | null;
  passportVersion: string | null;
  parameterSchemaId: string | null;
  familyCalculatorId: string | null;
  formulaGraphVersion: string | null;
  normativeSourceIds: readonly string[];
  pricePolicyId: string | null;
  deterministicCompilerVersion: string | null;
  validatorVersion: string | null;
  quantityOutputReady: boolean;
  realNamedBoqReady: boolean;
  materialQuantityReady: boolean;
  materialCompletenessReady: boolean;
  trustedCostingReady: boolean;
  contractTotalEvidenceReady: boolean;
  procurementEvidenceReady: boolean;
  normativelyExpertVerified: boolean;
  rollbackCompatible: boolean;
  revisionCompatible: boolean;
  claimedProfessionalEstimateReady: boolean;
  claimedContractCostReady: boolean;
  blockers: readonly string[];
};

export type EstimateScaleFoundationReadinessRow = {
  workId: string;
  readinessLevel: EstimateScaleReadinessLevel;
  passportId: string | null;
  passportVersion: string | null;
  parameterSchemaId: string | null;
  familyCalculatorId: string | null;
  formulaGraphVersion: string | null;
  normativeSourceIds: readonly string[];
  pricePolicyId: string | null;
  deterministicCompilerVersion: string | null;
  validatorVersion: string | null;
  professionalEstimateAllowed: boolean;
  contractTotalAllowed: boolean;
  procurementAllowed: boolean;
  quarantined: boolean;
  quarantineReasons: readonly string[];
  rollbackCompatible: boolean;
  revisionCompatible: boolean;
  checksum: string;
};

export type EstimateScaleFoundationManifest = {
  schema: typeof ESTIMATE_SCALE_FOUNDATION_SCHEMA;
  sourceSha: string;
  generatedAt: string;
  expectedWorkTotal: number;
  workTotal: number;
  uniqueWorkTotal: number;
  duplicateWorkIds: readonly string[];
  readinessCounts: Readonly<Record<EstimateScaleReadinessLevel, number>>;
  registryCounts: {
    workPassport: number;
    canonicalParameterSchema: number;
    familyCalculator: number;
    formulaGraph: number;
    normativeSource: number;
    pricePolicy: number;
    deterministicCompiler: number;
    validator: number;
    rollbackCompatible: number;
    revisionCompatible: number;
  };
  registryVersions: typeof ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS;
  auditEvidence: readonly EstimateScaleFoundationAuditEvidence[];
  quarantinedWorkCount: number;
  falseReadyCount: number;
  group01Started: false;
  groupOnboardingContract: {
    requiresExplicitGroupManifest: true;
    requiresIndependentGoldenFixtures: true;
    requiresDomainExpertApprovalForL5: true;
    massAutoPromotionForbidden: true;
  };
  admissionReadyForGroup01: boolean;
  blockers: readonly string[];
  rows: readonly EstimateScaleFoundationReadinessRow[];
  checksum: string;
};

const LEVEL_ORDER: readonly EstimateScaleReadinessLevel[] = [
  "L0_CATALOG_ONLY",
  "L1_IDENTIFIED",
  "L2_PARAMETERIZED",
  "L3_QUANTITY_READY",
  "L4_COST_READY",
  "L5_NORMATIVELY_VERIFIED",
];

function hasText(value: string | null): value is string {
  return Boolean(value?.trim());
}

function readinessLevel(
  proof: EstimateScaleFoundationWorkProof,
): EstimateScaleReadinessLevel {
  let level: EstimateScaleReadinessLevel = "L0_CATALOG_ONLY";
  const identified =
    proof.catalogPresent &&
    hasText(proof.passportId) &&
    hasText(proof.passportVersion);
  if (!identified) return level;
  level = "L1_IDENTIFIED";

  const parameterized =
    hasText(proof.parameterSchemaId) &&
    hasText(proof.familyCalculatorId) &&
    hasText(proof.formulaGraphVersion) &&
    hasText(proof.deterministicCompilerVersion) &&
    hasText(proof.validatorVersion);
  if (!parameterized) return level;
  level = "L2_PARAMETERIZED";

  const quantityReady =
    proof.quantityOutputReady &&
    proof.realNamedBoqReady &&
    proof.materialQuantityReady &&
    proof.materialCompletenessReady;
  if (!quantityReady) return level;
  level = "L3_QUANTITY_READY";

  if (!proof.trustedCostingReady || !hasText(proof.pricePolicyId)) return level;
  level = "L4_COST_READY";

  if (
    !proof.normativelyExpertVerified ||
    proof.normativeSourceIds.length === 0
  ) {
    return level;
  }
  return "L5_NORMATIVELY_VERIFIED";
}

function atLeast(
  value: EstimateScaleReadinessLevel,
  minimum: EstimateScaleReadinessLevel,
): boolean {
  return LEVEL_ORDER.indexOf(value) >= LEVEL_ORDER.indexOf(minimum);
}

function readinessRow(
  proof: EstimateScaleFoundationWorkProof,
): EstimateScaleFoundationReadinessRow {
  const level = readinessLevel(proof);
  const falseProfessionalReady =
    proof.claimedProfessionalEstimateReady &&
    !atLeast(level, "L3_QUANTITY_READY");
  const falseContractReady =
    proof.claimedContractCostReady &&
    (!atLeast(level, "L4_COST_READY") ||
      !proof.contractTotalEvidenceReady);
  const quarantineReasons = [
    ...proof.blockers,
    proof.catalogPresent ? "" : "catalog_record_missing",
    proof.rollbackCompatible ? "" : "rollback_compatibility_missing",
    proof.revisionCompatible ? "" : "revision_compatibility_missing",
    falseProfessionalReady ? "false_professional_ready_claim" : "",
    falseContractReady ? "false_contract_cost_ready_claim" : "",
    atLeast(level, "L3_QUANTITY_READY")
      ? ""
      : `readiness_below_quantity_ready:${level}`,
  ].filter(Boolean);
  const professionalEstimateAllowed =
    atLeast(level, "L3_QUANTITY_READY") &&
    !falseProfessionalReady;
  const contractTotalAllowed =
    atLeast(level, "L4_COST_READY") &&
    proof.contractTotalEvidenceReady &&
    !falseContractReady;
  const procurementAllowed =
    atLeast(level, "L4_COST_READY") &&
    proof.procurementEvidenceReady &&
    !falseContractReady;
  const rowWithoutChecksum = {
    workId: proof.workId,
    readinessLevel: level,
    passportId: proof.passportId,
    passportVersion: proof.passportVersion,
    parameterSchemaId: proof.parameterSchemaId,
    familyCalculatorId: proof.familyCalculatorId,
    formulaGraphVersion: proof.formulaGraphVersion,
    normativeSourceIds: [...new Set(proof.normativeSourceIds)].sort(),
    pricePolicyId: proof.pricePolicyId,
    deterministicCompilerVersion: proof.deterministicCompilerVersion,
    validatorVersion: proof.validatorVersion,
    professionalEstimateAllowed,
    contractTotalAllowed,
    procurementAllowed,
    quarantined: quarantineReasons.length > 0,
    quarantineReasons,
    rollbackCompatible: proof.rollbackCompatible,
    revisionCompatible: proof.revisionCompatible,
  };
  return {
    ...rowWithoutChecksum,
    checksum: estimateDeterministicHash(rowWithoutChecksum),
  };
}

function duplicateIds(
  proofs: readonly EstimateScaleFoundationWorkProof[],
): string[] {
  const counts = new Map<string, number>();
  for (const proof of proofs) {
    counts.set(proof.workId, (counts.get(proof.workId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([workId]) => workId)
    .sort();
}

export function buildEstimateScaleFoundationManifest(input: {
  sourceSha: string;
  generatedAt: string;
  proofs: readonly EstimateScaleFoundationWorkProof[];
  auditEvidence?: readonly EstimateScaleFoundationAuditEvidence[];
  expectedWorkTotal?: number;
}): EstimateScaleFoundationManifest {
  const expectedWorkTotal =
    input.expectedWorkTotal ?? ESTIMATE_SCALE_FOUNDATION_EXPECTED_WORKS;
  const rows = input.proofs.map(readinessRow);
  const duplicateWorkIds = duplicateIds(input.proofs);
  const uniqueWorkTotal = new Set(input.proofs.map((proof) => proof.workId)).size;
  const readinessCounts = Object.fromEntries(
    LEVEL_ORDER.map((level) => [
      level,
      rows.filter((row) => row.readinessLevel === level).length,
    ]),
  ) as Record<EstimateScaleReadinessLevel, number>;
  const falseReadyCount = rows.filter((row) =>
    row.quarantineReasons.some((reason) => reason.startsWith("false_"))
  ).length;
  const registryCounts = {
    workPassport: rows.filter((row) => hasText(row.passportId)).length,
    canonicalParameterSchema: rows.filter((row) =>
      hasText(row.parameterSchemaId)
    ).length,
    familyCalculator: rows.filter((row) =>
      hasText(row.familyCalculatorId)
    ).length,
    formulaGraph: rows.filter((row) =>
      hasText(row.formulaGraphVersion)
    ).length,
    normativeSource: rows.filter((row) =>
      row.normativeSourceIds.length > 0
    ).length,
    pricePolicy: rows.filter((row) => hasText(row.pricePolicyId)).length,
    deterministicCompiler: rows.filter((row) =>
      hasText(row.deterministicCompilerVersion)
    ).length,
    validator: rows.filter((row) => hasText(row.validatorVersion)).length,
    rollbackCompatible: rows.filter((row) => row.rollbackCompatible).length,
    revisionCompatible: rows.filter((row) => row.revisionCompatible).length,
  };
  const auditEvidence = [...(input.auditEvidence ?? [])]
    .sort((left, right) => left.auditId.localeCompare(right.auditId));
  const evidenceByAudit = new Map(
    auditEvidence.map((evidence) => [evidence.auditId, evidence]),
  );
  const missingAuditEvidence =
    ESTIMATE_SCALE_FOUNDATION_REQUIRED_AUDITS.filter(
      (auditId) => !evidenceByAudit.has(auditId),
    );
  const wrongShaAuditEvidence = auditEvidence.filter(
    (evidence) => evidence.sourceSha !== input.sourceSha,
  );
  const nonGreenAuditEvidence = auditEvidence.filter(
    (evidence) => !evidence.finalStatus.startsWith("GREEN_"),
  );
  const blockers = [
    input.sourceSha.length === 40 ? "" : "source_sha_not_full_40_characters",
    rows.length === expectedWorkTotal
      ? ""
      : `manifest_total_mismatch:${rows.length}/${expectedWorkTotal}`,
    uniqueWorkTotal === expectedWorkTotal
      ? ""
      : `unique_work_total_mismatch:${uniqueWorkTotal}/${expectedWorkTotal}`,
    duplicateWorkIds.length === 0
      ? ""
      : `duplicate_work_ids:${duplicateWorkIds.length}`,
    registryCounts.workPassport === expectedWorkTotal
      ? ""
      : "work_passport_registry_incomplete",
    registryCounts.canonicalParameterSchema === expectedWorkTotal
      ? ""
      : "canonical_parameter_schema_registry_incomplete",
    registryCounts.familyCalculator === expectedWorkTotal
      ? ""
      : "family_calculator_registry_incomplete",
    registryCounts.formulaGraph === expectedWorkTotal
      ? ""
      : "formula_graph_registry_incomplete",
    registryCounts.normativeSource === expectedWorkTotal
      ? ""
      : "normative_source_registry_incomplete",
    registryCounts.pricePolicy === expectedWorkTotal
      ? ""
      : "price_policy_registry_incomplete",
    registryCounts.deterministicCompiler === expectedWorkTotal
      ? ""
      : "deterministic_compiler_registry_incomplete",
    registryCounts.validator === expectedWorkTotal
      ? ""
      : "validator_registry_incomplete",
    registryCounts.rollbackCompatible === expectedWorkTotal
      ? ""
      : "rollback_contract_incomplete",
    registryCounts.revisionCompatible === expectedWorkTotal
      ? ""
      : "revision_compatibility_incomplete",
    missingAuditEvidence.length === 0
      ? ""
      : `required_audit_evidence_missing:${missingAuditEvidence.join(",")}`,
    wrongShaAuditEvidence.length === 0
      ? ""
      : `audit_evidence_sha_mismatch:${wrongShaAuditEvidence
        .map((evidence) => evidence.auditId)
        .join(",")}`,
    nonGreenAuditEvidence.length === 0
      ? ""
      : `audit_evidence_not_green:${nonGreenAuditEvidence
        .map((evidence) => evidence.auditId)
        .join(",")}`,
    falseReadyCount === 0 ? "" : `false_ready_count:${falseReadyCount}`,
  ].filter(Boolean);
  const manifestWithoutChecksum = {
    schema: ESTIMATE_SCALE_FOUNDATION_SCHEMA,
    sourceSha: input.sourceSha,
    generatedAt: input.generatedAt,
    expectedWorkTotal,
    workTotal: rows.length,
    uniqueWorkTotal,
    duplicateWorkIds,
    readinessCounts,
    registryCounts,
    registryVersions: ESTIMATE_SCALE_FOUNDATION_REGISTRY_VERSIONS,
    auditEvidence,
    quarantinedWorkCount: rows.filter((row) => row.quarantined).length,
    falseReadyCount,
    group01Started: false as const,
    groupOnboardingContract: {
      requiresExplicitGroupManifest: true as const,
      requiresIndependentGoldenFixtures: true as const,
      requiresDomainExpertApprovalForL5: true as const,
      massAutoPromotionForbidden: true as const,
    },
    admissionReadyForGroup01: blockers.length === 0,
    blockers,
    rows,
  };
  return {
    ...manifestWithoutChecksum,
    checksum: estimateDeterministicHash(manifestWithoutChecksum),
  };
}
