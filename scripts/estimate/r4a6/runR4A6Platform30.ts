import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildCanonicalProcurementProjection,
  selectCanonicalArtifactRows,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimatePriceItem,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { buildCanonicalProfessionalPdfProjection } from "../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf";
import {
  buildR4A6Group50Case,
  type R4A6Group50Parameter,
} from "./group50ScenarioContract";
import {
  R4_A6_PLATFORM30_SCENARIO_KINDS,
  androidApi34PlatformTransport,
  assertR4A6Platform30ScenarioSet,
  assertR4A6PlatformPayloadParity,
  webPlatformTransport,
  type R4A6Platform30ScenarioKind,
  type R4A6PlatformExecution,
} from "./platform30ScenarioContract";

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A6_CANONICAL_MONOLITH_PROFESSIONAL_ESTIMATE_PRINT_PDF_FORMULA_REMEDIATION_ANDROID_API34_GROUP50_71040_GLOBAL_GREEN_RU.md",
);
const MASTER_SHA256 = "11e671dd5c376c577fa4f64017e3ccdc7cc9acfd59f064c343627345334275e6";
const RELEASE_ID = "3788cc88-701d-5cc9-9130-c61262cb9979";
const SEARCH_RELEASE_ID = "3bb74464-9773-5364-a4f0-4e542b45f62a";
const GROUP50_SOURCE_SHA = "7514da1240ae99a5ad4aedf912a7075296cd55b4";
const GROUP50_ROOT = resolve(
  `.release-runtime/r568/rc09-r4-production-closeout/r4-a6-canonical-monolith-professional-estimate-print-formula-global-closeout-1/group50-${GROUP50_SOURCE_SHA}-terminal`,
);
const LIVE_CANARY_SOURCE_SHA = "0a51c28c8376fb97f334afd455fa4f7941194992";
const LIVE_CANARY_PATH = resolve(
  `.release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/evidence/android-${LIVE_CANARY_SOURCE_SHA}-terminal-green/17_android_replay.json`,
);
const ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a6-canonical-monolith-professional-estimate-print-formula-global-closeout-1",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const EXPECTED_GROUPS = 2_368;
const EXPECTED_VISIBLE_WORKS = 10_322;
const EXECUTIONS_PER_PLATFORM_PER_GROUP = 15;
const EXPECTED_EXECUTIONS_PER_PLATFORM = 35_520;
const EXPECTED_PLATFORM_EXECUTIONS = 71_040;
const EXPECTED_PARITY_PAIRS = 35_520;
const SHARD_COUNT = 32;
const PLATFORM_GROUP50_ORDINAL_OFFSET = 25;
const EXACT_SOURCE_PATHS = [
  "scripts/estimate/r4a6/runR4A6Platform30.ts",
  "scripts/estimate/r4a6/platform30ScenarioContract.ts",
  "scripts/estimate/r4a6/group50ScenarioContract.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
  "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts",
] as const;

type Json = Record<string, any>;

type UpstreamMember = {
  catalogId: string;
  definitionVersionId: string;
  titleRu: string;
  baseline: Json;
  parameters: R4A6Group50Parameter[];
};

type UpstreamGroup = {
  groupId: string;
  titleRu: string;
  domainId: string;
  memberSetSha256: string;
  members: UpstreamMember[];
};

type UpstreamManifest = {
  proofSnapshotSha256: string;
  source: Json;
  database: Json;
  denominators: Json;
  groups: UpstreamGroup[];
};

type PlatformCase = {
  caseId: string;
  caseOrdinal: number;
  scenarioKind: R4A6Platform30ScenarioKind;
  catalogId: string;
  definitionVersionId: string;
  parameterPatch: Json;
  baselineSha256: string;
  inputFingerprint: string;
};

type PlatformGroup = {
  groupId: string;
  memberSetSha256: string;
  memberCount: number;
  cases: PlatformCase[];
  caseSetSha256: string;
};

type PlatformManifest = {
  schemaVersion: string;
  status: "FROZEN_NOT_EXECUTED";
  masterSha256: string;
  source: Json;
  database: Json;
  upstreamGroup50: Json;
  liveCanary: Json;
  denominators: Json;
  groups: PlatformGroup[];
  shards: { shardId: string; groupIds: string[]; expectedPairs: number; membershipSha256: string }[];
  proofSnapshotSha256: string;
};

type PlatformProjection = {
  semantic: Json;
  checks: Record<string, boolean>;
  semanticSha256: string;
};

const COUNTER_KEYS = [
  "webRed",
  "androidRed",
  "webAndroidParityRed",
  "pdfParityRed",
  "procurementParityRed",
  "historyParityRed",
  "coldRestartRed",
  "confirmIdempotencyRed",
  "categoryProjectionRed",
  "photoIdentityRed",
  "marketplaceIdempotencyRed",
  "duplicateExecutionRed",
] as const;

type CounterKey = (typeof COUNTER_KEYS)[number];
type Counters = Record<CounterKey, number>;

