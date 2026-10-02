import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  toConcreteS2721HistoricalDocumentLedgerRow,
  type ConcreteHistoricalCandidateRow,
} from "./concreteS2721HistoricalDocumentLedger";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch008-historical-document-ledger-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const EVIDENCE_ROOT = resolve(".release-runtime/batch008-concrete-r5/evidence");
const SNAPSHOT_PATH = resolve(EVIDENCE_ROOT, "03-norms/OFFICIAL_SOURCE_SNAPSHOTS.jsonl");
const NORMATIVE_UNIVERSE_PATH = resolve(EVIDENCE_ROOT, "01-discovery/OFFICIAL_NORMATIVE_WORK_UNIVERSE.jsonl");
const PREDECESSOR_MANIFEST_PATH = resolve(
  ".release-runtime/batch008-concrete-r5/predecessor-batch007/manifest.json",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/r568/s27-21/concrete-batch008-historical-document-ledger-v1",
);
const LEDGER_PATH = resolve(OUTPUT_ROOT, "document-ledger.jsonl");
const OUTPUT_PATH = resolve(OUTPUT_ROOT, "acceptance.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const HISTORICAL_RELEASE_ID = "f939d30c-621d-5c65-ba08-d93723689406";
const DEFAULT_BATCH = "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2";
const DOCUMENT_SECTION_HEX = "d094d0bed0bad183d0bcd0b5d0bdd182d0b0d186d0b8d18f";
const QUALITY_SECTION_HEX = "d09ad0bed0bdd182d180d0bed0bbd18c20d0bad0b0d187d0b5d181d182d0b2d0b0";
const SOURCE_PATHS = [
  "scripts/estimate/r4a13/concreteS2721HistoricalDocumentLedger.ts",
  "scripts/estimate/r4a13/auditS2721Batch008HistoricalDocumentLedger.ts",
  "tests/estimateBackend/concreteS2721HistoricalDocumentLedger.contract.test.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function targetCatalogId(sourceCatalogId: string): string {
  return sourceCatalogId.startsWith("expanded-template:")
    ? sourceCatalogId
    : `canonical-work:base:${sourceCatalogId}`;
}

function atomicText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S2721_BATCH008_LEDGER_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_BATCH008_LEDGER_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_S2721_BATCH008_LEDGER_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_S2721_BATCH008_LEDGER_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH008_LEDGER_POINTER_STATE");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = [...new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-008")
    .flatMap((group) => group.member_catalog_ids))].sort();
  invariant(contentIds.length === 768, `STOP_S2721_BATCH008_LEDGER_CONTENT_DENOMINATOR:${contentIds.length}`);
  const targetIds = contentIds.map(targetCatalogId);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const candidateShape = (await client.query(`select count(*)::int definitions,
        (select count(*) from public.estimate_parameter_definition parameter
          join public.estimate_definition_version version on version.id=parameter.definition_version_id
          where version.release_id=$1)::int parameters,
        (select count(*) from public.estimate_formula_graph formula
          join public.estimate_definition_version version on version.id=formula.definition_version_id
          where version.release_id=$1)::int formulas,
        (select count(*) from public.estimate_resource_spec resource
          join public.estimate_definition_version version on version.id=resource.definition_version_id
          where version.release_id=$1)::int resources
      from public.estimate_definition_version where release_id=$1`, [HISTORICAL_RELEASE_ID])).rows[0] as Json;
    invariant(Number(candidateShape.definitions) === 768 && Number(candidateShape.parameters) === 224_876
      && Number(candidateShape.formulas) === 273_710 && Number(candidateShape.resources) === 273_714,
    `STOP_S2721_BATCH008_LEDGER_CANDIDATE_SHAPE:${JSON.stringify(candidateShape)}`);

    const databaseRows = (await client.query(`select version.catalog_id,
        version.id::text definition_version_id,version.definition_sha256,
        resource.row_id,resource.row_sha256,resource.section,resource.category,
        resource.resource_graph->>'operation' operation,resource.formula_id,
        formula.ast_sha256 formula_ast_sha256,formula.input_parameter_ids
      from public.estimate_resource_spec resource
      join public.estimate_definition_version version on version.id=resource.definition_version_id
      join public.estimate_formula_graph formula
        on formula.definition_version_id=version.id and formula.formula_id=resource.formula_id
      where version.release_id=$1
        and encode(convert_to(resource.section,'UTF8'),'hex')=$2
      order by version.catalog_id,resource.ordinal,resource.row_id`,
    [HISTORICAL_RELEASE_ID, DOCUMENT_SECTION_HEX])).rows as Json[];
    const ledgerRows = databaseRows.map((row) => toConcreteS2721HistoricalDocumentLedgerRow({
      catalogId: String(row.catalog_id),
      definitionVersionId: String(row.definition_version_id),
      definitionSha256: String(row.definition_sha256),
      rowId: String(row.row_id),
      rowSha256: String(row.row_sha256),
      section: String(row.section),
      category: String(row.category),
      operation: String(row.operation),
      formulaId: String(row.formula_id),
      formulaAstSha256: String(row.formula_ast_sha256),
      inputParameterIds: row.input_parameter_ids as string[],
    } satisfies ConcreteHistoricalCandidateRow));
    invariant(ledgerRows.length === 1_525,
      `STOP_S2721_BATCH008_LEDGER_DOCUMENT_ROWS:${ledgerRows.length}`);
    invariant(new Set(ledgerRows.map((row) => `${row.definitionVersionId}\0${row.rowId}`)).size === 1_525,
      "STOP_S2721_BATCH008_LEDGER_ROW_UNIQUENESS");
    invariant(new Set(ledgerRows.map((row) => `${row.definitionVersionId}\0${row.formulaId}`)).size === 1_525,
      "STOP_S2721_BATCH008_LEDGER_FORMULA_UNIQUENESS");
    invariant(new Set(ledgerRows.map((row) =>
      `${row.definitionVersionId}\0${row.exclusiveDocumentParameterId}`)).size === 1_525,
    "STOP_S2721_BATCH008_LEDGER_PARAMETER_UNIQUENESS");
    const operationCounts = Object.fromEntries(["record", "protocol"].map((operation) => [
      operation,
      ledgerRows.filter((row) => row.operation === operation).length,
    ]));
    invariant(operationCounts.record === 1_097 && operationCounts.protocol === 428,
      `STOP_S2721_BATCH008_LEDGER_OPERATION_DENOMINATOR:${JSON.stringify(operationCounts)}`);

    const exclusiveParameterReferences = (await client.query(`with document_rows as (
        select version.id definition_version_id,resource.formula_id
        from public.estimate_resource_spec resource
        join public.estimate_definition_version version on version.id=resource.definition_version_id
        where version.release_id=$1 and encode(convert_to(resource.section,'UTF8'),'hex')=$2
      ), document_parameters as (
        select distinct formula.definition_version_id,input.parameter_id
        from public.estimate_formula_graph formula
        join document_rows row on row.definition_version_id=formula.definition_version_id
          and row.formula_id=formula.formula_id
        cross join lateral unnest(formula.input_parameter_ids) input(parameter_id)
        where input.parameter_id like '%document_lot'
      )
      select count(*)::int document_parameters,
        count(*) filter(where retained_formula.formula_id is not null)::int retained_formula_references
      from document_parameters parameter
      left join public.estimate_formula_graph retained_formula
        on retained_formula.definition_version_id=parameter.definition_version_id
        and parameter.parameter_id=any(retained_formula.input_parameter_ids)
        and not exists(select 1 from document_rows row
          where row.definition_version_id=retained_formula.definition_version_id
            and row.formula_id=retained_formula.formula_id)`,
    [HISTORICAL_RELEASE_ID, DOCUMENT_SECTION_HEX])).rows[0] as Json;
    invariant(Number(exclusiveParameterReferences.document_parameters) === 1_525
      && Number(exclusiveParameterReferences.retained_formula_references) === 0,
    `STOP_S2721_BATCH008_LEDGER_EXCLUSIVE_PARAMETERS:${JSON.stringify(exclusiveParameterReferences)}`);

    const qualityRows = (await client.query(`select resource.resource_graph->>'operation' operation,
        resource.category,resource.row_type,resource.unit_id,count(*)::int rows
      from public.estimate_resource_spec resource
      join public.estimate_definition_version version on version.id=resource.definition_version_id
      where version.release_id=$1 and encode(convert_to(resource.section,'UTF8'),'hex')=$2
      group by operation,resource.category,resource.row_type,resource.unit_id
      order by rows desc,operation`, [HISTORICAL_RELEASE_ID, QUALITY_SECTION_HEX])).rows as Json[];
    const qualityRowCount = qualityRows.reduce((sum, row) => sum + Number(row.rows), 0);
    invariant(qualityRowCount === 34_610,
      `STOP_S2721_BATCH008_LEDGER_QUALITY_DENOMINATOR:${qualityRowCount}`);

    const currentRows = (await client.query(`select target.catalog_id,manifest.source_batch
      from unnest($2::text[]) target(catalog_id)
      left join public.estimate_cumulative_manifest_entry manifest
        on manifest.release_id=$1 and manifest.catalog_id=target.catalog_id`,
    [current.definitionReleaseId, targetIds])).rows as Json[];
    const acceptedSpecializedCount = currentRows.filter((row) =>
      row.source_batch != null && row.source_batch !== DEFAULT_BATCH).length;
    invariant(acceptedSpecializedCount === 449,
      `STOP_S2721_BATCH008_LEDGER_ACCEPTED_SUCCESSORS:${acceptedSpecializedCount}`);

    const ledgerText = `${ledgerRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
    atomicText(LEDGER_PATH, ledgerText);
    const receipt: Json = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      status: "GREEN_S2721_BATCH008_HISTORICAL_DOCUMENT_LEDGER_ONLY_NOT_SOURCE_PROJECTION_NOT_PUBLISHED",
      mutationPerformed: false,
      sourceCurrentParityVerified: false,
      publishable: false,
      current: {
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
        owner: current.owner,
        acceptedSpecializedConcreteSuccessorsPreserved: acceptedSpecializedCount,
        unchanged: true,
      },
      historicalCandidate: {
        releaseId: HISTORICAL_RELEASE_ID,
        shape: Object.fromEntries(Object.entries(candidateShape).map(([key, value]) => [key, Number(value)])),
      },
      ledger: {
        path: LEDGER_PATH,
        rows: ledgerRows.length,
        formulas: new Set(ledgerRows.map((row) => `${row.definitionVersionId}\0${row.formulaId}`)).size,
        exclusiveDocumentParameters: new Set(ledgerRows.map((row) =>
          `${row.definitionVersionId}\0${row.exclusiveDocumentParameterId}`)).size,
        operationCounts,
        sha256: sha256(ledgerText),
        disposition: "CANDIDATE_ONLY_UNTIL_SOURCE_PARITY_RESTORED",
      },
      retainedFailClosed: {
        qualityControlRows: qualityRowCount,
        breakdown: qualityRows.map((row) => ({
          operation: row.operation,
          category: row.category,
          rowType: row.row_type,
          unitId: row.unit_id,
          rows: Number(row.rows),
        })),
        reason: "These are tests, samples, measurements, inspections, labor and equipment; frozen sources are absent, so separate payability cannot be safely changed.",
      },
      remainingBlockers: [
        {
          code: "FROZEN_SOURCE_EVIDENCE_AND_PREDECESSOR_MISSING",
          count: Number(!existsSync(SNAPSHOT_PATH)) + Number(!existsSync(NORMATIVE_UNIVERSE_PATH))
            + Number(!existsSync(PREDECESSOR_MANIFEST_PATH)),
          nextAction: "Restore exact predecessor, snapshots and normative universe before applying this candidate-only ledger to a rebuilt source projection.",
        },
        {
          code: "QUALITY_CONTROL_PAYABILITY_REQUIRES_SOURCE_AND_ENGINEERING_REVIEW",
          count: qualityRowCount,
          nextAction: "Classify each exact testing/inspection activity only after source parity; do not blanket-collapse real services or equipment.",
        },
      ],
      checks: {
        historicalCandidateInspectedInReadOnlyTransaction: true,
        documentLedgerContracts: "GREEN_3_OF_3",
        focusedEslint: "GREEN_ZERO_WARNINGS",
        productionAccessed: false,
        deployPerformed: false,
        activationPerformed: false,
      },
      source: {
        branch: git("branch", "--show-current"),
        head: git("rev-parse", "HEAD"),
        tree: git("rev-parse", "HEAD^{tree}"),
        inventoryPath: INVENTORY_PATH,
        inventorySha256: sha256(readFileSync(INVENTORY_PATH)),
        sourceHashes: SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
      },
      master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    };
    receipt.receiptSha256 = sha256(receipt);
    atomicJson(OUTPUT_PATH, receipt);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    await client.query("rollback");
  } finally {
    await client.end();
  }
}

void main();
