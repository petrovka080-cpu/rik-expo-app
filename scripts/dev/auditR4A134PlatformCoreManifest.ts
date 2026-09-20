import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-4/platform-core-global/manifest-core-norm");
const COVERAGE_LEDGER = resolve(OUTPUT_ROOT, "01_CURRENT_WORK_IDENTITY_COVERAGE_LEDGER.jsonl");
const SOURCE_IDENTITY_LEDGER = resolve(OUTPUT_ROOT, "02_SOURCE_IDENTITY_RECONCILIATION.jsonl");
const NORM_LEDGER = resolve(OUTPUT_ROOT, "03_EXISTING_NORM_REUSE_LEDGER.jsonl");
const ROUTE_MAP = resolve(OUTPUT_ROOT, "04_ONE_CORE_ROUTE_MAP.json");
const SUMMARY = resolve(OUTPUT_ROOT, "05_MANIFEST_CORE_NORM_AUDIT.json");

const RELEASE_MANIFEST = "data/estimate-benchmarks/r568-local-developer-canonical-release.json";
const BACKEND_RECEIPT = ".release-runtime/r568/runtime/local-developer-current/backend.json";
const BASE_MANIFEST = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const EXPANDED_TEMPLATES = "data/estimate-catalog/expanded-complex/templates.json";
const EXPANDED_FAMILIES = "data/estimate-catalog/expanded-complex/work-families.json";
const SOURCE_REGISTRY = "data/estimate-catalog/source-registry.json";
const PROFESSIONAL_PACK_SUMMARY = "data/estimate-catalog/professional-norm-packs/professional-norm-packs.json";
const PROFESSIONAL_PACK_ROOT = "data/estimate-norms/professional";
const PROFESSIONAL_PACK_PLAN = `${PROFESSIONAL_PACK_ROOT}/work-group-remediation-plan.json`;
const QUANTITY_RECEIPT = ".release-runtime/r4a13-4/platform-core-global/catalog-quantity-web/01_catalog_quantity_lifecycle.json";
const RESTART_RECEIPT = ".release-runtime/r4a13-4/platform-core-global/catalog-quantity-web/02_catalog_quantity_restart_reload.json";

const PROTECTED_FILES = [
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
] as const;