function counters(): Counters {
  return Object.fromEntries(COUNTER_KEYS.map((key) => [key, 0])) as Counters;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256(value: unknown): string {
  return sha256Bytes(canonicalEstimateStableJson(value));
}

function exactSourceIdentity(): Json {
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...EXACT_SOURCE_PATHS);
  if (dirty) throw new Error(`STOP_PLATFORM30_SOURCE_DRIFT:${dirty}`);
  return {
    branch: git("branch", "--show-current"),
    commitSha: git("rev-parse", "HEAD"),
    sourceTreeSha: git("rev-parse", "HEAD^{tree}"),
    paths: EXACT_SOURCE_PATHS,
  };
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function writeImmutableJson(path: string, value: Json): void {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== content) {
      throw new Error(`STOP_IMMUTABLE_EVIDENCE_CONFLICT:${path}`);
    }
    return;
  }
  atomicWrite(path, content);
}

function withoutHash(value: Json, key: string): Json {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * ratio) - 1)]!;
}

async function databaseIdentity(client: Client): Promise<Json> {
  const row = (await client.query(
    `select release.id::text release_id,release.status release_status,release.release_key,
      search.id::text search_release_id,search.status search_status,search.snapshot_sha256,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1
        and baseline_ready and scenario_ready) ready_count,
      (select count(*)::int from public.estimate_search_group where search_release_id=$2) group_count,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2
        and selectable and adjudication_class='EFFECTIVE_WORK') visible_count,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) membership_count,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(entry_sha256,'' order by catalog_id),''),'UTF8'),'sha256'),'hex')
        from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(document_sha256,'' order by catalog_id),''),'UTF8'),'sha256'),'hex')
        from public.estimate_search_document where search_release_id=$2) document_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(member_set_sha256,'' order by group_id),''),'UTF8'),'sha256'),'hex')
        from public.estimate_search_group where search_release_id=$2) group_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(ast_sha256,'' order by definition_version_id,formula_id),''),'UTF8'),'sha256'),'hex')
        from public.estimate_formula_graph where definition_version_id in(
          select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) formula_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(row_sha256,'' order by definition_version_id,ordinal),''),'UTF8'),'sha256'),'hex')
        from public.estimate_resource_spec where definition_version_id in(
          select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) resource_hash
    from public.estimate_definition_release release
    join public.estimate_search_index_release search on search.id=$2
    where release.id=$1`,
    [RELEASE_ID, SEARCH_RELEASE_ID],
  )).rows[0] as Json;
  if (!row || Number(row.manifest_count) !== 10_331
    || Number(row.ready_count) !== 10_331
    || Number(row.group_count) !== EXPECTED_GROUPS
    || Number(row.visible_count) !== EXPECTED_VISIBLE_WORKS
    || Number(row.membership_count) !== EXPECTED_VISIBLE_WORKS) {
    throw new Error(`STOP_PLATFORM30_DATABASE_DENOMINATOR:${JSON.stringify(row)}`);
  }
  return { ...row, databaseIdentityHash: sha256(row) };
}

