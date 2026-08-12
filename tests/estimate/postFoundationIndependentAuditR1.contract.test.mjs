import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  compareInventories,
  mutationMustFail,
  parseJsonl,
  shaObject,
  validateAsphaltDenominator,
  validateFoundationEvidenceIndex,
  validateGroupPartition,
  validateInventory,
  validateNormativeRows,
  validateReferenceProof,
} from "../../scripts/estimate/postFoundationIndependentAuditValidatorsR1.mjs";

const targetRoot = process.env.POST_FOUNDATION_TARGET_ROOT;
const runA = process.env.POST_FOUNDATION_RUN_A;
const runB = process.env.POST_FOUNDATION_RUN_B;

function requireTarget() {
  assert.ok(targetRoot, "POST_FOUNDATION_TARGET_ROOT is required for exact-target contracts");
  return targetRoot;
}

function json(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function jsonl(file) {
  return parseJsonl(readFileSync(file, "utf8"));
}

function roots() {
  const root = requireTarget();
  return {
    root,
    master: path.join(root, ".release-runtime", "master-11610-group-batches-r1"),
    foundation: path.join(root, ".release-runtime", "master-11610-group-batches-r1", "01-foundation"),
    r63: path.join(root, ".release-runtime", "completed-domains-depth-r1", "asphalt-benchmark", "r63-m1-exact-353ad3ac"),
    reference: path.join(root, ".release-runtime", "completed-domains-depth-r1", "asphalt-benchmark", "reference-m1-exact-353ad3ac"),
  };
}

function hashTree(root, exclusions = new Set()) {
  const { readdirSync } = awaitImportFs;
  const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
  return walk(root)
    .map((file) => ({ file: path.relative(root, file).replaceAll("\\", "/"), bytes: statSync(file).size, sha256: shaObject(readFileSync(file).toString("base64")) }))
    .filter((row) => !exclusions.has(row.file))
    .sort((left, right) => left.file.localeCompare(right.file));
}

// Kept synchronous so the exact test command is deterministic.
import * as awaitImportFs from "node:fs";

test("postFoundationAuditTargetIdentity.contract.test", () => {
  const { foundation, reference } = roots();
  assert.equal(statSync(path.join(reference, "MANIFEST.json")).size > 0, true);
  assert.equal(statSync(path.join(foundation, "FOUNDATION_EXACT_SHA_EVIDENCE_INDEX.json")).size > 0, true);
});

test("postFoundationM1All63Presence.contract.test", () => {
  const { r63 } = roots();
  const records = json(path.join(r63, "ASPHALT_R63_INVENTORY.json")).records;
  const cases = json(path.join(r63, "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json")).cases;
  assert.equal(records.length, 63);
  assert.equal(new Set(records.map((row) => row.catalog_id)).size, 63);
  assert.equal(cases.length, 63);
});

test("postFoundationM1ThreeReferenceBenchmarks.contract.test", () => {
  const { reference } = roots();
  const cases = [
    ["ASPHALT_ETALON_ROAD_FULL_GEOMETRY_PROOF.json", { boq: 304, pdf: 304, procurement: 112 }],
    ["ASPHALT_ETALON_PARKING_FULL_GEOMETRY_PROOF.json", { boq: 167, pdf: 167, procurement: 37 }],
    ["ASPHALT_ETALON_DEMOLITION_STANDALONE_PROOF.json", { boq: 21, pdf: 21, procurement: 2 }],
  ];
  for (const [file, expected] of cases) assert.equal(validateReferenceProof(json(path.join(reference, file)), expected).ok, true);
});

test("postFoundationM1NormativeApplicability.contract.test", () => {
  const { r63 } = roots();
  const rows = json(path.join(r63, "ASPHALT_R63_NORMATIVE_APPLICABILITY_LEDGER.json")).rows;
  const expected = json(path.join(r63, "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json")).cases.reduce((sum, item) => sum + item.ledger.total_boq_rows, 0);
  const result = validateNormativeRows(rows, expected);
  assert.equal(result.ok, false, "the contract must expose incomplete exact source/table applicability");
  assert.ok(result.noExactSourceIdsCount > 0);
  assert.ok(result.pendingExactTableReviewCount > 0);
});

test("postFoundationM1NoPaddingAndParity.contract.test", () => {
  const { reference } = roots();
  const duplicateAudit = json(path.join(reference, "ASPHALT_ETALON_DUPLICATE_PADDING_AUDIT.json"));
  assert.equal(duplicateAudit.duplicate_exact_rows ?? duplicateAudit.audit?.duplicate_exact_rows ?? 0, 0);
  assert.equal(duplicateAudit.parent_child_double_count ?? duplicateAudit.audit?.parent_child_double_count ?? 0, 0);
});

test("postFoundationM1Historical700Reconciliation.contract.test", () => {
  const { reference } = roots();
  const value = json(path.join(reference, "ASPHALT_700_VS_116_SCOPE_AND_ROW_SEMANTICS_RECONCILIATION.json"));
  assert.deepEqual(value.historical_exact_variants.map((row) => row.raw_row_count), [700, 699, 695]);
  assert.deepEqual(value.repaired_exact_variants.map((row) => row.raw_row_count), [304, 303, 299]);
  assert.equal(value.rows.length, 25);
});

test("postFoundationMaster11610Inventory.contract.test", () => {
  const { foundation } = roots();
  const rows = jsonl(path.join(foundation, "inventory", "GLOBAL_11610_SOURCE_INVENTORY.jsonl"));
  assert.equal(validateInventory(rows).ok, true);
  assert.equal(compareInventories(rows, rows).ok, true);
});

test("postFoundationMaster11610Identity.contract.test", () => {
  const { foundation } = roots();
  const rows = jsonl(path.join(foundation, "identity", "GLOBAL_11610_SEMANTIC_IDENTITIES.jsonl"));
  assert.equal(rows.length, 11_610);
  assert.equal(rows.filter((row) => row.ambiguities.length > 0).length, 0);
  assert.equal(rows.filter((row) => {
    const { identityHash, ...withoutHash } = row;
    return shaObject(withoutHash) !== identityHash;
  }).length, 0);
});

test("postFoundationMaster11610AliasVariant.contract.test", () => {
  const { foundation, master } = roots();
  const identities = jsonl(path.join(foundation, "identity", "GLOBAL_11610_SEMANTIC_IDENTITIES.jsonl"));
  const crosswalk = jsonl(path.join(master, "00-asphalt-predecessor", "ASPHALT_R63_EXISTING_EVIDENCE_TO_NEW_PROOF_SCHEMA_CROSSWALK.jsonl"));
  assert.equal(identities.filter((row) => row.identityRole === "ALIAS").length, 18);
  const result = validateAsphaltDenominator(crosswalk);
  assert.equal(result.aliasesTotal, 19);
  assert.equal(result.aliasesGlobal, 18);
  assert.equal(result.aliasesExternal, 1);
});

test("postFoundationMaster11610Groups.contract.test", () => {
  const { foundation } = roots();
  const taxonomy = json(path.join(foundation, "groups", "GLOBAL_11610_WORK_GROUP_TAXONOMY.json"));
  assert.equal(taxonomy.groups.length, 2_368);
  assert.equal(taxonomy.groups.filter((row) => row.classificationBasis.numericSliceUsed).length, 0);
});

test("postFoundationMaster11610Partition.contract.test", () => {
  const { foundation } = roots();
  const taxonomy = json(path.join(foundation, "groups", "GLOBAL_11610_WORK_GROUP_TAXONOMY.json"));
  const inventory = jsonl(path.join(foundation, "inventory", "GLOBAL_11610_SOURCE_INVENTORY.jsonl"));
  assert.equal(validateGroupPartition(taxonomy.groups, inventory.map((row) => row.catalog_id)).ok, true);
});

test("postFoundationMaster11610Passport.contract.test", () => {
  const { foundation } = roots();
  const rows = jsonl(path.join(foundation, "passports", "GLOBAL_11610_CATALOG_WORK_PASSPORTS.jsonl"));
  assert.equal(rows.length, 11_610);
  assert.equal(rows.filter((row) => row.silentDefaultPermission !== false).length, 0);
  assert.equal(rows.filter((row) => !row.ambiguityBlockerState.contentAdmissionBlockers.includes("MODE_C_WORK_NORMATIVE_PROOF_REQUIRED")).length, 0);
});

test("postFoundationMaster11610ContentDelta.contract.test", () => {
  const { foundation } = roots();
  const index = json(path.join(foundation, "FOUNDATION_EXACT_SHA_EVIDENCE_INDEX.json"));
  assert.equal(index.contentComplete, false);
  assert.equal(index.files.some((row) => /BOQ|ESTIMATE_CONTENT/u.test(row.file)), false);
});

test("postFoundationAuditReplayDeterminism.contract.test", { skip: !runA || !runB }, () => {
  const exclusions = new Set([
    "journal/AUDIT_APPEND_ONLY_JOURNAL.jsonl",
    "journal/AUDIT_COMMAND_AND_TEST_LEDGER.jsonl",
    "replay/REPLAY_RUN_SUMMARY.json",
    "replay/REPLAY_DETERMINISM_COMPARISON.json",
    "replay/RUN_A_MANIFEST.json",
    "replay/RUN_B_MANIFEST.json",
    "replay/RUN_A_VS_RUN_B_DIFF.json",
    "closeout/MANIFEST.json",
    "closeout/AUDIT_EVIDENCE_INDEX.json",
    "closeout/POST_FOUNDATION_INDEPENDENT_AUDIT_EXACT_SHA_EVIDENCE_INDEX.json",
  ]);
  const left = hashTree(runA, exclusions);
  const right = hashTree(runB, exclusions);
  assert.deepEqual(left, right);
});

test("postFoundationAuditFinalReportCompleteness.contract.test", { skip: !runA }, () => {
  const report = readFileSync(path.join(runA, "closeout", "POST_FOUNDATION_INDEPENDENT_AUDIT_FINAL_REPORT.md"), "utf8");
  for (const heading of [
    "## 1. VERDICT",
    "## 4. Table A — all 63 M1 estimate routes",
    "## 5. Table B — Foundation content delta by domain",
    "## 6. Table C — what changed",
    "## 7. Table D — independently tested claims",
    "## 8. Tests and deterministic replay",
    "## 11. HARD STOP",
  ]) assert.match(report, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  const tableStart = report.indexOf("| catalog_id | title | scope | BOQ |");
  const tableEnd = report.indexOf("\n\nExact 63-row machine ledger:", tableStart);
  assert.ok(tableStart >= 0 && tableEnd > tableStart);
  const rows = report.slice(tableStart, tableEnd).split(/\r?\n/u).slice(2).filter((line) => line.startsWith("| "));
  assert.equal(rows.length, 63);
  assert.equal(jsonl(path.join(runA, "foundation", "GLOBAL_11610_ESTIMATE_CONTENT_AND_ROW_STATUS.jsonl")).length, 11_610);
  assert.match(report, /SHA-256/u);
});

test("mutation: duplicate id and overlap are rejected", () => {
  const inventory = [{ catalog_id: "a", source_row_hash: "a".repeat(64) }, { catalog_id: "b", source_row_hash: "b".repeat(64) }];
  assert.equal(mutationMustFail((rows) => validateInventory(rows, 2), inventory, (rows) => { rows[1].catalog_id = "a"; }).passed, true);
  const fixture = { ids: ["a", "b"], groups: [{ workGroupId: "g1", primaryMemberIds: ["a"] }, { workGroupId: "g2", primaryMemberIds: ["b"] }] };
  assert.equal(mutationMustFail((value) => validateGroupPartition(value.groups, value.ids), fixture, (value) => { value.groups[1].primaryMemberIds.push("a"); }).passed, true);
});
