import { estimateDeterministicHash } from "../estimateDeterministicHash";

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