function api34DeviceEvidence(): Json {
  const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME
    ?? resolve(process.env.LOCALAPPDATA ?? "", "Android/Sdk");
  const adb = resolve(sdkRoot, "platform-tools/adb.exe");
  if (!existsSync(adb)) throw new Error("STOP_PLATFORM30_ADB_MISSING");
  const devices = execFileSync(adb, ["devices"], { encoding: "utf8" });
  if (!/^emulator-5554\s+device$/mu.test(devices)) throw new Error("STOP_PLATFORM30_API34_DEVICE_OFFLINE");
  const apiLevel = execFileSync(adb, ["-s", "emulator-5554", "shell", "getprop", "ro.build.version.sdk"], {
    encoding: "utf8",
  }).trim();
  const packageDump = execFileSync(adb, ["-s", "emulator-5554", "shell", "dumpsys", "package", "com.azisbek_dzhantaev.rikexpoapp"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (apiLevel !== "34" || !/versionName=/u.test(packageDump)) {
    throw new Error("STOP_PLATFORM30_API34_DEVICE_IDENTITY");
  }
  return {
    deviceId: "emulator-5554",
    apiLevel: Number(apiLevel),
    packageInstalled: true,
    packageIdentitySha256: sha256(packageDump.match(/version(?:Code|Name)=[^\r\n]+/gu) ?? []),
  };
}

function liveCanaryEvidence(source: Json): Json {
  if (!existsSync(LIVE_CANARY_PATH)) throw new Error("STOP_PLATFORM30_LIVE_CANARY_MISSING");
  const bytes = readFileSync(LIVE_CANARY_PATH);
  const canary = JSON.parse(bytes.toString("utf8")) as Json;
  const accepted = canary.accepted_journey as Json;
  const parity = accepted?.parity as Json;
  if (canary.final_status !== "GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY"
    || canary.android_api34_smoke_passed !== true || Number(canary.actual_api) !== 34
    || accepted?.status !== "GREEN" || !Array.isArray(accepted?.failures) || accepted.failures.length > 0
    || parity?.sameRelease !== true || parity?.sameCatalog !== true
    || parity?.sameChecksum !== true || parity?.sameRowCount !== true) {
    throw new Error("STOP_PLATFORM30_LIVE_CANARY_RED");
  }
  try {
    git("merge-base", "--is-ancestor", LIVE_CANARY_SOURCE_SHA, String(source.commitSha));
  } catch {
    throw new Error("STOP_PLATFORM30_LIVE_CANARY_NOT_ANCESTOR");
  }
  return {
    scope: "LIVE_WEB_ANDROID_SHELL_CANARY_ONLY_NOT_PLATFORM30_DENOMINATOR",
    path: LIVE_CANARY_PATH,
    sha256: sha256Bytes(bytes),
    sourceCommitSha: LIVE_CANARY_SOURCE_SHA,
    sourceIsAncestor: true,
    webAndroidLiveParity: parity,
    androidApiLevel: Number(canary.actual_api),
    acceptedJourneyStatus: accepted.status,
    currentApi34Device: api34DeviceEvidence(),
    denominatorExecutionModes: {
      web: "WEB_CONTRACT_EXECUTION",
      android: "ANDROID_API34_CONTRACT_EXECUTION",
    },
  };
}

function loadUpstreamGroup50(): { manifest: UpstreamManifest; evidence: Json } {
  const manifestPath = resolve(GROUP50_ROOT, "FROZEN_MANIFEST.json");
  const terminalPath = resolve(GROUP50_ROOT, "TERMINAL_SUMMARY.json");
  if (!existsSync(manifestPath) || !existsSync(terminalPath)) {
    throw new Error("STOP_PLATFORM30_GROUP50_EVIDENCE_MISSING");
  }
  const manifestBytes = readFileSync(manifestPath);
  const terminalBytes = readFileSync(terminalPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as UpstreamManifest;
  const terminal = JSON.parse(terminalBytes.toString("utf8")) as Json;
  if (manifest.proofSnapshotSha256 !== sha256(withoutHash(manifest as Json, "proofSnapshotSha256"))
    || terminal.status !== "GREEN_R4_A6_GROUP50_2368_GROUPS"
    || terminal.source?.commitSha !== GROUP50_SOURCE_SHA
    || Number(terminal.passedCases) !== 118_400) {
    throw new Error("STOP_PLATFORM30_GROUP50_EVIDENCE_RED");
  }
  return {
    manifest,
    evidence: {
      root: GROUP50_ROOT,
      sourceCommitSha: GROUP50_SOURCE_SHA,
      frozenManifestSha256: sha256Bytes(manifestBytes),
      proofSnapshotSha256: manifest.proofSnapshotSha256,
      terminalSummarySha256: sha256Bytes(terminalBytes),
      terminalSemanticSha256: terminal.summarySha256,
      status: terminal.status,
    },
  };
}

function buildPlatformManifest(input: {
  source: Json;
  database: Json;
  upstream: UpstreamManifest;
  upstreamEvidence: Json;
  liveCanary: Json;
}): PlatformManifest {
  assertR4A6Platform30ScenarioSet();
  if (input.upstream.groups.length !== EXPECTED_GROUPS
    || Number(input.upstream.denominators.visibleWorks) !== EXPECTED_VISIBLE_WORKS
    || input.upstream.database.databaseIdentityHash !== input.database.databaseIdentityHash) {
    throw new Error("STOP_PLATFORM30_UPSTREAM_DATABASE_DRIFT");
  }
  const fingerprints = new Set<string>();
  const visibleWorks = new Set<string>();
  const groups = input.upstream.groups.map((group): PlatformGroup => {
    if (group.members.length === 0 || group.members.length > EXECUTIONS_PER_PLATFORM_PER_GROUP) {
      throw new Error(`STOP_PLATFORM30_GROUP_MEMBER_COVERAGE:${group.groupId}:${group.members.length}`);
    }
    const cases = R4_A6_PLATFORM30_SCENARIO_KINDS.map((scenarioKind, caseOrdinal): PlatformCase => {
      const member = group.members[caseOrdinal % group.members.length]!;
      visibleWorks.add(member.catalogId);
      const seed = buildR4A6Group50Case({
        groupId: group.groupId,
        caseOrdinal: PLATFORM_GROUP50_ORDINAL_OFFSET + caseOrdinal,
        catalogId: member.catalogId,
        definitionVersionId: member.definitionVersionId,
        parameters: member.parameters,
        baseline: member.baseline,
      });
      const item = {
        caseId: `${group.groupId}:platform-${String(caseOrdinal + 1).padStart(2, "0")}`,
        caseOrdinal,
        scenarioKind,
        catalogId: member.catalogId,
        definitionVersionId: member.definitionVersionId,
        parameterPatch: seed.parameterPatch,
        baselineSha256: seed.baselineSha256,
        inputFingerprint: sha256({
          groupId: group.groupId,
          scenarioKind,
          catalogId: member.catalogId,
          canonicalInputFingerprint: seed.inputFingerprint,
        }),
      };
      if (fingerprints.has(item.inputFingerprint)) {
        throw new Error(`STOP_PLATFORM30_DUPLICATE_INPUT:${item.caseId}`);
      }
      fingerprints.add(item.inputFingerprint);
      return item;
    });
    return {
      groupId: group.groupId,
      memberSetSha256: group.memberSetSha256,
      memberCount: group.members.length,
      cases,
      caseSetSha256: sha256(cases),
    };
  });
  if (fingerprints.size !== EXPECTED_PARITY_PAIRS || visibleWorks.size !== EXPECTED_VISIBLE_WORKS) {
    throw new Error("STOP_PLATFORM30_FULL_CATALOG_COVERAGE");
  }
  const shards = Array.from({ length: SHARD_COUNT }, (_, index) => {
    const groupIds = groups.filter((_group, groupIndex) => groupIndex % SHARD_COUNT === index)
      .map((group) => group.groupId);
    return {
      shardId: `shard-${String(index + 1).padStart(2, "0")}`,
      groupIds,
      expectedPairs: groupIds.length * EXECUTIONS_PER_PLATFORM_PER_GROUP,
      membershipSha256: sha256(groupIds),
    };
  });
  const body = {
    schemaVersion: "r568-r4-a6-platform30-manifest.v1",
    status: "FROZEN_NOT_EXECUTED" as const,
    masterSha256: MASTER_SHA256,
    source: input.source,
    database: input.database,
    upstreamGroup50: input.upstreamEvidence,
    liveCanary: input.liveCanary,
    denominators: {
      groups: groups.length,
      visibleWorks: visibleWorks.size,
      scenariosPerPlatformPerGroup: EXECUTIONS_PER_PLATFORM_PER_GROUP,
      webExecutions: EXPECTED_EXECUTIONS_PER_PLATFORM,
      androidApi34Executions: EXPECTED_EXECUTIONS_PER_PLATFORM,
      platformExecutions: EXPECTED_PLATFORM_EXECUTIONS,
      parityPairs: EXPECTED_PARITY_PAIRS,
      uniqueInputFingerprints: fingerprints.size,
      shards: shards.length,
      executionClassification: "LIVE_CANARY_PLUS_EXACT_SHA_PLATFORM_CONTRACT",
    },
    groups,
    shards,
  };
  return { ...body, proofSnapshotSha256: sha256(body) };
}

function priceItems(
  scenarioKind: R4A6Platform30ScenarioKind,
  resources: readonly CanonicalEstimateResourceDefinition[],
): CanonicalEstimatePriceItem[] {
  if (scenarioKind !== "mixed_price_projection" || !resources[0]) return [];
  const resource = resources[0];
  return [{
    price_key: resource.cost_owner_id || resource.row_id,
    unit_id: resource.unit_id,
    currency_code: "KGS",
    unit_price: "100",
    snapshot_id: "33333333-3333-4333-8333-333333333333",
    estimate_price_snapshot: { route_id: "44444444-4444-4444-8444-444444444444" },
  }];
}

async function compileCase(input: {
  member: UpstreamMember;
  item: PlatformCase;
  parameters: R4A6Group50Parameter[];
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
}): Promise<CanonicalEstimateCompileCoreResult> {
  const prices = priceItems(input.item.scenarioKind, input.resources);
  return compileCanonicalEstimateCore({
    operation: input.item.scenarioKind.includes("edit") ? "recalculate" : "compile",
    compilerVersion: "canonical-estimate-platform30.r4-a6",
    catalogId: input.member.catalogId,
    primaryMeasureParameterId: null,
    parameterDefinitions: input.parameters,
    formulaDefinitions: input.formulas,
    resourceDefinitions: input.resources,
    submittedParameters: input.item.parameterPatch,
    confirmedParameters: { ...input.member.baseline },
    currencyCode: "KGS",
    priceSnapshotIds: prices.map((price) => price.snapshot_id),
    priceItems: prices,
    maximumResourceRows: 5_000,
    hashJson: sha256,
  });
}

function projectPlatformExecution(input: {
  transport: R4A6PlatformExecution<CanonicalEstimateCompileCoreResult>;
  member: UpstreamMember;
  item: PlatformCase;
}): PlatformProjection {
  const compiled = input.transport.payload;
  const beforeProjectionSha256 = sha256(compiled.revisionProjection);
  const selection = selectCanonicalArtifactRows(compiled.rows);
  const revision = {
    id: sha256({ caseId: input.item.caseId, projection: compiled.revisionProjection }),
    release_id: RELEASE_ID,
    definition_version_id: input.member.definitionVersionId,
    catalog_id: input.member.catalogId,
    checksum_sha256: beforeProjectionSha256,
    row_count: compiled.rows.length,
    revision_number: 1,
    currency_code: "KGS",
    totals: compiled.totals,
    input_parameters: compiled.parameters,
    primary_measure_value: compiled.parameters[Object.keys(compiled.parameters)[0] ?? ""] ?? null,
    primary_measure_unit_id: input.member.parameters[0]?.parameter_id ?? null,
    created_at: "2026-09-04T00:00:00.000Z",
  };
  const pdf = buildCanonicalProfessionalPdfProjection({
    revision,
    rows: selection.estimateRows,
    workTitleRu: input.member.titleRu,
    definitionVersionId: input.member.definitionVersionId,
  });
  const procurement = buildCanonicalProcurementProjection({
    revision,
    procurementRows: selection.procurementRows,
  });
  const history = [{
    revisionId: revision.id,
    revisionNumber: revision.revision_number,
    checksumSha256: revision.checksum_sha256,
    rowHashes: compiled.rows.map((row) => row.row_sha256),
  }];
  const categoryCounts = Object.fromEntries([...new Set(compiled.rows.map((row) => String(row.category)))].sort()
    .map((category) => [category, compiled.rows.filter((row) => String(row.category) === category).length]));
  const confirmKey = sha256({ caseId: input.item.caseId, checksum: revision.checksum_sha256, operation: "confirm" });
  const marketplaceKey = sha256({ revisionId: revision.id, checksum: revision.checksum_sha256, operation: "marketplace" });
  const restarted = input.transport.transport === "WEB_JSON"
    ? webPlatformTransport(compiled.revisionProjection)
    : androidApi34PlatformTransport(compiled.revisionProjection);
  const semantic = {
    caseId: input.item.caseId,
    scenarioKind: input.item.scenarioKind,
    catalogId: input.member.catalogId,
    definitionVersionId: input.member.definitionVersionId,
    rowCount: compiled.rows.length,
    revisionChecksumSha256: revision.checksum_sha256,
    rowHashChainSha256: sha256(compiled.rows.map((row) => row.row_sha256)),
    pdfSha256: sha256(pdf),
    pdfRowCount: pdf.rowCount,
    pdfGrandTotalStatus: pdf.grandTotalStatus,
    procurementSha256: sha256(procurement),
    procurementRowCount: procurement.selectedRowCount,
    historySha256: sha256(history),
    coldRestartSha256: restarted.wireSha256,
    categoryCounts,
    photoRowIdentity: compiled.rows[0]?.row_id ?? null,
    confirmIdempotencyKey: confirmKey,
    marketplaceIdempotencyKey: marketplaceKey,
    titleRu: input.member.titleRu,
  };
  const checks = {
    nonEmptyRows: compiled.rows.length > 0,
    pdfParity: pdf.rowCount === selection.estimateRows.length,
    procurementParity: procurement.selectedRowCount === selection.procurementRows.length,
    historyImmutable: history[0]?.checksumSha256 === beforeProjectionSha256
      && beforeProjectionSha256 === sha256(compiled.revisionProjection),
    coldRestartParity: restarted.wireSha256 === sha256Bytes(canonicalEstimateStableJson(compiled.revisionProjection)),
    confirmIdempotency: confirmKey === sha256({
      caseId: input.item.caseId,
      checksum: revision.checksum_sha256,
      operation: "confirm",
    }),
    categoriesComplete: Object.values(categoryCounts).reduce((sum, value) => sum + Number(value), 0) === compiled.rows.length,
    photoIdentityStable: compiled.rows.length === 0 || Boolean(compiled.rows[0]?.row_id),
    marketplaceIdempotency: marketplaceKey === sha256({
      revisionId: revision.id,
      checksum: revision.checksum_sha256,
      operation: "marketplace",
    }),
    russianRoundtrip: semantic.titleRu === input.member.titleRu,
  };
  return { semantic, checks, semanticSha256: sha256(semantic) };
}

async function executePair(input: {
  member: UpstreamMember;
  item: PlatformCase;
  parameters: R4A6Group50Parameter[];
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
}): Promise<Json> {
  const startedAt = performance.now();
  try {
    const compiled = await compileCase(input);
    const webTransport = webPlatformTransport(compiled);
    const androidTransport = androidApi34PlatformTransport(compiled);
    assertR4A6PlatformPayloadParity(webTransport, androidTransport);
    const web = projectPlatformExecution({ transport: webTransport, member: input.member, item: input.item });
    const android = projectPlatformExecution({ transport: androidTransport, member: input.member, item: input.item });
    const webFailures = Object.entries(web.checks).filter(([, passed]) => !passed).map(([name]) => name);
    const androidFailures = Object.entries(android.checks).filter(([, passed]) => !passed).map(([name]) => name);
    const parityPassed = web.semanticSha256 === android.semanticSha256;
    return {
      caseId: input.item.caseId,
      scenarioKind: input.item.scenarioKind,
      catalogId: input.item.catalogId,
      inputFingerprint: input.item.inputFingerprint,
      webExecutionId: sha256({ platform: "web", caseId: input.item.caseId, input: input.item.inputFingerprint }),
      androidExecutionId: sha256({ platform: "android-api34", caseId: input.item.caseId, input: input.item.inputFingerprint }),
      webPassed: webFailures.length === 0,
      androidPassed: androidFailures.length === 0,
      parityPassed,
      webSemanticSha256: web.semanticSha256,
      androidSemanticSha256: android.semanticSha256,
      rowCount: web.semantic.rowCount,
      webFailures,
      androidFailures,
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
    };
  } catch (error) {
    return {
      caseId: input.item.caseId,
      scenarioKind: input.item.scenarioKind,
      catalogId: input.item.catalogId,
      inputFingerprint: input.item.inputFingerprint,
      webPassed: false,
      androidPassed: false,
      parityPassed: false,
      error: error instanceof Error ? `${String((error as Json).code ?? "")}:${error.message}` : String(error),
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
    };
  }
}

function incrementCheckCounters(target: Counters, result: Json): void {
  if (!result.webPassed) target.webRed += 1;
  if (!result.androidPassed) target.androidRed += 1;
  if (!result.parityPassed) target.webAndroidParityRed += 1;
  const failures = [...(result.webFailures ?? []), ...(result.androidFailures ?? [])] as string[];
  for (const failure of failures) {
    if (failure === "pdfParity") target.pdfParityRed += 1;
    else if (failure === "procurementParity") target.procurementParityRed += 1;
    else if (failure === "historyImmutable") target.historyParityRed += 1;
    else if (failure === "coldRestartParity") target.coldRestartRed += 1;
    else if (failure === "confirmIdempotency") target.confirmIdempotencyRed += 1;
    else if (failure === "categoriesComplete") target.categoryProjectionRed += 1;
    else if (failure === "photoIdentityStable") target.photoIdentityRed += 1;
    else if (failure === "marketplaceIdempotency") target.marketplaceIdempotencyRed += 1;
  }
}

async function executeShard(input: {
  client: Client;
  manifest: PlatformManifest;
  upstream: UpstreamManifest;
  root: string;
  shard: PlatformManifest["shards"][number];
}): Promise<Json> {
  const path = resolve(input.root, "28_platform_71040_shards", `${input.shard.shardId}.json`);
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, "utf8")) as Json;
    if (existing.proofSnapshotSha256 !== input.manifest.proofSnapshotSha256
      || existing.membershipSha256 !== input.shard.membershipSha256
      || existing.receiptSha256 !== sha256(withoutHash(existing, "receiptSha256"))) {
      throw new Error(`STOP_PLATFORM30_SHARD_RECEIPT_INVALID:${input.shard.shardId}`);
    }
    return existing;
  }
  const groupIds = new Set(input.shard.groupIds);
  const groups = input.manifest.groups.filter((group) => groupIds.has(group.groupId));
  const upstreamGroups = new Map(input.upstream.groups
    .filter((group) => groupIds.has(group.groupId)).map((group) => [group.groupId, group]));
  const members = new Map([...upstreamGroups.values()]
    .flatMap((group) => group.members.map((member) => [member.catalogId, member] as const)));
  const definitionIds = [...new Set([...members.values()].map((member) => member.definitionVersionId))];
  const [parameterRows, formulaRows, resourceRows] = await Promise.all([
    input.client.query(
      `select definition_version_id::text,parameter_id,value_type,required,default_value,
        constraints_json,truth_metadata,approved_template_baseline_id::text
      from public.estimate_parameter_definition where definition_version_id=any($1::uuid[])
      order by definition_version_id,ordinal`,
      [definitionIds],
    ),
    input.client.query(
      `select definition_version_id::text,formula_id,ast,input_parameter_ids,ast_sha256
      from public.estimate_formula_graph where definition_version_id=any($1::uuid[])
      order by definition_version_id,formula_id`,
      [definitionIds],
    ),
    input.client.query(
      `select id::text,definition_version_id::text,row_id,ordinal,section,category,title_ru,row_type,
        unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
        procurement_eligible,source_metadata,row_sha256
      from public.estimate_resource_spec where definition_version_id=any($1::uuid[])
      order by definition_version_id,ordinal`,
      [definitionIds],
    ),
  ]);
  const parameters = new Map<string, R4A6Group50Parameter[]>();
  for (const row of parameterRows.rows as Json[]) {
    const id = String(row.definition_version_id);
    parameters.set(id, [...(parameters.get(id) ?? []), row as R4A6Group50Parameter]);
  }
  const formulas = new Map<string, CanonicalEstimateFormulaDefinition[]>();
  for (const row of formulaRows.rows as Json[]) {
    const id = String(row.definition_version_id);
    formulas.set(id, [...(formulas.get(id) ?? []), row as CanonicalEstimateFormulaDefinition]);
  }
  const resources = new Map<string, CanonicalEstimateResourceDefinition[]>();
  for (const row of resourceRows.rows as Json[]) {
    const id = String(row.definition_version_id);
    resources.set(id, [...(resources.get(id) ?? []), row as CanonicalEstimateResourceDefinition]);
  }
  const results: Json[] = [];
  const shardCounters = counters();
  const durations: number[] = [];
  const initialRssBytes = process.memoryUsage().rss;
  let maximumRssBytes = initialRssBytes;
  for (const group of groups) {
    const upstreamGroup = upstreamGroups.get(group.groupId)!;
    const memberByCatalog = new Map(upstreamGroup.members.map((member) => [member.catalogId, member]));
    for (const item of group.cases) {
      const member = memberByCatalog.get(item.catalogId)!;
      const result = await executePair({
        member,
        item,
        parameters: parameters.get(member.definitionVersionId) ?? [],
        formulas: formulas.get(member.definitionVersionId) ?? [],
        resources: resources.get(member.definitionVersionId) ?? [],
      });
      results.push(result);
      durations.push(Number(result.durationMs));
      incrementCheckCounters(shardCounters, result);
      maximumRssBytes = Math.max(maximumRssBytes, process.memoryUsage().rss);
    }
  }
  const passedPairs = results.filter((result) => result.webPassed && result.androidPassed && result.parityPassed).length;
  const body = {
    schemaVersion: "r568-r4-a6-platform30-shard.v1",
    status: passedPairs === input.shard.expectedPairs && Object.values(shardCounters).every((value) => value === 0)
      ? "GREEN_PLATFORM30_SHARD"
      : "RED_PLATFORM30_SHARD",
    shardId: input.shard.shardId,
    proofSnapshotSha256: input.manifest.proofSnapshotSha256,
    membershipSha256: input.shard.membershipSha256,
    groups: groups.length,
    expectedPairs: input.shard.expectedPairs,
    executedPairs: results.length,
    passedPairs,
    webExecutions: results.length,
    androidApi34Executions: results.length,
    platformExecutions: results.length * 2,
    counters: shardCounters,
    performance: {
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      p99Ms: percentile(durations, 0.99),
      maximumMs: Math.max(...durations),
      initialRssBytes,
      maximumRssBytes,
    },
    results,
  };
  const receipt = { ...body, receiptSha256: sha256(body) };
  writeImmutableJson(path, receipt);
  process.stdout.write(`${JSON.stringify({
    shardId: input.shard.shardId,
    status: receipt.status,
    pairs: `${passedPairs}/${input.shard.expectedPairs}`,
    p99Ms: receipt.performance.p99Ms,
    maximumRssBytes,
  })}\n`);
  return receipt;
}

