import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_PRODUCTION_GRADE_CANONICAL_CODE_GREEN_REAL_ESTIMATES_SAFE_CLEANUP_R2_RU.md");
const SOURCE_IDENTITY = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-platform/source-seal/01_SOURCE_IDENTITY.json");
const TRACE = resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline/BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.jsonl");
const AUDIT = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/batch001_008_content_audit.jsonl");
const FACTS = resolve(".release-runtime/real-professional-estimates-r2/evidence/02-static-audit/batch001_008_content_audit_facts.jsonl");
const SUMMARY = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/BATCH001_008_R3_AUTHORITATIVE_AUDIT_SUMMARY.json");
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR2/buildAuthoritativeDenominatorR2.ts");
const OUTPUT_ROOT = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-denominator");
const OUTPUT_JSON = resolve(OUTPUT_ROOT, "AUTHORITATIVE_DENOMINATOR_R2.json");
const OUTPUT_JSONL = resolve(OUTPUT_ROOT, "AUTHORITATIVE_DENOMINATOR_R2_IDENTITIES_4282.jsonl");

const EXPECTED_SHA256 = new Map<string, string>([
  [MASTER, "1c18212fcea75adf57473146e04f25ce29a3c9a4febaaebfb5442ae2cdb78da4"],
  [TRACE, "66337d27f4b2e7636cd20c266c0478eb1c7abd0ad8071075fb62657da90d9c9d"],
  [AUDIT, "ccd0b7a7877a7129315ec05b011bb9a7ecc0a913861e7d4b2897068c996d9a90"],
  [FACTS, "ccfb805533efe4ff2ab19dbf828af803cf727885bb2290168250b8a211f62f88"],
  [SUMMARY, "a835f58f6fdd29495378b2efb5f29ed851457d1d66d20b601aa30cb0cd0260cf"],
]);

