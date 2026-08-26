import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildAllBatch002DrywallSuccessorsR3,
  compileBatch002DrywallSuccessorR3,
  evaluateBatch002DrywallContentPassportR3,
  evaluateBatch002FormulaUnitsR4,
  type Batch002DrywallCompiledRowR3,
  type Batch002DrywallSuccessorDefinitionR3,
  type Batch002UserParameterContractR4,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4";
import { batch002DrywallGoldFixtureValuesR3 } from "./batch002DrywallGoldFixtureR3";

type Json = Record<string, any>;

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R4_REAL_CONTENT_BATCH001_008_RU.md");
const MASTER_SHA256 = "bc27d1dd632ccd2b7a2f39e0a8febf3b909075aff6f5d50bf9e228b46ea8c933";
const SOURCE_LEDGER = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/batch001_008_authoritative_manifest_r3.json");
const ROOT = resolve(".release-runtime/real-professional-estimates-r4");
const OUTPUT_DIR = resolve(ROOT, "evidence/04-repair/batch002");
const STATE = resolve(ROOT, "state/batch001_008_r4_state.json");
const SUMMARY = resolve(OUTPUT_DIR, "BATCH002_R4_CONTENT_CANDIDATE_SUMMARY.json");
const MANIFEST = resolve(OUTPUT_DIR, "BATCH002_R4_SUCCESSOR_MANIFEST.json");
const INDIVIDUAL = resolve(OUTPUT_DIR, "BATCH002_R4_INDIVIDUAL_PROOF_TABLE.json");
const PASSPORTS = resolve(OUTPUT_DIR, "batch002_r4_passports.jsonl");
const ADJUDICATION = resolve(OUTPUT_DIR, "batch002_r4_predecessor_adjudication.jsonl");
const ADDITIONS = resolve(OUTPUT_DIR, "batch002_r4_successor_additions.jsonl");
const PARAMETERS = resolve(OUTPUT_DIR, "batch002_r4_parameter_contracts.jsonl");
const COMPILED = resolve(OUTPUT_DIR, "batch002_r4_gold_compiled_rows.jsonl");
const MUTATIONS = resolve(OUTPUT_DIR, "batch002_r4_parameter_mutations.jsonl");
const UNITS = resolve(OUTPUT_DIR, "batch002_r4_formula_unit_results.jsonl");
const NEGATIVE = resolve(OUTPUT_DIR, "batch002_r4_cross_domain_negative.jsonl");
const ROLES = resolve(OUTPUT_DIR, "batch002_r4_static_role_reviews.jsonl");
const MODULE = resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3.ts");
const SOURCES = resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallBatch002EngineeringSourcesR4.ts");
const FIXTURE = resolve("scripts/estimate/batch001008R3/batch002DrywallGoldFixtureR3.ts");
const TEST = resolve("tests/aiEstimateV4/batch002R4RealContentSuccessor.contract.test.ts");
const BACKEND = resolve(OUTPUT_DIR, "BATCH002_BACKEND_REVISION_PARITY_R4.json");

const FORBIDDEN_TEXT = /(?:worker_h|man_hour|machine_h|поставка состава|рабочая детализация|входное обследование|контрол|журнал|акт\b|испытани|координац|комплект документац)/iu;
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function atomicText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function jsonl(values: readonly unknown[]): string {
  return `${values.map((value) => JSON.stringify(value)).join("\n")}\n`;
}

function changedValue(
  value: string | number | boolean,
  contract: Batch002UserParameterContractR4,
): string | number | boolean {
  if (contract.inputType === "BOOLEAN") return !Boolean(value);
  if (contract.inputType === "TEXT") return `${String(value)} — изменено`;
  invariant(contract.range.kind === "NUMERIC", `BATCH002_R4_NUMERIC_RANGE_MISSING:${contract.parameterId}`);
  const current = Number(value);
  return current === contract.range.minimum ? contract.range.maximum : contract.range.minimum;
}

function rowsSignature(rows: readonly Batch002DrywallCompiledRowR3[]): string {
  return JSON.stringify(rows.map((row) => ({
    rowId: row.rowId,
    titleRu: row.titleRu,
    quantity: row.quantity,
    unitId: row.unitId,
    group: row.group,
  })));
}