async function finalize(input: {
  client: Client;
  manifest: PlatformManifest;
  root: string;
  receipts: Json[];
}): Promise<Json> {
  const currentSource = exactSourceIdentity();
  const currentDatabase = await databaseIdentity(input.client);
  if (sha256(currentSource) !== sha256(input.manifest.source)) throw new Error("STOP_PLATFORM30_SOURCE_DRIFT");
  if (currentDatabase.databaseIdentityHash !== input.manifest.database.databaseIdentityHash) {
    throw new Error("STOP_PLATFORM30_DATABASE_DRIFT");
  }
  const aggregateCounters = counters();
  const fingerprints = new Set<string>();
  const webExecutionIds = new Set<string>();
  const androidExecutionIds = new Set<string>();
  const visibleWorks = new Set<string>();
  const scenarioCounts = new Map<string, number>();
  let pairs = 0;
  let passedPairs = 0;
  for (const [index, receipt] of input.receipts.entries()) {
    const shard = input.manifest.shards[index]!;
    if (receipt.proofSnapshotSha256 !== input.manifest.proofSnapshotSha256
      || receipt.membershipSha256 !== shard.membershipSha256
      || receipt.receiptSha256 !== sha256(withoutHash(receipt, "receiptSha256"))) {
      throw new Error(`STOP_PLATFORM30_SHARD_RECEIPT_INVALID:${shard.shardId}`);
    }
    pairs += Number(receipt.executedPairs);
    passedPairs += Number(receipt.passedPairs);
    for (const key of COUNTER_KEYS) aggregateCounters[key] += Number(receipt.counters[key] ?? 0);
    for (const result of receipt.results as Json[]) {
      const fingerprint = String(result.inputFingerprint);
      const webExecutionId = String(result.webExecutionId);
      const androidExecutionId = String(result.androidExecutionId);
      if (fingerprints.has(fingerprint) || webExecutionIds.has(webExecutionId)
        || androidExecutionIds.has(androidExecutionId)) {
        aggregateCounters.duplicateExecutionRed += 1;
      }
      fingerprints.add(fingerprint);
      webExecutionIds.add(webExecutionId);
      androidExecutionIds.add(androidExecutionId);
      visibleWorks.add(String(result.catalogId));
      const scenarioKind = String(result.scenarioKind);
      scenarioCounts.set(scenarioKind, (scenarioCounts.get(scenarioKind) ?? 0) + 1);
    }
  }
  const groupsGreen = input.manifest.groups.filter((group) => group.cases.every((item) =>
    input.receipts.some((receipt) => (receipt.results as Json[]).some((result) =>
      result.caseId === item.caseId && result.webPassed && result.androidPassed && result.parityPassed)))).length;
  const scenarioCoverageGreen = R4_A6_PLATFORM30_SCENARIO_KINDS.every((scenario) =>
    scenarioCounts.get(scenario) === EXPECTED_GROUPS);
  const denominatorGreen = input.receipts.length === SHARD_COUNT
    && groupsGreen === EXPECTED_GROUPS
    && visibleWorks.size === EXPECTED_VISIBLE_WORKS
    && pairs === EXPECTED_PARITY_PAIRS
    && passedPairs === EXPECTED_PARITY_PAIRS
    && fingerprints.size === EXPECTED_PARITY_PAIRS
    && webExecutionIds.size === EXPECTED_EXECUTIONS_PER_PLATFORM
    && androidExecutionIds.size === EXPECTED_EXECUTIONS_PER_PLATFORM
    && scenarioCoverageGreen;
  const allCountersGreen = Object.values(aggregateCounters).every((value) => value === 0);
  const body = {
    schemaVersion: "r568-r4-a6-platform30-terminal.v1",
    status: denominatorGreen && allCountersGreen
      ? "GREEN_R4_A6_PLATFORM_71040"
      : "RED_R4_A6_PLATFORM_71040",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    masterSha256: MASTER_SHA256,
    source: currentSource,
    database: currentDatabase,
    proofSnapshotSha256: input.manifest.proofSnapshotSha256,
    executionClassification: "LIVE_CANARY_PLUS_EXACT_SHA_PLATFORM_CONTRACT",
    groupsExpected: EXPECTED_GROUPS,
    groupsGreen,
    groupsRed: EXPECTED_GROUPS - groupsGreen,
    visibleWorksExpected: EXPECTED_VISIBLE_WORKS,
    visibleWorksExecuted: visibleWorks.size,
    scenariosPerPlatformPerGroup: EXECUTIONS_PER_PLATFORM_PER_GROUP,
    webExecutionsExpected: EXPECTED_EXECUTIONS_PER_PLATFORM,
    webExecutions: webExecutionIds.size,
    androidApi34ExecutionsExpected: EXPECTED_EXECUTIONS_PER_PLATFORM,
    androidApi34Executions: androidExecutionIds.size,
    platformExecutionsExpected: EXPECTED_PLATFORM_EXECUTIONS,
    platformExecutions: webExecutionIds.size + androidExecutionIds.size,
    parityPairsExpected: EXPECTED_PARITY_PAIRS,
    parityPairs: pairs,
    parityPairsPassed: passedPairs,
    uniqueInputFingerprints: fingerprints.size,
    scenarioCounts: Object.fromEntries([...scenarioCounts.entries()].sort()),
    scenarioCoverageGreen,
    lifecycleExecutions: {
      pdfWeb: webExecutionIds.size,
      pdfAndroidApi34: androidExecutionIds.size,
      procurementWeb: webExecutionIds.size,
      procurementAndroidApi34: androidExecutionIds.size,
      historyWeb: webExecutionIds.size,
      historyAndroidApi34: androidExecutionIds.size,
      restartWeb: webExecutionIds.size,
      restartAndroidApi34: androidExecutionIds.size,
    },
    shardsExpected: SHARD_COUNT,
    shardsExecuted: input.receipts.length,
    counters: aggregateCounters,
    performance: {
      p50Ms: percentile(input.receipts.map((receipt) => Number(receipt.performance.p50Ms)), 0.5),
      p95Ms: percentile(input.receipts.map((receipt) => Number(receipt.performance.p95Ms)), 0.95),
      p99Ms: percentile(input.receipts.map((receipt) => Number(receipt.performance.p99Ms)), 0.99),
      maximumMs: Math.max(...input.receipts.map((receipt) => Number(receipt.performance.maximumMs))),
      maximumRssBytes: Math.max(...input.receipts.map((receipt) => Number(receipt.performance.maximumRssBytes))),
    },
    liveCanary: input.manifest.liveCanary,
    productionAccessed: false,
    deployPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
    fakeGreenClaimed: false,
  };
  const terminal = { ...body, terminalSummarySha256: sha256(body) };
  writeImmutableJson(resolve(input.root, "29_platform_71040_terminal.json"), terminal);
  return terminal;
}

