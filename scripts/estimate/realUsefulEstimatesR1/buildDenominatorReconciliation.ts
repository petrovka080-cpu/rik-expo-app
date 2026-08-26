import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SUPPLEMENT_SHA256 = "75a562c007e5e2eba1d21c3615ee3673deb16a1bbf8db8a12964006bef2c3258";
const TRACE = resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline/BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.jsonl");
const AUDIT = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/batch001_008_content_audit.jsonl");
const FACTS = resolve(".release-runtime/real-professional-estimates-r2/evidence/02-static-audit/batch001_008_content_audit_facts.jsonl");
const SUMMARY = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/BATCH001_008_R3_AUTHORITATIVE_AUDIT_SUMMARY.json");
const OUTPUT_ROOT = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before");

const EXPECTED_SHA256: Record<string, string> = {
  [TRACE]: "66337d27f4b2e7636cd20c266c0478eb1c7abd0ad8071075fb62657da90d9c9d",
  [AUDIT]: "ccd0b7a7877a7129315ec05b011bb9a7ecc0a913861e7d4b2897068c996d9a90",
  [FACTS]: "ccfb805533efe4ff2ab19dbf828af803cf727885bb2290168250b8a211f62f88",
  [SUMMARY]: "a835f58f6fdd29495378b2efb5f29ed851457d1d66d20b601aa30cb0cd0260cf",
};

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