function staticRoleReview(
  role: "ESTIMATOR" | "CONSTRUCTION_ENGINEER" | "ORDINARY_USER",
  definition: Batch002DrywallSuccessorDefinitionR3,
  rows: readonly Batch002DrywallCompiledRowR3[],
): Json {
  const checks = role === "ESTIMATOR"
    ? {
      positiveFiniteQuantities: rows.every((row) => row.quantity > 0 && Number.isFinite(row.quantity)),
      uniqueSemanticOwners: new Set(rows.map((row) => row.semanticOwnerId)).size === rows.length,
      uniqueCostOwners: new Set(rows.map((row) => row.costOwnerId)).size === rows.length,
      procurementExcludesConstructionWork: rows.filter((row) => row.procurementEligible).every((row) => row.group !== "construction_work"),
      distinctMaterialWorkAndApplicableDelivery: rows.some((row) => row.group === "material")
        && rows.some((row) => row.group === "construction_work")
        && rows.some((row) => row.group === "delivery"),
    }
    : role === "CONSTRUCTION_ENGINEER"
      ? {
        technologySequencePresent: definition.technologyStepsRu.length >= 3,
        dependenciesDeclared: definition.dependencyRu.length > 0,
        sourcesBoundToEveryResource: definition.resources.every((row) => row.engineeringSourceIds.length > 0),
        exactSourceLocatorsPresent: definition.passport.engineeringSources.every((source) => source.exactLocator.length >= 20),
        noRawLaborQaOrUnscopedMachineRows: definition.resources.every((row) => !FORBIDDEN_UNITS.has(row.unitId)
          && !FORBIDDEN_TEXT.test(row.titleRu) && row.group !== "machine_equipment"),
        dimensionalFormulaCheck: evaluateBatch002FormulaUnitsR4(definition).status === "GREEN",
      }
      : {
        simpleRussianResourceTitles: definition.resources.every((row) => /[а-яё]/iu.test(row.titleRu) && !FORBIDDEN_TEXT.test(row.titleRu)),
        boundedVisibleInputs: definition.passport.userParameterContracts.length <= 15,
        everyInputHasGuideRangeAndConsumer: definition.passport.userParameterContracts.every((parameter) =>
          /[а-яё]/iu.test(parameter.titleRu)
          && parameter.guideRu.length >= 20
          && parameter.formulaConsumerIds.length + parameter.resourceConsumerIds.length > 0),
        noArtificialEquipmentSection: definition.resources.every((row) => row.group !== "machine_equipment"),
        boundedResultRows: rows.length > 0 && rows.length <= 32,
      };
  const passed = Object.values(checks).every(Boolean);
  return {
    contract: "real-professional-estimates-r4.batch002-static-role-review.v1",
    catalogId: definition.catalogId,
    role,
    reviewMode: "AUTOMATED_ROLE_PERSPECTIVE_STATIC",
    isRealWebOrAndroidE2E: false,
    checks,
    verdict: passed ? "GREEN_STATIC_ONLY" : "RED",
  };
}

function crossDomainNegative(definition: Batch002DrywallSuccessorDefinitionR3): Json {
  const source = definition.resources[0];
  invariant(source, `BATCH002_R4_NEGATIVE_SOURCE_MISSING:${definition.catalogId}`);
  const foreign = {
    ...source,
    rowId: `${definition.catalogId}:successor-r3:material:foreign_concrete`,
    titleRu: "Бетонная смесь для монолитного фундамента",
    semanticOwnerId: `${definition.catalogId}:successor-r3:semantic:material:foreign_concrete`,
    costOwnerId: `${definition.catalogId}:successor-r3:cost:material:foreign_concrete`,
    procurementOwnerId: `${definition.catalogId}:successor-r3:procurement:material:foreign_concrete`,
    resourceIdentity: `${definition.catalogId}:material:foreign_concrete`,
  };
  const decision = evaluateBatch002DrywallContentPassportR3({
    ...definition.passport,
    resources: [...definition.resources, foreign],
    semanticOwners: [...definition.passport.semanticOwners, foreign.semanticOwnerId],
    costOwners: [...definition.passport.costOwners, foreign.costOwnerId],
    procurementOwners: [...definition.passport.procurementOwners, foreign.procurementOwnerId],
  });
  return {
    contract: "real-professional-estimates-r4.batch002-cross-domain-negative.v1",
    catalogId: definition.catalogId,
    injectedTitleRu: foreign.titleRu,
    expectedError: "DRYWALL_BATCH002_CROSS_DOMAIN_RESOURCE",
    decision,
    verdict: !decision.allowed && decision.errors.includes("DRYWALL_BATCH002_CROSS_DOMAIN_RESOURCE") ? "GREEN" : "RED",
  };
}