const BOLLARD_ID = "r58-real:concrete-bollard-installation";

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

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function atomicWrite(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function countBy<T extends Json>(rows: readonly T[], field: keyof T): Record<string, number> {
  return Object.fromEntries([...rows.reduce((counts, row) => {
    const key = String(row[field] ?? "UNCLASSIFIED");
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)));
}

function hasRedirectCycle(entries: readonly Json[]): boolean {
  const targetByDuplicate = new Map(entries
    .filter((entry) => entry.identity_class === "duplicate")
    .map((entry) => [String(entry.catalog_id), String(entry.canonical_target_id)]));
  for (const start of targetByDuplicate.keys()) {
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current && targetByDuplicate.has(current)) {
      if (seen.has(current)) return true;
      seen.add(current);
      current = targetByDuplicate.get(current);
    }
  }
  return false;
}

function main(): void {
  for (const [path, expected] of EXPECTED_SHA256) {
    invariant(hashFile(path) === expected, `DENOMINATOR_SOURCE_DRIFT:${path}`);
  }

  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const trace = readJsonl(TRACE);
  const audit = readJsonl(AUDIT);
  const facts = readJsonl(FACTS);
  const summary = readJson(SUMMARY);
  const predecessorIds = new Set(trace.map((entry) => String(entry.catalog_id)));
  const auditById = new Map(audit.map((entry) => [String(entry.catalogId), entry]));
  const factsById = new Map(facts.map((entry) => [String(entry.catalog_id), entry]));

  invariant(trace.length === 4272 && predecessorIds.size === 4272, "PREDECESSOR_4272_RED");
  invariant(audit.length === 4282 && auditById.size === 4282, "CURRENT_INVENTORY_4282_RED");
  invariant(facts.length === 4282 && factsById.size === 4282, "FACTS_INVENTORY_4282_RED");
  invariant([...predecessorIds].every((catalogId) => auditById.has(catalogId)), "PREDECESSOR_NOT_SUBSET_OF_CURRENT");
  invariant(summary.denominator === 4282 && summary.coverage === "4282/4282", "R3_SUMMARY_DENOMINATOR_DRIFT");
  invariant(sourceIdentity.master_contract.sha256 === EXPECTED_SHA256.get(MASTER), "SOURCE_IDENTITY_MASTER_DRIFT");
  invariant(sourceIdentity.status === "SOURCE_IDENTITY_CAPTURED_RUNTIME_NOT_FROZEN_GLOBAL_RED", "SOURCE_IDENTITY_STATUS_RED");

  const entries = audit.map((auditEntry) => {
    const catalogId = String(auditEntry.catalogId);
    const fact = factsById.get(catalogId);
    invariant(fact, `FACT_MISSING:${catalogId}`);
    const inPredecessor = predecessorIds.has(catalogId);
    const isReconciledBollard = catalogId === BOLLARD_ID
      && !inPredecessor
      && fact.adjudication_class == null
      && fact.publication_state === "CANONICAL_SUCCESSOR"
      && fact.source_batch === "R58_MANDATORY_REAL_WORKS"
      && auditEntry.classification === "REPAIR"
      && auditEntry.terminalClassification === "REAL_WORK_BLOCKED";
    const adjudicationClass = isReconciledBollard ? "EFFECTIVE_WORK" : fact.adjudication_class;
    invariant(["EFFECTIVE_WORK", "EXTERNAL_REFERENCE", "DUPLICATE"].includes(String(adjudicationClass)), `UNCLASSIFIED_IDENTITY:${catalogId}`);

    const identityClass = adjudicationClass === "EFFECTIVE_WORK"
      ? "canonical"
      : adjudicationClass === "EXTERNAL_REFERENCE" ? "external_reference" : "duplicate";
    const routingClass = String(fact.search_classification).toLowerCase();
    const canonicalTargetId = identityClass === "canonical"
      ? catalogId
      : identityClass === "duplicate" ? String(fact.canonical_target_catalog_id ?? fact.replacement_catalog_id ?? "") : null;
    const reason = isReconciledBollard
      ? "R2 reconciliation: added mandatory real-work CANONICAL_SUCCESSOR; audit class REPAIR and terminal class REAL_WORK_BLOCKED. The older facts row omitted adjudication_class."
      : identityClass === "canonical"
        ? "Adjudicated EFFECTIVE_WORK with canonical search ownership."
        : identityClass === "external_reference"
          ? "Adjudicated EXTERNAL_REFERENCE; retained for traceability and excluded from selectable content."
          : "Adjudicated DUPLICATE and routed to the recorded canonical target.";

    return {
      catalog_id: catalogId,
      identity_class: identityClass,
      routing_class: routingClass,
      adjudication_class: adjudicationClass,
      canonical_target_id: canonicalTargetId,
      batch_id: String(auditEntry.batchId),
      source_registry: String(fact.source_batch),
      source_release_id: fact.source_release_id ?? null,
      definition_version_id: String(auditEntry.currentVersionId),
      reason,
      included_in_predecessor_4272: inPredecessor,
      included_in_legacy_content_corpus_4211: /^BATCH-00[1-8]$/u.test(String(auditEntry.batchId)),
      included_in_target_content_denominator: identityClass === "canonical",
      search_selectable_before_remediation: fact.search_selectable === true,
      r2_reconciled_from_omitted_adjudication: isReconciledBollard,
    };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));

  const predecessor = entries.filter((entry) => entry.included_in_predecessor_4272);
  const legacyContentCorpus = entries.filter((entry) => entry.included_in_legacy_content_corpus_4211);
  const targetContent = entries.filter((entry) => entry.included_in_target_content_denominator);
  const addedSuccessors = entries.filter((entry) => !entry.included_in_predecessor_4272);
  const predecessorOnlyVsLegacy = predecessor.filter((entry) => !entry.included_in_legacy_content_corpus_4211);
  const legacyOnlyVsPredecessor = legacyContentCorpus.filter((entry) => !entry.included_in_predecessor_4272);
  const duplicates = entries.filter((entry) => entry.identity_class === "duplicate");
  const knownIds = new Set(entries.map((entry) => entry.catalog_id));
  const duplicateWithoutRedirectOrReason = duplicates.filter((entry) =>
    entry.routing_class !== "redirect"
    || !entry.canonical_target_id
    || !knownIds.has(String(entry.canonical_target_id))
    || !entry.reason);
  const redirectCycle = hasRedirectCycle(entries);

  invariant(countBy(predecessor, "routing_class").canonical === 3872, "PREDECESSOR_CANONICAL_ROUTE_NOT_3872");
  invariant(countBy(predecessor, "routing_class").redirect === 400, "PREDECESSOR_REDIRECT_ROUTE_NOT_400");
  invariant(countBy(predecessor, "identity_class").canonical === 3357, "PREDECESSOR_EFFECTIVE_NOT_3357");
  invariant(countBy(predecessor, "identity_class").external_reference === 515, "PREDECESSOR_EXTERNAL_NOT_515");
  invariant(countBy(predecessor, "identity_class").duplicate === 400, "PREDECESSOR_DUPLICATE_NOT_400");
  invariant(legacyContentCorpus.length === 4211, "LEGACY_CONTENT_CORPUS_NOT_4211");
  invariant(addedSuccessors.length === 10 && addedSuccessors.every((entry) => entry.identity_class === "canonical"), "ADDED_SUCCESSORS_NOT_10_CANONICAL");
  invariant(targetContent.length === 3367, "TARGET_CONTENT_DENOMINATOR_NOT_3367");
  invariant(predecessorOnlyVsLegacy.length === 63, "PREDECESSOR_ONLY_NOT_63");
  invariant(legacyOnlyVsPredecessor.length === 2, "LEGACY_ONLY_NOT_2");
  invariant(predecessorOnlyVsLegacy.length + legacyOnlyVsPredecessor.length === 65, "SYMMETRIC_DIFFERENCE_NOT_65");
  invariant(predecessor.length - legacyContentCorpus.length === 61, "NET_DIFFERENCE_NOT_61");
  invariant(duplicateWithoutRedirectOrReason.length === 0, "DUPLICATE_WITHOUT_REDIRECT_OR_REASON");
  invariant(!redirectCycle, "REDIRECT_CYCLE_NONZERO");

  atomicWrite(OUTPUT_JSONL, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`);

  const payload = {
    schema_version: "real-useful-estimates-r2.authoritative-denominator.v1",
    generated_at_utc: new Date().toISOString(),
    status: "GREEN_R2_DENOMINATOR_RECONCILIATION_CONTENT_REMEDIATION_STILL_RED",
    master_contract: { path: MASTER.replaceAll("\\", "/"), sha256: EXPECTED_SHA256.get(MASTER) },
    source_identity: {
      path: SOURCE_IDENTITY.replaceAll("\\", "/"),
      sha256: hashFile(SOURCE_IDENTITY),
      product_source_aggregate_sha256: sourceIdentity.source_seal.product_source_manifest.aggregate_sha256,
    },
    source_evidence: [...EXPECTED_SHA256.entries()].filter(([path]) => path !== MASTER).map(([path, expectedSha256]) => ({
      path: path.replaceAll("\\", "/"),
      sha256: expectedSha256,
    })),
    equations: {
      predecessor_search: "4272 = 3872 canonical routes + 400 redirects",
      predecessor_adjudication: "4272 = 3357 effective works + 515 external references + 400 duplicates",
      current_inventory: "4282 = 4272 predecessor identities + 10 mandatory real-work successors",
      legacy_content_corpus: "4211 = 4209 predecessor non-asphalt identities + 2 concrete-only successors",
      alias_set_difference: "symmetric difference 65 = 63 predecessor asphalt-only + 2 legacy-corpus concrete-only; net 61 = 63 - 2",
      target_content: "3367 = 3357 predecessor effective works + 10 mandatory real-work successors",
    },
    inventory_counts: {
      all_known_identities: entries.length,
      predecessor_trace: predecessor.length,
      legacy_content_corpus: legacyContentCorpus.length,
      current_inventory: entries.length,
      target_content_denominator: targetContent.length,
      target_content_denominator_name: "EFFECTIVE_REAL_WORK_CANONICAL_IDENTITIES_R2",
      current_identity_classes: countBy(entries, "identity_class"),
      current_routing_classes: countBy(entries, "routing_class"),
      target_by_batch: countBy(targetContent, "batch_id"),
      target_by_source_registry: countBy(targetContent, "source_registry"),
    },
    reconciliation: {
      added_successor_ids: addedSuccessors.map((entry) => entry.catalog_id),
      predecessor_only_relative_to_legacy_4211: predecessorOnlyVsLegacy.map((entry) => entry.catalog_id),
      legacy_4211_only_relative_to_predecessor: legacyOnlyVsPredecessor.map((entry) => entry.catalog_id),
      r2_explicit_reconciliations: entries.filter((entry) => entry.r2_reconciled_from_omitted_adjudication).map((entry) => ({
        catalog_id: entry.catalog_id,
        reason: entry.reason,
      })),
    },
    acceptance: {
      all_known_identities_classified_percent: 100,
      unclassified: 0,
      duplicate_without_redirect_or_reason: duplicateWithoutRedirectOrReason.length,
      redirect_cycle: redirectCycle ? 1 : 0,
      target_content_denominator_selected_exactly_once: true,
      target_content_denominator_membership_count: targetContent.length,
    },
    identity_inventory: {
      path: OUTPUT_JSONL.replaceAll("\\", "/"),
      sha256: hashFile(OUTPUT_JSONL),
      rows: entries.length,
    },
    tool: { path: TOOL.replaceAll("\\", "/"), sha256: hashFile(TOOL) },
    restrictions: ["NO_RELEASE", "NO_DEPLOY", "NO_OTA", "NO_MERGE", "NO_PUSH", "NO_BATCH009", "NO_FULL_JEST"],
    content_green_claimed: false,
  };
  const output = { ...payload, payload_sha256: hashObject(payload) };
  atomicWrite(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    status: output.status,
    target_content_denominator: targetContent.length,
    all_known_identities: entries.length,
    unclassified: output.acceptance.unclassified,
    duplicate_without_redirect_or_reason: output.acceptance.duplicate_without_redirect_or_reason,
    redirect_cycle: output.acceptance.redirect_cycle,
    output: OUTPUT_JSON.replaceAll("\\", "/"),
    output_sha256: hashFile(OUTPUT_JSON),
    identity_inventory_sha256: output.identity_inventory.sha256,
  }, null, 2)}\n`);
}

main();
