import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT,
  technologyPassportContentR2Sha256,
} from "../../../src/lib/estimate/backendPlatform/technologyPassportAcceptanceR2";
import {
  evaluateTechnologyPassportR1,
  technologyPassportR1Sha256,
  type TechnologyPassportR1,
} from "../../../src/lib/estimate/backendPlatform/technologyPassportR1";

type Json = Record<string, any>;

const ROOT = resolve(".");
const MASTER_SHA256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820";
const EVIDENCE_ROOT = resolve(".release-runtime/real-estimates-global-green-r3/evidence");
const SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
const PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "02_PRODUCT_SOURCE_MANIFEST_R3.json");
const HUMAN_ACCEPTANCE = resolve(EVIDENCE_ROOT, "HUMAN_ACCEPTANCE_PLATFORM_R3.json");
const DENOMINATOR = resolve(EVIDENCE_ROOT, "05_CONTENT_AUTHORING_DENOMINATOR_R3.json");
const BATCH001_SHADOW = resolve(EVIDENCE_ROOT, "26_BATCH001_SHADOW_REVALIDATION_R3.json");
const BATCH002_SHADOW = resolve(EVIDENCE_ROOT, "27_BATCH002_SHADOW_REVALIDATION_R3.json");
const BATCH001_DRAFTS = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch001/BATCH001_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl",
);
const BATCH002_DRAFTS = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch002/BATCH002_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl",
);
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR3/buildBatch001002EngineerReviewReadinessR32.ts");

const EXPECTED = {
  batch001_drafts: "f0066d5262e1bb3def908b5bb804371533cb965837582f9a36ba39a92f839d69",
  batch002_drafts: "085a8e84fd255741e08808a5e0e8e6fa55535c3a1e9d0e59bfc0c9fe206ecf53",
  batch001_passports: 16,
  batch002_passports: 55,
  batch001_material_occurrences: 106,
  batch002_material_occurrences: 294,
  batch001_equipment_occurrences: 32,
  batch002_equipment_occurrences: 110,
} as const;