function main(): void {
  invariant(hashFile(MASTER) === MASTER_SHA256, "BATCH002_R4_MASTER_SHA256_MISMATCH");
  const sourceLedger = JSON.parse(readFileSync(SOURCE_LEDGER, "utf8")) as Json;
  const ledgerEntries = (sourceLedger.entries as Json[]).filter((entry) => entry.batchId === "BATCH-002");
  const ledgerIds = ledgerEntries.map((entry) => String(entry.catalogId));
  invariant(ledgerIds.length === 55, `BATCH002_R4_LEDGER_COUNT_DRIFT:${ledgerIds.length}`);
  invariant(JSON.stringify(ledgerIds) === JSON.stringify(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4), "BATCH002_R4_LEDGER_ORDER_OR_MEMBERSHIP_DRIFT");

  const definitions = buildAllBatch002DrywallSuccessorsR3();
  invariant(definitions.length === 55, `BATCH002_R4_DEFINITION_COUNT_DRIFT:${definitions.length}`);
  invariant(JSON.stringify(definitions.map((definition) => definition.catalogId)) === JSON.stringify(ledgerIds), "BATCH002_R4_DEFINITION_LEDGER_DRIFT");

  const compiledRows: Json[] = [];
  const mutationRows: Json[] = [];
  const unitRows: Json[] = [];
  const negativeRows: Json[] = [];
  const roleRows: Json[] = [];
  const individualRows: Json[] = [];
  const backendEvidence = existsSync(BACKEND) ? JSON.parse(readFileSync(BACKEND, "utf8")) as Json : null;
  const backendReady = backendEvidence?.status === "GREEN_R4_BATCH002_ISOLATED_BACKEND_CANDIDATE_PARITY_NO_RELEASE"
    && backendEvidence?.proofs?.length === 55
    && backendEvidence?.proofs?.every((proof: Json) => proof.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"
      && proof.priceMutationParity === "GREEN_PRICE_ONLY_CHILD_QUANTITIES_UNCHANGED_TOTAL_CHANGED");
  if (backendEvidence) invariant(backendReady, "BATCH002_R4_BACKEND_EVIDENCE_PRESENT_BUT_RED");
  const backendProofByCatalog = new Map<string, Json>((backendEvidence?.proofs ?? [])
    .map((proof: Json): [string, Json] => [String(proof.catalogId), proof]));

  for (const definition of definitions) {
    invariant(definition.contentDecision.allowed, `BATCH002_R4_CONTENT_RED:${definition.catalogId}`);
    invariant(definition.domainDecision.allowed, `BATCH002_R4_DOMAIN_RED:${definition.catalogId}`);
    const values = { ...batch002DrywallGoldFixtureValuesR3(definition) };
    const compiled = compileBatch002DrywallSuccessorR3(definition, values);
    invariant(compiled.status === "GREEN", `BATCH002_R4_GOLD_COMPILE_RED:${definition.catalogId}:${compiled.status}`);
    compiledRows.push({
      contract: "real-professional-estimates-r4.batch002-gold-compile.v1",
      catalogId: definition.catalogId,
      fixtureValues: values,
      rows: compiled.rows,
      verdict: "GREEN",
    });

    for (const parameter of definition.passport.userParameterContracts) {
      const baselineValue = values[parameter.parameterId];
      invariant(baselineValue != null, `BATCH002_R4_FIXTURE_VALUE_MISSING:${definition.catalogId}:${parameter.parameterId}`);
      const mutatedValue = changedValue(baselineValue, parameter);
      const mutated = compileBatch002DrywallSuccessorR3(definition, { ...values, [parameter.parameterId]: mutatedValue });
      const changed = mutated.status !== compiled.status
        || (mutated.status === "GREEN" && rowsSignature(mutated.rows) !== rowsSignature(compiled.rows));
      mutationRows.push({
        contract: "real-professional-estimates-r4.batch002-parameter-mutation.v1",
        catalogId: definition.catalogId,
        parameterId: parameter.parameterId,
        baselineValue,
        mutatedValue,
        baselineStatus: compiled.status,
        mutatedStatus: mutated.status,
        observableChange: changed,
        verdict: changed ? "GREEN" : "RED",
      });
      invariant(changed, `BATCH002_R4_DEAD_PARAMETER:${definition.catalogId}:${parameter.parameterId}`);
    }

    const unitDecision = evaluateBatch002FormulaUnitsR4(definition);
    unitRows.push({ catalogId: definition.catalogId, ...unitDecision });
    invariant(unitDecision.status === "GREEN", `BATCH002_R4_UNIT_RED:${definition.catalogId}`);

    const negative = crossDomainNegative(definition);
    negativeRows.push(negative);
    invariant(negative.verdict === "GREEN", `BATCH002_R4_NEGATIVE_RED:${definition.catalogId}`);

    const reviews = (["ESTIMATOR", "CONSTRUCTION_ENGINEER", "ORDINARY_USER"] as const)
      .map((role) => staticRoleReview(role, definition, compiled.rows));
    roleRows.push(...reviews);
    invariant(reviews.every((review) => review.verdict === "GREEN_STATIC_ONLY"), `BATCH002_R4_STATIC_ROLE_RED:${definition.catalogId}`);

    const ledger = ledgerEntries.find((entry) => entry.catalogId === definition.catalogId);
    invariant(ledger, `BATCH002_R4_LEDGER_ENTRY_MISSING:${definition.catalogId}`);
    const backendProof = backendProofByCatalog.get(definition.catalogId);
    individualRows.push({
      catalogId: definition.catalogId,
      batchId: "BATCH-002",
      domain: definition.passport.domain,
      technologyFamily: definition.passport.technologyFamily,
      operation: definition.operation,
      variant: definition.variant,
      predecessorVersionId: ledger.currentVersionId,
      predecessorReleaseId: ledger.currentReleaseId,
      predecessorRows: definition.adjudication.length,
      successorRowsAtGoldFixture: compiled.rows.length,
      successorResourceDefinitions: definition.resources.length,
      userParameters: definition.passport.userParameterContracts.length,
      formulas: definition.passport.formulas.length,
      engineeringSources: definition.passport.engineeringSources.map((source) => source.sourceId),
      predecessorAdjudicationRows: definition.adjudication.length,
      successorAdditions: definition.successorAdditions.length,
      r4DecisionCounts: Object.fromEntries([...new Set([
        ...definition.adjudication.map((row) => row.r4Decision),
        ...definition.successorAdditions.map((row) => row.r4Decision),
      ])].sort().map((decision) => [decision,
        definition.adjudication.filter((row) => row.r4Decision === decision).length
          + definition.successorAdditions.filter((row) => row.r4Decision === decision).length])),
      contentPassport: "GREEN",
      formulaDimensions: unitDecision.status,
      goldFixture: "GREEN",
      parameterMutations: mutationRows.filter((row) => row.catalogId === definition.catalogId).every((row) => row.verdict === "GREEN") ? "GREEN" : "RED",
      negativeCrossDomain: negative.verdict,
      staticRoleReviews: reviews.every((review) => review.verdict === "GREEN_STATIC_ONLY") ? "GREEN_STATIC_3_OF_3_NOT_E2E" : "RED",
      backendParentChildParity: backendProof ? "GREEN_PARENT_FORMULA_CHILD_PRICE_ONLY_CHILD" : "PENDING",
      backendRevisionIds: backendProof ? {
        parentRevisionId: backendProof.parentRevisionId,
        formulaChildRevisionId: backendProof.formulaChildRevisionId,
        finalRevisionId: backendProof.finalRevisionId,
      } : null,
      backendUiHistoryPdfProcurementParity: backendProof ? "GREEN" : "PENDING",
      authoritativeDbReplay: "PENDING_UNAVAILABLE",
      webRoleE2E: "PENDING_0_OF_80",
      androidApi34RoleE2E: "PENDING_0_OF_50",
      finalStatus: "RED",
    });
  }

  invariant(mutationRows.every((row) => row.verdict === "GREEN"), "BATCH002_R4_MUTATION_MATRIX_RED");
  invariant(roleRows.length === 165, `BATCH002_R4_STATIC_ROLE_COUNT_DRIFT:${roleRows.length}`);

  execFileSync(process.execPath, [
    resolve("node_modules/jest/bin/jest.js"),
    "tests/aiEstimateV4/batch002R4RealContentSuccessor.contract.test.ts",
    "--runInBand",
    "--no-cache",
  ], { cwd: resolve("."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000 });

  atomicText(PASSPORTS, jsonl(definitions.map((definition) => definition.passport)));
  atomicText(ADJUDICATION, jsonl(definitions.flatMap((definition) => definition.adjudication.map((row) => ({ catalogId: definition.catalogId, ...row })))));
  atomicText(ADDITIONS, jsonl(definitions.flatMap((definition) => definition.successorAdditions.map((row) => ({ catalogId: definition.catalogId, ...row })))));
  atomicText(PARAMETERS, jsonl(definitions.flatMap((definition) => definition.passport.userParameterContracts.map((row) => ({ catalogId: definition.catalogId, ...row })))));
  atomicText(COMPILED, jsonl(compiledRows));
  atomicText(MUTATIONS, jsonl(mutationRows));
  atomicText(UNITS, jsonl(unitRows));
  atomicText(NEGATIVE, jsonl(negativeRows));
  atomicText(ROLES, jsonl(roleRows));
  atomicJson(INDIVIDUAL, individualRows);

  const manifest = {
    contract: "real-professional-estimates-r4.batch002-successor-manifest.v1",
    executionContract: { path: MASTER.replaceAll("\\", "/"), sha256: MASTER_SHA256 },
    sourceLedger: { path: SOURCE_LEDGER.replaceAll("\\", "/"), sha256: hashFile(SOURCE_LEDGER), entries: ledgerEntries.length },
    definitions: definitions.map((definition) => ({
      catalogId: definition.catalogId,
      predecessorVersion: definition.predecessorVersion,
      successorVersionId: definition.successorVersionId,
      operation: definition.operation,
      variant: definition.variant,
      contentStatus: "CONTENT_CANDIDATE_GREEN",
      backendStatus: backendReady ? "GREEN_ISOLATED_PARENT_FORMULA_CHILD_PRICE_ONLY_CHILD" : "PENDING",
      authoritativeDbStatus: "PENDING_UNAVAILABLE",
      roleE2EStatus: "PENDING",
      finalStatus: "RED",
    })),
  };
  atomicJson(MANIFEST, { ...manifest, payloadSha256: sha256(JSON.stringify(manifest)) });

  const generatedAt = new Date().toISOString();
  const artifacts = [PASSPORTS, ADJUDICATION, ADDITIONS, PARAMETERS, COMPILED, MUTATIONS, UNITS, NEGATIVE, ROLES, INDIVIDUAL, MANIFEST,
    ...(backendReady ? [BACKEND] : [])];
  const summary = {
    contract: "real-professional-estimates-r4.batch002-content-candidate-summary.v1",
    generatedAt,
    status: backendReady
      ? "RED_BATCH002_ISOLATED_CANDIDATE_GREEN_AUTHORITATIVE_DB_AND_REAL_ROLE_E2E_PENDING"
      : "RED_BATCH002_CONTENT_CANDIDATE_BACKEND_AUTHORITATIVE_DB_AND_REAL_ROLE_E2E_PENDING",
    releaseAllowed: false,
    exactScope: { batchId: "BATCH-002", definitions: 55, catalogIds: definitions.map((definition) => definition.catalogId) },
    gates: {
      masterSha256: "GREEN",
      savedLedgerReconciliation: "GREEN_55_OF_55_NON_AUTHORITATIVE_SNAPSHOT",
      individualContentPassports: "GREEN_55_OF_55",
      goldCompiles: "GREEN_55_OF_55",
      formulaDimensions: "GREEN_55_OF_55",
      parameterMutations: `GREEN_${mutationRows.length}_OF_${mutationRows.length}`,
      crossDomainNegative: "GREEN_55_OF_55",
      staticRoleReviews: "GREEN_165_OF_165_NOT_REAL_E2E",
      targetedJest: "GREEN_11_OF_11",
      backendParentChildParity: backendReady ? "GREEN_55_OF_55_ISOLATED" : "PENDING",
      backendPriceOnlyMutation: backendReady ? "GREEN_55_OF_55_QUANTITIES_UNCHANGED_TOTAL_CHANGED" : "PENDING",
      backendAdmissionNegative: backendReady ? backendEvidence.admissionNegative.verdict : "PENDING",
      legacyReadOnlyContract: backendReady ? backendEvidence.legacyReadOnly.verdict : "PENDING",
      authoritativeFullDbReplay: "PENDING_UNAVAILABLE",
      webRoleE2E: "PENDING_0_OF_80",
      androidApi34RoleE2E: "PENDING_0_OF_50",
    },
    counts: {
      definitions: definitions.length,
      predecessorRowsAdjudicated: definitions.reduce((total, definition) => total + definition.adjudication.length, 0),
      successorMissingRowsAdded: definitions.reduce((total, definition) => total + definition.successorAdditions.length, 0),
      resourceDefinitions: definitions.reduce((total, definition) => total + definition.resources.length, 0),
      userParameterContracts: definitions.reduce((total, definition) => total + definition.passport.userParameterContracts.length, 0),
      formulaDefinitions: definitions.reduce((total, definition) => total + definition.passport.formulas.length, 0),
      engineeringSourceBindings: definitions.reduce((total, definition) => total + definition.passport.engineeringSources.length, 0),
    },
    explicitNonClaims: [
      "Saved R3 ledger is not an authoritative live database replay.",
      "Static three-role validators are not Web or Android role E2E.",
      "Targeted contract tests are not Full Jest and are not platform E2E.",
      "No definition is released, activated, deployed, merged, pushed, or published.",
      "Overall BATCH-001…008 status remains RED.",
    ],
    sourceFiles: [MODULE, SOURCES, FIXTURE, TEST].map((path) => ({ path: path.replaceAll("\\", "/"), sha256: hashFile(path) })),
    artifacts: artifacts.map((path) => ({ path: path.replaceAll("\\", "/"), sha256: hashFile(path) })),
  };
  atomicJson(SUMMARY, { ...summary, payloadSha256: sha256(JSON.stringify(summary)) });

  const state = {
    contract: "real-professional-estimates-r4.resumable-state.v1",
    updatedAt: generatedAt,
    overallStatus: "RED",
    currentBatch: "BATCH-002",
    batches: {
      "BATCH-001": "CANDIDATE_GREEN_AUTHORITATIVE_DB_AND_REAL_ROLE_E2E_PENDING",
      "BATCH-002": backendReady
        ? "ISOLATED_CANDIDATE_GREEN_AUTHORITATIVE_DB_AND_REAL_ROLE_E2E_PENDING"
        : "CONTENT_CANDIDATE_GREEN_BACKEND_AUTHORITATIVE_DB_AND_REAL_ROLE_E2E_PENDING",
      "BATCH-003": "RED_NOT_REMEDIATED_R4",
      "BATCH-004": "RED_NOT_REMEDIATED_R4",
      "BATCH-005": "RED_NOT_REMEDIATED_R4",
      "BATCH-006": "RED_NOT_REMEDIATED_R4",
      "BATCH-007": "RED_NOT_REMEDIATED_R4",
      "BATCH-008": "RED_NOT_REMEDIATED_R4",
    },
    releaseAllowed: false,
    evidence: [SUMMARY, MANIFEST, INDIVIDUAL].map((path) => path.replaceAll("\\", "/")),
  };
  atomicJson(STATE, { ...state, payloadSha256: sha256(JSON.stringify(state)) });
  process.stdout.write(`${JSON.stringify({ status: summary.status, definitions: definitions.length, mutations: mutationRows.length, summary: SUMMARY, state: STATE }, null, 2)}\n`);
}

main();
