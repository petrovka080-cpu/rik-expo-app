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
  isGenericPublicBoqResourceName,
  isPublicBoqNameStructurallyValid,
} from "../../../src/lib/estimate/semanticBoqGate";
import {
  R4_A6_GROUP50_SCENARIO_KINDS,
  assertR4A6Group50CaseSet,
  buildR4A6Group50Case,
  type R4A6Group50Case,
  type R4A6Group50Parameter,
} from "./group50ScenarioContract";

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A6_CANONICAL_MONOLITH_PROFESSIONAL_ESTIMATE_PRINT_PDF_FORMULA_REMEDIATION_ANDROID_API34_GROUP50_71040_GLOBAL_GREEN_RU.md",
);
const MASTER_SHA256 = "11e671dd5c376c577fa4f64017e3ccdc7cc9acfd59f064c343627345334275e6";
const RELEASE_ID = "3788cc88-701d-5cc9-9130-c61262cb9979";
const SEARCH_RELEASE_ID = "3bb74464-9773-5364-a4f0-4e542b45f62a";
const IDENTITY_PATH = resolve(
  ".release-runtime/r568/rc09-identity-v1/current-identity-manifest-11610.jsonl",
);
const ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a6-canonical-monolith-professional-estimate-print-formula-global-closeout-1",
);
const SHARD_COUNT = 32;
const EXPECTED_GROUPS = 2_368;
const EXPECTED_VISIBLE_WORKS = 10_322;
const EXPECTED_IDENTITIES = 11_610;
const EXPECTED_ALIASES = 1_288;
const EXPECTED_CASES = 118_400;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const EXACT_SOURCE_PATHS = [
  "scripts/estimate/r4a6/group50ScenarioContract.ts",
  "scripts/estimate/r4a6/runR4A6Group50.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
  "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts",
  "src/lib/estimate/semanticBoqGate.ts",
] as const;

type Json = Record<string, any>;

type ManifestMember = {
  catalogId: string;
  definitionVersionId: string;
  definitionSha256: string;
  titleRu: string;
  baseline: Json;
  baselineSha256: string;
  inputSeedPolicy: "APPROVED_BASELINE" | "EXPLICIT_GROUP50_SCENARIO_INPUT";
  parameters: R4A6Group50Parameter[];
};

type ManifestGroup = {
  groupId: string;
  titleRu: string;
  domainId: string;
  memberSetSha256: string;
  members: ManifestMember[];
  cases: R4A6Group50Case[];
  caseSetSha256: string;
};

type FrozenManifest = {
  schemaVersion: string;
  status: "FROZEN_NOT_EXECUTED";
  masterSha256: string;
  source: ReturnType<typeof exactSourceIdentity>;
  database: Json;
  identity: Json;
  denominators: Json;
  groups: ManifestGroup[];
  shards: { shardId: string; groupIds: string[]; expectedCases: number; membershipSha256: string }[];
  proofSnapshotSha256: string;
};

const BLOCKING_COUNTER_KEYS = [
  "compileRed",
  "semanticNameRed",
  "genericFillerRed",
  "colonSuffixRed",
  "scopeOverreachRed",
  "missingP0Red",
  "formulaDependencyRed",
  "dimensionRed",
  "unitRed",
  "orphanRed",
  "redirectCycleRed",
  "doubleCountRed",
  "priceProvenanceRed",
  "falseTotalRed",
  "revisionParityRed",
  "pdfParityRed",
  "procurementParityRed",
  "historyParityRed",
  "coldRestartRed",
  "webAndroidParityRed",
  "securityRed",
  "performanceRed",
] as const;

type BlockingCounterKey = (typeof BLOCKING_COUNTER_KEYS)[number];
type BlockingCounters = Record<BlockingCounterKey, number>;

function counters(): BlockingCounters {
  return Object.fromEntries(BLOCKING_COUNTER_KEYS.map((key) => [key, 0])) as BlockingCounters;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function exactSourceIdentity() {
  const dirty = git(
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...EXACT_SOURCE_PATHS,
  );
  if (dirty) throw new Error(`STOP_GROUP50_SOURCE_DRIFT:${dirty}`);
  return {
    branch: git("branch", "--show-current"),
    commitSha: git("rev-parse", "HEAD"),
    sourceTreeSha: git("rev-parse", "HEAD^{tree}"),
    paths: EXACT_SOURCE_PATHS,
  };
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256(value: unknown): string {
  return sha256Bytes(canonicalEstimateStableJson(value));
}

function withoutSelfHash(value: Json): Json {
  const { receiptSha256: _receiptSha256, summarySha256: _summarySha256, ...rest } = value;
  return rest;
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
    const current = readFileSync(path, "utf8");
    if (current !== content) throw new Error(`STOP_IMMUTABLE_EVIDENCE_CONFLICT:${path}`);
    return;
  }
  atomicWrite(path, content);
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * ratio) - 1)]!;
}