const PROJECT_SOURCE_ID = "PROJECT_SYSTEM_SPECIFICATION_REQUIRED_R1";
const ZERO_SHA256 = "0".repeat(64);
const NUMERIC_EQUIPMENT_CHARACTERISTIC = /\d[\d.,–—-]*\s*(?:м³\/ч|кг\/ч|об\/мин|мм²|м²|м³|м3|мм|см|м|кг|т|квт|вт|л|бар|мпа|а|в)(?=$|[\s,;:.)])/iu;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function fileSha256(path: string): string {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return sha256(readFileSync(path));
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

function writeEvidence(path: string, value: Json): string {
  const withPayload = { ...value, payload_sha256: objectSha256(value) };
  atomicWrite(path, `${JSON.stringify(withPayload, null, 2)}\n`);
  return fileSha256(path);
}

function sourceReviewBindings(passport: TechnologyPassportR1): Json[] {
  const evidenceById = new Map(passport.provenance.evidence.map((item) => [item.evidenceId, item]));
  return passport.normSources.map((source) => {
    const evidence = evidenceById.get(source.evidenceId);
    invariant(evidence, `NORM_SOURCE_EVIDENCE_MISSING:${passport.catalogId}:${source.sourceId}`);
    return {
      source_id: source.sourceId,
      evidence_id: source.evidenceId,
      document_title: source.title,
      edition_or_version: source.editionOrVersion,
      page_or_section: source.locator,
      source_file_sha256: evidence.contentSha256,
      evidence_kind: evidence.sourceKind,
      human_claim_review_status: "REQUIRED_NOT_SIGNED",
    };
  }).sort((left, right) => left.source_id.localeCompare(right.source_id));
}

function reviewPacket(
  passport: TechnologyPassportR1,
  batch: "BATCH-001" | "BATCH-002",
  storedDraftSha256: string | null,
): Json {
  const decision = evaluateTechnologyPassportR1(passport, []);
  invariant(!decision.allowed && decision.errors.length === 1
    && decision.errors[0] === "ENGINEER_ACCEPTANCE_MISSING",
  `${batch}_STRUCTURAL_GRAPH_RED:${passport.catalogId}:${decision.errors.join(",")}`);
  invariant(passport.provenance.review.status === "DRAFT",
    `${batch}_FALSE_REVIEW_STATUS:${passport.catalogId}`);
  invariant(passport.provenance.review.reviewerId === "UNASSIGNED_ENGINEERING_REVIEW",
    `${batch}_REVIEWER_PLACEHOLDER_DRIFT:${passport.catalogId}`);
  invariant(passport.provenance.review.reviewEvidenceSha256 === ZERO_SHA256,
    `${batch}_REVIEW_EVIDENCE_PLACEHOLDER_DRIFT:${passport.catalogId}`);

  const passportR1Sha256 = technologyPassportR1Sha256(passport);
  if (storedDraftSha256 !== null) {
    invariant(storedDraftSha256 === passportR1Sha256,
      `${batch}_STORED_PASSPORT_HASH_MISMATCH:${passport.catalogId}`);
  }

  const materials = [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies];
  const materialRequirements = materials.map((material) => {
    const explicitlyPending = /^Указать(?:\s|$)/iu.test(material.specificationRequirementRu.normalize("NFKC").trim());
    invariant(explicitlyPending && material.normSourceIds.includes(PROJECT_SOURCE_ID),
      `${batch}_MATERIAL_PROJECT_REQUIREMENT_NOT_FAIL_CLOSED:${passport.catalogId}:${material.familyId}`);
    return {
      expectation_id: material.expectationId,
      family_id: material.familyId,
      title_ru: material.titleRu,
      inclusion_condition: material.inclusionCondition,
      exact_project_values_required_ru: material.specificationRequirementRu,
      norm_source_ids: [...material.normSourceIds].sort(),
      readiness: "PROJECT_SELECTION_PENDING_NOT_GUESSED",
    };
  }).sort((left, right) => left.expectation_id.localeCompare(right.expectation_id));

  const equipmentRules = passport.equipmentRules.map((equipment) => {
    const numeric = equipment.keyCharacteristicsRu.some((value) => NUMERIC_EQUIPMENT_CHARACTERISTIC.test(value));
    invariant(numeric, `${batch}_EQUIPMENT_NUMERIC_CHARACTERISTIC_MISSING:${passport.catalogId}:${equipment.equipmentRuleId}`);
    return {
      expectation_id: equipment.expectationId,
      equipment_rule_id: equipment.equipmentRuleId,
      title_ru: equipment.titleRu,
      equipment_class_ru: equipment.equipmentClassRu,
      key_characteristics_ru: equipment.keyCharacteristicsRu,
      inclusion_condition: equipment.inclusionCondition,
      operation_id: equipment.operationId,
      norm_source_ids: [...equipment.normSourceIds].sort(),
      numeric_characteristic_present: true,
      readiness: "NUMERIC_RULE_PRESENT_REQUIRES_ENGINEER_VERIFICATION",
    };
  }).sort((left, right) => left.expectation_id.localeCompare(right.expectation_id));

  const sources = sourceReviewBindings(passport);
  invariant(sources.some((source) => source.evidence_kind !== "PROJECT_DOCUMENT"),
    `${batch}_INDEPENDENT_EXTERNAL_SOURCE_MISSING:${passport.catalogId}`);
  const reviewInputSourceBindingSha256 = objectSha256(sources.map((source) => ({
    source_id: source.source_id,
    evidence_id: source.evidence_id,
    source_file_sha256: source.source_file_sha256,
    edition_or_version: source.edition_or_version,
    page_or_section: source.page_or_section,
  })));

  return {
    schema_version: "real-estimates-global-green-r3.engineer-review-readiness-packet.v1",
    batch,
    status: "STRUCTURALLY_READY_FOR_HUMAN_REVIEW_CONTENT_RED",
    catalog_id: passport.catalogId,
    technology_variant_id: passport.technologyVariantId,
    public_work_title_ru: passport.publicWorkTitleRu,
    technology_passport_r1_sha256: passportR1Sha256,
    passport_content_sha256: technologyPassportContentR2Sha256(passport),
    stored_draft_sha256: storedDraftSha256,
    stored_draft_hash_verified: storedDraftSha256 === null ? null : true,
    review_input_source_binding_sha256: reviewInputSourceBindingSha256,
    review_input_hash_is_not_signed_source_set_hash: true,
    current_structural_decision: decision,
    graph_references_resolved: true,
    provenance_state: {
      expectation_basis: passport.provenance.expectationBasis,
      runtime_rows_used_as_expectation: passport.provenance.runtimeRowsUsedAsExpectation,
      author_role_claim_in_draft: passport.provenance.authorRole,
      review_status: passport.provenance.review.status,
      reviewer_id: passport.provenance.review.reviewerId,
      review_evidence_sha256: passport.provenance.review.reviewEvidenceSha256,
      real_author_attestation_present: false,
      independent_engineer_acceptance_present: false,
    },
    project_material_requirements: materialRequirements,
    material_occurrences: materialRequirements.length,
    project_material_selections_resolved: 0,
    equipment_rules: equipmentRules,
    equipment_numeric_rules_present: equipmentRules.length,
    source_review_bindings: sources,
    unsigned_acceptance_manifest_template: {
      contract: TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT,
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
      acceptanceOrigin: null,
      createdByAgent: null,
    },
    admission_guard: {
      can_submit_to_admission: false,
      blockers: [
        "EXACT_PROJECT_MATERIAL_SELECTIONS_MISSING",
        "REAL_HUMAN_AUTHOR_ATTESTATION_MISSING",
        "SIGNED_SOURCE_CLAIMS_MISSING",
        "PRODUCTION_SOURCE_SET_SHA256_PENDING",
        "INDEPENDENT_ENGINEER_DECISION_MISSING",
        "SIGNATURE_OR_AUDIT_ID_MISSING",
      ],
    },
  };
}

function requirementInventory(batch: string, packets: Json[]): Json {
  const byRequirement = new Map<string, Json>();
  for (const packet of packets) {
    for (const requirement of packet.project_material_requirements as Json[]) {
      const key = `${requirement.family_id}\u0000${requirement.exact_project_values_required_ru}`;
      const current = byRequirement.get(key) ?? {
        family_id: requirement.family_id,
        title_ru: requirement.title_ru,
        exact_project_values_required_ru: requirement.exact_project_values_required_ru,
        occurrence_count: 0,
        affected_catalog_ids: [],
      };
      current.occurrence_count += 1;
      current.affected_catalog_ids.push(packet.catalog_id);
      byRequirement.set(key, current);
    }
  }
  const requirements: Json[] = [...byRequirement.values()]
    .map((item: Json): Json => ({
      ...item,
      affected_catalog_ids: [...new Set<string>(item.affected_catalog_ids as string[])].sort(),
    }))
    .sort((left: Json, right: Json) => `${left.family_id}\u0000${left.exact_project_values_required_ru}`
      .localeCompare(`${right.family_id}\u0000${right.exact_project_values_required_ru}`));
  return {
    batch,
    distinct_project_material_requirements: requirements.length,
    material_occurrences: requirements.reduce((total, item) => total + Number(item.occurrence_count), 0),
    requirements,
  };
}

function assertCurrentSeal(): Json {
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const productManifest = readJson(PRODUCT_MANIFEST);
  const humanAcceptance = readJson(HUMAN_ACCEPTANCE);
  const denominator = readJson(DENOMINATOR);
  const batch001Shadow = readJson(BATCH001_SHADOW);
  const batch002Shadow = readJson(BATCH002_SHADOW);
  const sourceIdentitySha256 = fileSha256(SOURCE_IDENTITY);
  const productSourceSha256 = String(productManifest.aggregates?.product_source?.sha256);

  invariant(sourceIdentity.status === "R3_SOURCE_IDENTITY_GREEN", "SOURCE_IDENTITY_NOT_GREEN");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "MASTER_SHA_DRIFT");
  invariant(productManifest.master_contract_sha256 === MASTER_SHA256, "PRODUCT_MANIFEST_MASTER_DRIFT");
  invariant(humanAcceptance.status === "HUMAN_ACCEPTANCE_PLATFORM_GREEN"
    && humanAcceptance.parent_source_identity_sha256 === sourceIdentitySha256
    && humanAcceptance.exact_product_source_sha256 === productSourceSha256
    && humanAcceptance.engineer_accepted === 0, "HUMAN_ACCEPTANCE_BINDING_OR_COUNT_RED");
  invariant(denominator.status === "AUTHORITATIVE_DENOMINATOR_GREEN"
    && denominator.parent_source_identity_sha256 === sourceIdentitySha256
    && denominator.content_authoring_denominator === 3367, "DENOMINATOR_BINDING_RED");
  invariant(batch001Shadow.parent_source_identity_sha256 === sourceIdentitySha256
    && batch001Shadow.exact_product_source_sha256 === productSourceSha256
    && batch001Shadow.status === "BATCH001_SHADOW_REVALIDATED_CONTENT_RED_HUMAN_ACCEPTANCE_0_OF_16"
    && batch001Shadow.engineer_accepted === 0, "BATCH001_SHADOW_BINDING_RED");
  invariant(batch002Shadow.parent_source_identity_sha256 === sourceIdentitySha256
    && batch002Shadow.exact_product_source_sha256 === productSourceSha256
    && batch002Shadow.status === "BATCH002_SHADOW_REVALIDATED_CONTENT_RED_HUMAN_ACCEPTANCE_0_OF_55"
    && batch002Shadow.engineer_accepted === 0, "BATCH002_SHADOW_BINDING_RED");

  return {
    source_identity: { path: repoPath(SOURCE_IDENTITY), sha256: sourceIdentitySha256 },
    exact_product_source_sha256: productSourceSha256,
    human_acceptance_platform: { path: repoPath(HUMAN_ACCEPTANCE), sha256: fileSha256(HUMAN_ACCEPTANCE) },
    denominator: { path: repoPath(DENOMINATOR), sha256: fileSha256(DENOMINATOR), value: 3367 },
    batch001_shadow: { path: repoPath(BATCH001_SHADOW), sha256: fileSha256(BATCH001_SHADOW) },
    batch002_shadow: { path: repoPath(BATCH002_SHADOW), sha256: fileSha256(BATCH002_SHADOW) },
  };
}

