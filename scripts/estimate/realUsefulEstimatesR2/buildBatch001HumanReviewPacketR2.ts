import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT,
  technologyPassportContentR2Sha256,
} from "../../../src/lib/estimate/backendPlatform/technologyPassportAcceptanceR2";
import {
  evaluateTechnologyPassportR1,
  technologyPassportR1Sha256,
  type TechnologyPassportR1,
} from "../../../src/lib/estimate/backendPlatform/technologyPassportR1";
import {
  buildAllBatch001DrywallTechnologyPassportDraftsR1,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1";

type Json = Record<string, any>;
type ReviewAssertion = {
  assertion_id: string;
  assertion_kind: string;
  claim_type_suggestion: string;
  text_ru: string;
  norm_source_ids: readonly string[];
  extraction_status: "AGENT_EXTRACTED_REQUIRES_HUMAN_VERIFICATION";
};

const ROOT = resolve(".");
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_PRODUCTION_GRADE_CANONICAL_CODE_GREEN_REAL_ESTIMATES_SAFE_CLEANUP_R2_RU.md");
const PHASE4 = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-platform/TECHNOLOGY_PASSPORT_PLATFORM_R2.json");
const SOURCE_IDENTITY = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase5-batch001-human-review/source-seal/01_SOURCE_IDENTITY.json");
const OUTPUT_ROOT = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase5-batch001-human-review");
const OUTPUT = resolve(OUTPUT_ROOT, "BATCH001_HUMAN_REVIEW_PACKET_R2.json");
const PACKETS = resolve(OUTPUT_ROOT, "BATCH001_UNSIGNED_PASSPORT_PACKETS_16.jsonl");
const INSTRUCTIONS = resolve(OUTPUT_ROOT, "BATCH001_HUMAN_REVIEW_INSTRUCTIONS_R2.md");
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR2/buildBatch001HumanReviewPacketR2.ts");
const MASTER_SHA256 = "1c18212fcea75adf57473146e04f25ce29a3c9a4febaaebfb5442ae2cdb78da4";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
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

function hashObject(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function repoPath(path: string): string {
  const root = ROOT.replaceAll("\\", "/");
  const normalized = path.replaceAll("\\", "/");
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}

function assertion(
  kind: string,
  id: string,
  claimType: string,
  textRu: string,
  sourceIds: readonly string[],
): ReviewAssertion {
  return {
    assertion_id: `${kind}:${id}`,
    assertion_kind: kind,
    claim_type_suggestion: claimType,
    text_ru: textRu.normalize("NFKC").trim(),
    norm_source_ids: [...sourceIds].sort(),
    extraction_status: "AGENT_EXTRACTED_REQUIRES_HUMAN_VERIFICATION",
  };
}

function assertions(passport: TechnologyPassportR1): readonly ReviewAssertion[] {
  const result: ReviewAssertion[] = [];
  for (const item of passport.capabilities) {
    result.push(assertion("CAPABILITY", item.group, "PROJECT_REQUIREMENT", item.reasonRu, item.normSourceIds));
  }
  for (const item of passport.acceptedPreliminaryAssumptions) {
    result.push(assertion("PRELIMINARY_ASSUMPTION", item.assumptionId, "PRELIMINARY_ASSUMPTION",
      `${item.statementRu}; принятое значение: ${String(item.acceptedValue)}`, [item.sourceId]));
  }
  for (const item of passport.requiredMaterialFamilies) {
    result.push(assertion("REQUIRED_MATERIAL", item.expectationId, "MATERIAL_PRESENCE",
      `${item.titleRu}. ${item.purposeRu}. ${item.specificationRequirementRu}. Условие: ${item.inclusionCondition}`,
      item.normSourceIds));
  }
  for (const item of passport.conditionalMaterialFamilies) {
    result.push(assertion("CONDITIONAL_MATERIAL", item.expectationId, "MATERIAL_PRESENCE",
      `${item.titleRu}. ${item.purposeRu}. ${item.specificationRequirementRu}. Условие: ${item.inclusionCondition}`,
      item.normSourceIds));
  }
  for (const item of passport.constructionOperations) {
    result.push(assertion("CONSTRUCTION_OPERATION", item.expectationId, "PROJECT_REQUIREMENT",
      `${item.titleRu}. ${item.purposeRu}. Условие: ${item.inclusionCondition}`, item.normSourceIds));
  }
  for (const item of passport.equipmentRules) {
    result.push(assertion("EQUIPMENT_RULE", item.expectationId, "EQUIPMENT_SELECTION",
      `${item.titleRu}. Класс: ${item.equipmentClassRu}. Характеристики: ${item.keyCharacteristicsRu.join("; ")}. Условие: ${item.inclusionCondition}`,
      item.normSourceIds));
  }
  for (const item of passport.deliveryFlows) {
    result.push(assertion("DELIVERY_FLOW", item.expectationId, "DELIVERY_FLOW",
      `${item.titleRu}. Транспорт: ${item.vehicleTypeRu}. Вместимость: ${item.capacityRequirementRu}. Условие: ${item.inclusionCondition}`,
      item.normSourceIds));
  }
  for (const item of passport.wasteFlows) {
    result.push(assertion("WASTE_FLOW", item.expectationId, "WASTE_FLOW",
      `${item.titleRu}. Транспорт: ${item.vehicleTypeRu}. Условие: ${item.inclusionCondition}`, item.normSourceIds));
  }
  for (const item of passport.quantityFormulas) {
    result.push(assertion("FORMULA", item.formulaId, "FORMULA",
      `Формула: ${item.expressionSource}; единица: ${item.outputUnitId}; округление: ${item.roundingRule}; потери: ${item.lossRule}`,
      item.normSourceIds));
  }
  for (const item of passport.procurementRules) {
    result.push(assertion("PROCUREMENT_RULE", item.procurementRuleId, "CONSUMPTION_RATE",
      `Семейство ${item.familyId}; закупка: ${item.procurementEligible}; упаковка: ${item.packageUnitRu ?? "не применимо"}; формула упаковки: ${item.packageSizeFormula ?? "не применимо"}; округление: ${item.roundingRule}`,
      item.sourceIds));
  }
  for (const item of passport.exclusions) {
    result.push(assertion("EXCLUSION", item.exclusionId, "EXCLUSION",
      `${item.reasonRu}. Условие: ${item.conditionExpression}`, item.sourceIds));
  }
  for (const item of passport.incompatibleVariants) {
    result.push(assertion("INCOMPATIBLE_VARIANT", item.variantId, "EXCLUSION", item.reasonRu, item.sourceIds));
  }
  return result.sort((left, right) => left.assertion_id.localeCompare(right.assertion_id));
}

function packet(passport: TechnologyPassportR1): Json {
  const decision = evaluateTechnologyPassportR1(passport, []);
  invariant(passport.provenance.review.status === "DRAFT", `BATCH001_REVIEW_PACKET_NOT_DRAFT:${passport.catalogId}`);
  invariant(!decision.allowed && decision.errors.length === 1 && decision.errors[0] === "ENGINEER_ACCEPTANCE_MISSING",
    `BATCH001_REVIEW_PACKET_STRUCTURAL_RED:${passport.catalogId}:${decision.errors.join(",")}`);
  const extractedAssertions = assertions(passport);
  const knownSourceIds = new Set(passport.normSources.map((source) => source.sourceId));
  invariant(extractedAssertions.length > 0, `BATCH001_REVIEW_ASSERTIONS_EMPTY:${passport.catalogId}`);
  invariant(extractedAssertions.every((item) => item.norm_source_ids.length > 0),
    `BATCH001_REVIEW_ASSERTION_SOURCE_EMPTY:${passport.catalogId}`);
  invariant(extractedAssertions.flatMap((item) => item.norm_source_ids).every((sourceId) => knownSourceIds.has(sourceId)),
    `BATCH001_REVIEW_ASSERTION_SOURCE_UNKNOWN:${passport.catalogId}`);
  const referencedSourceIds = new Set(extractedAssertions.flatMap((item) => item.norm_source_ids));
  invariant([...knownSourceIds].every((sourceId) => referencedSourceIds.has(sourceId)),
    `BATCH001_REVIEW_NORM_SOURCE_UNUSED:${passport.catalogId}`);
  const evidenceById = new Map(passport.provenance.evidence.map((item) => [item.evidenceId, item]));
  const sources = passport.normSources.map((source) => {
    const evidence = evidenceById.get(source.evidenceId);
    invariant(evidence, `BATCH001_REVIEW_EVIDENCE_MISSING:${passport.catalogId}:${source.evidenceId}`);
    return {
      source_id: source.sourceId,
      document_title: source.title,
      publisher_or_standard_owner: null,
      edition_or_date: source.editionOrVersion,
      page_or_section: source.locator,
      source_file_sha256: evidence.contentSha256,
      evidence_kind: evidence.sourceKind,
      evidence_title: evidence.title,
      applies_to_catalog_ids: [passport.catalogId],
      human_source_review_status: "REQUIRED",
      reviewed_by: null,
    };
  });
  return {
    schema_version: "real-useful-estimates-r2.batch001-unsigned-human-review-packet.v1",
    status: "UNSIGNED_DRAFT_NOT_ADMISSIBLE",
    catalog_id: passport.catalogId,
    technology_variant_id: passport.technologyVariantId,
    passport_content_sha256: technologyPassportContentR2Sha256(passport),
    technology_passport_r1_sha256: technologyPassportR1Sha256(passport),
    current_structural_decision: decision,
    passport_payload: passport,
    author_attestation_required: {
      audit_identity: null,
      role: "ENGINEER",
      authorship_origin: null,
      created_by_agent: null,
      status: "MUST_BE_COMPLETED_BY_REAL_HUMAN_AUTHOR",
    },
    source_review: {
      status: "UNVERIFIED_REQUIRES_HUMAN_CLAIM_BY_CLAIM_REVIEW",
      sources,
      extracted_assertions: extractedAssertions,
      signed_source_claims: [],
      source_set_sha256: null,
    },
    acceptance_manifest_template: {
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
    submission_guard: {
      can_submit_to_admission: false,
      blockers: [
        "HUMAN_AUTHOR_ATTESTATION_MISSING",
        "HUMAN_SOURCE_CLAIM_REVIEW_MISSING",
        "SOURCE_SET_SHA256_PENDING",
        "INDEPENDENT_REVIEWER_DECISION_MISSING",
        "SIGNATURE_OR_AUDIT_ID_MISSING",
      ],
    },
  };
}

function main(): void {
  invariant(hashFile(MASTER) === MASTER_SHA256, "MASTER_CONTRACT_DRIFT");
  const phase4 = JSON.parse(readFileSync(PHASE4, "utf8")) as Json;
  const sourceIdentity = JSON.parse(readFileSync(SOURCE_IDENTITY, "utf8")) as Json;
  invariant(phase4.status === "GREEN_R2_CONTENT_TRUTH_PLATFORM_BATCH_CONTENT_STILL_RED", "PHASE4_PLATFORM_NOT_GREEN");
  invariant(phase4.current_content_truth?.batch001?.engineer_accepted === 0, "BATCH001_ALREADY_ACCEPTED_UNEXPECTEDLY");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "BATCH001_SOURCE_IDENTITY_MASTER_DRIFT");
  invariant(sourceIdentity.status === "SOURCE_IDENTITY_CAPTURED_RUNTIME_NOT_FROZEN_GLOBAL_RED", "BATCH001_SOURCE_IDENTITY_STATUS_DRIFT");
  const passports = buildAllBatch001DrywallTechnologyPassportDraftsR1();
  invariant(passports.length === 16, "BATCH001_REVIEW_PACKET_NOT_16");
  const packets = passports.map(packet).sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
  invariant(packets.every((item) => item.status === "UNSIGNED_DRAFT_NOT_ADMISSIBLE"), "BATCH001_REVIEW_PACKET_FALSE_ACCEPTANCE");
  invariant(packets.every((item) => item.acceptance_manifest_template.createdByAgent === null),
    "BATCH001_REVIEW_PACKET_AGENT_ACCEPTANCE_FORGED");
  atomicWrite(PACKETS, `${packets.map((item) => JSON.stringify(item)).join("\n")}\n`);

  const totals = packets.reduce((result, item) => {
    result.assertions += item.source_review.extracted_assertions.length;
    result.sources += item.source_review.sources.length;
    return result;
  }, { assertions: 0, sources: 0 });
  const payload = {
    schema_version: "real-useful-estimates-r2.batch001-human-review-bundle.v1",
    generated_at_utc: new Date().toISOString(),
    status: "BATCH001_REVIEW_PACKET_READY_HUMAN_ACCEPTANCE_STILL_RED",
    master_contract: { path: MASTER.replaceAll("\\", "/"), sha256: MASTER_SHA256 },
    source_identity: {
      path: repoPath(SOURCE_IDENTITY),
      sha256: hashFile(SOURCE_IDENTITY),
      product_source_aggregate_sha256: sourceIdentity.source_seal.product_source_manifest.aggregate_sha256,
    },
    phase4_platform: { path: repoPath(PHASE4), sha256: hashFile(PHASE4), payload_sha256: phase4.payload_sha256 },
    batch: "BATCH-001",
    denominator: 16,
    passports_present: packets.length,
    engineer_accepted: 0,
    unsigned_packets: packets.length,
    extracted_assertions_requiring_human_review: totals.assertions,
    norm_source_bindings_requiring_human_review: totals.sources,
    fake_or_generated_acceptance: 0,
    admission_allowed: false,
    packet_inventory: { path: repoPath(PACKETS), sha256: hashFile(PACKETS), rows: packets.length },
    required_human_actions: [
      "A real engineering author verifies each passport and supplies a non-placeholder audit identity.",
      "A human reviewer verifies every extracted assertion against its exact source page/section and creates signed SourceClaim records.",
      "The source-set SHA is computed only after the reviewed claim set is frozen.",
      "A different engineer records ACCEPTED, REJECTED, or NEEDS_CHANGES and supplies a real signature/audit ID.",
      "Only the exact passport-content and source-set hashes may enter admission.",
    ],
    restrictions: ["NO_AGENT_SELF_ACCEPTANCE", "NO_FAKE_SIGNATURE", "NO_RELEASE", "NO_DEPLOY", "NO_OTA", "NO_PUSH"],
    content_green_claimed: false,
    tool: { path: repoPath(TOOL), sha256: hashFile(TOOL) },
  };
  const output = { ...payload, payload_sha256: hashObject(payload) };
  atomicWrite(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

  const instructions = `# BATCH-001 human engineering review packet R2\n\n`
    + `Status: **${output.status}**. This bundle is not an acceptance manifest and cannot enter admission.\n\n`
    + `- Passports: ${output.passports_present}/${output.denominator}, all DRAFT.\n`
    + `- Engineer accepted: ${output.engineer_accepted}/${output.denominator}.\n`
    + `- Extracted assertions awaiting human verification: ${output.extracted_assertions_requiring_human_review}.\n`
    + `- Source bindings awaiting human verification: ${output.norm_source_bindings_requiring_human_review}.\n`
    + `- Packet SHA-256: ${output.packet_inventory.sha256}.\n\n`
    + `The author and reviewer must be different real audit identities. An agent must not fill author, reviewer, decision, acceptance origin, timestamp, or signature fields. After any passport or source-set change, discard the old acceptance and review the new hashes.\n`;
  atomicWrite(INSTRUCTIONS, instructions);
  process.stdout.write(`${JSON.stringify({
    status: output.status,
    passports: output.passports_present,
    engineer_accepted: output.engineer_accepted,
    assertions: output.extracted_assertions_requiring_human_review,
    output: repoPath(OUTPUT),
    output_sha256: hashFile(OUTPUT),
  }, null, 2)}\n`);
}

main();
