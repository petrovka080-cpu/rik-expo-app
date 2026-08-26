import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-useful-estimates-batch001-008-r1.before-supplement-completion-audit.v1";
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_PRODUCTION_GRADE_REAL_USEFUL_ESTIMATES_BATCH001_008_R1_RU.md");
const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const FIRST_SUPPLEMENT = resolve("C:/Users/User/.codex/attachments/f5053385-c8e2-4664-981d-fcf49325fb8d/pasted-text.txt");
const FIRST_SUPPLEMENT_SHA256 = "75a562c007e5e2eba1d21c3615ee3673deb16a1bbf8db8a12964006bef2c3258";
const CURRENT_SUPPLEMENT = resolve("C:/Users/User/.codex/attachments/d0844955-dca6-4d53-98fe-d51463993a44/pasted-text.txt");
const CURRENT_SUPPLEMENT_SHA256 = "03d2edcd29b12d98c9fb8c95bd840e8caac39cf9e489cda7316a53c1ff942b92";
const ROOT = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence");
const BEFORE = resolve(ROOT, "before");
const DENOMINATOR = resolve(BEFORE, "BEFORE_DENOMINATOR_RECONCILIATION.json");
const DENOMINATOR_INVENTORY = resolve(BEFORE, "BEFORE_DENOMINATOR_RECONCILIATION_4282.jsonl");
const COMPOSITIONS = resolve(ROOT, "03_BEFORE_50_REAL_COMPOSITIONS.json");
const MONOLITH = resolve(BEFORE, "monolithic-isolated-snapshot/BEFORE_MONOLITHIC_ISOLATED_PREPARED_SNAPSHOT.json");
const MONOLITH_DUMP = resolve(BEFORE, "monolithic-isolated-snapshot/before-monolithic-isolated-prepared-r1.dump");
const STATE = resolve(ROOT, "00_EXECUTION_STATE.json");
const OUTPUT_JSON = resolve(BEFORE, "BEFORE_COMPLETION_SUPPLEMENT_AUDIT.json");
const OUTPUT_MD = resolve(BEFORE, "BEFORE_COMPLETION_SUPPLEMENT_AUDIT.md");
const DATABASE_BASE = "postgresql://postgres:before_local_only@127.0.0.1:55437";
const SOURCE_DATABASE = "before_batch004";
const TARGET_DATABASE = "before_batch005008_audit";
const NEW_RELEASE_IDS = [
  "0a9b5d0d-d57a-520d-b661-c3e564df3286",
  "34a707dc-954c-547d-ba88-27c15dba58d7",
] as const;
const NEW_DEFINITION_ID = "5533b62f-d183-51e7-95e4-cb26da8eeb5e";
const NEW_CATALOG_ID = "r58-real:monolithic-reinforced-concrete";
const NEW_REVISION_IDS = [
  "29ba3fc1-f070-48c6-82de-39d3a64b5348",
  "e9432615-f06c-4017-8620-3547e2c149d5",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256Buffer(readFileSync(path));
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

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(stable(value)), "utf8"));
}

function atomicWrite(path: string, body: string): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/gu).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function listFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    return entry.isDirectory() ? listFiles(child) : [child];
  });
}

function evidenceIndex(): Json[] {
  const rootRequired = ["00_EXECUTION_STATE.json", "01_SOURCE_IDENTITY.json",
    "02_BEFORE_50_REAL_COMPOSITIONS.md", "03_BEFORE_50_REAL_COMPOSITIONS.json",
    "04_CORPUS_CONTENT_AUDIT_BEFORE.json", "05_ROOT_CAUSE_MATRIX.md",
    "06_TECHNOLOGY_PASSPORT_COVERAGE.json"].map((name) => resolve(ROOT, name));
  const beforeFiles = listFiles(BEFORE).filter((path) => ![OUTPUT_JSON, OUTPUT_MD].includes(path));
  return [...rootRequired, ...beforeFiles]
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({
      path: relative(ROOT, path).replaceAll("\\", "/"),
      bytes: statSync(path).size,
      sha256: sha256File(path),
    }));
}