function main(): void {
  invariant(fileSha256(BATCH001_DRAFTS) === EXPECTED.batch001_drafts, "BATCH001_DRAFTS_DRIFT");
  invariant(fileSha256(BATCH002_DRAFTS) === EXPECTED.batch002_drafts, "BATCH002_DRAFTS_DRIFT");
  const seal = assertCurrentSeal();
  const generatedAt = new Date().toISOString();

  const batch001Rows = readJsonl(BATCH001_DRAFTS);
  const batch002Rows = readJsonl(BATCH002_DRAFTS);
  invariant(batch001Rows.length === EXPECTED.batch001_passports, "BATCH001_DRAFT_COUNT_RED");
  invariant(batch002Rows.length === EXPECTED.batch002_passports, "BATCH002_DRAFT_COUNT_RED");
  const batch001Packets = batch001Rows.map((row) => reviewPacket(
    row.passport as TechnologyPassportR1,
    "BATCH-001",
    String(row.technology_passport_sha256),
  )).sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
  const batch002Packets = batch002Rows.map((row) => reviewPacket(
    row as TechnologyPassportR1,
    "BATCH-002",
    null,
  )).sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));

  const batch001Materials = batch001Packets.reduce((total, item) => total + Number(item.material_occurrences), 0);
  const batch002Materials = batch002Packets.reduce((total, item) => total + Number(item.material_occurrences), 0);
  const batch001Equipment = batch001Packets.reduce((total, item) => total + Number(item.equipment_numeric_rules_present), 0);
  const batch002Equipment = batch002Packets.reduce((total, item) => total + Number(item.equipment_numeric_rules_present), 0);
  invariant(batch001Materials === EXPECTED.batch001_material_occurrences,
    `BATCH001_MATERIAL_DENOMINATOR_DRIFT:${batch001Materials}`);
  invariant(batch002Materials === EXPECTED.batch002_material_occurrences,
    `BATCH002_MATERIAL_DENOMINATOR_DRIFT:${batch002Materials}`);
  invariant(batch001Equipment === EXPECTED.batch001_equipment_occurrences,
    `BATCH001_EQUIPMENT_DENOMINATOR_DRIFT:${batch001Equipment}`);
  invariant(batch002Equipment === EXPECTED.batch002_equipment_occurrences,
    `BATCH002_EQUIPMENT_DENOMINATOR_DRIFT:${batch002Equipment}`);

  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    current_seal: seal,
    tool: { path: repoPath(TOOL), sha256: fileSha256(TOOL) },
    exact_project_values_invented_by_agent: 0,
    human_acceptances_fabricated: 0,
    production_mutated: false,
    release_performed: false,
    deploy_performed: false,
    content_green_claimed: false,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  };
  const batch001Output = resolve(EVIDENCE_ROOT, "28_BATCH001_ENGINEER_REVIEW_READINESS_R3.json");
  const batch001Sha256 = writeEvidence(batch001Output, {
    schema_version: "real-estimates-global-green-r3.batch001-engineer-review-readiness.v1",
    ...common,
    status: "BATCH001_ENGINEER_REVIEW_PACKET_READY_CONTENT_RED",
    batch: "BATCH-001",
    drafts: { path: repoPath(BATCH001_DRAFTS), sha256: fileSha256(BATCH001_DRAFTS), total: 16 },
    structural_graph_ready: "16_OF_16",
    project_material_selection_pending: batch001Materials,
    project_material_selection_resolved: 0,
    equipment_numeric_characteristics_present: `${batch001Equipment}_OF_${batch001Equipment}`,
    engineer_accepted: "0_OF_16",
    packets: batch001Packets,
  });
  const batch002Output = resolve(EVIDENCE_ROOT, "29_BATCH002_ENGINEER_REVIEW_READINESS_R3.json");
  const batch002Sha256 = writeEvidence(batch002Output, {
    schema_version: "real-estimates-global-green-r3.batch002-engineer-review-readiness.v1",
    ...common,
    status: "BATCH002_ENGINEER_REVIEW_PACKET_READY_CONTENT_RED",
    batch: "BATCH-002",
    drafts: { path: repoPath(BATCH002_DRAFTS), sha256: fileSha256(BATCH002_DRAFTS), total: 55 },
    structural_graph_ready: "55_OF_55",
    project_material_selection_pending: batch002Materials,
    project_material_selection_resolved: 0,
    equipment_numeric_characteristics_present: `${batch002Equipment}_OF_${batch002Equipment}`,
    engineer_accepted: "0_OF_55",
    packets: batch002Packets,
  });

  const batch001Requirements = requirementInventory("BATCH-001", batch001Packets);
  const batch002Requirements = requirementInventory("BATCH-002", batch002Packets);
  const requirementsOutput = resolve(EVIDENCE_ROOT, "30_BATCH001002_REVIEW_INPUT_REQUIREMENTS_R3.json");
  const requirementsSha256 = writeEvidence(requirementsOutput, {
    schema_version: "real-estimates-global-green-r3.batch001002-review-input-requirements.v1",
    ...common,
    status: "ENGINEER_REVIEW_INPUT_REQUIREMENTS_FROZEN_CONTENT_RED",
    scope: { passports: 71, structural_graph_ready: 71, engineer_accepted: 0 },
    material_project_selection: {
      occurrence_denominator: batch001Materials + batch002Materials,
      resolved_by_agent: 0,
      pending_real_project_input: batch001Materials + batch002Materials,
      batches: [batch001Requirements, batch002Requirements],
    },
    equipment: {
      occurrence_denominator: batch001Equipment + batch002Equipment,
      numeric_characteristics_present: batch001Equipment + batch002Equipment,
      still_requires_engineer_verification: batch001Equipment + batch002Equipment,
    },
    required_human_workflow: [
      "Supply the exact project-selected brand, type, dimensions, performance, compatible system, consumption, loss and package values requested by every material requirement.",
      "A real engineering author verifies the resulting passport and records a non-placeholder human audit identity.",
      "A human reviewer verifies every claim against the exact source page or section and freezes signed source claims.",
      "Compute the production sourceSetSha256 only from the completed signed claim set; the review-input binding hash is not a substitute.",
      "A different qualified engineer records a real decision, scope, comment, UTC timestamp and signature or audit ID.",
      "Admission may use only the exact passportContentSha256 and production sourceSetSha256 covered by that signed manifest.",
    ],
    acceptance_manifest_required_fields: [
      "catalogId", "technologyVariantId", "passportContentSha256", "sourceSetSha256", "reviewerId",
      "reviewerRole", "reviewerScope", "decision", "comment", "acceptedAtUtc", "signatureOrAuditId",
      "acceptanceOrigin=HUMAN_SIGNED_AUDIT", "createdByAgent=false",
    ],
    review_packet_artifacts: {
      batch001: { path: repoPath(batch001Output), sha256: batch001Sha256 },
      batch002: { path: repoPath(batch002Output), sha256: batch002Sha256 },
    },
    next_gate: "REAL_PROJECT_SPECIFICATION_PLUS_INDEPENDENT_SIGNED_ENGINEER_MANIFESTS_16_OF_16_AND_55_OF_55",
  });

  process.stdout.write(`${JSON.stringify({
    status: "ENGINEER_REVIEW_PACKETS_PREPARED_CONTENT_RED",
    batch001: {
      structural: "16/16",
      material_project_selection_pending: batch001Materials,
      equipment_numeric: `${batch001Equipment}/${batch001Equipment}`,
      engineer_accepted: "0/16",
      artifact_sha256: batch001Sha256,
    },
    batch002: {
      structural: "55/55",
      material_project_selection_pending: batch002Materials,
      equipment_numeric: `${batch002Equipment}/${batch002Equipment}`,
      engineer_accepted: "0/55",
      artifact_sha256: batch002Sha256,
    },
    requirements_artifact_sha256: requirementsSha256,
    exact_values_invented: 0,
    production_mutated: false,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
