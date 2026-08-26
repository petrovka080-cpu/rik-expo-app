import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { technologyPassportContentR2Sha256 } from "../../../src/lib/estimate/backendPlatform/technologyPassportAcceptanceR2";
import {
  evaluateTechnologyPassportR1,
  technologyPassportR1Sha256,
  type TechnologyPassportMaterialFamilyR1,
  type TechnologyPassportR1,
} from "../../../src/lib/estimate/backendPlatform/technologyPassportR1";
import { buildAllBatch001DrywallTechnologyPassportDraftsR1 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1";
import { buildAllBatch002DrywallTechnologyPassportDraftsR1 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsTechnologyPassportR1";
import { buildAllBatch001DrywallSuccessorsR3 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { buildAllBatch002DrywallSuccessorsR3 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import {
  DRYWALL_MATERIAL_SELECTION_R33_CONTRACT,
  MASTER_TZ_R33_SHA256,
  MASTER_TZ_R33_SOURCE_ID,
  drywallMaterialSelectionInventoryR33,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallMaterialSelectionR33";

type Json = Record<string, unknown>;

const ROOT = resolve(".");
const EVIDENCE_ROOT = resolve(".release-runtime/real-useful-estimates-r3/evidence/r3-3-closeout");
const EXECUTION_STATE = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R33.json");
const SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "07_CURRENT_SOURCE_IDENTITY_R33.json");
const TARGETED_TEST_RESULT = resolve(EVIDENCE_ROOT, "08_R33_TARGETED_TEST_RESULT.json");
const SHADOW_REVALIDATION = resolve(EVIDENCE_ROOT, "09_R33_SHADOW_REVALIDATION.json");
const MATERIAL_JSONL = resolve(EVIDENCE_ROOT, "10_MATERIAL_SELECTION_RESOLUTION_R33.jsonl");
const PACKET_ROOT = resolve(EVIDENCE_ROOT, "review-packets");
const PACKET_MANIFEST = resolve(EVIDENCE_ROOT, "11_ENGINEER_REVIEW_PACKET_MANIFEST_R33.json");
const SUMMARY = resolve(EVIDENCE_ROOT, "12_MATERIAL_SELECTION_CLOSEOUT_R33.json");
const VERDICT = resolve(EVIDENCE_ROOT, "13_AUTOMATED_MATERIAL_CLOSEOUT_VERDICT_R33.json");
const OWNERSHIP_ROOT = resolve(EVIDENCE_ROOT, "ownership-r33");
const OWNERSHIP_GRAPH = resolve(OWNERSHIP_ROOT, "04_PRODUCTION_REACHABILITY_GRAPH.json");
const CANONICAL_OWNERSHIP = resolve(OWNERSHIP_ROOT, "05_CANONICAL_CODE_OWNERSHIP.json");
const DEAD_CODE_LEDGER = resolve(OWNERSHIP_ROOT, "06_DEAD_CODE_LEDGER.json");
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR3/buildR33MaterialSelectionReviewPackets.ts");
const FROZEN_BATCH001_DRAFTS = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch001/BATCH001_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl");
const FROZEN_BATCH002_DRAFTS = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch002/BATCH002_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl");
const FORBIDDEN_VISIBLE_MATERIAL_PLACEHOLDER = /(?:^\s*указать(?:\s|$)|project_system_specification_required|(?:выбранн|проектн)\S*\s+(?:материал|состав|издели|марка|тип|спецификац)|точная\s+позиция\s+выбранной\s+системы)/iu;

const EXPECTED = {
  batch001Passports: 16,
  batch002Passports: 55,
  passports: 71,
  batch001Materials: 106,
  batch002Materials: 294,
  materials: 400,
  required: 194,
  conditional: 206,
  uniqueFamilies: 59,
  equipment: 142,
  technologyDerived: 102,
  acceptedPreliminary: 168,
  projectInput: 130,
  targetedSuites: 3,
  targetedTests: 26,
  productionModules: 3410,
  reachableModules: 1886,
  roots: 71,
} as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path: string): string {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return sha256(readFileSync(path));
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function readJson(path: string): Json {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
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

function objectSha256(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeJson(path: string, value: Json): string {
  const payload = { ...value, payload_sha256: objectSha256(value) };
  atomicWrite(path, `${JSON.stringify(payload, null, 2)}\n`);
  return fileSha256(path);
}

function materialRecord(
  passport: TechnologyPassportR1,
  batch: "BATCH-001" | "BATCH-002",
  material: TechnologyPassportMaterialFamilyR1,
  inclusion: "REQUIRED" | "CONDITIONAL",
): Json {
  const resolution = material.selectionResolutionR33;
  invariant(resolution, `R33_SELECTION_RESOLUTION_MISSING:${passport.catalogId}:${material.familyId}`);
  invariant(resolution.contract === DRYWALL_MATERIAL_SELECTION_R33_CONTRACT,
    `R33_SELECTION_CONTRACT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(resolution.sourceIds.includes(MASTER_TZ_R33_SOURCE_ID),
    `R33_MASTER_SOURCE_BINDING_MISSING:${passport.catalogId}:${material.familyId}`);

  const parameterById = new Map(passport.userInputs.map((parameter) => [parameter.parameterId, parameter]));
  const formula = passport.quantityFormulas.find((item) => item.formulaId === material.formulaId);
  const procurement = passport.procurementRules.find((item) => item.procurementRuleId === material.procurementRuleId);
  const selectionParameter = parameterById.get(resolution.selectionParameterId);
  const normParameter = parameterById.get(`norm_${material.familyId}`);
  const lossParameter = parameterById.get(`loss_${material.familyId}_percent`);
  const packageParameter = parameterById.get(`package_size_${material.familyId}`);

  invariant(selectionParameter?.titleRu === resolution.selectionParameterTitleRu,
    `R33_SELECTION_PARAMETER_TITLE_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(selectionParameter.guideRu === resolution.plainHintRu,
    `R33_SELECTION_PARAMETER_HINT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(selectionParameter.acceptedDefault === resolution.preliminaryValueRu,
    `R33_SELECTION_DEFAULT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(normParameter?.acceptedDefault === resolution.preliminaryNormPerResultUnit,
    `R33_NORM_DEFAULT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(lossParameter?.acceptedDefault === resolution.preliminaryLossPercent,
    `R33_LOSS_DEFAULT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(packageParameter?.acceptedDefault === resolution.preliminaryPackageSize,
    `R33_PACKAGE_DEFAULT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(formula?.outputUnitId === resolution.materialUnitId,
    `R33_FORMULA_UNIT_DRIFT:${passport.catalogId}:${material.familyId}`);
  invariant(procurement?.packageUnitRu === resolution.packageUnitRu,
    `R33_PROCUREMENT_PACKAGE_DRIFT:${passport.catalogId}:${material.familyId}`);

  return {
    schema_version: "master-r33.material-selection-resolution.v1",
    batch,
    catalog_id: passport.catalogId,
    technology_variant_id: passport.technologyVariantId,
    inclusion,
    expectation_id: material.expectationId,
    family_id: material.familyId,
    stage_id: material.stageId,
    inclusion_condition: material.inclusionCondition,
    public_boq_title_ru: resolution.publicBoqTitleRu,
    technical_specification_ru: resolution.technicalSpecificationRu,
    strategy: resolution.strategy,
    user_input: {
      parameter_id: resolution.selectionParameterId,
      title_ru: resolution.selectionParameterTitleRu,
      plain_hint_ru: resolution.plainHintRu,
      preliminary_value_ru: resolution.preliminaryValueRu,
      allowed_range_ru: resolution.allowedRangeRu,
      confirmation_required: resolution.confirmationRequired,
      safety_critical: resolution.safetyCritical,
    },
    quantity: {
      formula_id: formula.formulaId,
      expression: formula.expressionSource,
      material_unit_id: resolution.materialUnitId,
      preliminary_norm_per_result_unit: resolution.preliminaryNormPerResultUnit,
      preliminary_loss_percent: resolution.preliminaryLossPercent,
    },
    procurement: {
      rule_id: procurement.procurementRuleId,
      package_size: resolution.preliminaryPackageSize,
      package_unit_ru: resolution.packageUnitRu,
      package_size_formula: procurement.packageSizeFormula,
      rounding_rule_ru: procurement.roundingRule,
    },
    source_ids: [...resolution.sourceIds].sort(),
    resolution_status: resolution.confirmationRequired
      ? "PRELIMINARY_VALUE_PRESENT_PROJECT_CONFIRMATION_REQUIRED"
      : "PRELIMINARY_VALUE_PRESENT_USER_EDITABLE",
    engineer_accepted: false,
  };
}

function reviewPacket(passport: TechnologyPassportR1, batch: "BATCH-001" | "BATCH-002"): Json {
  const decision = evaluateTechnologyPassportR1(passport, []);
  invariant(!decision.allowed && decision.status === "RED"
    && decision.errors.length === 1 && decision.errors[0] === "ENGINEER_ACCEPTANCE_MISSING",
  `R33_PASSPORT_STRUCTURE_RED:${passport.catalogId}:${decision.errors.join("|")}`);
  invariant(passport.provenance.review.status === "DRAFT"
    && passport.provenance.review.reviewerId === "UNASSIGNED_ENGINEERING_REVIEW",
  `R33_FALSE_ENGINEERING_REVIEW:${passport.catalogId}`);

  const required = passport.requiredMaterialFamilies.map((material) => materialRecord(passport, batch, material, "REQUIRED"));
  const conditional = passport.conditionalMaterialFamilies.map((material) => materialRecord(passport, batch, material, "CONDITIONAL"));
  const materials = [...required, ...conditional];
  const sourceBindings = passport.normSources.map((source) => {
    const evidence = passport.provenance.evidence.find((item) => item.evidenceId === source.evidenceId);
    invariant(evidence, `R33_SOURCE_EVIDENCE_MISSING:${passport.catalogId}:${source.sourceId}`);
    return {
      source_id: source.sourceId,
      evidence_id: source.evidenceId,
      title: source.title,
      edition_or_version: source.editionOrVersion,
      page_or_section: source.locator,
      applicability_ru: source.applicabilityRu,
      source_file_sha256: evidence.contentSha256,
      human_claim_review_status: "PENDING_REAL_ENGINEER_REVIEW",
    };
  }).sort((left, right) => left.source_id.localeCompare(right.source_id));

  return {
    schema_version: "master-r33.independent-engineer-review-packet.v1",
    status: "AUTOMATED_CONTENT_COMPLETE_HUMAN_REVIEW_PENDING",
    batch,
    catalog_id: passport.catalogId,
    technology_variant_id: passport.technologyVariantId,
    public_work_title_ru: passport.publicWorkTitleRu,
    result_unit_id: passport.resultUnitId,
    technology_passport_sha256: technologyPassportR1Sha256(passport),
    passport_content_sha256: technologyPassportContentR2Sha256(passport),
    structural_decision: decision,
    applicability_ru: passport.applicabilityRu,
    stages: passport.stages,
    material_resolution: {
      occurrences: materials.length,
      resolved: materials.length,
      required: required.length,
      conditional: conditional.length,
      project_confirmation_required: materials.filter((item) => item.strategy === "REQUIRED_PROJECT_INPUT").length,
      items: materials,
    },
    construction_operations: passport.constructionOperations,
    equipment_rules: passport.equipmentRules,
    delivery_flows: passport.deliveryFlows,
    waste_flows: passport.wasteFlows,
    quantity_formulas: passport.quantityFormulas,
    procurement_rules: passport.procurementRules,
    user_inputs: passport.userInputs,
    preliminary_assumptions: passport.acceptedPreliminaryAssumptions,
    exclusions: passport.exclusions,
    source_review_bindings: sourceBindings,
    human_acceptance: {
      author_attestation_present: false,
      independent_engineer_accepted: false,
      reviewer_id: null,
      reviewed_at_utc: null,
      signature_or_audit_id: null,
      created_by_agent: false,
      fabricated: false,
    },
    unsigned_acceptance_manifest_template: {
      catalogId: passport.catalogId,
      technologyVariantId: passport.technologyVariantId,
      passportContentSha256: technologyPassportContentR2Sha256(passport),
      sourceSetSha256: null,
      reviewerId: null,
      reviewerRole: "engineer",
      reviewerScope: null,
      decision: null,
      comment: null,
      acceptedAtUtc: null,
      signatureOrAuditId: null,
      acceptanceOrigin: "HUMAN_SIGNED_AUDIT_REQUIRED",
      createdByAgent: false,
    },
    terminal_blockers: [
      "REAL_ENGINEERING_AUTHOR_ATTESTATION_MISSING",
      "INDEPENDENT_ENGINEER_DECISION_MISSING",
      "SIGNED_SOURCE_CLAIMS_MISSING",
      "SIGNATURE_OR_AUDIT_ID_MISSING",
    ],
  };
}

function main(): void {
  invariant(fileSha256(TOOL).length === 64, "R33_TOOL_HASH_RED");
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const targeted = readJson(TARGETED_TEST_RESULT);
  invariant(sourceIdentity.status === "R33_SOURCE_IDENTITY_GREEN", "R33_SOURCE_IDENTITY_RED");
  invariant((sourceIdentity.master_contract as Json)?.sha256 === MASTER_TZ_R33_SHA256, "R33_SOURCE_MASTER_DRIFT");
  invariant(targeted.success === true
    && targeted.numPassedTestSuites === EXPECTED.targetedSuites
    && targeted.numFailedTestSuites === 0
    && targeted.numPassedTests === EXPECTED.targetedTests
    && targeted.numFailedTests === 0,
  "R33_TARGETED_TEST_RESULT_RED");
  const ownershipGraph = readJson(OWNERSHIP_GRAPH);
  const ownership = readJson(CANONICAL_OWNERSHIP);
  const deadCodeLedger = readJson(DEAD_CODE_LEDGER);
  invariant(ownershipGraph.master_contract_sha256 === MASTER_TZ_R33_SHA256
    && ownershipGraph.production_source_modules === EXPECTED.productionModules
    && ownershipGraph.runtime_reachable_modules === EXPECTED.reachableModules
    && ownershipGraph.total_roots === EXPECTED.roots,
  "R33_OWNERSHIP_GRAPH_RED");
  invariant(ownership.master_contract_sha256 === MASTER_TZ_R33_SHA256
    && ownership.status === "GREEN_R33_CANONICAL_OWNERSHIP"
    && (ownership.blockers as unknown[]).length === 0
    && ownership.confirmed_dead_source_remaining_in_bounded_scope === 0,
  "R33_CANONICAL_OWNERSHIP_RED");
  invariant(deadCodeLedger.master_contract_sha256 === MASTER_TZ_R33_SHA256,
    "R33_DEAD_CODE_LEDGER_MASTER_DRIFT");
  const gitHead = String((sourceIdentity.git as Json).head);
  const noTestWeakeningPath = resolve(".release-runtime/current-core-no-test-weakening", gitHead, "summary.json");
  const noTestWeakening = readJson(noTestWeakeningPath);
  invariant(noTestWeakening.final_status === "GREEN_CURRENT_CORE_NO_TEST_WEAKENING_AUDIT"
    && (noTestWeakening.blockers as unknown[]).length === 0
    && (noTestWeakening.forbidden_focus_changes as unknown[]).length === 0
    && (noTestWeakening.timeout_or_memory_weakening_changes as unknown[]).length === 0,
  "R33_NO_TEST_WEAKENING_RED");

  const batch001 = buildAllBatch001DrywallTechnologyPassportDraftsR1();
  const batch002 = buildAllBatch002DrywallTechnologyPassportDraftsR1();
  invariant(batch001.length === EXPECTED.batch001Passports, "R33_BATCH001_PASSPORT_COUNT_RED");
  invariant(batch002.length === EXPECTED.batch002Passports, "R33_BATCH002_PASSPORT_COUNT_RED");

  const packets = [
    ...batch001.map((passport) => reviewPacket(passport, "BATCH-001")),
    ...batch002.map((passport) => reviewPacket(passport, "BATCH-002")),
  ].sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
  invariant(packets.length === EXPECTED.passports, "R33_PACKET_COUNT_RED");

  const frozenBatch001 = readJsonl(FROZEN_BATCH001_DRAFTS).map((row) => row.passport as TechnologyPassportR1);
  const frozenBatch002 = readJsonl(FROZEN_BATCH002_DRAFTS).map((row) => row as unknown as TechnologyPassportR1);
  invariant(frozenBatch001.length === EXPECTED.batch001Passports, "R33_FROZEN_BATCH001_COUNT_RED");
  invariant(frozenBatch002.length === EXPECTED.batch002Passports, "R33_FROZEN_BATCH002_COUNT_RED");
  const frozenMaterials = new Map<string, TechnologyPassportMaterialFamilyR1>();
  for (const [batch, frozenPassports] of [["BATCH-001", frozenBatch001], ["BATCH-002", frozenBatch002]] as const) {
    for (const passport of frozenPassports) {
      for (const material of [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies]) {
        const key = `${batch}\u0000${passport.catalogId}\u0000${material.familyId}`;
        invariant(!frozenMaterials.has(key), `R33_FROZEN_MATERIAL_DUPLICATE:${key}`);
        frozenMaterials.set(key, material);
      }
    }
  }
  invariant(frozenMaterials.size === EXPECTED.materials, "R33_FROZEN_MATERIAL_DENOMINATOR_RED");

  const records = packets.flatMap((packet) => ((packet.material_resolution as Json).items as Json[]));
  const batch001Records = records.filter((record) => record.batch === "BATCH-001");
  const batch002Records = records.filter((record) => record.batch === "BATCH-002");
  invariant(batch001Records.length === EXPECTED.batch001Materials, "R33_BATCH001_MATERIAL_COUNT_RED");
  invariant(batch002Records.length === EXPECTED.batch002Materials, "R33_BATCH002_MATERIAL_COUNT_RED");
  invariant(records.length === EXPECTED.materials, "R33_MATERIAL_COUNT_RED");
  invariant(records.filter((record) => record.inclusion === "REQUIRED").length === EXPECTED.required, "R33_REQUIRED_COUNT_RED");
  invariant(records.filter((record) => record.inclusion === "CONDITIONAL").length === EXPECTED.conditional, "R33_CONDITIONAL_COUNT_RED");
  invariant(new Set(records.map((record) => String(record.family_id))).size === EXPECTED.uniqueFamilies,
    "R33_UNIQUE_FAMILY_COUNT_RED");
  invariant(drywallMaterialSelectionInventoryR33().length === EXPECTED.uniqueFamilies, "R33_SELECTION_OWNER_COUNT_RED");
  invariant(records.filter((record) => record.strategy === "TECHNOLOGY_DERIVED").length === EXPECTED.technologyDerived,
    "R33_TECHNOLOGY_DERIVED_COUNT_RED");
  invariant(records.filter((record) => record.strategy === "ACCEPTED_PRELIMINARY_VALUE").length === EXPECTED.acceptedPreliminary,
    "R33_PRELIMINARY_COUNT_RED");
  invariant(records.filter((record) => record.strategy === "REQUIRED_PROJECT_INPUT").length === EXPECTED.projectInput,
    "R33_PROJECT_INPUT_COUNT_RED");
  const beforeAfterRecords = records.map((record) => {
    const key = `${record.batch}\u0000${record.catalog_id}\u0000${record.family_id}`;
    const before = frozenMaterials.get(key);
    invariant(before, `R33_FROZEN_MATERIAL_BINDING_MISSING:${key}`);
    invariant(FORBIDDEN_VISIBLE_MATERIAL_PLACEHOLDER.test(before.specificationRequirementRu),
      `R33_BEFORE_PLACEHOLDER_EXPECTATION_DRIFT:${key}`);
    const afterValues = [
      String(record.public_boq_title_ru),
      String(record.technical_specification_ru),
      String((record.user_input as Json).plain_hint_ru),
      String((record.user_input as Json).preliminary_value_ru),
    ];
    invariant(afterValues.every((value) => !FORBIDDEN_VISIBLE_MATERIAL_PLACEHOLDER.test(value)),
      `R33_AFTER_VISIBLE_PLACEHOLDER_REMAINS:${key}`);
    return {
      ...record,
      before: {
        public_boq_title_ru: before.titleRu,
        abstract_specification_requirement_ru: before.specificationRequirementRu,
        visible_placeholder: true,
      },
      after: {
        public_boq_title_ru: record.public_boq_title_ru,
        technical_specification_ru: record.technical_specification_ru,
        plain_hint_ru: (record.user_input as Json).plain_hint_ru,
        preliminary_value_ru: (record.user_input as Json).preliminary_value_ru,
        visible_placeholder: false,
      },
      before_after_changed: before.titleRu !== record.public_boq_title_ru
        || before.specificationRequirementRu !== record.technical_specification_ru,
    };
  });
  invariant(beforeAfterRecords.length === EXPECTED.materials
    && beforeAfterRecords.every((record) => record.before_after_changed === true),
  "R33_BEFORE_AFTER_DIFF_RED");
  const equipmentCount = packets.reduce((total, packet) => total + (packet.equipment_rules as unknown[]).length, 0);
  invariant(equipmentCount === EXPECTED.equipment, "R33_EQUIPMENT_COUNT_RED");

  const generatedAt = new Date().toISOString();
  const sourceIdentitySha256 = fileSha256(SOURCE_IDENTITY);
  const productSourceSha256 = String((sourceIdentity.hashes as Json).product_source_sha256);
  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_TZ_R33_SHA256,
    current_source_identity: { path: repoPath(SOURCE_IDENTITY), sha256: sourceIdentitySha256 },
    exact_product_source_sha256: productSourceSha256,
    targeted_test_result: { path: repoPath(TARGETED_TEST_RESULT), sha256: fileSha256(TARGETED_TEST_RESULT), suites: "3/3", tests: "26/26" },
    dependent_architecture: {
      graph: { path: repoPath(OWNERSHIP_GRAPH), sha256: fileSha256(OWNERSHIP_GRAPH) },
      ownership: { path: repoPath(CANONICAL_OWNERSHIP), sha256: fileSha256(CANONICAL_OWNERSHIP) },
      dead_code_ledger: { path: repoPath(DEAD_CODE_LEDGER), sha256: fileSha256(DEAD_CODE_LEDGER) },
      production_modules: EXPECTED.productionModules,
      runtime_reachable_modules: EXPECTED.reachableModules,
      roots: EXPECTED.roots,
      confirmed_dead_source_remaining: 0,
    },
    no_test_weakening: {
      path: repoPath(noTestWeakeningPath),
      sha256: fileSha256(noTestWeakeningPath),
      blockers: 0,
      forbidden_focus_changes: 0,
      timeout_or_memory_weakening_changes: 0,
    },
    tool: { path: repoPath(TOOL), sha256: fileSha256(TOOL) },
    production_accessed: false,
    production_mutated: false,
    release_performed: false,
    deploy_performed: false,
    human_acceptances_fabricated: 0,
  };

  const shadowBatch001 = buildAllBatch001DrywallSuccessorsR3().map((definition) => ({
    batch: "BATCH-001",
    catalog_id: definition.catalogId,
    technology_passport_sha256: definition.shadowRealUsefulGateR1.technologyPassportSha256,
    structural_decision: definition.shadowRealUsefulGateR1.passportDecision,
    review_status: definition.shadowRealUsefulGateR1.passportReviewStatus,
    production_admission_attached: definition.shadowRealUsefulGateR1.productionAdmissionAttached,
    runtime_remediation_blockers: definition.shadowRealUsefulGateR1.runtimeRemediationBlockers,
    status: definition.shadowRealUsefulGateR1.status,
  }));
  const shadowBatch002 = buildAllBatch002DrywallSuccessorsR3().map((definition) => ({
    batch: "BATCH-002",
    catalog_id: definition.catalogId,
    technology_passport_sha256: definition.shadowRealUsefulGateR1.technologyPassportSha256,
    review_status: definition.shadowRealUsefulGateR1.reviewStatus,
    production_admission_attached: definition.shadowRealUsefulGateR1.productionAdmissionAttached,
    runtime_remediation_blockers: definition.shadowRealUsefulGateR1.blockers,
    status: definition.shadowRealUsefulGateR1.status,
  }));
  invariant(shadowBatch001.length === EXPECTED.batch001Passports
    && shadowBatch001.every((item) => item.structural_decision.errors.length === 1
      && item.structural_decision.errors[0] === "ENGINEER_ACCEPTANCE_MISSING"),
  "R33_BATCH001_SHADOW_RED");
  invariant(shadowBatch002.length === EXPECTED.batch002Passports
    && shadowBatch002.every((item) => item.status === "RED" && item.production_admission_attached === false),
  "R33_BATCH002_SHADOW_RED");
  const shadowSha256 = writeJson(SHADOW_REVALIDATION, {
    schema_version: "master-r33.batch001002-shadow-revalidation.v1",
    ...common,
    status: "SHADOW_REBUILT_71_OF_71_CONTENT_HUMAN_BLOCKED",
    batch001: { rebuilt: 16, denominator: 16, items: shadowBatch001 },
    batch002: { rebuilt: 55, denominator: 55, items: shadowBatch002 },
    production_admission_attached: 0,
    engineer_accepted: 0,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  atomicWrite(MATERIAL_JSONL, `${beforeAfterRecords.map((record) => JSON.stringify(record)).join("\n")}\n`);
  mkdirSync(PACKET_ROOT, { recursive: true });
  const packetEntries = packets.map((packet) => {
    const path = resolve(PACKET_ROOT, `${String(packet.catalog_id)}.json`);
    const sha = writeJson(path, { ...common, ...packet });
    return {
      catalog_id: packet.catalog_id,
      batch: packet.batch,
      path: repoPath(path),
      sha256: sha,
      technology_passport_sha256: packet.technology_passport_sha256,
      passport_content_sha256: packet.passport_content_sha256,
      material_occurrences: (packet.material_resolution as Json).occurrences,
      material_resolved: (packet.material_resolution as Json).resolved,
      engineer_accepted: false,
    };
  });

  const packetManifestSha256 = writeJson(PACKET_MANIFEST, {
    schema_version: "master-r33.engineer-review-packet-manifest.v1",
    ...common,
    status: "REVIEW_PACKETS_71_OF_71_AUTOMATED_COMPLETE_HUMAN_PENDING",
    packet_count: packetEntries.length,
    engineer_accepted: 0,
    packets: packetEntries,
  });

  const summarySha256 = writeJson(SUMMARY, {
    schema_version: "master-r33.material-selection-closeout.v1",
    ...common,
    status: "MATERIAL_SELECTION_400_OF_400_AUTOMATED_GREEN_HUMAN_CONFIRMATION_PENDING",
    passports: { batch001: 16, batch002: 55, total: 71, review_packets_built: 71 },
    materials: {
      batch001: 106,
      batch002: 294,
      total: 400,
      resolved: 400,
      unresolved: 0,
      required: 194,
      conditional: 206,
      unique_family_ids: 59,
      strategy: {
        technology_derived: 102,
        accepted_preliminary_value: 168,
        required_project_input: 130,
      },
      before_visible_placeholders: 400,
      after_visible_placeholders: 0,
      before_after_diffs: 400,
    },
    equipment: { numeric_rules_present: 142, denominator: 142 },
    architecture_transition: {
      previous_production_modules: 3410,
      current_production_modules: 3410,
      exact_added_modules: ["src/lib/estimate/v4/domains/interiorFinishesComplete/drywallMaterialSelectionR33.ts"],
      exact_removed_modules: ["src/features/consumerRepair/requestEstimateLegacyTestActions.ts"],
      added_module_role: "single canonical owner for all 59 drywall material-selection families and 400 reviewed occurrences",
      removed_module_role: "retired throwing test-only frontend compiler fixture; current request flow compiles only through the canonical backend client",
      previous_runtime_reachable_modules: 1886,
      current_runtime_reachable_modules: 1886,
      runtime_reachability_note: "review/shadow material-selection owner remains outside production admission until signed engineering acceptance",
      roots: 71,
      ownership_blockers: 0,
      confirmed_dead_source_remaining: 0,
    },
    engineering_acceptance: { accepted: 0, denominator: 71, fabricated: 0 },
    artifacts: {
      material_resolution_jsonl: { path: repoPath(MATERIAL_JSONL), sha256: fileSha256(MATERIAL_JSONL) },
      shadow_revalidation: { path: repoPath(SHADOW_REVALIDATION), sha256: shadowSha256 },
      packet_manifest: { path: repoPath(PACKET_MANIFEST), sha256: packetManifestSha256 },
    },
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  const verdictSha256 = writeJson(VERDICT, {
    schema_version: "master-r33.automated-material-closeout-verdict.v1",
    ...common,
    status: "R33_AUTOMATED_MATERIAL_CLOSEOUT_GREEN_HUMAN_ACCEPTANCE_BLOCKED",
    gates: {
      exact_material_selection: "GREEN_400_OF_400",
      visible_material_selection_placeholders: "GREEN_ZERO_OF_400_AFTER",
      before_after_material_diffs: "GREEN_400_OF_400",
      shadow_revalidation: "GREEN_REBUILT_16_PLUS_55_HUMAN_BLOCKED",
      independent_review_packets: "GREEN_71_OF_71",
      equipment_numeric_characteristics: "GREEN_142_OF_142",
      structural_graph: "GREEN_71_OF_71",
      targeted_tests: "GREEN_3_SUITES_26_TESTS",
      source_reseal: "GREEN",
      canonical_ownership: "GREEN_3410_MODULES_1886_REACHABLE_71_ROOTS_ZERO_BLOCKERS",
      dead_source: "GREEN_ZERO_CONFIRMED_DEAD_OWNERS_REMAINING",
      no_test_weakening: "GREEN_ZERO_BLOCKERS",
      engineer_acceptance: "RED_0_OF_71",
      release: "BLOCKED",
    },
    parent_artifacts: {
      source_identity: { path: repoPath(SOURCE_IDENTITY), sha256: sourceIdentitySha256 },
      material_closeout: { path: repoPath(SUMMARY), sha256: summarySha256 },
      packet_manifest: { path: repoPath(PACKET_MANIFEST), sha256: packetManifestSha256 },
      material_resolution_jsonl: { path: repoPath(MATERIAL_JSONL), sha256: fileSha256(MATERIAL_JSONL) },
    },
    terminal_human_blockers: {
      engineer_signatures_missing: 71,
      independent_engineer_acceptance_missing: 71,
      project_confirmation_required_material_occurrences: 130,
      signed_source_claim_sets_missing: 71,
    },
    global_status: "R3_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  writeJson(EXECUTION_STATE, {
    schema_version: "master-r33.execution-state.v2",
    ...common,
    current_phase: "R3_3_C_AUTOMATED_MATERIAL_CLOSEOUT_COMPLETE_HUMAN_REVIEW_REQUIRED",
    automated_stage_status: "GREEN",
    material_selection_scope: {
      occurrences: 400,
      resolved: 400,
      unresolved: 0,
      required: 194,
      conditional: 206,
      project_confirmation_required: 130,
    },
    review_packets: { built: 71, denominator: 71 },
    equipment_numeric: { present: 142, denominator: 142 },
    architecture: {
      production_modules: 3410,
      runtime_reachable_modules: 1886,
      roots: 71,
      ownership_blockers: 0,
      confirmed_dead_source_remaining: 0,
    },
    engineering_acceptance: { accepted: 0, denominator: 71, fabricated: 0 },
    verdict: { path: repoPath(VERDICT), sha256: verdictSha256 },
    production_ready: false,
    release_performed: false,
    production_accessed: false,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
    terminal_wording: "R3_IN_PROGRESS / GLOBAL_RED / NOT_PRODUCTION_READY / NO_RELEASE",
  });

  process.stdout.write(`${JSON.stringify({
    status: "R33_AUTOMATED_MATERIAL_CLOSEOUT_GREEN_HUMAN_ACCEPTANCE_BLOCKED",
    source_identity_sha256: sourceIdentitySha256,
    product_source_sha256: productSourceSha256,
    passports: "71/71",
    materials: "400/400",
    equipment: "142/142",
    targeted: "3 suites / 26 tests",
    engineer_accepted: "0/71",
    verdict_sha256: verdictSha256,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
