import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { asphaltRelatedAdmissionPolicyR6 } from "../../../src/lib/estimate/v4/asphalt/asphaltRelatedAdmissionR6";
import { buildRoadworksWaveAAdmissionLedgerR6 } from "../../../src/lib/estimate/v4/roadworks";
import {
  createCanonicalDefinitionClonePlan,
  publishCanonicalDefinitionDraft,
  type CanonicalDefinitionPublishPlan,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.asphalt-source-ownership-successor.v3";
const PREDECESSOR_OWNERSHIP_CONTRACT =
  "rik-expo-app.r4-a13-6.asphalt-source-ownership-successor.v2";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const SOURCE_GAP_LEDGER_PATH = resolve(process.env.R4A13_SOURCE_GAP_LEDGER_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/source-gap-ledger-v41/catalog-source-gap-ledger.json");
const CLAIM_APPLICABILITY_REVIEW_PATH = resolve(process.env.R4A13_CLAIM_APPLICABILITY_REVIEW_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/primary-source-review/krer27-claim-applicability-review-v1.json");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/asphalt-source-ownership-successor-v3");
const APPLY = process.argv.includes("--apply");
const ALLOW_HASHED_DIRTY_SOURCE = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
const SOURCE_PATHS = [
  "src/lib/estimate/v4/roadworks/roadworksWaveAAdmissionR6.ts",
  "src/lib/estimate/v4/asphalt/asphaltRelatedAdmissionR6.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareAsphaltSourceOwnershipSuccessor.ts",
] as const;
const PROJECT_SPECIFIC_ROLES = new Set([
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SELECTED_EQUIPMENT_PASSPORT",
  "MATERIAL_PASSPORT_VALUE",
  "MANUFACTURER_CONFIRMED",
]);

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
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_ASPHALT_SOURCE_OWNERSHIP_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_ASPHALT_SOURCE_OWNERSHIP_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

function targetPolicy(catalogId: string, parameterId: string): Json {
  const prefix = "canonical-work:base:";
  if (catalogId.startsWith(`${prefix}paving_roads_landscape_interior_asphalt_`)) {
    const workId = catalogId.slice(prefix.length);
    const policy = buildRoadworksWaveAAdmissionLedgerR6(workId)
      .find((entry) => entry.parameterId === parameterId);
    invariant(policy, `STOP_ASPHALT_SOURCE_OWNERSHIP_WAVE_A_POLICY_MISSING:${catalogId}:${parameterId}`);
    return policy;
  }
  return asphaltRelatedAdmissionPolicyR6(parameterId);
}

function declaredSourcesForRole(existing: unknown, role: string): string[] {
  if (role === "PROJECT_DOCUMENTATION" || role === "ENGINEERING_DESIGN") {
    return ["project_quantity_inputs_v3"];
  }
  if (role === "SELECTED_EQUIPMENT_PASSPORT") {
    return ["selected_equipment_passport_v1"];
  }
  if (role === "MATERIAL_PASSPORT_VALUE" || role === "MANUFACTURER_CONFIRMED") {
    return ["selected_material_or_product_passport_v1"];
  }
  return Array.isArray(existing) ? [...new Set(existing.map(String))].sort() : [];
}

function validationScenarioRefsWithCurrentEvidence(
  existing: unknown,
  acceptanceEvidenceSha256: string,
): unknown[] {
  const references = Array.isArray(existing) ? existing.map((reference) => ({ ...reference })) : [];
  if (!references.some((reference) =>
    reference?.scenario === "R6_NO_HIDDEN_RUNTIME_ASSUMPTIONS")) return references;
  if (!references.some((reference) =>
    reference?.scenario === "R6_NO_HIDDEN_RUNTIME_ASSUMPTIONS"
    && reference?.acceptanceEvidenceSha256 === acceptanceEvidenceSha256)) {
    references.push({
      scenario: "R6_NO_HIDDEN_RUNTIME_ASSUMPTIONS",
      acceptanceEvidenceSha256,
    });
  }
  return references;
}

async function loadRepresentative(client: Client, definitionId: string, baselineId: string) {
  const definition = (await client.query(
    "select * from public.estimate_definition_version where id=$1",
    [definitionId],
  )).rows[0] as Json | undefined;
  invariant(definition, `STOP_ASPHALT_SOURCE_OWNERSHIP_DEFINITION_MISSING:${definitionId}`);
  const parameters = (await client.query(
    "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
    [definitionId],
  )).rows as Json[];
  const formulas = (await client.query(
    "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
    [definitionId],
  )).rows as Json[];
  const resources = (await client.query(
    "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
    [definitionId],
  )).rows as Json[];
  const bindings = (await client.query(`select resource.row_id,binding.locator_id::text,
      binding.applicability
    from public.estimate_work_normative_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    where binding.definition_version_id=$1 order by resource.row_id,binding.locator_id`, [definitionId])).rows as Json[];
  const baseline = (await client.query(
    "select * from public.estimate_approved_template_baseline where id=$1",
    [baselineId],
  )).rows[0] as Json | undefined;
  invariant(baseline, `STOP_ASPHALT_SOURCE_OWNERSHIP_BASELINE_MISSING:${baselineId}`);
  const passport = (await client.query(
    "select * from public.estimate_content_passport_r3 where definition_version_id=$1",
    [definitionId],
  )).rows[0] as Json | undefined;
  invariant(passport, `STOP_ASPHALT_SOURCE_OWNERSHIP_PASSPORT_MISSING:${definitionId}`);
  return { definition, parameters, formulas, resources, bindings, baseline, passport };
}

async function createPlans(client: Client, input: {
  releaseId: string;
  predecessorReleaseId: string;
  fingerprint: string;
  head: string;
  tree: string;
  catalogIds: readonly string[];
}): Promise<{ plans: CanonicalDefinitionPublishPlan[]; transitions: Json[] }> {
  const manifestRows = (await client.query(`select manifest.catalog_id,
      manifest.definition_version_id::text definition_id,
      manifest.approved_template_baseline_id::text baseline_id,
      definition.definition_version
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    order by manifest.catalog_id`, [input.predecessorReleaseId, input.catalogIds])).rows as Json[];
  invariant(manifestRows.length === input.catalogIds.length,
    `STOP_ASPHALT_SOURCE_OWNERSHIP_TARGETS_MISSING:${manifestRows.length}:${input.catalogIds.length}`);

  const plans: CanonicalDefinitionPublishPlan[] = [];
  const transitions: Json[] = [];
  for (const manifest of manifestRows) {
    const catalogId = String(manifest.catalog_id);
    const currentDefinitionId = String(manifest.definition_id);
    const currentBaselineId = String(manifest.baseline_id);
    const representative = await loadRepresentative(client, currentDefinitionId, currentBaselineId);
    invariant(representative.parameters.every((parameter) => parameter.default_value == null),
      `STOP_ASPHALT_SOURCE_OWNERSHIP_NON_NULL_DEFAULT:${catalogId}`);

    const definitionId = uuid(`${CONTRACT}:${input.fingerprint}:definition:${catalogId}`);
    const baselineId = uuid(`${CONTRACT}:${input.fingerprint}:baseline:${catalogId}`);
    const truthByParameter = new Map<string, Json>();
    const roleTransitions: Json[] = [];
    const normativeSourceIds = { ...(representative.baseline.normative_source_ids ?? {}) };
    const guideProvenanceRu = { ...(representative.baseline.guide_provenance_ru ?? {}) };
    for (const parameter of representative.parameters) {
      const parameterId = String(parameter.parameter_id);
      const policy = targetPolicy(catalogId, parameterId);
      const oldTruth = { ...(parameter.truth_metadata ?? {}) };
      const oldRole = String(oldTruth.value_source_role ?? "");
      const newRole = String(policy.valueSourceRole);
      const guide = {
        ...(oldTruth.guide ?? {}),
        guide_kind: policy.guideKind,
        source_role: newRole,
        guide_validation_policy: policy.requiresSourceConfirmation === true
          ? "PROVENANCE_REQUIRED"
          : "INFORMATION_ONLY",
        guide_version: CONTRACT,
        source_snapshot_hash: sha256({
          contract: CONTRACT,
          fingerprint: input.fingerprint,
          catalogId,
          parameterId,
          valueSourceRole: newRole,
          guideKind: policy.guideKind,
        }),
        verified_at: "2026-09-19",
      };
      const nextTruth = {
        ...oldTruth,
        contract: CONTRACT,
        visibility_role: policy.visibilityRole,
        value_source_role: newRole,
        preliminary_compilation_allowed: policy.visibilityRole === "USER_INPUT",
        source_confirmation_required: policy.requiresSourceConfirmation === true,
        guide,
        provenance: {
          ...(oldTruth.provenance ?? {}),
          asphaltSourceOwnershipPredecessorDefinitionId: currentDefinitionId,
          asphaltSourceOwnershipContract: CONTRACT,
        },
      };
      truthByParameter.set(parameterId, nextTruth);
      normativeSourceIds[parameterId] = declaredSourcesForRole(
        normativeSourceIds[parameterId],
        newRole,
      );
      guideProvenanceRu[parameterId] = String(guide.guide_short_ru ?? parameter.title_ru ?? "");
      if (oldRole !== newRole) roleTransitions.push({ parameterId, oldRole, newRole });
    }
    const parameterSchemaSha256 = sha256(representative.parameters.map((parameter) => ({
      parameterId: parameter.parameter_id,
      valueType: parameter.value_type,
      unitId: parameter.unit_id,
      constraints: parameter.constraints_json,
      truth: truthByParameter.get(String(parameter.parameter_id)),
    })));
    const definitionSha256 = sha256({
      contract: CONTRACT,
      predecessorDefinitionSha256: representative.definition.definition_sha256,
      parameterSchemaSha256,
      formulas: representative.formulas.map((formula) => formula.ast_sha256),
      resources: representative.resources.map((resource) => resource.row_sha256),
    });
    const acceptanceEvidenceSha256 = sha256({
      contract: CONTRACT,
      predecessorAcceptanceEvidenceSha256: representative.baseline.acceptance_evidence_sha256,
      catalogId,
      currentDefinitionId,
      roleTransitions,
    });
    const baseline = {
      ...representative.baseline,
      parameter_schema_sha256: parameterSchemaSha256,
      normative_source_ids: normativeSourceIds,
      guide_provenance_ru: guideProvenanceRu,
    };
    const plan = createCanonicalDefinitionClonePlan({
      contract: CONTRACT,
      definition: {
        id: definitionId,
        releaseId: input.releaseId,
        catalogId,
        definitionVersion: Number(manifest.definition_version) + 1,
        passport: {
          ...(representative.definition.passport ?? {}),
          catalogId,
          sourceOwnershipContract: CONTRACT,
        },
        applicability: representative.definition.applicability ?? {},
        definitionSha256,
        sourceMetadata: {
          ...(representative.definition.source_metadata ?? {}),
          contract: CONTRACT,
          sourceOwnershipPredecessorDefinitionId: currentDefinitionId,
          sourceOwnershipTransitionCount: roleTransitions.length,
          activationAllowed: false,
          productionEligible: false,
        },
      },
      representative: {
        parameters: representative.parameters,
        formulas: representative.formulas,
        resources: representative.resources,
        bindings: representative.bindings,
        baseline,
        passport: representative.passport,
      },
      parameterTruthMetadata: (parameter) => truthByParameter.get(String(parameter.parameter_id))!,
      resourceId: (resource) => uuid(`${CONTRACT}:${input.fingerprint}:resource:${catalogId}:${resource.row_id}`),
      resourceSemanticOwner: (resource) => String(resource.semantic_owner),
      resourceSha256: (resource) => sha256({
        contract: CONTRACT,
        catalogId,
        predecessorRowSha256: resource.row_sha256,
        rowId: resource.row_id,
      }),
      baseline: {
        id: baselineId,
        key: `${CONTRACT}:${input.fingerprint.slice(0, 16)}:${catalogId}`,
        sourceDefinitionVersionId: currentDefinitionId,
        validationScenarioRefs: validationScenarioRefsWithCurrentEvidence(
          representative.baseline.validation_scenario_refs,
          acceptanceEvidenceSha256,
        ),
        acceptanceEvidenceSha256,
        acceptedReleaseId: input.releaseId,
        supersedesBaselineId: currentBaselineId,
      },
      passport: {
        physicalResultRu: String(representative.passport.physical_result_ru),
        excludedScopeRu: representative.passport.excluded_scope_ru,
        decision: {
          ...(representative.passport.decision ?? {}),
          contract: representative.passport.contract_version,
          status: "GREEN",
          allowed: true,
          quantityScope: "FULL",
          priceState: "PARTIAL_NEEDS_PRICE",
          waveContract: CONTRACT,
          sourceOwnershipContract: CONTRACT,
          activationAllowed: false,
          productionEligible: false,
        },
        payloadSha256: sha256({
          contract: CONTRACT,
          predecessorPayloadSha256: representative.passport.payload_sha256,
          definitionSha256,
          acceptanceEvidenceSha256,
        }),
        sourceHead: input.head,
        sourceTree: input.tree,
      },
      bindingApplicability: (binding) => ({
        ...(binding.applicability ?? {}),
        clonedByContract: CONTRACT,
      }),
      expectedNormativeBindingCount: representative.bindings.length,
    });
    plans.push(plan);
    transitions.push({
      catalogId,
      predecessorDefinitionId: currentDefinitionId,
      successorDefinitionId: definitionId,
      predecessorBaselineId: currentBaselineId,
      successorBaselineId: baselineId,
      roleTransitions,
    });
  }
  return { plans, transitions };
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
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.parentSearchReleaseId,
    input.releaseId, input.fingerprint,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group", "group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition"],
    ["estimate_search_clarification_question", "question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId, input.parentSearchReleaseId,
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
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, input.parentSearchReleaseId, input.fingerprint,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group_membership", "group_id,catalog_id,ordinal,independent_disposition"],
    ["estimate_search_typed_relation", "source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId, input.parentSearchReleaseId,
    ]);
  }
  const snapshot = (await client.query(`select count(*)::int documents,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, sourceOwnershipTargetCount: 42 }),
  ]);
  return snapshot;
}

async function auditCandidate(client: Client, input: {
  releaseId: string;
  predecessorReleaseId: string;
  searchReleaseId: string;
  catalogIds: readonly string[];
}): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256,metadata
    from public.estimate_definition_release where id=$1`, [input.releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]) and source_batch=$3)::int targets,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    input.releaseId, input.catalogIds, CONTRACT,
  ])).rows[0] as Json;
  const roles = (await client.query(`select parameter.truth_metadata->>'value_source_role' role,count(*)::int count
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_parameter_definition parameter
      on parameter.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    group by parameter.truth_metadata->>'value_source_role' order by role`, [
    input.releaseId, input.catalogIds,
  ])).rows as Json[];
  const unrelated = (await client.query(`select count(*)::int changed
    from public.estimate_cumulative_manifest_entry parent
    join public.estimate_cumulative_manifest_entry successor using(catalog_id)
    where parent.release_id=$1 and successor.release_id=$2 and not(parent.catalog_id=any($3::text[]))
      and (parent.definition_version_id<>successor.definition_version_id
        or parent.source_batch<>successor.source_batch
        or parent.source_release_id<>successor.source_release_id
        or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
        or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
    input.predecessorReleaseId, input.releaseId, input.catalogIds,
  ])).rows[0] as Json;
  const search = (await client.query(`select release.status,release.snapshot_sha256,
      release.metadata->>'definitionReleaseId' definition_release_id,
      count(document.*)::int documents,
      count(*) filter(where document.catalog_id=any($2::text[]))::int indexed_targets
    from public.estimate_search_index_release release
    join public.estimate_search_document document on document.search_release_id=release.id
    where release.id=$1 group by release.id`, [input.searchReleaseId, input.catalogIds])).rows[0] as Json;
  invariant(Number(manifest.identities) === Number(release.definition_count)
    && Number(manifest.targets) === input.catalogIds.length,
  `STOP_ASPHALT_SOURCE_OWNERSHIP_MANIFEST_AUDIT:${JSON.stringify(manifest)}`);
  invariant(Number(unrelated.changed) === 0,
    `STOP_ASPHALT_SOURCE_OWNERSHIP_UNRELATED_DRIFT:${unrelated.changed}`);
  invariant(search.definition_release_id === input.releaseId && search.status === "draft",
    `STOP_ASPHALT_SOURCE_OWNERSHIP_SEARCH_AUDIT:${JSON.stringify(search)}`);
  return { release, manifest, roles, unrelatedManifestChanges: Number(unrelated.changed), search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_ASPHALT_SOURCE_OWNERSHIP_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_ASPHALT_SOURCE_OWNERSHIP_MASTER_SHA256_DRIFT");
  invariant(existsSync(CURRENT_RELEASE_PATH) && existsSync(SOURCE_GAP_LEDGER_PATH)
    && existsSync(CLAIM_APPLICABILITY_REVIEW_PATH),
    "STOP_ASPHALT_SOURCE_OWNERSHIP_REQUIRED_INPUT_MISSING");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_ASPHALT_SOURCE_OWNERSHIP_SOURCE_MISSING:${path}`);
  }
  const dirtySourcePaths = SOURCE_PATHS.filter((path) => git("status", "--short", "--", path) !== "");
  invariant(dirtySourcePaths.length === 0 || ALLOW_HASHED_DIRTY_SOURCE,
    `STOP_ASPHALT_SOURCE_OWNERSHIP_DIRTY_SOURCE_REQUIRES_EXPLICIT_OPT_IN:${dirtySourcePaths.join(",")}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
  }));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false,
    "STOP_ASPHALT_SOURCE_OWNERSHIP_PRODUCTION_ACCESS_FLAG");
  const ledger = JSON.parse(readFileSync(SOURCE_GAP_LEDGER_PATH, "utf8")) as Json;
  const claimApplicabilityReview = JSON.parse(
    readFileSync(CLAIM_APPLICABILITY_REVIEW_PATH, "utf8"),
  ) as Json;
  invariant(claimApplicabilityReview.source?.sha256
    === "cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161"
    && claimApplicabilityReview.databaseMutationPerformed === false,
  "STOP_ASPHALT_SOURCE_OWNERSHIP_CLAIM_REVIEW_INVALID");
  const managed = (ledger.occurrences as Json[]).filter((occurrence) =>
    occurrence.claimKind === "MANAGED_PROFESSIONAL_SOURCE");
  const catalogIds = [...new Set(managed.map((occurrence) => String(occurrence.catalogId)))].sort();
  invariant(catalogIds.length === 42 && managed.length === 71,
    `STOP_ASPHALT_SOURCE_OWNERSHIP_LEDGER_SCOPE:${catalogIds.length}:${managed.length}`);

  const client = new Client({ connectionString: DATABASE_URL,
    application_name: "r4-a13-6-asphalt-source-ownership-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const pointedRelease = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [current.definitionReleaseId],
    )).rows[0] as Json | undefined;
    const pointedSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [current.searchReleaseId],
    )).rows[0] as Json | undefined;
    invariant(pointedRelease?.status === "prepared" && pointedRelease.activated_at == null,
      "STOP_ASPHALT_SOURCE_OWNERSHIP_CURRENT_RELEASE_NOT_PREPARED_INACTIVE");
    invariant(pointedSearch?.status === "draft"
      && pointedSearch.metadata?.definitionReleaseId === current.definitionReleaseId,
    "STOP_ASPHALT_SOURCE_OWNERSHIP_CURRENT_SEARCH_DRIFT");

    if (pointedRelease.metadata?.contract === CONTRACT) {
      const predecessorReleaseId = String(pointedRelease.parent_release_id);
      const searchReleaseId = String(pointedRelease.metadata.searchReleaseId);
      receipt = {
        status: "GREEN_ASPHALT_SOURCE_OWNERSHIP_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        predecessor: { releaseId: predecessorReleaseId },
        successor: {
          releaseId: String(pointedRelease.id),
          searchReleaseId,
          releaseKey: String(pointedRelease.release_key),
        },
        audit: await auditCandidate(client, {
          releaseId: String(pointedRelease.id), predecessorReleaseId, searchReleaseId, catalogIds,
        }),
      };
    } else {
      const predecessorReleaseId = String(current.definitionReleaseId);
      const predecessorSearchReleaseId = String(current.searchReleaseId);
      const fingerprint = sha256({
        contract: CONTRACT,
        masterSha256: MASTER_SHA256,
        predecessorReleaseId,
        predecessorSearchReleaseId,
        sourceGapLedgerSha256: sha256(readFileSync(SOURCE_GAP_LEDGER_PATH)),
        claimApplicabilityReviewSha256: sha256(readFileSync(CLAIM_APPLICABILITY_REVIEW_PATH)),
        sourceHashes,
        catalogIds,
      });
      const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
      const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
      const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;
      const { plans, transitions } = await createPlans(client, {
        releaseId, predecessorReleaseId, fingerprint, head, tree, catalogIds,
      });
      const correctedProjectSpecificCount = managed.filter((occurrence) =>
        PROJECT_SPECIFIC_ROLES.has(targetPolicy(
          String(occurrence.catalogId),
          String(occurrence.parameterId),
        ).valueSourceRole)).length;
      const preservedManagedNormCount = managed.length - correctedProjectSpecificCount;
      const managedKeys = new Set(managed.map((occurrence) =>
        `${occurrence.catalogId}\u0000${occurrence.parameterId}`));
      invariant(correctedProjectSpecificCount === 71 && preservedManagedNormCount === 0,
        `STOP_ASPHALT_SOURCE_OWNERSHIP_ROLE_DENOMINATOR:${correctedProjectSpecificCount}:${preservedManagedNormCount}`);
      const transitionCount = transitions.reduce(
        (sum, transition) => sum + transition.roleTransitions.filter(
          (roleTransition: Json) => managedKeys.has(
            `${transition.catalogId}\u0000${roleTransition.parameterId}`,
          ) && PROJECT_SPECIFIC_ROLES.has(roleTransition.newRole),
        ).length,
      0);
      const predecessorAlreadyClassified = pointedRelease.metadata?.contract
        === PREDECESSOR_OWNERSHIP_CONTRACT;
      invariant(predecessorAlreadyClassified && transitionCount === correctedProjectSpecificCount,
      `STOP_ASPHALT_SOURCE_OWNERSHIP_TRANSITION_DENOMINATOR:${transitionCount}:${predecessorAlreadyClassified}`);
      const publisherPreflight = {
        status: "GENERIC_CLAIM_OWNERSHIP_RECONCILED_FROM_PRIMARY_SOURCE_REVIEW",
        targetCount: plans.length,
        correctedProjectSpecificCount,
        roleTransitionsAppliedThisSuccessor: transitionCount,
        predecessorAlreadyClassified,
        preservedManagedNormCount,
        strictSourceClosurePreflightExecuted: true,
        claimApplicabilityReviewSha256: sha256(readFileSync(CLAIM_APPLICABILITY_REVIEW_PATH)),
        reason: "Direct review proves that the remaining generic crew-productivity and waste selectors are project/PPR or confirmed-supply refinements, not portable KRER constants. Exact KRER labor may be used only through a future exact matching table-variant binding; no runtime value is inserted here.",
      };
      const existing = (await client.query(
        "select status from public.estimate_definition_release where id=$1",
        [releaseId],
      )).rows[0] as Json | undefined;
      if (existing) {
        invariant(existing.status === "prepared",
          "STOP_ASPHALT_SOURCE_OWNERSHIP_EXISTING_SUCCESSOR_NOT_PREPARED");
        const audit = await auditCandidate(client, {
          releaseId, predecessorReleaseId, searchReleaseId, catalogIds,
        });
        receipt = {
          status: "GREEN_ASPHALT_SOURCE_OWNERSHIP_PREPARED_NOT_ACTIVE",
          idempotent: true,
          mutationPerformed: false,
          predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId },
          successor: { releaseId, searchReleaseId, releaseKey },
          transitions,
          publisherPreflight,
          audit,
        };
      } else {
        await client.query("begin");
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='900s'");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
        try {
          await client.query(`insert into public.estimate_definition_release(
              id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
              definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
              parameter_count,formula_count)
            select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count,
              metadata||$6::jsonb,$7,$8,parameter_count,formula_count
            from public.estimate_definition_release where id=$7`, [
            releaseId,
            releaseKey,
            head,
            tree,
            sha256(`${CONTRACT}:${fingerprint}:draft`),
            JSON.stringify({
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              sourceFingerprint: fingerprint,
              sourceHashes,
              lifecycle: "DRAFT_FORWARD_ONLY",
              searchReleaseId,
              replacedDefinitionCount: catalogIds.length,
              managedOccurrenceInputCount: managed.length,
              claimApplicabilityReviewSha256: sha256(readFileSync(CLAIM_APPLICABILITY_REVIEW_PATH)),
              activationAllowed: false,
              productionEligible: false,
            }),
            predecessorReleaseId,
            sha256({ contract: CONTRACT, fingerprint, sourceHashes }),
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
            releaseId, CONTRACT, predecessorReleaseId,
          ]);
          const publisherPersistedSelfAudit: Json[] = [];
          for (const [index, plan] of plans.entries()) {
            publisherPersistedSelfAudit.push(await publishCanonicalDefinitionDraft(client, plan));
            const transition = transitions[index]!;
            const update = await client.query(`update public.estimate_cumulative_manifest_entry set
                definition_version_id=$3,source_batch=$4,source_release_id=$1,
                publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
                baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
                runtime_publication_state='CANDIDATE'
              where release_id=$1 and catalog_id=$2`, [
              releaseId,
              transition.catalogId,
              transition.successorDefinitionId,
              CONTRACT,
              transition.successorBaselineId,
              plan.definition.definition_sha256,
              sha256({
                contract: CONTRACT,
                releaseId,
                catalogId: transition.catalogId,
                definitionId: transition.successorDefinitionId,
                baselineId: transition.successorBaselineId,
                definitionSha256: plan.definition.definition_sha256,
              }),
            ]);
            invariant(update.rowCount === 1,
              `STOP_ASPHALT_SOURCE_OWNERSHIP_MANIFEST_UPDATE:${transition.catalogId}`);
          }
          const search = await cloneSearch(client, {
            releaseId, searchReleaseId, parentSearchReleaseId: predecessorSearchReleaseId,
            releaseKey, head, tree, fingerprint,
          });
          const draftAudit = await auditCandidate(client, {
            releaseId, predecessorReleaseId, searchReleaseId, catalogIds,
          });
          const prepared = await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId,
            draftAudit.manifest.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: search.snapshot_sha256,
              sourceOwnershipTargetCount: catalogIds.length,
              sourceOwnershipTransitionCount: transitions.reduce(
                (sum, transition) => sum + transition.roleTransitions.length, 0),
            }),
          ]);
          invariant(prepared.rowCount === 1,
            "STOP_ASPHALT_SOURCE_OWNERSHIP_PREPARED_TRANSITION");
          const terminalAudit = await auditCandidate(client, {
            releaseId, predecessorReleaseId, searchReleaseId, catalogIds,
          });
          invariant(terminalAudit.release.status === "prepared"
            && terminalAudit.release.activated_at == null,
          `STOP_ASPHALT_SOURCE_OWNERSHIP_TERMINAL_LIFECYCLE:${JSON.stringify(terminalAudit.release)}`);
          if (APPLY) await client.query("commit");
          else await client.query("rollback");
          receipt = {
            status: APPLY
              ? "GREEN_ASPHALT_SOURCE_OWNERSHIP_PREPARED_NOT_ACTIVE"
              : "DRY_RUN_ASPHALT_SOURCE_OWNERSHIP_VALIDATED",
            idempotent: false,
            mutationPerformed: APPLY,
            predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId },
            successor: { releaseId, searchReleaseId, releaseKey },
            transitions,
            publisherPreflight,
            publisherPersistedSelfAudit,
            audit: terminalAudit,
          };
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
        if (!APPLY) {
          const residue = Number((await client.query(`select
              (select count(*) from public.estimate_definition_release where id=$1)+
              (select count(*) from public.estimate_search_index_release where id=$2) value`, [
            releaseId, searchReleaseId,
          ])).rows[0].value);
          invariant(residue === 0, `STOP_ASPHALT_SOURCE_OWNERSHIP_DRY_RUN_RESIDUE:${residue}`);
          receipt.dryRunResidue = residue;
        }
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
      sourceHashes,
      hashedDirtySourceAccepted: dirtySourcePaths.length > 0 && ALLOW_HASHED_DIRTY_SOURCE,
    },
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    inputLedger: {
      path: SOURCE_GAP_LEDGER_PATH.replaceAll("\\", "/"),
      sha256: sha256(readFileSync(SOURCE_GAP_LEDGER_PATH)),
      managedWorkCount: catalogIds.length,
      managedOccurrenceCount: managed.length,
    },
    claimApplicabilityReview: {
      path: CLAIM_APPLICABILITY_REVIEW_PATH.replaceAll("\\", "/"),
      sha256: sha256(readFileSync(CLAIM_APPLICABILITY_REVIEW_PATH)),
      sourceArtifactSha256: String(claimApplicabilityReview.source.sha256),
    },
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && (receipt!.mutationPerformed === true || receipt!.idempotent === true)) {
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: receipt!.successor.releaseId,
      searchReleaseId: receipt!.successor.searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      owner: "R4_A13_6_ASPHALT_SOURCE_OWNERSHIP_SUCCESSOR_V3",
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
