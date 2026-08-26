import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete";

type Json = Record<string, any>;
type TerminalClassification =
  | "KEEP_PRODUCTION"
  | "REPAIR_SUCCESSOR"
  | "ALIAS_ONLY"
  | "REDIRECT"
  | "GARBAGE_QUARANTINED"
  | "REAL_WORK_BLOCKED";

const CONTRACT = "real-professional-estimates-r3.batch001-008-authoritative-audit.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R3_RU.md");
const MASTER_SPEC_SHA256 = "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const TARGET_RELEASE_ID = "4c5affaf-5f63-5d04-b036-875c684f8c45";
const SEARCH_RELEASE_ID = "367c2439-df83-5f27-bedd-89247b50caae";
const ROOT = resolve(".release-runtime/real-professional-estimates-r3");
const R2_ROOT = resolve(".release-runtime/real-professional-estimates-r2");
const R2_MANIFEST_PATH = resolve(R2_ROOT, "evidence/01-discovery/batch001_008_authoritative_manifest.json");
const R2_AUDIT_PATH = resolve(R2_ROOT, "evidence/02-static-audit/batch001_008_content_audit.jsonl");
const R2_FACTS_PATH = resolve(R2_ROOT, "evidence/02-static-audit/batch001_008_content_audit_facts.jsonl");
const R2_MISSING_PATH = resolve(R2_ROOT, "evidence/02-static-audit/missing-real-resources-report.json");
const STATE_PATH = resolve(ROOT, "state/batch001_008_r3_state.json");
const EVIDENCE_ROOT = resolve(ROOT, "evidence/02-authoritative-audit");
const MANIFEST_PATH = resolve(EVIDENCE_ROOT, "batch001_008_authoritative_manifest_r3.json");
const AUDIT_PATH = resolve(EVIDENCE_ROOT, "batch001_008_content_audit.jsonl");
const TECHNOLOGY_PATH = resolve(EVIDENCE_ROOT, "batch001_008_technology_audit.jsonl");
const EXCESS_PATH = resolve(EVIDENCE_ROOT, "EXCESS_ROWS.jsonl");
const MISSING_PATH = resolve(EVIDENCE_ROOT, "MISSING_CAPABILITIES.jsonl");
const QUEUE_PATH = resolve(EVIDENCE_ROOT, "batch001_008_remediation_queue.jsonl");
const SUMMARY_PATH = resolve(EVIDENCE_ROOT, "BATCH001_008_R3_AUTHORITATIVE_AUDIT_SUMMARY.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashObject(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(path: string, rows: readonly unknown[]): void {
  atomicWrite(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function verifyPayload(value: Json, code: string): void {
  const { payloadSha256, ...payload } = value;
  invariant(typeof payloadSha256 === "string" && hashObject(payload) === payloadSha256, code);
}

function countBy(rows: readonly Json[], key: (row: Json) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const current = key(row);
    counts.set(current, (counts.get(current) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function terminalClassification(audit: Json, fact: Json): TerminalClassification {
  if (fact.search_classification === "REDIRECT") return "REDIRECT";
  if (fact.search_classification === "ALIAS") return "ALIAS_ONLY";
  if (audit.successorVersionId && audit.finalStatus === "GREEN") return "REPAIR_SUCCESSOR";
  if (audit.classification === "KEEP" && audit.finalStatus === "GREEN") return "KEEP_PRODUCTION";
  // R3 forbids treating a real construction identity as garbage merely because its generated rows are bad.
  return "REAL_WORK_BLOCKED";
}

function batchIdFor(fact: Json, drywallSets: Record<string, Set<string>>): string {
  const catalogId = String(fact.catalog_id);
  if (fact.domain_id === "drywall") {
    for (const [batchId, ids] of Object.entries(drywallSets)) if (ids.has(catalogId)) return batchId;
    throw new Error(`R3_DRYWALL_BATCH_NOT_MAPPED:${catalogId}`);
  }
  if (fact.domain_id === "electrical") return "BATCH-005";
  if (fact.domain_id === "water_supply_sewerage") return "BATCH-006";
  if (fact.domain_id === "hvac_heat_supply") return "BATCH-007";
  if (fact.domain_id === "concrete") return "BATCH-008";
  if (fact.domain_id === "asphalt") return "PRE-BATCH-005-ACCEPTED-BASELINE";
  return "R58-MANDATORY-SUCCESSOR";
}

function unresolvedTechnologyFields(fact: Json, terminal: TerminalClassification): string[] {
  if (terminal === "REDIRECT" || terminal === "ALIAS_ONLY") return [];
  const fields = [
    "PHYSICAL_RESULT_ENGINEER_CONFIRMATION",
    "SCOPE_START_AND_END",
    "APPLICABLE_MATERIAL_SET",
    "MEASURABLE_CONSTRUCTION_OPERATIONS",
    "APPLICABLE_MACHINE_SET",
    "REAL_DELIVERY_FLOWS",
    "MUTUALLY_EXCLUSIVE_VARIANTS",
    "EXPLICIT_TECHNOLOGY_EXCLUSIONS",
    "MINIMAL_QUANTITY_INPUTS",
    "PER_ROW_NORM_OR_PROJECT_SOURCE",
  ];
  if (Number(fact.valid_physical_rows) > 0) fields.splice(fields.indexOf("PHYSICAL_RESULT_ENGINEER_CONFIRMATION"), 1);
  return fields;
}

function main(): void {
  for (const path of [MASTER_SPEC_PATH, R2_MANIFEST_PATH, R2_AUDIT_PATH, R2_FACTS_PATH, R2_MISSING_PATH, STATE_PATH]) {
    invariant(existsSync(path), `R3_REQUIRED_INPUT_MISSING:${path}`);
  }
  invariant(hashFile(MASTER_SPEC_PATH) === MASTER_SPEC_SHA256, "R3_MASTER_SPEC_SHA256_DRIFT");
  invariant(execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() === EXPECTED_BRANCH, "R3_BRANCH_DRIFT");

  const inheritedManifest = readJson(R2_MANIFEST_PATH);
  const inheritedMissing = readJson(R2_MISSING_PATH);
  verifyPayload(inheritedManifest, "R3_INHERITED_MANIFEST_PAYLOAD_DRIFT");
  verifyPayload(inheritedMissing, "R3_INHERITED_MISSING_PAYLOAD_DRIFT");
  const inheritedAudit = readJsonl(R2_AUDIT_PATH);
  const inheritedFacts = readJsonl(R2_FACTS_PATH);
  invariant(inheritedManifest.entries?.length === 4282, "R3_MANIFEST_DENOMINATOR_DRIFT");
  invariant(inheritedAudit.length === 4282, "R3_AUDIT_DENOMINATOR_DRIFT");
  invariant(inheritedFacts.length === 4282, "R3_FACT_DENOMINATOR_DRIFT");
  invariant(inheritedMissing.entries?.length === 4282, "R3_MISSING_DENOMINATOR_DRIFT");
  invariant(inheritedManifest.releases?.targetReleaseId === TARGET_RELEASE_ID, "R3_TARGET_RELEASE_DRIFT");
  invariant(inheritedManifest.releases?.searchReleaseId === SEARCH_RELEASE_ID, "R3_SEARCH_RELEASE_DRIFT");

  const auditByCatalog = new Map(inheritedAudit.map((row) => [String(row.catalogId), row]));
  const factByCatalog = new Map(inheritedFacts.map((row) => [String(row.catalog_id), row]));
  invariant(auditByCatalog.size === 4282 && factByCatalog.size === 4282, "R3_DUPLICATE_CATALOG_ID");
  for (const entry of inheritedManifest.entries as Json[]) {
    const audit = auditByCatalog.get(String(entry.catalogId));
    const fact = factByCatalog.get(String(entry.catalogId));
    invariant(audit && fact, `R3_LEDGER_JOIN_GAP:${entry.catalogId}`);
    invariant(entry.definitionVersionId === fact.definition_version_id, `R3_DEFINITION_VERSION_JOIN_DRIFT:${entry.catalogId}`);
  }

  const batch2 = new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
  const batch3 = new Set(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6);
  const batch4 = new Set(DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7);
  invariant(batch2.size === 55 && batch3.size === 36 && batch4.size === 393, "R3_DRYWALL_KNOWN_BATCH_DENOMINATOR_DRIFT");
  const drywallIds = inheritedFacts.filter((row) => row.domain_id === "drywall").map((row) => String(row.catalog_id));
  invariant(drywallIds.length === 500, "R3_DRYWALL_DENOMINATOR_DRIFT");
  const known = new Set([...batch2, ...batch3, ...batch4]);
  invariant(known.size === 484, "R3_DRYWALL_BATCH_OVERLAP");
  const batch1 = new Set(drywallIds.filter((id) => !known.has(id)));
  invariant(batch1.size === 16, "R3_BATCH001_REMAINDER_DRIFT");
  const drywallSets = { "BATCH-001": batch1, "BATCH-002": batch2, "BATCH-003": batch3, "BATCH-004": batch4 };

  const contentAudit: Json[] = [];
  const technologyAudit: Json[] = [];
  const excessRows: Json[] = [];
  const missingCapabilities: Json[] = [];
  const remediationQueue: Json[] = [];

  for (const manifestEntry of inheritedManifest.entries as Json[]) {
    const catalogId = String(manifestEntry.catalogId);
    const audit = auditByCatalog.get(catalogId)!;
    const fact = factByCatalog.get(catalogId)!;
    const batchId = batchIdFor(fact, drywallSets);
    const terminal = terminalClassification(audit, fact);
    const unresolved = unresolvedTechnologyFields(fact, terminal);
    const finalStatus = terminal === "KEEP_PRODUCTION" || terminal === "REPAIR_SUCCESSOR"
      || terminal === "ALIAS_ONLY" || terminal === "REDIRECT" || terminal === "GARBAGE_QUARANTINED"
      ? "GREEN"
      : "RED";
    const sourceBatch = String(fact.source_batch);
    const base = {
      batchId,
      sourceBatch,
      domainId: String(fact.domain_id),
      catalogId,
      canonicalTitleRu: String(fact.title_ru),
      currentVersionId: String(fact.definition_version_id),
      currentReleaseId: TARGET_RELEASE_ID,
    };

    contentAudit.push({
      ...base,
      classification: audit.classification,
      terminalClassification: terminal,
      existingValidRows: Number(fact.valid_physical_rows),
      noiseRows: Number(fact.noise_rows),
      missingRequiredResources: [...(fact.missingCapabilityCodes ?? []), ...unresolved],
      crossDomainRows: fact.cross_domain_rows ?? [],
      duplicateOwners: fact.duplicate_owners ?? [],
      parameterDefects: fact.parameterDefectCodes ?? [],
      uiWorkflowDefects: fact.uiWorkflowDefectCodes ?? [],
      historyParity: fact.historyPass ? "PASS" : "FAIL",
      pdfParity: fact.pdfPass ? "PASS" : "FAIL",
      procurementParity: fact.procurementPass ? "PASS" : "FAIL",
      successorVersionId: audit.successorVersionId ?? null,
      finalStatus,
    });

    excessRows.push({
      ...base,
      status: Number(fact.noise_rows) > 0 || (fact.resourceDefects ?? []).length > 0 ? "EXCESS_PRESENT" : "NO_STATIC_EXCESS_DETECTED",
      counts: {
        noise: Number(fact.noise_rows),
        rawInternalUom: Number(fact.raw_uom_rows),
        invalidCategory: Number(fact.invalid_category_rows),
        genericTitle: Number(fact.generic_title_rows),
        rawEnglishTitle: Number(fact.english_only_rows),
        crossDomain: (fact.cross_domain_rows ?? []).length,
      },
      defectCodes: fact.resourceDefects ?? [],
      samples: fact.noise_samples ?? [],
      disposition: terminal === "REDIRECT" || terminal === "ALIAS_ONLY"
        ? "SEARCH_ONLY_NO_NEW_ESTIMATE_PAYLOAD"
        : "REMOVE_ONLY_THROUGH_VERIFIED_SUCCESSOR_DIFF",
    });

    missingCapabilities.push({
      ...base,
      status: unresolved.length > 0 || (fact.missingCapabilityCodes ?? []).length > 0
        ? "ENGINEERING_ADJUDICATION_REQUIRED"
        : "NOT_APPLICABLE_SEARCH_ONLY",
      staticMissingCodes: fact.missingCapabilityCodes ?? [],
      unresolvedTechnologyFields: unresolved,
      rule: "An empty BOQ category is valid; only physically applicable resources may be required.",
    });

    technologyAudit.push({
      ...base,
      terminalClassification: terminal,
      technologyAuditStatus: unresolved.length === 0 ? "SEARCH_ONLY_TERMINAL" : "REAL_WORK_BLOCKED_PENDING_ENGINEERING_MODEL",
      physicalResult: terminal === "REDIRECT" || terminal === "ALIAS_ONLY" ? "SEARCH_IDENTITY_ONLY" : String(fact.title_ru),
      scopeStart: unresolved.includes("SCOPE_START_AND_END") ? "UNRESOLVED" : "SEARCH_ONLY",
      scopeEnd: unresolved.includes("SCOPE_START_AND_END") ? "UNRESOLVED" : "SEARCH_ONLY",
      realMaterials: { validRowsDetected: Number(fact.valid_material_rows), applicability: "REQUIRES_PER_DEFINITION_REVIEW" },
      measurableConstructionOperations: { validRowsDetected: Number(fact.valid_work_rows), applicability: "REQUIRES_PER_DEFINITION_REVIEW" },
      applicableMachines: { validRowsDetected: Number(fact.valid_machine_rows), applicability: "REQUIRES_PER_DEFINITION_REVIEW" },
      realDeliveryFlows: { validRowsDetected: Number(fact.valid_delivery_rows), applicability: "REQUIRES_PER_DEFINITION_REVIEW" },
      mutuallyExclusiveVariants: "UNRESOLVED",
      explicitExclusions: fact.noise_samples ?? [],
      quantityInputs: { count: Number(fact.parameter_count), defects: fact.parameterDefectCodes ?? [] },
      rowSourceCoverage: {
        totalRows: Number(fact.total_rows),
        missingSourceRows: Number(fact.missing_source_rows),
        missingFormulaRows: Number(fact.missing_formula_rows),
      },
      excessRowsRef: "EXCESS_ROWS.jsonl",
      missingCapabilitiesRef: "MISSING_CAPABILITIES.jsonl",
    });

    if (terminal === "REAL_WORK_BLOCKED" || terminal === "REPAIR_SUCCESSOR") {
      remediationQueue.push({
        ordinal: remediationQueue.length + 1,
        ...base,
        terminalClassification: terminal,
        priority: Number(fact.search_selectable) ? "P0_SELECTABLE_REAL_WORK" : "P1_REAL_WORK",
        requiredAction: "BUILD_AND_VERIFY_CONTENT_PASSPORT_AND_SUCCESSOR",
        preserve: ["accepted inputs", "valid formulas", "valid physical rows", "accepted revisions", "old PDF artifacts"],
        blockers: [...(fact.resourceDefects ?? []), ...(fact.parameterDefectCodes ?? []), ...unresolved],
      });
    }
  }

  invariant(contentAudit.length === 4282 && technologyAudit.length === 4282, "R3_OUTPUT_DENOMINATOR_DRIFT");
  const batchCounts = countBy(contentAudit, (row) => String(row.batchId));
  invariant(batchCounts["BATCH-001"] === 16 && batchCounts["BATCH-002"] === 55
    && batchCounts["BATCH-003"] === 36 && batchCounts["BATCH-004"] === 393
    && batchCounts["BATCH-005"] === 605 && batchCounts["BATCH-006"] === 874
    && batchCounts["BATCH-007"] === 1012 && batchCounts["BATCH-008"] === 1220,
  "R3_EXACT_BATCH_DENOMINATOR_DRIFT");
  invariant(batchCounts["PRE-BATCH-005-ACCEPTED-BASELINE"] === 63, "R3_ASPHALT_BASELINE_DRIFT");
  invariant(batchCounts["R58-MANDATORY-SUCCESSOR"] === 8, "R3_NON_CONCRETE_SUCCESSOR_DRIFT");

  const generatedAt = new Date().toISOString();
  const source = {
    branch: EXPECTED_BRANCH,
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    tree: execFileSync("git", ["show", "-s", "--format=%T", "HEAD"], { encoding: "utf8" }).trim(),
  };
  const provenanceFiles = [R2_MANIFEST_PATH, R2_AUDIT_PATH, R2_FACTS_PATH, R2_MISSING_PATH]
    .map((path) => ({ path: path.replaceAll("\\", "/"), sha256: hashFile(path) }));
  const manifestPayload = {
    contract: CONTRACT,
    generatedAt,
    masterSpec: { path: MASTER_SPEC_PATH.replaceAll("\\", "/"), sha256: MASTER_SPEC_SHA256 },
    source,
    sourceSnapshot: {
      mode: "VERIFIED_IMMUTABLE_READONLY_LEDGER_RECLASSIFIED_FOR_R3",
      liveDatabaseRuntime: "DEFERRED_AUTHORITATIVE_LISTENER_55432_UNAVAILABLE",
      substitutionUsed: false,
      databaseWritesApplied: 0,
      inheritedEvidence: provenanceFiles,
    },
    releases: inheritedManifest.releases,
    denominatorReconciliation: inheritedManifest.denominatorReconciliation,
    sourceBatchCounts: inheritedManifest.sourceBatchCounts,
    exactR3BatchCounts: batchCounts,
    additions: inheritedManifest.additions,
    entries: contentAudit.map((row) => ({
      batchId: row.batchId,
      sourceBatch: row.sourceBatch,
      domainId: row.domainId,
      catalogId: row.catalogId,
      currentVersionId: row.currentVersionId,
      currentReleaseId: row.currentReleaseId,
      terminalClassification: row.terminalClassification,
      finalStatus: row.finalStatus,
    })),
    status: "GREEN_R3_AUTHORITATIVE_MAPPING_4282_RED_REMEDIATION_REQUIRED",
  };
  const manifest = { ...manifestPayload, payloadSha256: hashObject(manifestPayload) };
  writeJson(MANIFEST_PATH, manifest);
  writeJsonl(AUDIT_PATH, contentAudit);
  writeJsonl(TECHNOLOGY_PATH, technologyAudit);
  writeJsonl(EXCESS_PATH, excessRows);
  writeJsonl(MISSING_PATH, missingCapabilities);
  writeJsonl(QUEUE_PATH, remediationQueue);

  const summaryPayload = {
    contract: CONTRACT,
    generatedAt,
    masterSpecSha256: MASTER_SPEC_SHA256,
    targetReleaseId: TARGET_RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    denominator: 4282,
    coverage: "4282/4282",
    exactR3BatchCounts: batchCounts,
    domains: countBy(contentAudit, (row) => String(row.domainId)),
    inheritedClassifications: countBy(contentAudit, (row) => String(row.classification)),
    terminalClassifications: countBy(contentAudit, (row) => String(row.terminalClassification)),
    finalStatuses: countBy(contentAudit, (row) => String(row.finalStatus)),
    remediationQueueCount: remediationQueue.length,
    denominatorReconciliation: inheritedManifest.denominatorReconciliation,
    falseConcreteGarbagePromotionCount: 0,
    databaseWritesApplied: 0,
    liveDatabaseRuntime: "DEFERRED_AUTHORITATIVE_LISTENER_55432_UNAVAILABLE",
    gates: {
      fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
      activation: "NOT_RUN_PROHIBITED",
      deploy: "NOT_RUN_PROHIBITED",
      ota: "NOT_RUN_PROHIBITED",
      merge: "NOT_RUN_PROHIBITED",
      batch009: "NOT_RUN_PROHIBITED",
    },
    evidence: [MANIFEST_PATH, AUDIT_PATH, TECHNOLOGY_PATH, EXCESS_PATH, MISSING_PATH, QUEUE_PATH]
      .map((path) => path.replaceAll("\\", "/")),
    status: "RED_R3_AUTHORITATIVE_AUDIT_COMPLETE_REPAIR_REQUIRED",
  };
  const summary = { ...summaryPayload, payloadSha256: hashObject(summaryPayload) };
  writeJson(SUMMARY_PATH, summary);

  const state = readJson(STATE_PATH);
  state.updatedAt = generatedAt;
  state.currentWave = "WAVE_3_CANONICAL_CONTENT_MODEL";
  state.waves.WAVE_2_AUTHORITATIVE_AUDIT = {
    status: "COMPLETE_RED_REMEDIATION_REQUIRED",
    denominator: 4282,
    audited: 4282,
    terminalClassified: 4282,
    remediationQueue: remediationQueue.length,
    liveDatabaseRuntime: "DEFERRED_AUTHORITATIVE_LISTENER_55432_UNAVAILABLE",
    evidence: summary.evidence,
    summarySha256: summary.payloadSha256,
  };
  state.terminalStatus = "RED";
  state.fullJest = "DEFERRED_BY_OPERATOR_NOT_RUN";
  writeJson(STATE_PATH, state);

  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    denominator: summary.denominator,
    coverage: summary.coverage,
    batchCounts,
    terminalClassifications: summary.terminalClassifications,
    remediationQueueCount: remediationQueue.length,
    summarySha256: summary.payloadSha256,
  }, null, 2)}\n`);
}

main();
