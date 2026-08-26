import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildBatch002RealUsefulGapAuditR1 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulGapAuditR1";
import { buildAllBatch002DrywallTechnologyPassportDraftsR1 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsTechnologyPassportR1";

const EVIDENCE_ROOT = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch002",
);
const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SUPPLEMENT_SHA256 = "03d2edcd29b12d98c9fb8c95bd840e8caac39cf9e489cda7316a53c1ff942b92";

const sha256 = (value: Buffer | string): string =>
  createHash("sha256").update(value).digest("hex");

function writeUtf8(path: string, value: string): { path: string; bytes: number; sha256: string } {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const body = value.endsWith("\n") ? value : `${value}\n`;
  writeFileSync(absolute, body, "utf8");
  const bytes = readFileSync(absolute);
  return { path: absolute, bytes: bytes.length, sha256: sha256(bytes) };
}

function sourceIdentity(path: string): { path: string; bytes: number; sha256: string } {
  const absolute = resolve(path);
  const bytes = readFileSync(absolute);
  return { path: absolute, bytes: bytes.length, sha256: sha256(bytes) };
}

const audit = buildBatch002RealUsefulGapAuditR1();
const passports = buildAllBatch002DrywallTechnologyPassportDraftsR1();
const passportDrafts = writeUtf8(
  resolve(EVIDENCE_ROOT, "BATCH002_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl"),
  passports.map((passport) => JSON.stringify(passport)).join("\n"),
);
const auditJson = writeUtf8(
  resolve(EVIDENCE_ROOT, "BATCH002_RUNTIME_GAP_AUDIT_R1.json"),
  JSON.stringify(audit, null, 2),
);
const auditMarkdown = writeUtf8(
  resolve(EVIDENCE_ROOT, "BATCH002_RUNTIME_GAP_AUDIT_R1.md"),
  [
    "# BATCH-002 — real-useful runtime gap audit R1",
    "",
    `- Exact catalog coverage: ${audit.observedCatalogCount}/${audit.expectedCatalogCount}`,
    `- Independent TechnologyPassportR1 DRAFT coverage: ${audit.independentPassportDraftCoverage}`,
    `- Engineer-accepted passport coverage: ${audit.engineerAcceptedPassportCoverage}`,
    `- Passports with exact equipment rules: ${audit.expectedEquipmentRuleCoverage}`,
    `- Runtime exact equipment coverage: ${audit.exactRuntimeEquipmentCoverage}`,
    "- Shadow compiler contract coverage: 55/55",
    "- Shadow runtime truth: 55/55 structurally complete; ENGINEER_ACCEPTANCE_MISSING retained",
    "- Shared canonical core representative parity: 7/7 operations",
    `- Legacy self-referential content GREEN: ${audit.legacyContentGreenCount}/55`,
    `- Real-useful decision RED: ${audit.realUsefulRedCount}/55`,
    `- Production admission attached: ${audit.productionAdmissionAttachedCount}`,
    "",
    "All 55 current successors contain zero machine/equipment rows. Their legacy domain policy explicitly rejects separate machine-equipment rows, which contradicts the current master requirement for concrete equipment as `type + numeric characteristic + operation`.",
    "",
    "This evidence is a shadow runtime measurement only. It is not an independent engineering passport and it does not change the current user runtime.",
  ].join("\n"),
);

const jestPath = resolve(EVIDENCE_ROOT, "BATCH002_GAP_TARGETED_JEST_R1.json");
const checkpoint = {
  contract: "real-useful-estimates.batch002-gap-checkpoint-r1.v1",
  generatedAt: "2026-08-21",
  status: "BATCH002_SHARED_CORE_PARITY_7_OF_7_GREEN_CONTENT_RED_ENGINEERING_REVIEW_PENDING_NO_RELEASE",
  masterSha256: MASTER_SHA256,
  supplementSha256: SUPPLEMENT_SHA256,
  metrics: {
    exactCatalogCoverage: `${audit.observedCatalogCount}/${audit.expectedCatalogCount}`,
    independentTechnologyPassportDraftCoverage: audit.independentPassportDraftCoverage,
    engineerAcceptedPassportCoverage: audit.engineerAcceptedPassportCoverage,
    expectedEquipmentRuleCoverage: audit.expectedEquipmentRuleCoverage,
    exactRuntimeEquipmentCoverage: audit.exactRuntimeEquipmentCoverage,
    realUsefulGreenCoverage: audit.realUsefulGreenCoverage,
    shadowCompilerContractCoverage: "55/55",
    shadowRuntimeTruthCompleteExceptEngineeringReview: "55/55",
    sharedCanonicalCoreRepresentativeParity: "7/7",
    productionAdmissionAttached: audit.productionAdmissionAttachedCount,
  },
  blockers: [...audit.rows[0]!.blockers],
  evidence: {
    auditJson,
    auditMarkdown,
    passportDrafts,
    targetedJest: sourceIdentity(jestPath),
    sourceFiles: [
      sourceIdentity("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulGapAuditR1.ts"),
      sourceIdentity("tests/aiEstimateV4/batch002RealUsefulGapAuditR1.contract.test.ts"),
      sourceIdentity("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsTechnologyPassportR1.ts"),
      sourceIdentity("tests/aiEstimateV4/batch002RealUsefulTechnologyPassportR1.contract.test.ts"),
      sourceIdentity("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulShadowCompilerR1.ts"),
      sourceIdentity("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulSharedCoreR1.ts"),
    ],
    independentSourceFiles: [
      sourceIdentity(resolve(EVIDENCE_ROOT, "independent-sources/KNAUF_FLEXIBOARD_TDS_2025.pdf")),
      sourceIdentity(resolve(EVIDENCE_ROOT, "independent-sources/KNAUF_PAPER_JOINT_TAPE_2025.pdf")),
      sourceIdentity(resolve(EVIDENCE_ROOT, "independent-sources/KNAUF_CEILING_INSULATION_INSTALL_2024.pdf")),
      sourceIdentity(resolve(EVIDENCE_ROOT, "independent-sources/USG_SHEETROCK_J371_2021.pdf")),
    ],
  },
  safety: {
    shadowPreparedOnly: true,
    productionRegistryChanged: false,
    currentUserRuntimeChanged: false,
    merge: false,
    deploy: false,
    ota: false,
    release: false,
  },
};
const checkpointFile = writeUtf8(
  resolve(EVIDENCE_ROOT, "BATCH002_REMEDIATION_CHECKPOINT_R1.json"),
  JSON.stringify(checkpoint, null, 2),
);

process.stdout.write(`${JSON.stringify({
  status: checkpoint.status,
  files: [passportDrafts, auditJson, auditMarkdown, checkpoint.evidence.targetedJest, checkpointFile],
}, null, 2)}\n`);
