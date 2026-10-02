import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildAllBatch004R56CanonicalSuccessorDefinitions,
  projectBatch004R56DefinitionToCanonicalRows,
} from "../r5/batch004R56SharedCoreProjection";
import { batch004R56FixtureValues } from "../r5/batch004R56Fixtures";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  type CanonicalDefinitionPublishPlan,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.drywall-domain-completion-cumulative-successor.v1";
const OWNER = "S2721_DRYWALL_DOMAIN_COMPLETION_CUMULATIVE_SUCCESSOR";
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const SOURCE_KEY = "KG_SP_KR_65_101_2025";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r568/s27-21/drywall-domain-completion-cumulative-successor-v1");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const ALLOW_HASHED_DIRTY_SOURCE = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
const SOURCE_PATHS = [
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionSuccessorR56.ts",
  "scripts/estimate/r5/batch004R56SharedCoreProjection.ts",
  "scripts/estimate/r5/batch004R56Fixtures.ts",
  "tests/aiEstimateV4/batch004R56Reconciliation.contract.test.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareS2721DrywallDomainCompletionCumulativeSuccessor.ts",
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

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S2721_DRYWALL_DOMAIN_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S2721_DRYWALL_DOMAIN_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

function targetCatalogId(sourceCatalogId: string): string {
  return `canonical-work:base:${sourceCatalogId}`;
}

function rowType(category: string): string {
  if (category === "material") return "material";
  if (category === "construction_work") return "labor";
  if (category === "machine_equipment") return "equipment";
  if (category === "delivery") return "service";
  if (category === "waste") return "waste";
  return "other";
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  parentSearchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    CONTRACT,
    input.parentSearchReleaseId,
    input.releaseId,
    input.fingerprint,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group", "group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition"],
    ["estimate_search_clarification_question", "question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId,
      input.parentSearchReleaseId,
    ]);
  }
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,source.source_provenance||jsonb_build_object(
        'contract',$3::text,'parentSearchReleaseId',$4::uuid::text,
        'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||
        manifest.definition_version_id::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,
      manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT,
    input.parentSearchReleaseId,
    input.fingerprint,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group_membership", "group_id,catalog_id,ordinal,independent_disposition"],
    ["estimate_search_typed_relation", "source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId,
      input.parentSearchReleaseId,
    ]);
  }
  const snapshot = (await client.query(`select count(*)::int documents,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, drywallDomainCompletionTargetCount: 393 }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_S2721_DRYWALL_DOMAIN_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_S2721_DRYWALL_DOMAIN_MASTER_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_S2721_DRYWALL_DOMAIN_SOURCE_MISSING:${path}`);
  }
  const dirtySourcePaths = SOURCE_PATHS.filter((path) => git("status", "--short", "--", path) !== "");
  invariant(dirtySourcePaths.length === 0 || ALLOW_HASHED_DIRTY_SOURCE,
    `STOP_S2721_DRYWALL_DOMAIN_DIRTY_SOURCE_REQUIRES_EXPLICIT_OPT_IN:${dirtySourcePaths.join(",")}`);

  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const receiptPath = resolve(OUTPUT_ROOT, "acceptance.json");
  if (current.owner === OWNER && existsSync(receiptPath)) {
    process.stdout.write(readFileSync(receiptPath, "utf8"));
    return;
  }
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_DRYWALL_DOMAIN_POINTER_STATE");

  const parentReleaseId = String(current.definitionReleaseId);
  const parentSearchReleaseId = String(current.searchReleaseId);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
  }));
  const definitions = buildAllBatch004R56CanonicalSuccessorDefinitions();
  invariant(definitions.length === 393 && new Set(definitions.map((entry) => entry.catalogId)).size === 393,
    "STOP_S2721_DRYWALL_DOMAIN_DEFINITION_SET");
  const definitionSetSha256 = sha256(definitions.map((definition) => ({
    catalogId: definition.catalogId,
    definitionSha256: definition.definitionSha256,
    sourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
  })));
  const fingerprint = sha256({
    contract: CONTRACT,
    head,
    tree,
    masterSha256: MASTER_SHA256,
    parentReleaseId,
    parentSearchReleaseId,
    sourceHashes,
    definitionSetSha256,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "s27-21-drywall-domain-completion-cumulative-successor",
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [parentReleaseId],
    )).rows[0] as Json | undefined;
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [parentSearchReleaseId],
    )).rows[0] as Json | undefined;
    invariant(parent?.status === "prepared" && parent.activated_at == null,
      "STOP_S2721_DRYWALL_DOMAIN_PARENT_NOT_PREPARED_INACTIVE");
    invariant(parentSearch?.status === "draft",
      "STOP_S2721_DRYWALL_DOMAIN_PARENT_SEARCH_NOT_DRAFT");

    const targetCatalogIds = definitions.map((definition) => targetCatalogId(definition.catalogId));
    const oldTargets = (await client.query(`select manifest.catalog_id,
        manifest.definition_version_id::text,manifest.approved_template_baseline_id::text,
        definition.definition_version,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id) resources,
        (select count(*)::int from public.estimate_approved_template_baseline child
          where child.supersedes_baseline_id=manifest.approved_template_baseline_id) baseline_children
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition
        on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      order by manifest.catalog_id`, [parentReleaseId, targetCatalogIds])).rows as Json[];
    invariant(oldTargets.length === 393 && oldTargets.every((row) => Number(row.baseline_children) === 0),
      `STOP_S2721_DRYWALL_DOMAIN_PARENT_TARGETS:${oldTargets.length}`);
    const oldByCatalog = new Map(oldTargets.map((row) => [String(row.catalog_id), row]));
    const locator = (await client.query(`select locator.id::text,source.source_key
      from public.estimate_normative_locator locator
      join public.estimate_normative_source source on source.id=locator.source_id
      where source.source_key=$1
      order by locator.locator_key,locator.id limit 1`, [SOURCE_KEY])).rows[0] as Json | undefined;
    invariant(locator?.source_key === SOURCE_KEY,
      "STOP_S2721_DRYWALL_DOMAIN_NORMATIVE_LOCATOR_MISSING");

    const projections = definitions.map((definition) => ({
      definition,
      projection: projectBatch004R56DefinitionToCanonicalRows(definition, {
        includeRuntimePriceInputs: false,
        normalizePublisherCategories: true,
      }),
    }));
    const newCounts = projections.reduce((totals, entry) => ({
      parameters: totals.parameters + entry.projection.parameterDefinitions.length,
      formulas: totals.formulas + entry.projection.formulaDefinitions.length,
      resources: totals.resources + entry.projection.resourceDefinitions.length,
    }), { parameters: 0, formulas: 0, resources: 0 });
    const oldCounts = oldTargets.reduce((totals, row) => ({
      parameters: totals.parameters + Number(row.parameters),
      formulas: totals.formulas + Number(row.formulas),
      resources: totals.resources + Number(row.resources),
    }), { parameters: 0, formulas: 0, resources: 0 });
    const nextCounts = {
      definitions: Number(parent.definition_count),
      parameters: Number(parent.parameter_count) - oldCounts.parameters + newCounts.parameters,
      formulas: Number(parent.formula_count) - oldCounts.formulas + newCounts.formulas,
      resources: Number(parent.resource_row_count) - oldCounts.resources + newCounts.resources,
    };

    const plans: CanonicalDefinitionPublishPlan[] = projections.map(({ definition, projection }) => {
      const catalogId = targetCatalogId(definition.catalogId);
      const old = oldByCatalog.get(catalogId)!;
      const definitionId = uuid(`${CONTRACT}:${fingerprint}:${catalogId}:definition`);
      const baselineId = uuid(`${CONTRACT}:${fingerprint}:${catalogId}:baseline`);
      const parameterRows = projection.parameterDefinitions.map((parameter) => {
        const parameterId = String(parameter.parameter_id);
        const primaryMeasure = ["area_m2", "joint_length_m", "defect_area_m2", "opening_count_item"]
          .includes(parameterId);
        const declaredConsumers = Array.isArray(parameter.truth_metadata?.resource_branch_consumers)
          ? parameter.truth_metadata.resource_branch_consumers.map(String)
          : [];
        const inferredConsumers = projection.resourceDefinitions.filter((resource) =>
          definition.formulas.some((formula) => formula.formulaId === resource.formula_id
            && formula.inputParameterIds.includes(parameterId))
          || JSON.stringify(resource.inclusion_ast).includes(`"${parameterId}"`)
          || JSON.stringify(resource.resource_graph).includes(`"${parameterId}"`)
        ).map((resource) => String(resource.row_id));
        const resourceConsumers = [...new Set([...declaredConsumers, ...inferredConsumers])];
        return {
          ...parameter,
          truth_metadata: {
            ...parameter.truth_metadata,
            contract: CONTRACT,
            semantic_parameter_key: `${catalogId}:${parameterId}`,
            visibility_role: "USER_INPUT",
            value_source_role: primaryMeasure ? "USER_MEASURED" : "PROJECT_CONDITIONAL_INPUT",
            input_origin_class: primaryMeasure ? "KNOWN_WORK_SCOPE" : "PROJECT_OR_SITE_INPUT",
            preliminary_compilation_allowed: !primaryMeasure,
            source_confirmation_required: false,
            resource_branch_consumers: resourceConsumers.length > 0
              ? resourceConsumers
              : projection.resourceDefinitions.map((resource) => String(resource.row_id)),
            guide: {
              guide_kind: primaryMeasure ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
              guide_short_ru: primaryMeasure
                ? `Введите подтверждённый физический объём: ${String(parameter.title_ru)}.`
                : `${String(parameter.title_ru)}: укажите проектное, паспортное или площадочное значение; скрытая подстановка запрещена.`,
              source_role: primaryMeasure ? "USER_MEASURED" : "PROJECT_CONDITIONAL_INPUT",
              source_document: SOURCE_KEY,
              source_locator: "СП КР 65-101:2025 — правила производства и приёмки отделочных работ; точные количества задаются проектом и паспортом системы",
              guide_version: "s27-21-drywall-domain-completion-r1",
              source_snapshot_hash: definition.passport.engineeringSourcePack.sourcePackHash,
              applicability: definition.passport.variantApplicabilityRu,
              verified_at: "2026-09-30T00:00:00+06:00",
              guide_validation_policy: "FIRST_ESTIMATE_FAIL_CLOSED_REPLACE_WITH_PROJECT_DATA",
            },
            hidden_default_forbidden: true,
            runtime_profile_value: false,
            synthetic: false,
          },
        };
      });
      const formulaRows = projection.formulaDefinitions.map((formula) => ({
        ...formula,
        ast_sha256: sha256(formula.ast),
      }));
      const resourceRows = projection.resourceDefinitions.map((resource) => ({
        ...resource,
        row_type: rowType(String(resource.category)),
      }));
      const fixture = batch004R56FixtureValues(definition);
      const inputValues = Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        fixture[String(parameter.parameter_id)],
      ]));
      invariant(Object.values(inputValues).every((value) => value !== undefined),
        `STOP_S2721_DRYWALL_DOMAIN_FIXTURE:${definition.catalogId}`);
      const formulaConsumers = Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        formulaRows.filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
          .map((formula) => formula.formula_id),
      ]));
      const resourceConsumers = Object.fromEntries(parameterRows.map((parameter) => {
        const declared = (parameter.truth_metadata.resource_branch_consumers as string[]) ?? [];
        return [parameter.parameter_id, declared];
      }));
      const acceptanceEvidenceSha256 = sha256({
        contract: CONTRACT,
        catalogId,
        definitionSha256: definition.definitionSha256,
        sourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
        inputValues,
        resources: resourceRows.map((resource) => resource.row_id),
      });
      const targetDefinitionSha256 = sha256({
        contract: CONTRACT,
        catalogId,
        canonicalDefinitionSha256: definition.definitionSha256,
        parameters: parameterRows,
        formulas: formulaRows,
        resources: resourceRows,
      });
      const baselineRepresentative = {
        parameter_schema_sha256: sha256(parameterRows),
        input_values: inputValues,
        input_classification: Object.fromEntries(parameterRows.map((parameter) => [
          parameter.parameter_id, "VALIDATION_FIXTURE",
        ])),
        uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
          parameter.parameter_id, (parameter as Record<string, unknown>).unit_id,
        ])),
        formula_consumer_ids: formulaConsumers,
        resource_consumer_row_ids: resourceConsumers,
        normative_source_ids: Object.fromEntries(parameterRows.map((parameter) => [
          parameter.parameter_id, [SOURCE_KEY],
        ])),
        guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
          parameter.parameter_id, String(parameter.truth_metadata.guide.guide_short_ru),
        ])),
        proposal_source_refs: [{
          contract: CONTRACT,
          sourceId: SOURCE_KEY,
          sourceKind: "KG_WORK_EXECUTION_AND_PROJECT_SYSTEM_ROUTE",
          exactLocator: "СП КР 65-101:2025 и явные проектные/паспортные входы определения",
          sourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
        }],
        contract_version: BASELINE_CONTRACT,
      };
      return createCanonicalDefinitionClonePlan({
        contract: CONTRACT,
        definition: {
          id: definitionId,
          releaseId,
          catalogId,
          definitionVersion: Number(old.definition_version) + 1,
          passport: {
            ...definition.passport,
            catalogId,
            sourceCatalogId: definition.catalogId,
            batchId: "BATCH-004",
          },
          applicability: {
            country: "KG",
            family: definition.family,
            operation: definition.operation,
            variant: definition.variant,
            firstEstimateBeforeOptionalClarification: true,
            hiddenQuantitativeAssumptionCount: 0,
          },
          definitionSha256: targetDefinitionSha256,
          sourceMetadata: {
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            sourceFingerprint: fingerprint,
            sourceCatalogId: definition.catalogId,
            canonicalDefinitionSha256: definition.definitionSha256,
            engineeringSourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
            knownWorkScopeFirstEstimate: true,
            missingProjectQuantityPolicy: "PRELIMINARY_NEED",
            invalidSuppliedValuePolicy: "REJECT",
            activationAllowed: false,
            productionEligible: false,
          },
        },
        representative: {
          parameters: parameterRows,
          formulas: formulaRows,
          resources: resourceRows,
          bindings: resourceRows.map((resource) => ({
            row_id: resource.row_id,
            locator_id: locator.id,
            applicability: {
              technologyFamily: "DRYWALL_DOMAIN_COMPLETION",
              family: definition.family,
              operation: definition.operation,
              variant: definition.variant,
              sourceKey: SOURCE_KEY,
            },
          })),
          baseline: baselineRepresentative,
          passport: {
            contract_version: CONTENT_PASSPORT_CONTRACT,
            included_scope_ru: definition.passport.includedScopeRu,
            capability_matrix: [
              { capability: "PARAMETERS", status: "GREEN" },
              { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
              { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
              { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
            ],
          },
        },
        parameterTruthMetadata: (parameter) => ({ ...parameter.truth_metadata }),
        resourceId: (resource) => uuid(`${CONTRACT}:${fingerprint}:${catalogId}:resource:${resource.row_id}`),
        resourceSemanticOwner: (resource) => `${catalogId}:${resource.row_id}`,
        resourceSha256: (resource) => sha256({ contract: CONTRACT, catalogId, resource }),
        baseline: {
          id: baselineId,
          key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${catalogId}`,
          sourceDefinitionVersionId: String(old.definition_version_id),
          validationScenarioRefs: [{
            scenario: "S27_21_DRYWALL_DOMAIN_COMPLETION_SHARED_CORE_393",
            sourceCatalogId: definition.catalogId,
            fixture: inputValues,
            canonicalDefinitionSha256: definition.definitionSha256,
            acceptanceEvidenceSha256,
          }],
          acceptanceEvidenceSha256,
          acceptedReleaseId: releaseId,
          supersedesBaselineId: String(old.approved_template_baseline_id),
        },
        passport: {
          physicalResultRu: definition.passport.physicalResultRu,
          excludedScopeRu: definition.passport.excludedScopeRu,
          decision: {
            contract: CONTENT_PASSPORT_CONTRACT,
            status: "GREEN",
            allowed: true,
            waveContract: CONTRACT,
            quantityScope: "FULL",
            priceState: "PARTIAL_NEEDS_PRICE",
            activationAllowed: false,
            productionEligible: false,
          },
          payloadSha256: sha256({
            targetDefinitionSha256,
            acceptanceEvidenceSha256,
            sourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
          }),
          sourceHead: head,
          sourceTree: tree,
        },
        bindingApplicability: (binding) => ({ ...binding.applicability }),
        expectedNormativeBindingCount: resourceRows.length,
      });
    });

    const existing = (await client.query(
      "select id,status from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_S2721_DRYWALL_DOMAIN_EXISTING_NOT_PREPARED");
      receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Json;
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='900s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(client, plans);
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId,
          releaseKey,
          head,
          tree,
          sha256(`${CONTRACT}:${fingerprint}:draft`),
          nextCounts.definitions,
          nextCounts.resources,
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            replacedDefinitionCount: 393,
            activationAllowed: false,
            productionEligible: false,
            priceState: "PARTIAL_NEEDS_PRICE",
          }),
          parentReleaseId,
          sha256({ contract: CONTRACT, fingerprint, definitionSetSha256 }),
          nextCounts.parameters,
          nextCounts.formulas,
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [
          releaseId,
          CONTRACT,
          parentReleaseId,
        ]);

        let persistedDefinitions = 0;
        let inheritedPriceBindings = 0;
        for (const plan of plans) {
          const persisted = await publishCanonicalDefinitionDraft(client, plan);
          persistedDefinitions += 1;
          inheritedPriceBindings += Number(persisted.inheritedCompatiblePriceBindingCount);
          const targetEntrySha256 = sha256({
            contract: CONTRACT,
            releaseId,
            catalogId: plan.definition.catalog_id,
            definitionId: plan.definition.id,
            baselineId: plan.baseline.id,
            targetDefinitionSha256: plan.definition.definition_sha256,
          });
          const updated = await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,
              publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
              baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
              runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId,
            plan.definition.catalog_id,
            plan.definition.id,
            CONTRACT,
            plan.baseline.id,
            plan.definition.definition_sha256,
            targetEntrySha256,
          ]);
          invariant(updated.rowCount === 1,
            `STOP_S2721_DRYWALL_DOMAIN_MANIFEST_UPDATE:${plan.definition.catalog_id}`);
        }
        invariant(persistedDefinitions === 393,
          `STOP_S2721_DRYWALL_DOMAIN_PERSISTED_DENOMINATOR:${persistedDefinitions}`);

        const searchSnapshot = await cloneSearch(client, {
          releaseId,
          searchReleaseId,
          parentSearchReleaseId,
          releaseKey,
          head,
          tree,
          fingerprint,
        });
        const manifest = (await client.query(`select count(*)::int identities,
            count(*) filter(where catalog_id=any($2::text[]) and source_batch=$3)::int targets,
            encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
          from public.estimate_cumulative_manifest_entry where release_id=$1`, [
          releaseId,
          targetCatalogIds,
          CONTRACT,
        ])).rows[0] as Json;
        const targetAudit = (await client.query(`select count(*)::int definitions,
            min((select count(*) from public.estimate_resource_spec resource where resource.definition_version_id=definition.id))::int min_resources,
            max((select count(*) from public.estimate_resource_spec resource where resource.definition_version_id=definition.id))::int max_resources,
            sum((select count(*) from public.estimate_parameter_definition parameter where parameter.definition_version_id=definition.id))::int parameters,
            sum((select count(*) from public.estimate_formula_graph formula where formula.definition_version_id=definition.id))::int formulas,
            sum((select count(*) from public.estimate_resource_spec resource where resource.definition_version_id=definition.id))::int resources,
            count(*) filter(where definition.content_status='CANDIDATE_READY' and definition.content_gate_status='GREEN')::int green
          from public.estimate_definition_version definition
          where definition.release_id=$1 and definition.catalog_id=any($2::text[])`, [
          releaseId,
          targetCatalogIds,
        ])).rows[0] as Json;
        const unrelated = (await client.query(`select count(*)::int changed
          from public.estimate_cumulative_manifest_entry parent
          join public.estimate_cumulative_manifest_entry successor using(catalog_id)
          where parent.release_id=$1 and successor.release_id=$2 and not(parent.catalog_id=any($3::text[]))
            and (parent.definition_version_id<>successor.definition_version_id
              or parent.source_batch<>successor.source_batch
              or parent.source_release_id<>successor.source_release_id
              or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
              or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
          parentReleaseId,
          releaseId,
          targetCatalogIds,
        ])).rows[0] as Json;
        invariant(Number(manifest.identities) === nextCounts.definitions
          && Number(manifest.targets) === 393
          && Number(targetAudit.definitions) === 393
          && Number(targetAudit.green) === 393
          && Number(targetAudit.parameters) === newCounts.parameters
          && Number(targetAudit.formulas) === newCounts.formulas
          && Number(targetAudit.resources) === newCounts.resources
          && Number(unrelated.changed) === 0,
        `STOP_S2721_DRYWALL_DOMAIN_AUDIT:${JSON.stringify({ manifest, targetAudit, unrelated })}`);
        const prepared = await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          manifest.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: searchSnapshot.snapshot_sha256,
            drywallDomainCompletionTargetCount: 393,
            definitionSetSha256,
            publisherPreflightSha256: publisherPreflight.plansSha256,
          }),
        ]);
        invariant(prepared.rowCount === 1, "STOP_S2721_DRYWALL_DOMAIN_PREPARED_TRANSITION");
        if (APPLY) await client.query("commit");
        else await client.query("rollback");
        receipt = {
          status: APPLY
            ? "GREEN_S2721_DRYWALL_DOMAIN_COMPLETION_393_PREPARED_NOT_ACTIVE"
            : "DRY_RUN_S2721_DRYWALL_DOMAIN_COMPLETION_393_VALIDATED",
          mutationPerformed: APPLY,
          predecessor: {
            releaseId: parentReleaseId,
            searchReleaseId: parentSearchReleaseId,
            targetShape: oldCounts,
          },
          successor: {
            releaseId,
            searchReleaseId,
            releaseKey,
            targetShape: newCounts,
            nextCounts,
          },
          audit: {
            manifest,
            targetAudit,
            unrelatedManifestChanges: Number(unrelated.changed),
            searchSnapshot,
            publisherPreflightSha256: publisherPreflight.plansSha256,
            inheritedCompatiblePriceBindings: inheritedPriceBindings,
          },
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: EXPECTED_BRANCH,
      head,
      tree,
      fingerprint,
      definitionSetSha256,
      sourceHashes,
      hashedDirtySourceAccepted: dirtySourcePaths.length > 0 && ALLOW_HASHED_DIRTY_SOURCE,
    },
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(receiptPath, sealed);
    atomicJson(resolve(OUTPUT_ROOT, `01_drywall_domain_completion_393_${head}.json`), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.searchSnapshot.snapshot_sha256,
      currentRuntimeDefinitions: receipt!.successor.nextCounts.definitions,
      owner: OWNER,
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main();