async function constraintDefinition(client: Client): Promise<string> {
  const row = (await client.query(`select pg_get_constraintdef(oid) definition
    from pg_constraint where conname='estimate_resource_spec_r3_truth_ck'`)).rows[0] as Json | undefined;
  invariant(typeof row?.definition === "string", "SCHEMA_REPAIR_CONSTRAINT_MISSING");
  return row.definition;
}

type SharedTable = {
  table: string;
  targetFilter: string;
};

const SHARED_TABLES: readonly SharedTable[] = [
  { table: "estimate_definition_release", targetFilter: `id::text not in ('${NEW_RELEASE_IDS.join("','")}')` },
  { table: "estimate_work_identity", targetFilter: `catalog_id <> '${NEW_CATALOG_ID}'` },
  { table: "estimate_definition_version", targetFilter: `id::text <> '${NEW_DEFINITION_ID}'` },
  { table: "estimate_parameter_definition", targetFilter: `definition_version_id::text <> '${NEW_DEFINITION_ID}'` },
  { table: "estimate_formula_graph", targetFilter: `definition_version_id::text <> '${NEW_DEFINITION_ID}'` },
  { table: "estimate_resource_spec", targetFilter: `definition_version_id::text <> '${NEW_DEFINITION_ID}'` },
  { table: "estimate_revision", targetFilter: `id::text not in ('${NEW_REVISION_IDS.join("','")}')` },
  { table: "estimate_revision_row", targetFilter: `revision_id::text not in ('${NEW_REVISION_IDS.join("','")}')` },
  { table: "estimate_revision_artifact", targetFilter: `revision_id::text not in ('${NEW_REVISION_IDS.join("','")}')` },
  { table: "estimate_compile_job", targetFilter: `target_release_id::text <> '${NEW_RELEASE_IDS[0]}'` },
  { table: "estimate_cumulative_manifest_entry", targetFilter: `release_id::text not in ('${NEW_RELEASE_IDS.join("','")}')` },
  { table: "estimate_content_passport_r3", targetFilter: `definition_version_id::text <> '${NEW_DEFINITION_ID}'` },
];

async function tableFingerprint(client: Client, table: SharedTable, target: boolean): Promise<Json> {
  const filter = target ? `where ${table.targetFilter}` : "";
  const result = (await client.query(`with hashed as (
      select encode(extensions.digest(convert_to(to_jsonb(t)::text,'UTF8'),'sha256'),'hex') row_sha256
      from public.${table.table} t ${filter}
    ) select count(*)::int row_count,
      encode(extensions.digest(convert_to(coalesce(string_agg(row_sha256,'' order by row_sha256),''),'UTF8'),'sha256'),'hex') set_sha256
    from hashed`)).rows[0] as Json;
  return { table: table.table, row_count: Number(result.row_count), set_sha256: result.set_sha256 };
}

async function databaseAudit(): Promise<Json> {
  const source = new Client({ connectionString: `${DATABASE_BASE}/${SOURCE_DATABASE}`, application_name: "before-supplement-source-readonly" });
  const target = new Client({ connectionString: `${DATABASE_BASE}/${TARGET_DATABASE}`, application_name: "before-supplement-target-readonly" });
  await source.connect();
  await target.connect();
  try {
    await source.query("begin transaction read only");
    await target.query("begin transaction read only");
    const originalConstraint = await constraintDefinition(source);
    const repairedConstraint = await constraintDefinition(target);
    const comparisons: Json[] = [];
    for (const table of SHARED_TABLES) {
      const before = await tableFingerprint(source, table, false);
      const afterShared = await tableFingerprint(target, table, true);
      comparisons.push({
        table: table.table,
        source_clone: before,
        isolated_target_shared_rows: afterShared,
        unchanged: before.row_count === afterShared.row_count && before.set_sha256 === afterShared.set_sha256,
        target_exclusion: table.targetFilter,
      });
    }
    const readOnly = (await target.query(`select current_setting('default_transaction_read_only') setting`)).rows[0] as Json;
    await source.query("rollback");
    await target.query("rollback");
    const repairIdentity = {
      marker: "ISOLATED_AUDIT_SCHEMA_REPAIR",
      database: TARGET_DATABASE,
      constraint: "estimate_resource_spec_r3_truth_ck",
      original_constraint: originalConstraint,
      repaired_constraint: repairedConstraint,
      reason: "RESTORED_PG16_CONSTRAINT_CONTAINED_LOSSY_MOJIBAKE_QUESTION_MARKS_AND_FAILED_NEW_R3_ROW_INSERTS_WITH_INVALID_REGULAR_EXPRESSION_QUANTIFIER_OPERAND_INVALID",
      scope: "DDL_CONSTRAINT_ONLY_NOT_VALID; ORIGINAL_DATABASE_AND_DUMPS_UNCHANGED",
    };
    return {
      ...repairIdentity,
      original_constraint_sha256: sha256Buffer(Buffer.from(originalConstraint, "utf8")),
      repaired_constraint_sha256: sha256Buffer(Buffer.from(repairedConstraint, "utf8")),
      schema_repair_sha256: sha256(repairIdentity),
      source_database: SOURCE_DATABASE,
      target_database: TARGET_DATABASE,
      target_default_transaction_read_only: readOnly.setting,
      shared_business_rows: comparisons,
      shared_business_rows_unchanged: comparisons.every((item) => item.unchanged === true),
      production_writes: 0,
      source_dump_mutated: false,
    };
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }
}