function countBy(rows: readonly Json[], field: string): Record<string, number> {
  return Object.fromEntries([...rows.reduce<Map<string, number>>((counts, row) => {
    const key = String(row[field] ?? "UNCLASSIFIED");
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)));
}

function main(): void {
  for (const [path, expected] of Object.entries(EXPECTED_SHA256)) {
    invariant(hashFile(path) === expected, `DENOMINATOR_SOURCE_DRIFT:${path}`);
  }

  const trace = readJsonl(TRACE);
  const audit = readJsonl(AUDIT);
  const facts = readJsonl(FACTS);
  const predecessorIds = new Set(trace.map((entry) => String(entry.catalog_id)));
  const targetIds = new Set(audit.map((entry) => String(entry.catalogId)));
  const auditById = new Map(audit.map((entry) => [String(entry.catalogId), entry]));
  const factsById = new Map(facts.map((entry) => [String(entry.catalog_id), entry]));

  invariant(trace.length === 4272 && predecessorIds.size === 4272, "PREDECESSOR_4272_DENOMINATOR_RED");
  invariant(audit.length === 4282 && targetIds.size === 4282, "TARGET_4282_DENOMINATOR_RED");
  invariant(facts.length === 4282 && factsById.size === 4282, "FACTS_4282_DENOMINATOR_RED");
  invariant([...predecessorIds].every((catalogId) => targetIds.has(catalogId)), "PREDECESSOR_NOT_SUBSET_OF_TARGET");

  const predecessor: Json[] = [...predecessorIds].map((catalogId): Json => ({
    ...factsById.get(catalogId),
    ...auditById.get(catalogId),
    catalog_id: catalogId,
  }));
  const targetBatch001008 = audit.filter((entry) => /^BATCH-00[1-8]$/u.test(String(entry.batchId)));
  const addedSuccessors = audit.filter((entry) => !predecessorIds.has(String(entry.catalogId)));
  const predecessorNotTargetBatch = predecessor.filter((entry) => !/^BATCH-00[1-8]$/u.test(String(entry.batchId)));
  const targetBatchNotPredecessor = targetBatch001008.filter((entry) => !predecessorIds.has(String(entry.catalogId)));
  const targetOutsideBatch001008 = audit.filter((entry) => !/^BATCH-00[1-8]$/u.test(String(entry.batchId)));
  const predecessorUnclassified = predecessor.filter((entry) =>
    !["CANONICAL", "REDIRECT"].includes(String(entry.search_classification))
    || !["EFFECTIVE_WORK", "EXTERNAL_REFERENCE", "DUPLICATE"].includes(String(entry.adjudication_class)));
  const targetUnclassified = audit.filter((entry) =>
    !["REAL_WORK_BLOCKED", "REDIRECT"].includes(String(entry.terminalClassification)));

  invariant(targetBatch001008.length === 4211, `TARGET_BATCH001008_NOT_4211:${targetBatch001008.length}`);
  invariant(addedSuccessors.length === 10, `TARGET_ADDED_SUCCESSORS_NOT_10:${addedSuccessors.length}`);
  invariant(predecessorNotTargetBatch.length === 63, `PREDECESSOR_OUTSIDE_TARGET_BATCH_NOT_63:${predecessorNotTargetBatch.length}`);
  invariant(targetBatchNotPredecessor.length === 2, `TARGET_BATCH_ADDITIONS_NOT_2:${targetBatchNotPredecessor.length}`);
  invariant(targetOutsideBatch001008.length === 71, `TARGET_OUTSIDE_BATCH_NOT_71:${targetOutsideBatch001008.length}`);
  invariant(predecessorUnclassified.length === 0 && targetUnclassified.length === 0, "DENOMINATOR_UNCLASSIFIED_NONZERO");

  const entries = audit.map((entry) => {
    const catalogId = String(entry.catalogId);
    const fact = factsById.get(catalogId)!;
    const inPredecessor = predecessorIds.has(catalogId);
    const inTargetBatch = /^BATCH-00[1-8]$/u.test(String(entry.batchId));
    return {
      catalog_id: catalogId,
      in_accepted_predecessor_4272: inPredecessor,
      in_r3_target_manifest_4282: true,
      in_r3_target_batch001008_bucket_4211: inTargetBatch,
      membership_bucket: !inPredecessor
        ? "R3_ADDED_SUCCESSOR_10"
        : inTargetBatch ? "PREDECESSOR_NON_ASPHALT_IN_TARGET_BATCH_4209" : "PREDECESSOR_ASPHALT_OUTSIDE_TARGET_BATCH_63",
      target_batch_id: entry.batchId,
      source_batch: fact.source_batch,
      domain_id: entry.domainId,
      adjudication_class: fact.adjudication_class,
      search_classification: fact.search_classification,
      search_selectable: fact.search_selectable,
      terminal_classification: entry.terminalClassification,
      definition_version_id: entry.currentVersionId,
    };
  }).sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));

  const payload = {
    schema_version: "real-useful-estimates-batch001-008-r1.denominator-reconciliation.v1",
    generated_at: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    supplement_sha256: SUPPLEMENT_SHA256,
    source_evidence: Object.entries(EXPECTED_SHA256).map(([path, hash]) => ({ path: path.replaceAll("\\", "/"), sha256: hash })),
    accepted_predecessor_runtime_set: {
      total: predecessor.length,
      equation: "4272 = 4209 non-asphalt + 63 asphalt",
      domains: countBy(predecessor, "domain_id"),
      search_classification: countBy(predecessor, "search_classification"),
      adjudication_class: countBy(predecessor, "adjudication_class"),
      exact_classification: {
        canonical: predecessor.filter((entry) => entry.search_classification === "CANONICAL").length,
        redirects: predecessor.filter((entry) => entry.search_classification === "REDIRECT").length,
        effective_work_selectable: predecessor.filter((entry) => entry.adjudication_class === "EFFECTIVE_WORK").length,
        external_reference_nonselectable: predecessor.filter((entry) => entry.adjudication_class === "EXTERNAL_REFERENCE").length,
        duplicate: predecessor.filter((entry) => entry.adjudication_class === "DUPLICATE").length,
        unclassified: predecessorUnclassified.length,
      },
    },
    r3_target_manifest: {
      total: audit.length,
      equation: "4282 = 4272 accepted predecessor + 10 added successors",
      batch_counts: countBy(audit, "batchId"),
      target_batch001008_total: targetBatch001008.length,
      target_outside_batch001008_total: targetOutsideBatch001008.length,
      equation_by_target_bucket: "4282 = 4211 BATCH-001...008 + 71 outside that target bucket",
      added_successor_ids: addedSuccessors.map((entry) => String(entry.catalogId)).sort(),
      unclassified: targetUnclassified.length,
    },
    difference_4211_vs_4272: {
      verdict: "NOT_4211_EFFECTIVE_WORK_PLUS_61_ALIASES",
      explanation: "The two numbers describe different inventory cuts. The predecessor 4272 contains 63 asphalt baselines outside the later target BATCH-001...008 bucket; that target bucket contains 2 new concrete successors absent from the predecessor. Therefore 4272 - 4211 = 63 - 2 = 61. The 61 is a set-difference balance, not an alias denominator.",
      predecessor_only_relative_to_target_batch001008: predecessorNotTargetBatch.map((entry) => String(entry.catalog_id)).sort(),
      target_batch001008_only_relative_to_predecessor: targetBatchNotPredecessor.map((entry) => String(entry.catalogId)).sort(),
      arithmetic: "4272 - 4211 = 63 - 2 = 61",
    },
    full_inventory_entry_count: entries.length,
    full_inventory_jsonl: "BEFORE_DENOMINATOR_RECONCILIATION_4282.jsonl",
    content_green_claimed: false,
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    status: "GREEN_DENOMINATOR_RECONCILIATION_ONLY_CONTENT_RED_NO_RELEASE",
  };
  const jsonPath = resolve(OUTPUT_ROOT, "BEFORE_DENOMINATOR_RECONCILIATION.json");
  const jsonlPath = resolve(OUTPUT_ROOT, "BEFORE_DENOMINATOR_RECONCILIATION_4282.jsonl");
  const markdownPath = resolve(OUTPUT_ROOT, "BEFORE_DENOMINATOR_RECONCILIATION.md");
  atomicWrite(jsonlPath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
  const finalPayload = {
    ...payload,
    full_inventory_jsonl_sha256: hashFile(jsonlPath),
  };
  const output = { ...finalPayload, payload_sha256: hashObject(finalPayload) };
  atomicWrite(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  atomicWrite(markdownPath, `# Reconciliation знаменателей BEFORE\n\n`
    + `Статус этого доказательства: \`${payload.status}\`. Содержательный GREEN не заявлен.\n\n`
    + `- Accepted predecessor runtime: \`4272 = 4209 non-asphalt + 63 asphalt\`.\n`
    + `- R3 target manifest: \`4282 = 4272 predecessor + 10 successors\`.\n`
    + `- Target bucket BATCH-001…008: \`4211 = 4209 predecessor non-asphalt + 2 new concrete successors\`.\n`
    + `- Остаток target manifest вне этого bucket: \`71 = 63 asphalt baselines + 8 other mandatory successors\`.\n`
    + `- Поэтому \`4272 - 4211 = 63 - 2 = 61\`; это не 61 alias/redirect, а разность двух несовпадающих множеств.\n\n`
    + `Классификация predecessor 4272: \`3872 CANONICAL + 400 REDIRECT\`; дополнительное adjudication-разбиение: \`3357 EFFECTIVE_WORK + 515 EXTERNAL_REFERENCE + 400 DUPLICATE\`. Unclassified: \`0\`.\n\n`
    + `Полная построчная классификация всех 4282 catalog_id сохранена в \`BEFORE_DENOMINATOR_RECONCILIATION_4282.jsonl\`.\n`);

  process.stdout.write(`${JSON.stringify({
    status: payload.status,
    predecessor: predecessor.length,
    target: audit.length,
    target_batch001008: targetBatch001008.length,
    target_outside_batch001008: targetOutsideBatch001008.length,
    predecessor_unclassified: predecessorUnclassified.length,
    target_unclassified: targetUnclassified.length,
    json: jsonPath.replaceAll("\\", "/"),
    json_sha256: hashFile(jsonPath),
    jsonl_sha256: hashFile(jsonlPath),
    markdown_sha256: hashFile(markdownPath),
  }, null, 2)}\n`);
}

main();