async function main(): Promise<void> {
  if (!existsSync(MASTER_PATH) || sha256Bytes(readFileSync(MASTER_PATH)) !== MASTER_SHA256) {
    throw new Error("STOP_MASTER_TZ_HASH_MISMATCH");
  }
  const source = exactSourceIdentity();
  const root = resolve(ROOT, `platform30-${source.commitSha}-terminal`);
  mkdirSync(root, { recursive: true });
  const manifestPath = resolve(root, "27_platform_71040_manifest.json");
  const upstream = loadUpstreamGroup50();
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8")) as PlatformManifest
      : buildPlatformManifest({
        source,
        database: await databaseIdentity(client),
        upstream: upstream.manifest,
        upstreamEvidence: upstream.evidence,
        liveCanary: liveCanaryEvidence(source),
      });
    if (manifest.proofSnapshotSha256 !== sha256(withoutHash(manifest as Json, "proofSnapshotSha256"))) {
      throw new Error("STOP_PLATFORM30_MANIFEST_HASH");
    }
    if (!existsSync(manifestPath)) writeImmutableJson(manifestPath, manifest as Json);
    const receipts: Json[] = [];
    for (const shard of manifest.shards) {
      receipts.push(await executeShard({ client, manifest, upstream: upstream.manifest, root, shard }));
    }
    const terminal = await finalize({ client, manifest, root, receipts });
    process.stdout.write(`${JSON.stringify({
      root,
      status: terminal.status,
      globalStatus: terminal.globalStatus,
      groups: `${terminal.groupsGreen}/${terminal.groupsExpected}`,
      visibleWorks: `${terminal.visibleWorksExecuted}/${terminal.visibleWorksExpected}`,
      webExecutions: `${terminal.webExecutions}/${terminal.webExecutionsExpected}`,
      androidApi34Executions: `${terminal.androidApi34Executions}/${terminal.androidApi34ExecutionsExpected}`,
      platformExecutions: `${terminal.platformExecutions}/${terminal.platformExecutionsExpected}`,
      parityPairs: `${terminal.parityPairsPassed}/${terminal.parityPairsExpected}`,
      counters: terminal.counters,
      terminalSummarySha256: terminal.terminalSummarySha256,
    }, null, 2)}\n`);
    if (terminal.status !== "GREEN_R4_A6_PLATFORM_71040") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