const ROUTES: Json[] = [
  {
    routeId: "REQUEST_AND_MARKET_INTENT_BASELINE",
    surfaces: ["Market/add button", "/request", "Web", "Android"],
    chain: [
      ["app/_layout.tsx", "requestEstimateIntentLifecycle"],
      ["app/(tabs)/request/index.tsx", "ConsumerRepairRequestScreen"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx", "compileConsumerCanonicalBaseline"],
      ["src/features/consumerRepair/consumerCanonicalBaselineCompile.ts", "compileCanonicalEstimateAndLoad"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "jobs/compile"],
      ["scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts", "CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts", "adaptCanonicalRevisionToStructuredEstimate"],
    ],
    status: "CANONICAL_BACKEND_CORE",
  },
  {
    routeId: "REQUEST_PARAMETER_AND_MANUAL_ROW_RECALCULATION",
    surfaces: ["parameter refinement", "manual catalog addition", "quantity/price/edit"],
    chain: [
      ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "applyCanonicalRowAmendment"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx", "recalculateConsumerCanonicalEstimate"],
      ["src/features/consumerRepair/consumerCanonicalParameterEditor.ts", "recalculateConsumerCanonicalCatalogAddition"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "recalculateCanonicalEstimateAndLoad"],
      ["scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", "rowOverrides"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts", "createCanonicalEstimateRevision"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts", "adaptCanonicalRevisionToStructuredEstimate"],
    ],
    status: "CANONICAL_BACKEND_CORE",
  },
  {
    routeId: "OFFICE_FOREMAN_COMPOSER",
    surfaces: ["Office", "foreman", "Web", "Android"],
    chain: [
      ["src/components/estimate/ProfessionalEstimateComposer.tsx", "compileCanonicalEstimateAndLoad"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "jobs/compile"],
      ["scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts", "createCanonicalEstimateRevision"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts", "adaptCanonicalRevisionToStructuredEstimate"],
    ],
    status: "CANONICAL_BACKEND_CORE",
  },
  {
    routeId: "CANONICAL_AI_PLUGIN",
    surfaces: ["AI platform estimate plugin"],
    chain: [
      ["src/lib/aiPlatform/plugins/estimate/AiEstimatePlugin.ts", "compileCanonicalEstimateAndLoad"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "jobs/compile"],
      ["scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", "compileCanonicalEstimateCore"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts", "createCanonicalEstimateRevision"],
    ],
    status: "CANONICAL_BACKEND_CORE",
  },
  {
    routeId: "DEEP_LINK_HISTORY_REOPEN",
    surfaces: ["deep link", "history", "repeat open", "Web", "Android"],
    chain: [
      ["app/(tabs)/request/index.tsx", "canonicalRevisionId"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx", "initialCanonicalRevisionId"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "getCanonicalEstimateRevision"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts", "adaptCanonicalRevisionToStructuredEstimate"],
      ["src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection.ts", "canonicalBackend"],
    ],
    status: "CANONICAL_REVISION_READ_ONLY",
  },
  {
    routeId: "PDF_AND_PROCUREMENT",
    surfaces: ["PDF", "procurement", "confirm"],
    chain: [
      ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "createCanonicalEstimateArtifact"],
      ["scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", "createArtifactJob"],
      ["src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts", "canonicalProfessionalArtifactMetadataIdentityMatches"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "buildCanonicalEstimateArtifact"],
    ],
    status: "SAME_CANONICAL_REVISION_PROJECTION",
  },
];

const LEGACY_NON_PRODUCT_ADAPTERS: Json[] = [
  {
    adapterId: "BUILT_IN_AI_SYNC_ESTIMATE",
    caller: "src/features/consumerRepair/consumerRepairAiAdapter.ts",
    chain: [
      ["src/features/consumerRepair/consumerRepairAiAdapter.ts", "answerBuiltInAi"],
      ["src/lib/ai/builtInAi/builtInAiIngress.ts", "runBuiltInAiTool"],
      ["src/lib/ai/builtInAi/builtInAiToolRegistry.ts", "buildProfessionalExpandedGlobalEstimate"],
      ["src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts", "buildProfessionalExpandedGlobalEstimate"],
    ],
    productRouteRoots: [
      ["app/(tabs)/request/index.tsx", "consumerRepairAiAdapter"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "consumerRepairAiAdapter"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx", "consumerRepairAiAdapter"],
      ["src/features/ai/assistantClient.ts", "answerBuiltInAi"],
      ["src/features/ai/assistantAnswerPipeline.ts", "answerBuiltInAi"],
    ],
    disposition: "LEGACY_OFFLINE_TEST_ADAPTER_NOT_PRODUCT_REACHABLE",
  },
  {
    adapterId: "CONSUMER_REQUEST_ESTIMATOR_KERNEL",
    caller: "src/lib/consumerRequests/consumerRequestEstimateApplicationService.ts",
    chain: [
      ["src/lib/consumerRequests/consumerRequestEstimateApplicationService.ts", "buildGlobalEstimateFromEstimatorKernel"],
      ["src/lib/ai/globalEstimate/globalEstimateCalculator.ts", "buildGlobalEstimateFromEstimatorKernel"],
    ],
    productRouteRoots: [
      ["app/(tabs)/request/index.tsx", "buildConsumerRepairEstimateFromEstimatorKernel"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "buildConsumerRepairEstimateFromEstimatorKernel"],
      ["src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx", "buildConsumerRepairEstimateFromEstimatorKernel"],
      ["src/features/ai/assistantClient.ts", "buildGlobalEstimateFromEstimatorKernel"],
      ["src/features/ai/assistantAnswerPipeline.ts", "buildGlobalEstimateFromEstimatorKernel"],
    ],
    disposition: "LEGACY_OFFLINE_TEST_ADAPTER_NOT_PRODUCT_REACHABLE",
  },
];

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R4A134_MANIFEST_CORE_NORM:${code}`);
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stable(value));
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(resolve(path), "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function atomicJsonl(path: string, rows: readonly unknown[]): void {
  atomicText(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function fileIdentity(path: string): Json {
  const bytes = readFileSync(resolve(path));
  return { path, byteSize: bytes.byteLength, sha256: sha256(bytes) };
}

function pathExists(path: string): boolean {
  try {
    statSync(resolve(path));
    return true;
  } catch {
    return false;
  }
}

function inspectChain(chain: readonly (readonly [string, string])[]): Json[] {
  return chain.map(([path, marker]) => {
    const bytes = readFileSync(resolve(path));
    const source = bytes.toString("utf8");
    return {
      path,
      marker,
      markerPresent: source.includes(marker),
      byteSize: bytes.byteLength,
      sha256: sha256(bytes),
    };
  });
}

function sourceIdentityRows(input: {
  base: Json[];
  expanded: Json[];
  families: Json[];
  currentDefinitions: ReadonlyMap<string, Json>;
}): Json[] {
  const familyById = new Map(input.families.map((family) => [String(family.work_family_id), family]));
  const ownerByFamily = new Map<string, Json>();
  for (const template of input.expanded) {
    if (template.template_level === "PRELIMINARY_BOQ") {
      invariant(!ownerByFamily.has(String(template.work_family_id)),
        `EXPANDED_OWNER_DUPLICATE:${String(template.work_family_id)}`);
      ownerByFamily.set(String(template.work_family_id), template);
    }
  }
  const rows: Json[] = input.base.map((template) => {
    const canonicalId = `canonical-work:base:${String(template.work_key)}`;
    const runtime = input.currentDefinitions.get(canonicalId);
    return {
      sourceIdentityId: `base-work:${String(template.work_key)}`,
      sourceCorpus: "BASE_WORK_CATALOG_10000",
      sourceTitleRu: template.localized_name_ru,
      groupId: template.work_family_id,
      classification: "CANONICAL_VISIBLE",
      canonicalId,
      redirectTargetSourceIdentityId: null,
      runtimeAdmissionState: runtime ? runtime.admission_state : "MISSING_FROM_CURRENT_RELEASE",
      definitionVersionId: runtime?.definition_version_id ?? null,
      openIssue: runtime ? null : "VISIBLE_SOURCE_IDENTITY_NOT_ADMITTED",
    };
  });
  for (const template of input.expanded) {
    const familyId = String(template.work_family_id);
    const owner = ownerByFamily.get(familyId);
    const family = familyById.get(familyId);
    invariant(owner && family, `EXPANDED_FAMILY_OR_OWNER_MISSING:${String(template.template_id)}`);
    const visible = template.template_level === "PRELIMINARY_BOQ";
    const canonicalId = `canonical-work:expanded:${familyId}`;
    const runtime = input.currentDefinitions.get(canonicalId);
    rows.push({
      sourceIdentityId: `expanded-template:${String(template.template_id)}`,
      sourceCorpus: "EXPANDED_COMPLEX_TEMPLATES_1610",
      sourceTitleRu: family.professionalNameRu,
      groupId: family.categoryGroup,
      classification: visible ? "CANONICAL_VISIBLE" : "REDIRECT_TO_CANONICAL",
      canonicalId,
      redirectTargetSourceIdentityId: visible ? null : `expanded-template:${String(owner.template_id)}`,
      runtimeAdmissionState: runtime ? runtime.admission_state : "MISSING_FROM_CURRENT_RELEASE",
      definitionVersionId: runtime?.definition_version_id ?? null,
      openIssue: runtime ? null : "EXPANDED_OWNER_NOT_ADMITTED",
    });
  }
  const knownCanonicalIds = new Set(rows.filter((row) => row.classification === "CANONICAL_VISIBLE")
    .map((row) => String(row.canonicalId)));
  for (const runtime of input.currentDefinitions.values()) {
    if (knownCanonicalIds.has(String(runtime.catalog_id))) continue;
    rows.push({
      sourceIdentityId: `runtime-extra:${String(runtime.catalog_id)}`,
      sourceCorpus: "CURRENT_RELEASE_EXTRA_ADMISSION",
      sourceTitleRu: runtime.title_ru,
      groupId: runtime.domain_id,
      classification: "CANONICAL_VISIBLE_RUNTIME_EXTRA",
      canonicalId: runtime.catalog_id,
      redirectTargetSourceIdentityId: null,
      runtimeAdmissionState: runtime.admission_state,
      definitionVersionId: runtime.definition_version_id,
      reconciliation: "PRESERVED_CURRENT_RUNTIME_ADDITION_OUTSIDE_HISTORICAL_11610_SOURCE_LEDGER",
      openIssue: null,
    });
  }
  return rows.sort((left, right) => String(left.sourceIdentityId).localeCompare(String(right.sourceIdentityId)));
}

async function main(): Promise<void> {
  const startedUtc = new Date().toISOString();
  const releaseManifest = readJson(RELEASE_MANIFEST);
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const quantityReceipt = readJson(QUANTITY_RECEIPT);
  const restartReceipt = readJson(RESTART_RECEIPT);
  const releaseId = String(releaseManifest.definitionReleaseId);
  invariant(quantityReceipt.status === "GREEN_R4_A13_4_CATALOG_QUANTITY_LIFECYCLE_WEB", "QUANTITY_RECEIPT_NOT_GREEN");
  invariant(restartReceipt.status === "GREEN_R4_A13_4_CATALOG_QUANTITY_RESTART_RELOAD", "RESTART_RECEIPT_NOT_GREEN");
  invariant(backendReceipt.compatibility_tuple?.definitionReleaseId === releaseId, "BACKEND_RELEASE_DRIFT");

  const base = (readJson(BASE_MANIFEST).templates ?? []) as Json[];
  const expanded = readJson(EXPANDED_TEMPLATES) as unknown as Json[];
  const families = readJson(EXPANDED_FAMILIES) as unknown as Json[];
  const sourceRegistry = readJson(SOURCE_REGISTRY);
  const registrySources = (sourceRegistry.sources ?? []) as Json[];
  const registryById = new Map(registrySources.map((source) => [String(source.source_id), source]));
  const professionalPackSummary = readJson(PROFESSIONAL_PACK_SUMMARY);
  const professionalPackPlan = readJson(PROFESSIONAL_PACK_PLAN);
  const professionalPackFiles = readdirSync(resolve(PROFESSIONAL_PACK_ROOT))
    .filter((name) => name.endsWith(".json") && name !== "work-group-remediation-plan.json")
    .sort()
    .map((name) => {
      const path = `${PROFESSIONAL_PACK_ROOT}/${name}`;
      const pack = readJson(path);
      return {
        path,
        sha256: fileIdentity(path).sha256,
        workGroup: pack.work_group ?? null,
        sourcePackVersion: pack.source_pack_version ?? null,
        sourceType: pack.source_type ?? null,
        reviewStatus: pack.review_status ?? null,
        normItemCount: Array.isArray(pack.norm_items) ? pack.norm_items.length : 0,
      };
    });

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    invariant(release, "CURRENT_RELEASE_NOT_FOUND");
    invariant(release.sealed_at, "CURRENT_RELEASE_NOT_SEALED");

    process.stderr.write("[r4a134-audit] current-definition coverage\n");
    const currentDefinitions = (await client.query(`with
      current_manifest as materialized (
        select * from public.estimate_cumulative_manifest_entry where release_id=$1
      ),
      parameter_stats as (
        select parameter.definition_version_id,count(*)::int parameter_count,
          count(*) filter(where parameter.required)::int required_parameter_count,
          count(*) filter(where parameter.default_value is not null)::int default_parameter_count
        from public.estimate_parameter_definition parameter
        join current_manifest manifest on manifest.definition_version_id=parameter.definition_version_id
        group by parameter.definition_version_id
      ), formula_stats as (
        select formula.definition_version_id,count(*)::int formula_count,
          count(*) filter(where cardinality(formula.input_parameter_ids)>0)::int parameterized_formula_count,
          count(*) filter(where cardinality(formula.input_parameter_ids)=0)::int constant_formula_count
        from public.estimate_formula_graph formula
        join current_manifest manifest on manifest.definition_version_id=formula.definition_version_id
        group by formula.definition_version_id
      ), binding_resources as (
        select binding.definition_version_id,binding.resource_spec_id,count(*)::int binding_count
        from public.estimate_work_normative_binding binding
        join current_manifest manifest on manifest.definition_version_id=binding.definition_version_id
        group by binding.definition_version_id,binding.resource_spec_id
      ), resource_stats as (
        select resource.definition_version_id,count(*)::int resource_count,
          count(*) filter(where jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
            and jsonb_array_length(resource.source_metadata->'normativeTrace')>0)::int trace_resource_count,
          count(*) filter(where binding.resource_spec_id is not null)::int normalized_binding_resource_count,
          count(*) filter(where not (
              jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
              and jsonb_array_length(resource.source_metadata->'normativeTrace')>0
            ) and binding.resource_spec_id is null)::int uncovered_resource_count,
          count(*) filter(where exists(
            select 1 from jsonb_array_elements(case
              when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
                then resource.source_metadata->'normativeTrace' else '[]'::jsonb end) trace
            where not (
              (nullif(trace->>'normId','') is not null
                and nullif(trace->>'normVersion','') is not null
                and nullif(trace->>'normSourceId','') is not null
                and nullif(trace->>'normFamilyId','') is not null
                and nullif(trace->>'normReviewStatus','') is not null)
              or (nullif(trace->>'sourceId','') is not null
                and nullif(trace->>'sourceRole','') is not null
                and nullif(trace->>'exactLocator','') is not null)
              or (nullif(trace->>'sourceId','') is not null
                and nullif(trace->>'role','') is not null)
              or (nullif(trace->>'source_id','') is not null
                and nullif(trace->>'locator','') is not null
                and trace ? 'applicability')
              or (nullif(trace->>'sourceKey','') is not null
                and nullif(trace->>'documentCode','') is not null
                and nullif(trace->>'locator','') is not null)
            )
          ))::int invalid_trace_resource_count
        from public.estimate_resource_spec resource
        join current_manifest manifest on manifest.definition_version_id=resource.definition_version_id
        left join binding_resources binding on binding.resource_spec_id=resource.id
        group by resource.definition_version_id
      ), trace_source_stats as (
        select resource.definition_version_id,
          array_agg(distinct coalesce(trace->>'normSourceId',trace->>'sourceId',trace->>'source_id',trace->>'sourceKey')
            order by coalesce(trace->>'normSourceId',trace->>'sourceId',trace->>'source_id',trace->>'sourceKey'))
            filter(where nullif(coalesce(trace->>'normSourceId',trace->>'sourceId',trace->>'source_id',trace->>'sourceKey'),'') is not null) norm_source_ids,
          array_agg(distinct trace->>'normSourceId' order by trace->>'normSourceId')
            filter(where nullif(trace->>'normSourceId','') is not null) canonical_norm_source_ids,
          array_agg(distinct coalesce(trace->>'sourceId',trace->>'source_id',trace->>'sourceKey')
            order by coalesce(trace->>'sourceId',trace->>'source_id',trace->>'sourceKey'))
            filter(where nullif(coalesce(trace->>'sourceId',trace->>'source_id',trace->>'sourceKey'),'') is not null) embedded_source_ids,
          array_agg(distinct trace->>'normVersion' order by trace->>'normVersion')
            filter(where nullif(trace->>'normVersion','') is not null) norm_versions,
          array_agg(distinct trace->>'normFamilyId' order by trace->>'normFamilyId')
            filter(where nullif(trace->>'normFamilyId','') is not null) norm_family_ids
        from public.estimate_resource_spec resource
        join current_manifest manifest on manifest.definition_version_id=resource.definition_version_id
        cross join lateral jsonb_array_elements(case
          when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
            then resource.source_metadata->'normativeTrace' else '[]'::jsonb end) trace
        group by resource.definition_version_id
      )
      select manifest.catalog_id,identity.title_ru,identity.domain,identity.denominator_eligible,
        identity.retired_at,manifest.domain_id,manifest.source_batch,manifest.source_release_id::text,
        manifest.publication_state,manifest.baseline_ready,manifest.scenario_ready,
        manifest.definition_hash,manifest.entry_sha256,
        definition.id::text definition_version_id,definition.definition_version,
        definition.definition_sha256,definition.passport,definition.applicability,definition.source_metadata,
        coalesce(parameter_stats.parameter_count,0) parameter_count,
        coalesce(parameter_stats.required_parameter_count,0) required_parameter_count,
        coalesce(parameter_stats.default_parameter_count,0) default_parameter_count,
        coalesce(formula_stats.formula_count,0) formula_count,
        coalesce(formula_stats.parameterized_formula_count,0) parameterized_formula_count,
        coalesce(formula_stats.constant_formula_count,0) constant_formula_count,
        coalesce(resource_stats.resource_count,0) resource_count,
        coalesce(resource_stats.trace_resource_count,0) trace_resource_count,
        coalesce(resource_stats.normalized_binding_resource_count,0) normalized_binding_resource_count,
        coalesce(resource_stats.uncovered_resource_count,0) uncovered_resource_count,
        coalesce(resource_stats.invalid_trace_resource_count,0) invalid_trace_resource_count,
        coalesce(trace_source_stats.norm_source_ids,'{}'::text[]) norm_source_ids,
        coalesce(trace_source_stats.canonical_norm_source_ids,'{}'::text[]) canonical_norm_source_ids,
        coalesce(trace_source_stats.embedded_source_ids,'{}'::text[]) embedded_source_ids,
        coalesce(trace_source_stats.norm_versions,'{}'::text[]) norm_versions,
        coalesce(trace_source_stats.norm_family_ids,'{}'::text[]) norm_family_ids
      from current_manifest manifest
      join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      left join parameter_stats on parameter_stats.definition_version_id=definition.id
      left join formula_stats on formula_stats.definition_version_id=definition.id
      left join resource_stats on resource_stats.definition_version_id=definition.id
      left join trace_source_stats on trace_source_stats.definition_version_id=definition.id
      where manifest.release_id=$1 order by manifest.catalog_id`, [releaseId])).rows as Json[];

    const currentById = new Map<string, Json>(currentDefinitions.map((definition): [string, Json] => {
      const admissionState = definition.publication_state === "CANONICAL_SUCCESSOR"
        ? "ADMITTED_CANONICAL_SUCCESSOR"
        : "ADMITTED_INHERITED";
      return [String(definition.catalog_id), { ...definition, admission_state: admissionState }];
    }));

    process.stderr.write("[r4a134-audit] work-identity registry\n");
    const workIdentities = (await client.query(`select identity.catalog_id,identity.namespace,
        identity.domain,identity.source_identity,identity.work_key,identity.title_ru,
        identity.denominator_eligible,identity.canonical_owner,identity.created_at,identity.retired_at,
        latest.id::text latest_definition_version_id,latest.definition_version latest_definition_version,
        latest.release_id::text latest_definition_release_id,latest.definition_sha256 latest_definition_sha256,
        latest.release_key latest_definition_release_key,latest.release_status latest_definition_release_status,
        latest.release_sealed_at latest_definition_release_sealed_at
      from public.estimate_work_identity identity
      left join lateral (
        select definition.id,definition.definition_version,definition.release_id,definition.definition_sha256,
          release.release_key,release.status release_status,release.sealed_at release_sealed_at
        from public.estimate_definition_version definition
        join public.estimate_definition_release release on release.id=definition.release_id
        where definition.catalog_id=identity.catalog_id
        order by definition.definition_version desc limit 1
      ) latest on true
      order by identity.catalog_id`)).rows as Json[];

    const allDbSourceKeys = new Set((await client.query(
      "select source_key from public.estimate_normative_source order by source_key",
    )).rows.map((row) => String(row.source_key)));
    const evidenceSnapshot = {
      sourceHead: backendReceipt.compatibility_tuple.sourceHead,
      sourceTreeHash: backendReceipt.compatibility_tuple.sourceTree,
      definitionReleaseId: releaseId,
      definitionManifestSha256: release.source_manifest_sha256,
      searchReleaseId: releaseManifest.searchReleaseId,
      quantityReceiptSha256: fileIdentity(QUANTITY_RECEIPT).sha256,
      restartReceiptSha256: fileIdentity(RESTART_RECEIPT).sha256,
    };
    const coverageRows = workIdentities.map((identity) => {
      const current = currentById.get(String(identity.catalog_id));
      const admissionState = current?.admission_state
        ?? (identity.retired_at
          ? "RETIRED_NOT_CURRENT"
          : identity.denominator_eligible
            ? identity.latest_definition_release_status === "prepared" && identity.latest_definition_release_sealed_at
              ? "PREPARED_CANDIDATE_NOT_CURRENT"
              : "UNADMITTED_BLOCKED_OR_HISTORICAL"
            : "EXTERNAL_REFERENCE_NON_DENOMINATOR");
      const missingRegistrySourceIds = current
        ? (current.canonical_norm_source_ids as string[]).filter((id) => !registryById.has(id) && !allDbSourceKeys.has(id))
        : [];
      const openIssues: string[] = [];
      if (!current && identity.denominator_eligible && !identity.retired_at
        && admissionState === "UNADMITTED_BLOCKED_OR_HISTORICAL") {
        openIssues.push("NOT_ADMITTED_TO_CURRENT_RELEASE_REQUIRES_SCOPE_ADJUDICATION");
      }
      if (current && Number(current.uncovered_resource_count) > 0) openIssues.push("RESOURCE_NORM_SOURCE_UNCOVERED");
      if (current && Number(current.invalid_trace_resource_count) > 0) openIssues.push("INVALID_NORMATIVE_TRACE");
      if (missingRegistrySourceIds.length > 0) openIssues.push("NORM_SOURCE_ID_NOT_IN_EXISTING_REGISTRIES");
      return {
        schemaVersion: "rik-expo-app.r4-a13-4.current-work-identity-coverage-row.v1",
        canonicalId: identity.catalog_id,
        groupId: current?.domain_id ?? identity.domain,
        admissionState,
        definitionVersion: current
          ? { id: current.definition_version_id, version: current.definition_version, sha256: current.definition_sha256 }
          : identity.latest_definition_version_id
            ? {
              id: identity.latest_definition_version_id,
              version: identity.latest_definition_version,
              releaseId: identity.latest_definition_release_id,
              releaseKey: identity.latest_definition_release_key,
              releaseStatus: identity.latest_definition_release_status,
              sealedAt: identity.latest_definition_release_sealed_at,
              sha256: identity.latest_definition_sha256,
              current: false,
            }
            : null,
        normPackVersion: current
          ? {
            normPackId: current.passport?.sourcePack?.normPackId ?? current.passport?.normativeCompositionId ?? null,
            versions: current.norm_versions,
            familyIds: current.norm_family_ids,
            sourceIds: current.norm_source_ids,
          }
          : null,
        parameterOwner: current ? "public.estimate_parameter_definition" : null,
        compileOwner: current ? "canonicalEstimateCompileCore@backend-worker" : null,
        sourceCoverage: current
          ? {
            resourceCount: current.resource_count,
            tracedResourceCount: current.trace_resource_count,
            normalizedBindingResourceCount: current.normalized_binding_resource_count,
            uncoveredResourceCount: current.uncovered_resource_count,
            invalidTraceResourceCount: current.invalid_trace_resource_count,
            missingRegistrySourceIds,
            embeddedSourceIds: current.embedded_source_ids,
          }
          : null,
        calculationCoverage: current
          ? {
            formulaCount: current.formula_count,
            parameterizedFormulaCount: current.parameterized_formula_count,
            constantFormulaCount: current.constant_formula_count,
            everyResourceFormulaForeignKeyEnforced: true,
          }
          : null,
        lifecycleCoverage: current
          ? {
            baselineReady: current.baseline_ready,
            scenarioReady: current.scenario_ready,
            sourceBatch: current.source_batch,
            publicationState: current.publication_state,
          }
          : {
            currentRelease: false,
            latestReleaseKey: identity.latest_definition_release_key ?? null,
            latestReleaseStatus: identity.latest_definition_release_status ?? null,
            latestReleaseSealedAt: identity.latest_definition_release_sealed_at ?? null,
          },
        evidenceSnapshot,
        openIssue: openIssues,
      };
    });

    const identityRows = sourceIdentityRows({ base, expanded, families, currentDefinitions: currentById });

    process.stderr.write("[r4a134-audit] norm-trace aggregation\n");
    const traceNormRows = (await client.query(`with traces as materialized (
        select manifest.catalog_id,manifest.domain_id,resource.id resource_id,resource.row_id,
          resource.unit_id,resource.formula_id,formula.input_parameter_ids,formula.expression_source,trace,
          coalesce(trace->>'normSourceId',trace->>'sourceId',trace->>'source_id',trace->>'sourceKey') trace_source_id,
          case
            when nullif(trace->>'normSourceId','') is not null then 'CANONICAL_NORM_V1'
            when nullif(trace->>'sourceId','') is not null and nullif(trace->>'exactLocator','') is not null then 'LEGACY_EXACT_LOCATOR'
            when nullif(trace->>'sourceId','') is not null then 'EMBEDDED_SOURCE_REFERENCE'
            when nullif(trace->>'source_id','') is not null then 'LEGACY_SNAKE_CASE_LOCATOR'
            when nullif(trace->>'sourceKey','') is not null then 'PROJECT_OR_EQUIPMENT_SOURCE'
            else 'UNRECOGNIZED'
          end trace_schema_kind
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
        join public.estimate_formula_graph formula on formula.definition_version_id=resource.definition_version_id
          and formula.formula_id=resource.formula_id
        cross join lateral jsonb_array_elements(case
          when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
            then resource.source_metadata->'normativeTrace' else '[]'::jsonb end) trace
        where manifest.release_id=$1
      ), trace_groups as (
        select trace_source_id norm_source_id,trace->>'normVersion' norm_version,
          trace->>'normFamilyId' norm_family_id,
          array_agg(distinct trace_schema_kind order by trace_schema_kind) trace_schema_kinds,
          count(distinct trace->>'normId')::int norm_id_count,
          count(distinct resource_id)::int resource_consumer_count,
          count(distinct catalog_id)::int definition_consumer_count,
          array_agg(distinct unit_id order by unit_id) units,
          bool_or(expression_source like '%round_to(%') uses_round_to,
          bool_or(expression_source like '%ceil(%') uses_ceil,
          min(trace->>'normId') norm_id_sample,
          min(catalog_id) definition_consumer_sample,
          min(row_id) resource_consumer_sample,
          min(trace->>'normReviewStatus') norm_review_status
        from traces where nullif(trace_source_id,'') is not null
        group by trace_source_id,trace->>'normVersion',trace->>'normFamilyId'
      ), parameter_groups as (
        select norm_source_id,norm_version,norm_family_id,
          array_agg(distinct parameter_id order by parameter_id) dependent_parameters
        from (
          select trace_source_id norm_source_id,trace->>'normVersion' norm_version,
            trace->>'normFamilyId' norm_family_id,parameter_id
          from traces cross join lateral unnest(input_parameter_ids) parameter_id
          where nullif(trace_source_id,'') is not null
        ) parameters
        group by norm_source_id,norm_version,norm_family_id
      )
      select trace_groups.*,coalesce(parameter_groups.dependent_parameters,'{}'::text[]) dependent_parameters
      from trace_groups left join parameter_groups using(norm_source_id,norm_version,norm_family_id)
      order by norm_source_id,norm_version,norm_family_id`, [releaseId])).rows as Json[];

    process.stderr.write("[r4a134-audit] normalized norm registry\n");
    const dbNormRows = (await client.query(`select source.source_key norm_source_id,
        source.title_ru,source.authority,source.official_url,source.effective_from,source.effective_to,
        source.metadata,count(distinct locator.id)::int locator_count,
        count(distinct binding.resource_spec_id)::int current_resource_consumer_count,
        count(distinct manifest.catalog_id)::int current_definition_consumer_count,
        array_agg(distinct locator.locator_key order by locator.locator_key)
          filter(where locator.locator_key is not null) locator_keys
      from public.estimate_normative_source source
      left join public.estimate_normative_locator locator on locator.source_id=source.id
      left join public.estimate_work_normative_binding binding on binding.locator_id=locator.id
      left join public.estimate_cumulative_manifest_entry manifest
        on manifest.definition_version_id=binding.definition_version_id and manifest.release_id=$1
      group by source.id order by source.source_key`, [releaseId])).rows as Json[];
    const dbNormById = new Map(dbNormRows.map((row) => [String(row.norm_source_id), row]));
    const traceGroupsBySource = new Map<string, Json[]>();
    for (const row of traceNormRows) {
      const id = String(row.norm_source_id);
      traceGroupsBySource.set(id, [...(traceGroupsBySource.get(id) ?? []), row]);
    }
    const allNormSourceIds = [...new Set([
      ...registryById.keys(),
      ...dbNormById.keys(),
      ...traceGroupsBySource.keys(),
    ])].sort();
    const normRows = allNormSourceIds.map((normSourceId) => {
      const registry = registryById.get(normSourceId) ?? null;
      const db = dbNormById.get(normSourceId) ?? null;
      const traceGroups = traceGroupsBySource.get(normSourceId) ?? [];
      const currentResourceConsumers = traceGroups.reduce((sum, row) => sum + Number(row.resource_consumer_count), 0)
        + Number(db?.current_resource_consumer_count ?? 0);
      const openIssues: string[] = [];
      const traceSchemaKinds = [...new Set(traceGroups.flatMap((row) => row.trace_schema_kinds ?? []))].sort();
      const projectOrEngineeringSource = traceSchemaKinds.every((kind) =>
        kind === "PROJECT_OR_EQUIPMENT_SOURCE" || kind === "EMBEDDED_SOURCE_REFERENCE"
      ) && /^(?:project_|selected_|engineering_assumption:|verified_)/u.test(normSourceId);
      if (!registry && !db) {
        openIssues.push(projectOrEngineeringSource
          ? "EMBEDDED_PROJECT_OR_ENGINEERING_INPUT_SOURCE"
          : "EMBEDDED_ACCEPTED_SOURCE_TRACE_NOT_NORMALIZED");
      }
      if (registry?.quality_status === "needs_regional_review") openIssues.push("NEEDS_REGIONAL_REVIEW");
      if (db?.metadata?.candidateOnly === true && !db.official_url) openIssues.push("DB_SOURCE_CANDIDATE_ONLY_WITHOUT_OFFICIAL_URL");
      if (currentResourceConsumers === 0) openIssues.push("REGISTERED_SOURCE_UNUSED_BY_CURRENT_RELEASE");
      return {
        schemaVersion: "rik-expo-app.r4-a13-4.existing-norm-reuse-row.v1",
        normSourceId,
        owningRegistry: registry ? SOURCE_REGISTRY : db ? "public.estimate_normative_source" : null,
        sourceTitle: registry?.source_title ?? db?.title_ru ?? null,
        sourceType: registry?.source_type ?? null,
        authority: db?.authority ?? null,
        officialUrl: registry?.source_url_or_document_ref ?? db?.official_url ?? null,
        qualityStatus: registry?.quality_status ?? (db?.metadata?.candidateOnly ? "candidate_only" : null),
        effectiveFrom: db?.effective_from ?? null,
        effectiveTo: db?.effective_to ?? null,
        traceGroups,
        stableNormIdCount: traceGroups.reduce((sum, row) => sum + Number(row.norm_id_count), 0),
        normVersions: [...new Set([
          ...traceGroups.map((row) => row.norm_version).filter(Boolean),
          registry?.source_date_or_version,
        ].filter(Boolean))].sort(),
        traceSchemaKinds,
        applicabilityScope: {
          familyIds: traceGroups.map((row) => row.norm_family_id),
          sampleTemplateIds: registry?.sample_template_ids ?? [],
        },
        units: [...new Set(traceGroups.flatMap((row) => row.units ?? []))].sort(),
        dependentParameters: [...new Set(traceGroups.flatMap((row) => row.dependent_parameters ?? []))].sort(),
        rounding: {
          roundToUsed: traceGroups.some((row) => row.uses_round_to),
          ceilUsed: traceGroups.some((row) => row.uses_ceil),
        },
        consumers: {
          currentResourceCount: currentResourceConsumers,
          traceDefinitionCountSum: traceGroups.reduce((sum, row) => sum + Number(row.definition_consumer_count), 0),
          normalizedDbResourceCount: Number(db?.current_resource_consumer_count ?? 0),
          normalizedDbDefinitionCount: Number(db?.current_definition_consumer_count ?? 0),
        },
        openIssue: openIssues,
      };
    });

    const inspectedRoutes = ROUTES.map((route) => {
      const chain = inspectChain(route.chain as [string, string][]);
      return { ...route, chain, verified: chain.every((node) => node.markerPresent) };
    });
    const inspectedLegacyAdapters = LEGACY_NON_PRODUCT_ADAPTERS.map((adapter) => {
      const chain = inspectChain(adapter.chain as [string, string][]);
      const productRouteRoots = inspectChain(adapter.productRouteRoots as [string, string][]);
      return {
        ...adapter,
        chain,
        productRouteRoots,
        implementationPresent: chain.every((node) => node.markerPresent),
        productReachable: productRouteRoots.some((node) => node.markerPresent),
      };
    });
    const routeMapBase = {
      schemaVersion: "rik-expo-app.r4-a13-4.one-core-route-map.v1",
      generatedUtc: new Date().toISOString(),
      authoritativeCore: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
      revisionWriter: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
      projectionAdapter: "src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts",
      routes: inspectedRoutes,
      legacyNonProductAdapters: inspectedLegacyAdapters,
      canonicalRoutesVerified: inspectedRoutes.every((route) => route.verified),
      activeAlternateCompilerCount: inspectedLegacyAdapters.filter((adapter) => adapter.productReachable).length,
      status: inspectedLegacyAdapters.some((adapter) => adapter.productReachable)
        ? "BLOCKED_ACTIVE_LIVE_ALTERNATE_ESTIMATE_PATHS"
        : "GREEN_ONE_AUTHORITATIVE_CORE_ROUTE_MAP",
      evidenceSnapshot,
    };
    atomicJson(ROUTE_MAP, { ...routeMapBase, payloadSha256: shaObject(routeMapBase) });
    atomicJsonl(COVERAGE_LEDGER, coverageRows);
    atomicJsonl(SOURCE_IDENTITY_LEDGER, identityRows);
    atomicJsonl(NORM_LEDGER, normRows);

    const admittedRows = coverageRows.filter((row) => String(row.admissionState).startsWith("ADMITTED_"));
    const admittedUncovered = admittedRows.filter((row) => Number(row.sourceCoverage?.uncoveredResourceCount ?? 0) > 0);
    const admittedInvalidTrace = admittedRows.filter((row) => Number(row.sourceCoverage?.invalidTraceResourceCount ?? 0) > 0);
    const identityCounts = identityRows.reduce((counts, row) => {
      const key = String(row.classification);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    const admissionCounts = coverageRows.reduce((counts, row) => {
      const key = String(row.admissionState);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    const currentDefinitionCount = currentDefinitions.length;
    const declaredVisibleCount = Number(releaseManifest.visibleCanonicalDefinitions);
    const runtimeExtraCount = Number(identityCounts.CANONICAL_VISIBLE_RUNTIME_EXTRA ?? 0);
    const historicalSourceIdentityCount = base.length + expanded.length;
    const declaredRuntimeDefinitionCount = Number(releaseManifest.currentRuntimeDefinitions);
    const declaredRuntimeAdditionalAdmissions = Number(releaseManifest.runtimeAdditionalAdmissions);
    const declaredCurrentInventoryRows = Number(releaseManifest.currentInventoryRowsIncludingAliases);
    const openIssues = [
      ...(historicalSourceIdentityCount !== Number(releaseManifest.identities)
        ? [`HISTORICAL_SOURCE_IDENTITY_RECONCILIATION_DRIFT:${releaseManifest.identities}->${historicalSourceIdentityCount}`]
        : []),
      ...(Number(identityCounts.CANONICAL_VISIBLE ?? 0) !== declaredVisibleCount
        ? [`HISTORICAL_CANONICAL_OWNER_RECONCILIATION_DRIFT:${declaredVisibleCount}->${identityCounts.CANONICAL_VISIBLE ?? 0}`]
        : []),
      ...(Number(identityCounts.REDIRECT_TO_CANONICAL ?? 0) !== Number(releaseManifest.aliasesRedirects)
        ? [`HISTORICAL_REDIRECT_RECONCILIATION_DRIFT:${releaseManifest.aliasesRedirects}->${identityCounts.REDIRECT_TO_CANONICAL ?? 0}`]
        : []),
      ...(currentDefinitionCount !== declaredRuntimeDefinitionCount
        ? [`CURRENT_RUNTIME_DEFINITION_COUNT_DRIFT:${declaredRuntimeDefinitionCount}->${currentDefinitionCount}`]
        : []),
      ...(runtimeExtraCount !== declaredRuntimeAdditionalAdmissions
        ? [`CURRENT_RUNTIME_ADDITION_COUNT_DRIFT:${declaredRuntimeAdditionalAdmissions}->${runtimeExtraCount}`]
        : []),
      ...(identityRows.length !== declaredCurrentInventoryRows
        ? [`CURRENT_INVENTORY_ROW_COUNT_DRIFT:${declaredCurrentInventoryRows}->${identityRows.length}`]
        : []),
      ...(admittedUncovered.length > 0 ? [`ADMITTED_DEFINITIONS_WITH_UNCOVERED_RESOURCES:${admittedUncovered.length}`] : []),
      ...(admittedInvalidTrace.length > 0 ? [`ADMITTED_DEFINITIONS_WITH_INVALID_TRACES:${admittedInvalidTrace.length}`] : []),
      ...(routeMapBase.activeAlternateCompilerCount > 0
        ? [`ACTIVE_LIVE_ALTERNATE_ESTIMATE_PATHS:${routeMapBase.activeAlternateCompilerCount}`]
        : []),
      ...(Number(admissionCounts.UNADMITTED_BLOCKED_OR_HISTORICAL ?? 0) > 0
        ? [`UNADJUDICATED_NONCURRENT_DENOMINATOR_IDENTITIES:${admissionCounts.UNADMITTED_BLOCKED_OR_HISTORICAL}`]
        : []),
    ];
    const summaryBase = {
      schemaVersion: "rik-expo-app.r4-a13-4.manifest-core-norm-audit.v1",
      startedUtc,
      finishedUtc: new Date().toISOString(),
      status: openIssues.length === 0
        ? "GREEN_R4_A13_4_MANIFEST_CORE_NORM_INVENTORY"
        : "BLOCKED_R4_A13_4_MANIFEST_CORE_NORM_INVENTORY",
      runtime: {
        definitionReleaseId: releaseId,
        searchReleaseId: releaseManifest.searchReleaseId,
        releaseStatus: release.status,
        sealedAt: release.sealed_at,
        sourceHead: backendReceipt.compatibility_tuple.sourceHead,
        sourceTreeHash: backendReceipt.compatibility_tuple.sourceTree,
        sourceManifestSha256: release.source_manifest_sha256,
      },
      catalog: {
        declaredHistoricalSourceIdentities: releaseManifest.identities,
        reconstructedHistoricalSourceIdentities: historicalSourceIdentityCount,
        sourceIdentityRowsIncludingRuntimeExtras: identityRows.length,
        identityCounts,
        currentRuntimeDefinitions: currentDefinitionCount,
        releaseStoredDefinitionCount: release.definition_count,
        admissionCounts,
        currentManifestPublicationStates: currentDefinitions.reduce((counts, row) => {
          counts[row.publication_state] = (counts[row.publication_state] ?? 0) + 1;
          return counts;
        }, {} as Record<string, number>),
        reconciliation: {
          historicalCanonicalOwners: declaredVisibleCount,
          historicalRedirects: Number(releaseManifest.aliasesRedirects),
          preservedRuntimeAdditionalAdmissions: runtimeExtraCount,
          preparedCandidatesNotCurrent: Number(admissionCounts.PREPARED_CANDIDATE_NOT_CURRENT ?? 0),
          retiredNotCurrent: Number(admissionCounts.RETIRED_NOT_CURRENT ?? 0),
          externalReferenceNonDenominator: Number(admissionCounts.EXTERNAL_REFERENCE_NON_DENOMINATOR ?? 0),
          historicalNumbersUsedAsReconciliationNotForcedRuntimeDenominator: true,
        },
      },
      definitions: {
        parameterCount: currentDefinitions.reduce((sum, row) => sum + Number(row.parameter_count), 0),
        formulaCount: currentDefinitions.reduce((sum, row) => sum + Number(row.formula_count), 0),
        parameterizedFormulaCount: currentDefinitions.reduce((sum, row) => sum + Number(row.parameterized_formula_count), 0),
        constantFormulaCount: currentDefinitions.reduce((sum, row) => sum + Number(row.constant_formula_count), 0),
        resourceCount: currentDefinitions.reduce((sum, row) => sum + Number(row.resource_count), 0),
        tracedResourceCount: currentDefinitions.reduce((sum, row) => sum + Number(row.trace_resource_count), 0),
        normalizedBindingResourceCount: currentDefinitions.reduce((sum, row) => sum + Number(row.normalized_binding_resource_count), 0),
        uncoveredResourceCount: currentDefinitions.reduce((sum, row) => sum + Number(row.uncovered_resource_count), 0),
        invalidTraceResourceCount: currentDefinitions.reduce((sum, row) => sum + Number(row.invalid_trace_resource_count), 0),
        admittedDefinitionsWithUncoveredResources: admittedUncovered.length,
        admittedDefinitionsWithInvalidTraces: admittedInvalidTrace.length,
      },
      norms: {
        sourceRegistry: { ...fileIdentity(SOURCE_REGISTRY), sourceCount: registrySources.length },
        usedTraceSourceCount: traceGroupsBySource.size,
        normalizedDbSourceCount: dbNormRows.length,
        combinedNormLedgerRows: normRows.length,
        regionalReviewSourceCount: registrySources.filter((source) => source.quality_status === "needs_regional_review").length,
        professionalPackSummary: {
          ...fileIdentity(PROFESSIONAL_PACK_SUMMARY),
          declaredNormPackCount: professionalPackSummary.norm_pack_count,
          declaredNormPackIds: professionalPackSummary.norm_pack_ids,
        },
        professionalPackFiles,
        professionalPackPlan: {
          ...fileIdentity(PROFESSIONAL_PACK_PLAN),
          workGroupCount: Array.isArray(professionalPackPlan.work_groups) ? professionalPackPlan.work_groups.length : 0,
        },
      },
      oneCore: {
        routeMapPath: ROUTE_MAP,
        canonicalRoutesVerified: routeMapBase.canonicalRoutesVerified,
        activeAlternateCompilerCount: routeMapBase.activeAlternateCompilerCount,
        status: routeMapBase.status,
      },
      openIssues,
      artifacts: [COVERAGE_LEDGER, SOURCE_IDENTITY_LEDGER, NORM_LEDGER, ROUTE_MAP].map((path) => fileIdentity(path)),
      inputs: [
        RELEASE_MANIFEST,
        BACKEND_RECEIPT,
        BASE_MANIFEST,
        EXPANDED_TEMPLATES,
        EXPANDED_FAMILIES,
        SOURCE_REGISTRY,
        PROFESSIONAL_PACK_SUMMARY,
        PROFESSIONAL_PACK_PLAN,
        QUANTITY_RECEIPT,
        RESTART_RECEIPT,
        ...PROTECTED_FILES,
      ].map(fileIdentity),
      protectedFiles: PROTECTED_FILES.map(fileIdentity),
      productionAccessed: false,
      deployPerformed: false,
      newCompilerCreated: false,
      fakeGreenClaimed: false,
    };
    atomicJson(SUMMARY, { ...summaryBase, payloadSha256: shaObject(summaryBase) });
    process.stdout.write(`${JSON.stringify({
      status: summaryBase.status,
      summary: SUMMARY,
      currentRuntimeDefinitions: currentDefinitionCount,
      declaredVisibleDefinitions: declaredVisibleCount,
      runtimeExtraAdmissions: runtimeExtraCount,
      resourceCount: summaryBase.definitions.resourceCount,
      uncoveredResourceCount: summaryBase.definitions.uncoveredResourceCount,
      activeAlternateCompilerCount: routeMapBase.activeAlternateCompilerCount,
      openIssues,
      productionAccessed: false,
    })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