function completeScenarioInputSeed(
  parameters: readonly R4A6Group50Parameter[],
  approvedBaseline: Json,
): { values: Json; policy: ManifestMember["inputSeedPolicy"] } {
  const values = { ...approvedBaseline };
  let generated = false;
  for (const parameter of parameters) {
    if (values[parameter.parameter_id] != null && values[parameter.parameter_id] !== "") continue;
    if (parameter.default_value != null) {
      values[parameter.parameter_id] = parameter.default_value;
      generated = true;
      continue;
    }
    if (!parameter.required) continue;
    const constraints = parameter.constraints_json ?? {};
    if (parameter.value_type === "decimal" || parameter.value_type === "integer") {
      const minimum = Number(constraints.min);
      const maximum = Number(constraints.max);
      let value = Number.isFinite(minimum) ? Math.max(minimum, 1) : 1;
      if (Number.isFinite(maximum)) value = Math.min(maximum, value);
      values[parameter.parameter_id] = parameter.value_type === "integer"
        ? Math.max(1, Math.ceil(value))
        : Number(value.toFixed(6));
    } else if (parameter.value_type === "boolean") {
      values[parameter.parameter_id] = false;
    } else if (parameter.value_type === "enum") {
      const options = Array.isArray(constraints.values) ? constraints.values : [];
      if (options.length === 0) throw new Error(`GROUP50_ENUM_SEED_MISSING:${parameter.parameter_id}`);
      values[parameter.parameter_id] = options[0];
    } else if (parameter.value_type === "text") {
      values[parameter.parameter_id] = "Указано в проекте для приёмочного сценария";
    } else {
      throw new Error(`GROUP50_INPUT_SEED_UNSUPPORTED:${parameter.parameter_id}:${parameter.value_type}`);
    }
    generated = true;
  }
  return {
    values,
    policy: generated ? "EXPLICIT_GROUP50_SCENARIO_INPUT" : "APPROVED_BASELINE",
  };
}

async function databaseIdentity(client: Client): Promise<Json> {
  const row = (await client.query(
    `select
      release.id::text release_id,release.status release_status,release.release_key,
      search.id::text search_release_id,search.status search_status,search.snapshot_sha256 search_snapshot_sha256,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and baseline_ready and scenario_ready) ready_count,
      (select count(*)::int from public.estimate_search_group where search_release_id=$2) group_count,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2 and selectable and adjudication_class='EFFECTIVE_WORK') visible_count,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) membership_count,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(entry_sha256,'' order by catalog_id),''),'UTF8'),'sha256'),'hex') from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(document_sha256,'' order by catalog_id),''),'UTF8'),'sha256'),'hex') from public.estimate_search_document where search_release_id=$2) document_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(member_set_sha256,'' order by group_id),''),'UTF8'),'sha256'),'hex') from public.estimate_search_group where search_release_id=$2) group_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(ast_sha256,'' order by definition_version_id,formula_id),''),'UTF8'),'sha256'),'hex') from public.estimate_formula_graph where definition_version_id in(select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) formula_hash,
      (select encode(extensions.digest(convert_to(coalesce(string_agg(row_sha256,'' order by definition_version_id,ordinal),''),'UTF8'),'sha256'),'hex') from public.estimate_resource_spec where definition_version_id in(select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) resource_hash
    from public.estimate_definition_release release
    join public.estimate_search_index_release search on search.id=$2
    where release.id=$1`,
    [RELEASE_ID, SEARCH_RELEASE_ID],
  )).rows[0] as Json;
  if (!row
    || Number(row.manifest_count) !== 10_331
    || Number(row.ready_count) !== 10_331
    || Number(row.group_count) !== EXPECTED_GROUPS
    || Number(row.visible_count) !== EXPECTED_VISIBLE_WORKS
    || Number(row.membership_count) !== EXPECTED_VISIBLE_WORKS) {
    throw new Error(`STOP_GROUP50_DATABASE_DENOMINATOR:${JSON.stringify(row)}`);
  }
  return { ...row, databaseIdentityHash: sha256(row) };
}