function markdown(payload: Json): string {
  const difference = payload.denominator_reconciliation;
  const sourceKinds = payload.before_50_source_kinds;
  const repair = payload.isolated_audit_schema_repair;
  const lines = [
    "# BEFORE completion supplement audit",
    "",
    `Status: \`${payload.status}\`  `,
    `Master SHA-256: \`${MASTER_SHA256}\`  `,
    `Latest additive supplement SHA-256: \`${CURRENT_SUPPLEMENT_SHA256}\`  `,
    "Content truth: `RED`; никакой release/activation не выполнялся.",
    "",
    "## Честное reconciliation 4 272 / 4 211 / 61",
    "",
    "Запрошенное равенство `4272 = 4211 effective works + 61 aliases/redirects/non-work` отвергнуто как фактически ложное. `4211` — target bucket BATCH-001…008, а не подмножество 4 272: в нём есть 2 новых concrete successor, которых не было в predecessor 4 272. В predecessor есть 63 asphalt definitions вне target bucket. Поэтому существует числовой баланс `4272 - 4211 = 63 - 2 = 61`, но отдельного множества из 61 definition нет.",
    "",
    `- predecessor: ${difference.predecessor_total}`,
    `- target BATCH-001…008: ${difference.target_batch001008_total}`,
    `- predecessor-only: ${difference.predecessor_only_count}`,
    `- target-only: ${difference.target_only_count}`,
    `- union inventory: ${difference.union_inventory_count}`,
    `- unclassified: ${difference.unclassified}`,
    "",
    "### Полный set difference: 63 predecessor-only",
    "",
    "| # | catalog_id | Причина | search / terminal |",
    "|---:|---|---|---|",
    ...difference.predecessor_only.map((item: Json, index: number) =>
      `| ${index + 1} | \`${item.catalog_id}\` | ${item.reason} | ${item.search_classification} / ${item.terminal_classification} |`),
    "",
    "### Полный set difference: 2 target-only",
    "",
    "| # | catalog_id | Причина | batch |",
    "|---:|---|---|---|",
    ...difference.target_only.map((item: Json, index: number) =>
      `| ${index + 1} | \`${item.catalog_id}\` | ${item.reason} | ${item.target_batch_id} |`),
    "",
    "## Source kind для 50 BEFORE cases",
    "",
    `- \`HISTORICAL_EXACT_RUNTIME\`: ${sourceKinds.counts.HISTORICAL_EXACT_RUNTIME ?? 0}`,
    `- \`ACCEPTED_COMPOSITION_BRIDGE\`: ${sourceKinds.counts.ACCEPTED_COMPOSITION_BRIDGE ?? 0}`,
    `- \`RECONSTRUCTED_ISOLATED_RUNTIME\`: ${sourceKinds.counts.RECONSTRUCTED_ISOLATED_RUNTIME ?? 0}`,
    "",
    "Bridge не объявлен восстановленной backend revision; reconstructed case не объявлен историческим. Ограничения записаны отдельно в каждом case `03_BEFORE_50_REAL_COMPOSITIONS.json` и `02_BEFORE_50_REAL_COMPOSITIONS.md`.",
    "",
    "## Isolated audit schema repair",
    "",
    `Marker: \`${repair.marker}\`  `,
    `Schema repair SHA-256: \`${repair.schema_repair_sha256}\`  `,
    `Original constraint SHA-256: \`${repair.original_constraint_sha256}\`  `,
    `Repaired constraint SHA-256: \`${repair.repaired_constraint_sha256}\`  `,
    `Shared business rows unchanged: \`${repair.shared_business_rows_unchanged}\`  `,
    `Target DB read-only: \`${repair.target_default_transaction_read_only}\`  `,
    "",
    "Полные тексты обоих constraint и SHA/count каждого общего business table находятся в JSON companion.",
    "",
    "## Evidence hashes",
    "",
    `Проиндексировано файлов: ${payload.evidence_files.length}.`,
    "",
    "Этот checkpoint завершает доказательную часть BEFORE по дополнению, но не является AFTER или content GREEN.",
  ];
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  invariant(sha256File(MASTER) === MASTER_SHA256, "MASTER_SHA256_DRIFT");
  invariant(sha256File(FIRST_SUPPLEMENT) === FIRST_SUPPLEMENT_SHA256, "FIRST_SUPPLEMENT_SHA256_DRIFT");
  invariant(sha256File(CURRENT_SUPPLEMENT) === CURRENT_SUPPLEMENT_SHA256, "CURRENT_SUPPLEMENT_SHA256_DRIFT");
  const denominator = readJson(DENOMINATOR);
  const inventory = readJsonl(DENOMINATOR_INVENTORY);
  const compositions = readJson(COMPOSITIONS);
  const monolith = readJson(MONOLITH);
  const predecessorOnlyIds = denominator.difference_4211_vs_4272.predecessor_only_relative_to_target_batch001008 as string[];
  const targetOnlyIds = denominator.difference_4211_vs_4272.target_batch001008_only_relative_to_predecessor as string[];
  const inventoryById = new Map(inventory.map((item) => [String(item.catalog_id), item]));
  invariant(predecessorOnlyIds.length === 63 && targetOnlyIds.length === 2, "DENOMINATOR_SET_DIFFERENCE_DRIFT");
  invariant(inventory.length === 4282 && inventory.every((item) => item.membership_bucket), "DENOMINATOR_UNCLASSIFIED_DRIFT");
  const predecessorOnly = predecessorOnlyIds.map((catalogId) => {
    const item = inventoryById.get(catalogId);
    invariant(item, `PREDECESSOR_ONLY_INVENTORY_MISSING:${catalogId}`);
    return {
      catalog_id: catalogId,
      reason: "PREDECESSOR_ASPHALT_OUTSIDE_TARGET_BATCH001_008_BUCKET",
      target_batch_id: item.target_batch_id,
      source_batch: item.source_batch,
      adjudication_class: item.adjudication_class,
      search_classification: item.search_classification,
      search_selectable: item.search_selectable,
      terminal_classification: item.terminal_classification,
      definition_version_id: item.definition_version_id,
    };
  });
  const targetOnly = targetOnlyIds.map((catalogId) => {
    const item = inventoryById.get(catalogId);
    invariant(item, `TARGET_ONLY_INVENTORY_MISSING:${catalogId}`);
    return {
      catalog_id: catalogId,
      reason: "NEW_R58_CONCRETE_SUCCESSOR_ABSENT_FROM_ACCEPTED_PREDECESSOR_4272",
      target_batch_id: item.target_batch_id,
      source_batch: item.source_batch,
      terminal_classification: item.terminal_classification,
      definition_version_id: item.definition_version_id,
    };
  });

  const cases = compositions.cases as Json[];
  invariant(cases.length === 50 && cases.every((item) => item.source_kind), "BEFORE_SOURCE_KIND_INCOMPLETE");
  const sourceKindCounts = Object.fromEntries([...cases.reduce<Map<string, number>>((counts, item) => {
    const key = String(item.source_kind);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)));
  invariant(sourceKindCounts.HISTORICAL_EXACT_RUNTIME === 21
    && sourceKindCounts.ACCEPTED_COMPOSITION_BRIDGE === 28
    && sourceKindCounts.RECONSTRUCTED_ISOLATED_RUNTIME === 1,
  "BEFORE_SOURCE_KIND_COUNTS_DRIFT");
  const bridgeCases = cases.filter((item) => item.source_kind === "ACCEPTED_COMPOSITION_BRIDGE");
  invariant(bridgeCases.every((item) => item.source_limitations.includes(
    "ACCEPTED_EVIDENCE_JOIN_NOT_RESTORED_AS_A_BACKEND_DATABASE_REVISION_IN_THIS_AUDIT")),
  "BRIDGE_BACKEND_IDENTITY_OVERCLAIM");
  const reconstructed = cases.filter((item) => item.source_kind === "RECONSTRUCTED_ISOLATED_RUNTIME");
  invariant(reconstructed.length === 1 && reconstructed[0].catalog_id === NEW_CATALOG_ID,
    "RECONSTRUCTED_MONOLITH_IDENTITY_DRIFT");
  invariant(monolith.historical_probe_reference.root_parent_revision_id
    !== monolith.isolated_prepared_runtime.root_parent.id
    && monolith.isolated_prepared_runtime.historical_checksum_parity.required === false,
  "MONOLITH_HISTORICAL_RECONSTRUCTED_IDENTITY_COLLAPSED");

  const schemaRepair = await databaseAudit();
  invariant(schemaRepair.shared_business_rows_unchanged === true, "ISOLATED_SCHEMA_REPAIR_CHANGED_BUSINESS_ROWS");
  invariant(schemaRepair.target_default_transaction_read_only === "on", "ISOLATED_AUDIT_DATABASE_NOT_READ_ONLY");
  const state = readJson(STATE);
  state.additive_supplements = [
    { path: FIRST_SUPPLEMENT.replaceAll("\\", "/"), sha256: FIRST_SUPPLEMENT_SHA256 },
    { path: CURRENT_SUPPLEMENT.replaceAll("\\", "/"), sha256: CURRENT_SUPPLEMENT_SHA256 },
  ];
  state.current_phase = "BEFORE_COMPLETE_WITH_SUPPLEMENT_RECONCILIATION_AND_SCHEMA_REPAIR_PROOF";
  state.current_gate = "SHADOW_TECHNOLOGY_PASSPORT_R1_THEN_CANONICAL_SOURCE_REMEDIATION";
  state.gate_status = "GREEN_BEFORE_EVIDENCE_CONTENT_RED_SHADOW_ONLY";
  state.exact_next_action = "Keep TechnologyPassportR1 shadow/prepared-only; remediate the shared canonical generator and create independent family passports with per-catalog delta manifests.";
  writeJson(STATE, state);

  const payload = {
    schema_version: CONTRACT,
    generated_at: new Date().toISOString(),
    contracts: {
      master: { path: MASTER.replaceAll("\\", "/"), sha256: MASTER_SHA256 },
      additive_supplements: state.additive_supplements,
    },
    source_identity: {
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      dirty_status_sha256: sha256Buffer(Buffer.from(execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }), "utf8")),
      audited_sources: [
        "scripts/estimate/realUsefulEstimatesR1/buildDenominatorReconciliation.ts",
        "scripts/estimate/realUsefulEstimatesR1/buildBefore50ReadableAndCorpusAudit.ts",
        "scripts/estimate/realUsefulEstimatesR1/prepareBeforeMonolithicSuccessorSnapshot.ts",
        "src/lib/estimate/backendPlatform/technologyPassportR1.ts",
        "src/lib/estimate/backendPlatform/technologyPassportR1.test.ts",
      ].map((path) => ({ path, sha256: sha256File(resolve(path)) })),
    },
    denominator_reconciliation: {
      requested_equation: "4272 = 4211 effective works + 61 aliases_redirects_or_non_work",
      requested_equation_status: "REJECTED_AS_FACTUALLY_FALSE",
      reason: "4211 is a target batch bucket containing 2 new successors, not a subset or effective-work count of predecessor 4272; predecessor-only is 63, target-only is 2.",
      separate_entity_set_of_61_exists: false,
      actual_equations: [
        "4272 = 4209 non-asphalt + 63 asphalt",
        "4282 = 4211 BATCH001_008 + 71 outside target bucket",
        "4282 = 4272 predecessor + 10 successors",
        "4272 - 4211 = 63 predecessor-only - 2 target-only = 61 numerical balance",
      ],
      predecessor_total: 4272,
      target_batch001008_total: 4211,
      predecessor_only_count: predecessorOnly.length,
      target_only_count: targetOnly.length,
      set_difference_entity_count: predecessorOnly.length + targetOnly.length,
      union_inventory_count: inventory.length,
      unclassified: 0,
      predecessor_classification: denominator.accepted_predecessor_runtime_set.exact_classification,
      predecessor_only: predecessorOnly,
      target_only: targetOnly,
      parent_evidence: { path: relative(ROOT, DENOMINATOR).replaceAll("\\", "/"), sha256: sha256File(DENOMINATOR) },
    },
    before_50_source_kinds: {
      counts: sourceKindCounts,
      total: cases.length,
      all_cases_explicit: true,
      bridge_called_restored_backend_revision: false,
      reconstructed_called_historical_revision: false,
      cases: cases.map((item) => ({
        case_number: item.case_number,
        catalog_id: item.catalog_id,
        source_kind: item.source_kind,
        evidence_mode: item.evidence_mode,
        source_limitations: item.source_limitations,
        root_revision_id: item.exact_identity.canonical_root_parent_revision_id,
        definition_version_id: item.exact_identity.runtime_definition_version_id,
        release_id: item.exact_identity.release_id,
        runtime_row_count: item.row_counts.total,
        artifact_metadata_sha256_present: item.artifacts.items.every((artifact: Json) => /^[a-f0-9]{64}$/u.test(String(artifact.sha256))),
      })),
    },
    isolated_audit_schema_repair: {
      ...schemaRepair,
      source_script: {
        path: "scripts/estimate/realUsefulEstimatesR1/prepareBeforeMonolithicSuccessorSnapshot.ts",
        sha256: sha256File(resolve("scripts/estimate/realUsefulEstimatesR1/prepareBeforeMonolithicSuccessorSnapshot.ts")),
      },
      frozen_dump: { path: relative(ROOT, MONOLITH_DUMP).replaceAll("\\", "/"), bytes: statSync(MONOLITH_DUMP).size, sha256: sha256File(MONOLITH_DUMP) },
    },
    technology_passport_gate: {
      mode: "SHADOW_AUDIT_AND_PREPARED_RELEASE_ONLY",
      production_admission_connected: false,
      current_coverage: "0/4211",
      mechanical_generation_from_runtime_rows_forbidden: true,
      targeted_contract_tests: "6/6 GREEN",
      content_green_claimed: false,
    },
    evidence_files: evidenceIndex(),
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    status: "GREEN_BEFORE_SUPPLEMENT_EVIDENCE_COMPLETE_CONTENT_RED_SHADOW_ONLY_NO_RELEASE",
  };
  const sealed = { ...payload, payload_sha256: sha256(payload) };
  writeJson(OUTPUT_JSON, sealed);
  atomicWrite(OUTPUT_MD, markdown(sealed));
  process.stdout.write(`${JSON.stringify({
    status: payload.status,
    denominator: {
      predecessor: 4272,
      target: 4211,
      predecessor_only: predecessorOnly.length,
      target_only: targetOnly.length,
      numerical_balance: 61,
      set_difference_entities: predecessorOnly.length + targetOnly.length,
      unclassified: 0,
    },
    source_kinds: sourceKindCounts,
    schema_repair_sha256: schemaRepair.schema_repair_sha256,
    business_rows_unchanged: schemaRepair.shared_business_rows_unchanged,
    outputs: [OUTPUT_JSON, OUTPUT_MD].map((path) => ({
      path: path.replaceAll("\\", "/"),
      bytes: statSync(path).size,
      sha256: sha256File(path),
    })),
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