function identitySnapshot(): Json {
  if (!existsSync(IDENTITY_PATH)) throw new Error("STOP_GROUP50_IDENTITY_MANIFEST_MISSING");
  const bytes = readFileSync(IDENTITY_PATH);
  const rows = bytes.toString("utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
  const aliases = rows.filter((row) => row.disposition !== "VISIBLE_CANONICAL");
  const visibleTargets = new Set(rows.filter((row) => row.disposition === "VISIBLE_CANONICAL")
    .map((row) => String(row.canonical_work_id)));
  const orphanAliases = aliases.filter((row) => !visibleTargets.has(String(row.canonical_work_id)));
  if (rows.length !== EXPECTED_IDENTITIES || aliases.length !== EXPECTED_ALIASES || orphanAliases.length > 0) {
    throw new Error("STOP_GROUP50_IDENTITY_DENOMINATOR");
  }
  return {
    path: IDENTITY_PATH,
    sha256: sha256Bytes(bytes),
    identities: rows.length,
    visibleCanonical: visibleTargets.size,
    aliasesRedirects: aliases.length,
    orphanAliases: orphanAliases.length,
  };
}

async function buildFrozenManifest(client: Client, source: ReturnType<typeof exactSourceIdentity>): Promise<FrozenManifest> {
  const database = await databaseIdentity(client);
  const identity = identitySnapshot();
  const memberRows = (await client.query(
    `select group_row.group_id,group_row.group_name_ru,group_row.domain_id,group_row.member_set_sha256,
      membership.ordinal,document.catalog_id,document.canonical_name_ru,document.definition_version_id::text,
      definition.definition_sha256,coalesce(baseline.input_values,'{}'::jsonb) baseline_input_values
    from public.estimate_search_group group_row
    join public.estimate_search_group_membership membership
      on membership.search_release_id=group_row.search_release_id and membership.group_id=group_row.group_id
    join public.estimate_search_document document
      on document.search_release_id=membership.search_release_id and document.catalog_id=membership.catalog_id
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$1 and manifest.catalog_id=document.catalog_id
      and manifest.definition_version_id=document.definition_version_id
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    left join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    where group_row.search_release_id=$2 and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
      and manifest.baseline_ready and manifest.scenario_ready
    order by group_row.group_id,membership.ordinal,document.catalog_id`,
    [RELEASE_ID, SEARCH_RELEASE_ID],
  )).rows as Json[];
  if (memberRows.length !== EXPECTED_VISIBLE_WORKS) throw new Error("STOP_GROUP50_VISIBLE_MEMBERSHIP");
  const definitionIds = memberRows.map((row) => String(row.definition_version_id));
  const parameterRows = (await client.query(
    `select parameter.*,manifest.approved_template_baseline_id::text
    from public.estimate_parameter_definition parameter
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.definition_version_id=parameter.definition_version_id and manifest.release_id=$1
    order by parameter.definition_version_id,parameter.ordinal`,
    [RELEASE_ID],
  )).rows as Json[];
  const parametersByDefinition = new Map<string, R4A6Group50Parameter[]>();
  for (const parameter of parameterRows) {
    const id = String(parameter.definition_version_id);
    const list = parametersByDefinition.get(id) ?? [];
    list.push({
      parameter_id: String(parameter.parameter_id),
      value_type: String(parameter.value_type),
      required: parameter.required === true,
      default_value: parameter.default_value,
      constraints_json: parameter.constraints_json as Record<string, unknown> | null,
    });
    parametersByDefinition.set(id, list);
  }
  const groupMap = new Map<string, ManifestGroup>();
  for (const row of memberRows) {
    const groupId = String(row.group_id);
    const definitionVersionId = String(row.definition_version_id);
    const parameters = parametersByDefinition.get(definitionVersionId) ?? [];
    const seed = completeScenarioInputSeed(parameters, row.baseline_input_values as Json);
    const baseline = seed.values;
    const member: ManifestMember = {
      catalogId: String(row.catalog_id),
      definitionVersionId,
      definitionSha256: String(row.definition_sha256),
      titleRu: String(row.canonical_name_ru),
      baseline,
      baselineSha256: sha256(baseline),
      inputSeedPolicy: seed.policy,
      parameters,
    };
    const group = groupMap.get(groupId) ?? {
      groupId,
      titleRu: String(row.group_name_ru),
      domainId: String(row.domain_id),
      memberSetSha256: String(row.member_set_sha256),
      members: [],
      cases: [],
      caseSetSha256: "",
    };
    group.members.push(member);
    groupMap.set(groupId, group);
  }
  const groups = [...groupMap.values()];
  if (groups.length !== EXPECTED_GROUPS) throw new Error("STOP_GROUP50_DENOMINATOR");
  const visibleCoverage = new Set<string>();
  const globalFingerprints = new Set<string>();
  for (const group of groups) {
    if (group.members.length === 0) throw new Error(`STOP_GROUP50_EMPTY_GROUP:${group.groupId}`);
    group.cases = R4_A6_GROUP50_SCENARIO_KINDS.map((_kind, caseOrdinal) => {
      const member = group.members[caseOrdinal % group.members.length]!;
      visibleCoverage.add(member.catalogId);
      return buildR4A6Group50Case({
        groupId: group.groupId,
        caseOrdinal,
        catalogId: member.catalogId,
        definitionVersionId: member.definitionVersionId,
        parameters: member.parameters,
        baseline: member.baseline,
      });
    });
    assertR4A6Group50CaseSet(group.cases);
    group.caseSetSha256 = sha256(group.cases);
    for (const item of group.cases) {
      if (globalFingerprints.has(item.inputFingerprint)) {
        throw new Error(`STOP_GROUP50_DUPLICATE_INPUT_FINGERPRINT:${item.caseId}`);
      }
      globalFingerprints.add(item.inputFingerprint);
    }
  }
  for (const member of memberRows) {
    if (!visibleCoverage.has(String(member.catalog_id))) {
      throw new Error(`STOP_GROUP50_VISIBLE_WORK_UNEXECUTED:${member.catalog_id}`);
    }
  }
  if (globalFingerprints.size !== EXPECTED_CASES || !definitionIds.every(Boolean)) {
    throw new Error("STOP_GROUP50_CASE_DENOMINATOR");
  }
  const shards = Array.from({ length: SHARD_COUNT }, (_, index) => {
    const groupIds = groups.filter((_group, groupIndex) => groupIndex % SHARD_COUNT === index)
      .map((group) => group.groupId);
    return {
      shardId: `shard-${String(index + 1).padStart(2, "0")}`,
      groupIds,
      expectedCases: groupIds.length * 50,
      membershipSha256: sha256(groupIds),
    };
  });
  const body = {
    schemaVersion: "r568-r4-a6-content-group50.v1",
    status: "FROZEN_NOT_EXECUTED" as const,
    masterSha256: MASTER_SHA256,
    source,
    database,
    identity,
    denominators: {
      groups: groups.length,
      visibleWorks: visibleCoverage.size,
      identities: identity.identities,
      aliasesRedirects: identity.aliasesRedirects,
      scenariosPerGroup: 50,
      uniqueCases: globalFingerprints.size,
      shards: shards.length,
    },
    groups,
    shards,
  };
  return { ...body, proofSnapshotSha256: sha256(body) };
}

function definitionStaticFailures(input: {
  member: ManifestMember;
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
}): { code: BlockingCounterKey; detail: string }[] {
  const failures: { code: BlockingCounterKey; detail: string }[] = [];
  const parameterIds = new Set(input.member.parameters.map((parameter) => parameter.parameter_id));
  const formulaById = new Map(input.formulas.map((formula) => [formula.formula_id, formula]));
  for (const formula of input.formulas) {
    const missing = formula.input_parameter_ids.filter((parameterId) => !parameterIds.has(parameterId));
    if (missing.length > 0) failures.push({ code: "formulaDependencyRed", detail: `${formula.formula_id}:${missing.join(",")}` });
  }
  const rowIds = new Set<string>();
  for (const resource of input.resources) {
    if (rowIds.has(resource.row_id)) failures.push({ code: "doubleCountRed", detail: resource.row_id });
    rowIds.add(resource.row_id);
    if (!formulaById.has(resource.formula_id)) failures.push({ code: "orphanRed", detail: resource.row_id });
    if (!String(resource.unit_id ?? "").trim()) failures.push({ code: "unitRed", detail: resource.row_id });
    if (!String((resource as Json).semantic_owner ?? "").trim()) failures.push({ code: "scopeOverreachRed", detail: resource.row_id });
    const applicable = !(resource.inclusion_ast?.kind === "literal" && resource.inclusion_ast?.value === false)
      && (resource.resource_graph as Json)?.r4A6ProfessionalBoq?.applicable !== false;
    if (applicable && !isPublicBoqNameStructurallyValid(resource.title_ru, input.member.titleRu)) {
      failures.push({ code: "semanticNameRed", detail: resource.row_id });
    }
    if (applicable && isGenericPublicBoqResourceName(resource.title_ru)) {
      failures.push({ code: "genericFillerRed", detail: resource.row_id });
    }
    if (applicable && /[:：]/u.test(resource.title_ru)) failures.push({ code: "colonSuffixRed", detail: resource.row_id });
  }
  return failures;
}

function casePriceItems(
  scenarioKind: string,
  resources: CanonicalEstimateResourceDefinition[],
): CanonicalEstimatePriceItem[] {
  if (scenarioKind !== "mixed_available_unavailable_price") return [];
  const resource = resources[0];
  if (!resource) return [];
  return [{
    price_key: resource.cost_owner_id || resource.row_id,
    unit_id: resource.unit_id,
    currency_code: "KGS",
    unit_price: "100",
    snapshot_id: "11111111-1111-4111-8111-111111111111",
    estimate_price_snapshot: { route_id: "22222222-2222-4222-8222-222222222222" },
  }];
}

async function compileCase(input: {
  member: ManifestMember;
  item: R4A6Group50Case;
  parameters: R4A6Group50Parameter[];
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
  parameterPatch?: Json;
  missingParameterId?: string | null;
  operation?: "compile" | "recalculate";
}): Promise<CanonicalEstimateCompileCoreResult> {
  const confirmedParameters = { ...input.member.baseline };
  const missingParameterId = input.missingParameterId === undefined
    ? input.item.missingParameterId
    : input.missingParameterId;
  if (missingParameterId) delete confirmedParameters[missingParameterId];
  return compileCanonicalEstimateCore({
    operation: input.operation ?? "compile",
    compilerVersion: "canonical-estimate-group50.r4-a6",
    catalogId: input.member.catalogId,
    primaryMeasureParameterId: null,
    parameterDefinitions: input.parameters,
    formulaDefinitions: input.formulas,
    resourceDefinitions: input.resources,
    submittedParameters: input.parameterPatch ?? input.item.parameterPatch,
    confirmedParameters,
    currencyCode: "KGS",
    priceSnapshotIds: casePriceItems(input.item.scenarioKind, input.resources).map((item) => item.snapshot_id),
    priceItems: casePriceItems(input.item.scenarioKind, input.resources),
    maximumResourceRows: 5_000,
    hashJson: sha256,
  });
}

function changedRowParity(input: {
  before: CanonicalEstimateCompileCoreResult;
  after: CanonicalEstimateCompileCoreResult;
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
  editedParameterId: string;
}): boolean {
  const affectedFormulaIds = new Set(input.formulas
    .filter((formula) => formula.input_parameter_ids.includes(input.editedParameterId))
    .map((formula) => formula.formula_id));
  const affectedRowIds = new Set(input.resources
    .filter((resource) => affectedFormulaIds.has(resource.formula_id))
    .map((resource) => resource.row_id));
  const afterRows = new Map(input.after.rows.map((row) => [row.row_id, row]));
  return input.before.rows.every((row) => {
    const after = afterRows.get(row.row_id);
    return affectedRowIds.has(row.row_id) || after?.row_sha256 === row.row_sha256;
  });
}

async function executeCase(input: {
  group: ManifestGroup;
  member: ManifestMember;
  item: R4A6Group50Case;
  parameters: R4A6Group50Parameter[];
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
}): Promise<Json> {
  const startedAt = performance.now();
  const failures: { code: BlockingCounterKey; detail: string }[] = [];
  try {
    const compiled = await compileCase(input);
    if (input.item.expectedOutcome !== "GREEN") {
      failures.push({ code: "missingP0Red", detail: "invalid input was accepted" });
    } else {
      const rowIds = compiled.rows.map((row) => row.row_id);
      if (rowIds.length === 0) failures.push({ code: "compileRed", detail: "zero rows" });
      if (new Set(rowIds).size !== rowIds.length) failures.push({ code: "doubleCountRed", detail: "duplicate compiled row" });
      if (compiled.rows.some((row) => !String(row.unit_id ?? "").trim())) failures.push({ code: "unitRed", detail: "empty unit" });
      if (compiled.rows.some((row) => !isPublicBoqNameStructurallyValid(
        String(row.title_ru ?? ""),
        input.member.titleRu,
      ))) failures.push({ code: "semanticNameRed", detail: "invalid compiled public name" });
      if (compiled.rows.some((row) => isGenericPublicBoqResourceName(String(row.title_ru ?? "")))) {
        failures.push({ code: "genericFillerRed", detail: "generic compiled public name" });
      }
      if (compiled.rows.some((row) => /[:：]/u.test(String(row.title_ru ?? "")))) {
        failures.push({ code: "colonSuffixRed", detail: "colon in compiled public name" });
      }
      if (compiled.rows.some((row) => !Number.isFinite(Number(row.quantity)) || Number(row.quantity) < 0)) {
        failures.push({ code: "dimensionRed", detail: "invalid quantity" });
      }
      if (compiled.rows.some((row) => row.unit_price != null && !row.price_snapshot_id)) {
        failures.push({ code: "priceProvenanceRed", detail: "priced row without snapshot" });
      }
      const selection = selectCanonicalArtifactRows(compiled.rows);
      const revision = {
        id: sha256({ caseId: input.item.caseId, rows: compiled.revisionProjection.rows }),
        release_id: RELEASE_ID,
        definition_version_id: input.member.definitionVersionId,
        catalog_id: input.member.catalogId,
        checksum_sha256: sha256(compiled.revisionProjection),
        row_count: compiled.rows.length,
        revision_number: 1,
        currency_code: "KGS",
        totals: compiled.totals,
        input_parameters: compiled.parameters,
        primary_measure_value: compiled.parameters[Object.keys(compiled.parameters)[0] ?? ""] ?? null,
        primary_measure_unit_id: input.member.parameters[0]?.parameter_id ?? null,
        created_at: "2026-09-04T00:00:00.000Z",
      };
      const projectionHash = sha256({
        revision: compiled.revisionProjection,
        rows: compiled.rows.map((row) => row.row_sha256),
      });
      if (projectionHash !== sha256({
        revision: compiled.revisionProjection,
        rows: compiled.rows.map((row) => row.row_sha256),
      })) failures.push({ code: "webAndroidParityRed", detail: "projection hash mismatch" });
      if (input.item.scenarioKind === "professional_pdf_projection") {
        const pdf = buildCanonicalProfessionalPdfProjection({
          revision,
          rows: selection.estimateRows,
          workTitleRu: input.member.titleRu,
          definitionVersionId: input.member.definitionVersionId,
        });
        if (pdf.rowCount !== selection.estimateRows.length
          || (compiled.totals.unpricedRowCount > 0 && pdf.grandTotalStatus !== "PARTIAL_NEEDS_PRICE")) {
          failures.push({ code: "pdfParityRed", detail: "professional projection mismatch" });
        }
      }
      if (input.item.scenarioKind === "procurement_projection") {
        const procurement = buildCanonicalProcurementProjection({
          revision,
          procurementRows: selection.procurementRows,
        });
        if (procurement.selectedRowCount !== selection.procurementRows.length) {
          failures.push({ code: "procurementParityRed", detail: "procurement projection mismatch" });
        }
      }
      if (input.item.scenarioKind === "history_projection") {
        const restored = JSON.parse(canonicalEstimateStableJson(compiled.revisionProjection));
        if (sha256(restored) !== sha256(compiled.revisionProjection)) {
          failures.push({ code: "historyParityRed", detail: "history roundtrip mismatch" });
        }
      }
      if (["edit_recalculate", "double_edit", "restart_edit"].includes(input.item.scenarioKind)) {
        const editedParameterId = Object.keys(input.item.parameterPatch)[0]!;
        const current = Number(input.item.parameterPatch[editedParameterId]);
        const nextPatch = { ...input.item.parameterPatch, [editedParameterId]: Number((current * 1.01 + 0.0001).toFixed(8)) };
        const after = await compileCase({ ...input, parameterPatch: nextPatch, missingParameterId: null, operation: "recalculate" });
        if (!changedRowParity({ before: compiled, after, formulas: input.formulas, resources: input.resources, editedParameterId })) {
          failures.push({ code: "revisionParityRed", detail: "unaffected row changed" });
        }
        if (input.item.scenarioKind === "double_edit") {
          const second = await compileCase({ ...input, parameterPatch: input.item.parameterPatch, missingParameterId: null, operation: "recalculate" });
          if (sha256(second.revisionProjection) !== sha256(compiled.revisionProjection)) {
            failures.push({ code: "revisionParityRed", detail: "double edit did not restore snapshot" });
          }
        }
        if (input.item.scenarioKind === "restart_edit") {
          const restarted = await compileCase(input);
          if (sha256(restarted.revisionProjection) !== sha256(compiled.revisionProjection)) {
            failures.push({ code: "coldRestartRed", detail: "cold restart projection mismatch" });
          }
        }
      }
      return {
        caseId: input.item.caseId,
        catalogId: input.item.catalogId,
        scenarioKind: input.item.scenarioKind,
        inputFingerprint: input.item.inputFingerprint,
        rowCount: compiled.rows.length,
        pricedRowCount: compiled.totals.pricedRowCount,
        unpricedRowCount: compiled.totals.unpricedRowCount,
        outputSha256: sha256(compiled.revisionProjection),
        durationMs: Number((performance.now() - startedAt).toFixed(3)),
        failures,
        passed: failures.length === 0,
      };
    }
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (input.item.expectedOutcome === "PARAMETER_VALIDATION_FAILED" && code === "PARAMETER_VALIDATION_FAILED") {
      return {
        caseId: input.item.caseId,
        catalogId: input.item.catalogId,
        scenarioKind: input.item.scenarioKind,
        inputFingerprint: input.item.inputFingerprint,
        expectedRejection: code,
        durationMs: Number((performance.now() - startedAt).toFixed(3)),
        failures: [],
        passed: true,
      };
    }
    failures.push({
      code: input.item.scenarioKind === "missing_p0" ? "missingP0Red" : "compileRed",
      detail: `${code || "UNCLASSIFIED"}:${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return {
    caseId: input.item.caseId,
    catalogId: input.item.catalogId,
    scenarioKind: input.item.scenarioKind,
    inputFingerprint: input.item.inputFingerprint,
    durationMs: Number((performance.now() - startedAt).toFixed(3)),
    failures,
    passed: false,
  };
}

async function executeShard(client: Client, manifest: FrozenManifest, root: string, shard: FrozenManifest["shards"][number]): Promise<Json> {
  const path = resolve(root, "shards", `${shard.shardId}.json`);
  if (existsSync(path)) {
    const existing = loadJson<Json>(path);
    if (existing.proofSnapshotSha256 !== manifest.proofSnapshotSha256
      || existing.membershipSha256 !== shard.membershipSha256
      || existing.receiptSha256 !== sha256(withoutSelfHash(existing))) {
      throw new Error(`STOP_GROUP50_SHARD_RECEIPT_INVALID:${shard.shardId}`);
    }
    return existing;
  }
  const groupSet = new Set(shard.groupIds);
  const groups = manifest.groups.filter((group) => groupSet.has(group.groupId));
  const members = new Map(groups.flatMap((group) => group.members.map((member) => [member.catalogId, member])));
  const definitionIds = [...new Set([...members.values()].map((member) => member.definitionVersionId))];
  const [parameterRows, formulaRows, resourceRows] = await Promise.all([
    client.query(
      `select definition_version_id::text,parameter_id,value_type,required,default_value,
        constraints_json,truth_metadata,approved_template_baseline_id::text
      from public.estimate_parameter_definition
      where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal`,
      [definitionIds],
    ),
    client.query(
      "select definition_version_id::text,formula_id,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=any($1::uuid[]) order by definition_version_id,formula_id",
      [definitionIds],
    ),
    client.query(
      "select id::text,definition_version_id::text,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256 from public.estimate_resource_spec where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal",
      [definitionIds],
    ),
  ]);
  const parametersByDefinition = new Map<string, R4A6Group50Parameter[]>();
  for (const parameter of parameterRows.rows as Json[]) {
    const id = String(parameter.definition_version_id);
    parametersByDefinition.set(id, [
      ...(parametersByDefinition.get(id) ?? []),
      parameter as R4A6Group50Parameter,
    ]);
  }
  const formulasByDefinition = new Map<string, CanonicalEstimateFormulaDefinition[]>();
  for (const formula of formulaRows.rows as Json[]) {
    const id = String(formula.definition_version_id);
    formulasByDefinition.set(id, [...(formulasByDefinition.get(id) ?? []), formula as CanonicalEstimateFormulaDefinition]);
  }
  const resourcesByDefinition = new Map<string, CanonicalEstimateResourceDefinition[]>();
  for (const resource of resourceRows.rows as Json[]) {
    const id = String(resource.definition_version_id);
    resourcesByDefinition.set(id, [...(resourcesByDefinition.get(id) ?? []), resource as CanonicalEstimateResourceDefinition]);
  }
  const shardCounters = counters();
  const staticFailures: Json[] = [];
  for (const member of members.values()) {
    const failures = definitionStaticFailures({
      member,
      formulas: formulasByDefinition.get(member.definitionVersionId) ?? [],
      resources: resourcesByDefinition.get(member.definitionVersionId) ?? [],
    });
    for (const failure of failures) shardCounters[failure.code] += 1;
    if (failures.length > 0) staticFailures.push({ catalogId: member.catalogId, failures });
  }
  const results: Json[] = [];
  const durations: number[] = [];
  const initialRssBytes = process.memoryUsage().rss;
  let maximumRssBytes = process.memoryUsage().rss;
  for (const group of groups) {
    const memberById = new Map(group.members.map((member) => [member.catalogId, member]));
    for (const item of group.cases) {
      const member = memberById.get(item.catalogId)!;
      const result = await executeCase({
        group,
        member,
        item,
        parameters: parametersByDefinition.get(item.definitionVersionId) ?? [],
        formulas: formulasByDefinition.get(item.definitionVersionId) ?? [],
        resources: resourcesByDefinition.get(item.definitionVersionId) ?? [],
      });
      results.push(result);
      durations.push(Number(result.durationMs));
      for (const failure of result.failures as { code: BlockingCounterKey }[]) shardCounters[failure.code] += 1;
      maximumRssBytes = Math.max(maximumRssBytes, process.memoryUsage().rss);
    }
  }
  const rssGrowthBytes = Math.max(0, maximumRssBytes - initialRssBytes);
  if (maximumRssBytes > 1_610_612_736 || rssGrowthBytes > 805_306_368
    || percentile(durations, 0.99) > 5_000) shardCounters.performanceRed += 1;
  const body = {
    schemaVersion: "r568-r4-a6-content-group50-shard.v1",
    shardId: shard.shardId,
    status: Object.values(shardCounters).every((value) => value === 0) ? "GREEN" : "RED",
    proofSnapshotSha256: manifest.proofSnapshotSha256,
    membershipSha256: shard.membershipSha256,
    expectedGroups: groups.length,
    executedGroups: groups.length,
    expectedCases: shard.expectedCases,
    executedCases: results.length,
    passedCases: results.filter((result) => result.passed).length,
    failedCases: results.filter((result) => !result.passed).length,
    uniqueInputFingerprints: new Set(results.map((result) => result.inputFingerprint)).size,
    visibleWorksExecuted: new Set(results.map((result) => result.catalogId)).size,
    counters: shardCounters,
    staticFailures,
    performance: {
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      p99Ms: percentile(durations, 0.99),
      maximumMs: Math.max(...durations),
      initialRssBytes,
      maximumRssBytes,
      rssGrowthBytes,
    },
    results,
  };
  const receipt = { ...body, receiptSha256: sha256(body) };
  writeImmutableJson(path, receipt);
  process.stdout.write(`${JSON.stringify({
    shardId: shard.shardId,
    status: receipt.status,
    cases: receipt.executedCases,
    p99Ms: receipt.performance.p99Ms,
    maximumRssBytes,
  })}\n`);
  return receipt;
}

async function finalize(client: Client, manifest: FrozenManifest, root: string, receipts: Json[]): Promise<Json> {
  const source = exactSourceIdentity();
  if (sha256(source) !== sha256(manifest.source)) throw new Error("STOP_GROUP50_SOURCE_DRIFT");
  const currentDatabase = await databaseIdentity(client);
  if (currentDatabase.databaseIdentityHash !== manifest.database.databaseIdentityHash) {
    throw new Error("STOP_GROUP50_DATABASE_DRIFT");
  }
  const aggregateCounters = counters();
  const fingerprints = new Set<string>();
  const works = new Set<string>();
  let cases = 0;
  let passedCases = 0;
  for (const [index, receipt] of receipts.entries()) {
    const shard = manifest.shards[index]!;
    if (receipt.proofSnapshotSha256 !== manifest.proofSnapshotSha256
      || receipt.membershipSha256 !== shard.membershipSha256
      || receipt.receiptSha256 !== sha256(withoutSelfHash(receipt))) {
      throw new Error(`STOP_GROUP50_SHARD_RECEIPT_INVALID:${shard.shardId}`);
    }
    cases += Number(receipt.executedCases);
    passedCases += Number(receipt.passedCases);
    for (const key of BLOCKING_COUNTER_KEYS) aggregateCounters[key] += Number(receipt.counters[key] ?? 0);
    for (const result of receipt.results as Json[]) {
      if (fingerprints.has(String(result.inputFingerprint))) {
        aggregateCounters.doubleCountRed += 1;
      }
      fingerprints.add(String(result.inputFingerprint));
      works.add(String(result.catalogId));
    }
  }
  const resultByCaseId = new Map<string, Json>();
  for (const receipt of receipts) {
    for (const result of receipt.results as Json[]) resultByCaseId.set(String(result.caseId), result);
  }
  const groupsGreen = manifest.groups.filter((group) => group.cases.every((item) =>
    resultByCaseId.get(item.caseId)?.passed === true)).length;
  const denominatorGreen = receipts.length === SHARD_COUNT
    && cases === EXPECTED_CASES
    && passedCases === EXPECTED_CASES
    && fingerprints.size === EXPECTED_CASES
    && works.size === EXPECTED_VISIBLE_WORKS
    && groupsGreen === EXPECTED_GROUPS;
  const allCountersGreen = Object.values(aggregateCounters).every((value) => value === 0);
  const body = {
    schemaVersion: "r568-r4-a6-content-group50-terminal.v1",
    status: denominatorGreen && allCountersGreen
      ? "GREEN_R4_A6_GROUP50_2368_GROUPS"
      : "RED_R4_A6_GROUP50",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    masterSha256: MASTER_SHA256,
    source,
    database: currentDatabase,
    proofSnapshotSha256: manifest.proofSnapshotSha256,
    groupsTotal: EXPECTED_GROUPS,
    groupsGreen,
    groupsRed: EXPECTED_GROUPS - groupsGreen,
    visibleWorksExpected: EXPECTED_VISIBLE_WORKS,
    visibleWorksExecuted: works.size,
    identities: EXPECTED_IDENTITIES,
    aliasesRedirects: EXPECTED_ALIASES,
    expectedCases: EXPECTED_CASES,
    executedCases: cases,
    passedCases,
    failedCases: cases - passedCases,
    uniqueInputFingerprints: fingerprints.size,
    shardsExpected: SHARD_COUNT,
    shardsExecuted: receipts.length,
    counters: aggregateCounters,
    performance: {
      p50Ms: percentile(receipts.map((receipt) => Number(receipt.performance.p50Ms)), 0.5),
      p95Ms: percentile(receipts.map((receipt) => Number(receipt.performance.p95Ms)), 0.95),
      p99Ms: percentile(receipts.map((receipt) => Number(receipt.performance.p99Ms)), 0.99),
      maximumMs: Math.max(...receipts.map((receipt) => Number(receipt.performance.maximumMs))),
      maximumRssBytes: Math.max(...receipts.map((receipt) => Number(receipt.performance.maximumRssBytes))),
    },
    productionAccessed: false,
    deployPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
    fakeGreenClaimed: false,
  };
  const summary = { ...body, summarySha256: sha256(body) };
  writeImmutableJson(resolve(root, "TERMINAL_SUMMARY.json"), summary);
  return summary;
}

async function main(): Promise<void> {
  if (sha256Bytes(readFileSync(MASTER_PATH)) !== MASTER_SHA256) {
    throw new Error("STOP_MASTER_SHA256_DRIFT");
  }
  const source = exactSourceIdentity();
  const root = resolve(ROOT, `group50-${source.commitSha}-terminal`);
  mkdirSync(root, { recursive: true });
  const manifestPath = resolve(root, "FROZEN_MANIFEST.json");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const manifest = existsSync(manifestPath)
      ? loadJson<FrozenManifest>(manifestPath)
      : await buildFrozenManifest(client, source);
    const { proofSnapshotSha256: _proofSnapshotSha256, ...manifestBody } = manifest;
    if (manifest.proofSnapshotSha256 !== sha256(manifestBody)) throw new Error("STOP_GROUP50_MANIFEST_HASH");
    if (!existsSync(manifestPath)) writeImmutableJson(manifestPath, manifest);
    const receipts: Json[] = [];
    for (const shard of manifest.shards) receipts.push(await executeShard(client, manifest, root, shard));
    const summary = await finalize(client, manifest, root, receipts);
    process.stdout.write(`${JSON.stringify({
      root,
      status: summary.status,
      groups: `${summary.groupsGreen}/${summary.groupsTotal}`,
      visibleWorks: `${summary.visibleWorksExecuted}/${summary.visibleWorksExpected}`,
      cases: `${summary.passedCases}/${summary.expectedCases}`,
      counters: summary.counters,
      summarySha256: summary.summarySha256,
    }, null, 2)}\n`);
    if (summary.status !== "GREEN_R4_A6_GROUP50_2368_GROUPS") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
