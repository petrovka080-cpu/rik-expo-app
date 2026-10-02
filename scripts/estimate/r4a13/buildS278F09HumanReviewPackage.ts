import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { Client } from "pg";

import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalApprovedBaselineRuntimeParameters } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import { isCatalogFirstEstimateKnownGeometryParameter } from "./catalogFirstEstimateMinimumInputAudit.shared";

type Json = Record<string, any>;

const ROOT = resolve(".");
const MASTER_PATH = resolve(
  process.env.S278_F09_HUMAN_REVIEW_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (54).md",
);
const EXPECTED_MASTER_SHA256 = process.env.S278_F09_HUMAN_REVIEW_MASTER_SHA256
  ?? "bcf902aeff445391e4661df1dfb92aab19d522d4619318136154340b1bbbacbc";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  process.env.S278_F09_HUMAN_REVIEW_INVENTORY_PATH
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/01_inventory.json",
);
const OUTPUT_ROOT = resolve(
  process.env.S278_F09_HUMAN_REVIEW_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-9/p6/human-review/f09-current-release-v3",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CANDIDATE_CONTRACT = "real-useful-estimates.technology-passport-candidate-r2.v1";
const ACCEPTANCE_CONTRACT = "real-useful-estimates.technology-passport-human-acceptance-r3.v1";
const CONTRACT = "rik-expo-app.s27-9.f09-human-engineering-review-package.v3";

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

function sha256(value: Buffer | string | unknown): string {
  const input = Buffer.isBuffer(value) || typeof value === "string"
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(input).digest("hex");
}

function fileSha256(path: string): string {
  return sha256(readFileSync(path));
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.pending-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(stable(value), null, 2)}\n`);
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(
    ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S278_F09_REVIEW_DATABASE_NOT_LOOPBACK:${parsed.hostname}`,
  );
  invariant(
    parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S278_F09_REVIEW_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`,
  );
}

function groupBy<T extends Json>(rows: T[], field: string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = String(row[field]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function compileError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "UNKNOWN");
  }
  return String(error instanceof Error ? error.message : error).slice(0, 500);
}

function markdownEscape(value: unknown): string {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/gu, " ");
}

function conditionMatches(raw: unknown, values: Json): boolean {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return false;
  try {
    return evaluateInclusionGraph(raw as never, values);
  } catch {
    return false;
  }
}

function minimumBoundaryInput(
  parameters: readonly (CanonicalEstimateParameterDefinition & Json)[],
): { values: Json; provenance: Json[]; unresolved: string[] } {
  const values: Json = {};
  const provenance: Json[] = [];
  const unresolved: string[] = [];

  for (const parameter of parameters) {
    const id = String(parameter.parameter_id);
    const constraints = parameter.constraints_json ?? {};
    if (parameter.default_value != null) {
      values[id] = parameter.default_value;
      provenance.push({ parameterId: id, basis: "DECLARED_DEFAULT", value: parameter.default_value });
    } else if (parameter.value_type === "enum" && Array.isArray(constraints.values)
      && constraints.values.length > 0) {
      values[id] = constraints.values[0];
      provenance.push({ parameterId: id, basis: "FIRST_DECLARED_ENUM_BOUNDARY", value: values[id] });
    } else if (parameter.value_type === "boolean") {
      values[id] = false;
      provenance.push({ parameterId: id, basis: "BOOLEAN_FALSE_BOUNDARY", value: false });
    }
  }

  for (const parameter of parameters) {
    const id = String(parameter.parameter_id);
    if (Object.prototype.hasOwnProperty.call(values, id)) continue;
    const constraints = parameter.constraints_json ?? {};
    if (conditionMatches(constraints.forbiddenWhen, values)) {
      provenance.push({ parameterId: id, basis: "OMITTED_BY_DECLARED_FORBIDDEN_WHEN" });
      continue;
    }
    if (parameter.value_type === "decimal" || parameter.value_type === "integer") {
      if (constraints.min == null) {
        unresolved.push(id);
        continue;
      }
      values[id] = Number(constraints.min);
      provenance.push({ parameterId: id, basis: "DECLARED_MIN_BOUNDARY", value: values[id] });
      continue;
    }
    if (parameter.value_type === "text") {
      const minimumLength = Math.max(1, Number(constraints.minLength ?? 1));
      values[id] = "X".repeat(minimumLength);
      provenance.push({
        parameterId: id,
        basis: "SYNTHETIC_MIN_LENGTH_PLACEHOLDER_NOT_PROJECT_FACT",
        value: values[id],
      });
      continue;
    }
    unresolved.push(id);
  }
  return { values, provenance, unresolved: [...new Set(unresolved)].sort() };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S278_F09_REVIEW_WRONG_BRANCH");
  invariant(fileSha256(MASTER_PATH) === EXPECTED_MASTER_SHA256, "STOP_S278_F09_REVIEW_MASTER_DRIFT");

  const currentRelease = readJson(CURRENT_RELEASE_PATH);
  const releaseId = String(currentRelease.definitionReleaseId ?? "");
  invariant(/^[0-9a-f-]{36}$/u.test(releaseId), "STOP_S278_F09_REVIEW_RELEASE_ID_INVALID");
  const inventory = readJson(INVENTORY_PATH);
  invariant(inventory.release?.id === releaseId, "STOP_S278_F09_REVIEW_INVENTORY_RELEASE_STALE");
  const catalogIds = [...(inventory.fireFamily?.sourceBackedSuccessorCatalogIds ?? [])].map(String).sort();
  invariant(catalogIds.length === 68, `STOP_S278_F09_REVIEW_DENOMINATOR:${catalogIds.length}`);
  invariant(new Set(catalogIds).size === catalogIds.length, "STOP_S278_F09_REVIEW_DUPLICATE_IDS");

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query<Json>(
      `select id::text,release_key,status,activated_at,definition_count,parent_release_id::text
       from public.estimate_definition_release where id=$1::uuid`,
      [releaseId],
    )).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S278_F09_REVIEW_RELEASE_NOT_PREPARED_INACTIVE");

    const definitions = (await client.query<Json>(
      `select manifest.catalog_id,manifest.definition_version_id::text,
          manifest.domain_id,manifest.source_batch,manifest.publication_state,
          manifest.runtime_publication_state,manifest.approved_template_baseline_id::text,
          identity.title_ru,definition.definition_version,definition.passport,
          definition.applicability,definition.definition_sha256,definition.source_metadata,
          definition.content_status,definition.content_gate_status,
          public.estimate_technology_passport_any_exact_accepted_r3(definition.id)
            exact_human_accepted,
          content.physical_result_ru,content.included_scope_ru,content.excluded_scope_ru,
          content.capability_matrix,content.payload_sha256 content_passport_sha256,
          baseline.input_values,baseline.input_classification,
          baseline.validation_scenario_refs,baseline.acceptance_evidence_sha256
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
       join public.estimate_content_passport_r3 content
         on content.definition_version_id=definition.id
       join public.estimate_approved_template_baseline baseline
         on baseline.id=manifest.approved_template_baseline_id
       where manifest.release_id=$1::uuid and manifest.catalog_id=any($2::text[])
       order by manifest.catalog_id`,
      [releaseId, catalogIds],
    )).rows;
    invariant(definitions.length === 68, `STOP_S278_F09_REVIEW_DEFINITION_COUNT:${definitions.length}`);
    const definitionIds = definitions.map((row) => String(row.definition_version_id));

    const parameters = (await client.query<CanonicalEstimateParameterDefinition & Json>(
        `select * from public.estimate_parameter_definition
         where definition_version_id=any($1::uuid[])
         order by definition_version_id,ordinal`,
        [definitionIds],
      )).rows;
    const formulas = (await client.query<CanonicalEstimateFormulaDefinition & Json>(
        `select definition_version_id::text,formula_id,output_unit_id,expression_source,ast,
            input_parameter_ids,ast_sha256
         from public.estimate_formula_graph
         where definition_version_id=any($1::uuid[])
         order by definition_version_id,formula_id`,
        [definitionIds],
      )).rows;
    const resources = (await client.query<CanonicalEstimateResourceDefinition & Json>(
        `select resource.*,
            coalesce(price_binding.price_keys,'{}'::text[]) _binding_price_keys
         from public.estimate_resource_spec resource
         left join lateral (
           select array_agg(distinct binding.price_key order by binding.price_key) price_keys
           from public.estimate_resource_price_route_binding binding
           where binding.resource_spec_id=resource.id
         ) price_binding on true
         where resource.definition_version_id=any($1::uuid[])
         order by resource.definition_version_id,resource.ordinal`,
        [definitionIds],
      )).rows;
    const bindings = (await client.query<Json>(
        `select binding.definition_version_id::text,resource.row_id,resource.formula_id,
            source.source_key,source.title_ru source_title_ru,source.authority,
            source.official_url,source.artifact_sha256,source.metadata source_metadata,
            locator.locator_key,locator.locator,locator.excerpt_sha256,binding.applicability
         from public.estimate_work_normative_binding binding
         join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
         join public.estimate_normative_locator locator on locator.id=binding.locator_id
         join public.estimate_normative_source source on source.id=locator.source_id
         where binding.definition_version_id=any($1::uuid[])
         order by binding.definition_version_id,resource.ordinal,source.source_key,locator.locator_key`,
        [definitionIds],
      )).rows;
    const candidates = (await client.query<Json>(
        `select tenant_id::text,definition_version_id::text,catalog_id,technology_variant_id,
            contract_version,definition_sha256,passport_content_sha256,source_set_sha256,
            author_id::text,author_audit_identity,author_role,authorship_origin,
            author_created_by_agent,engineering_scope,status
         from public.estimate_technology_passport_r3
         where release_id=$1::uuid and catalog_id=any($2::text[])
         order by catalog_id,tenant_id,technology_variant_id`,
        [releaseId, catalogIds],
      )).rows;
    const acceptances = (await client.query<Json>(
        `select distinct on (tenant_id,definition_version_id,technology_variant_id)
            tenant_id::text,definition_version_id::text,catalog_id,technology_variant_id,
            decision_sequence,contract_version,definition_sha256,passport_content_sha256,
            source_set_sha256,author_id::text,reviewer_id::text,reviewer_role,
            reviewer_scope,decision,review_comment,signature_or_audit_id,
            acceptance_origin,created_by_agent,decided_at_utc,manifest_sha256
         from public.estimate_technology_passport_acceptance_r3
         where release_id=$1::uuid and catalog_id=any($2::text[])
         order by tenant_id,definition_version_id,technology_variant_id,decision_sequence desc`,
        [releaseId, catalogIds],
      )).rows;
    const authorizations = (await client.query<Json>(
        `select tenant_id::text,engineer_user_id::text,reviewer_scope,authorization_event,
            signature_or_audit_id,decided_at_utc,event_sequence
         from public.estimate_technology_engineer_authorization_r3
         order by tenant_id,engineer_user_id,reviewer_scope,event_sequence`,
      )).rows;

    const parameterGroups = groupBy(parameters, "definition_version_id");
    const formulaGroups = groupBy(formulas, "definition_version_id");
    const resourceGroups = groupBy(resources, "definition_version_id");
    const bindingGroups = groupBy(bindings, "definition_version_id");
    const candidateGroups = groupBy(candidates, "definition_version_id");
    const acceptanceGroups = groupBy(acceptances, "definition_version_id");

    const packets: Json[] = [];
    for (const definition of definitions) {
      const definitionId = String(definition.definition_version_id);
      const definitionParameters = parameterGroups.get(definitionId) ?? [];
      const definitionFormulas = formulaGroups.get(definitionId) ?? [];
      const definitionResources = resourceGroups.get(definitionId) ?? [];
      const definitionBindings = bindingGroups.get(definitionId) ?? [];
      const boundResources = bindCanonicalEstimateResourcePriceKeys(
        definitionResources,
        definitionResources.flatMap((resource) =>
          ((resource as Json)._binding_price_keys as string[]).map((priceKey) => ({
            resource_spec_id: String(resource.id),
            price_key: String(priceKey),
          }))),
      );
      const approvedBaseline = definition.input_values ?? {};
      const confirmedParameters = canonicalApprovedBaselineRuntimeParameters({
        input_values: approvedBaseline,
        input_classification: definition.input_classification ?? {},
      });
      const approvedGeometryInputs = Object.fromEntries(definitionParameters.flatMap((parameter) => {
        const parameterId = String(parameter.parameter_id);
        const value = approvedBaseline[parameterId];
        return isCatalogFirstEstimateKnownGeometryParameter(parameter, value)
          ? [[parameterId, value]]
          : [];
      }));
      const boundaryInput = minimumBoundaryInput(definitionParameters);
      invariant(boundaryInput.unresolved.length === 0,
        `STOP_S278_F09_REVIEW_MINIMUM_INPUT_UNRESOLVED:${definition.catalog_id}:${boundaryInput.unresolved.join(",")}`);
      const minimumSubmittedParameters = {
        ...boundaryInput.values,
        ...approvedGeometryInputs,
      };

      let firstCalculation: Json;
      try {
        const compiled = await compileCanonicalEstimateCore({
          operation: "compile",
          compilerVersion: "s27-9-f09-human-review-package-v3",
          catalogId: String(definition.catalog_id),
          primaryMeasureParameterId: null,
          parameterDefinitions: definitionParameters,
          formulaDefinitions: definitionFormulas,
          resourceDefinitions: boundResources,
          submittedParameters: minimumSubmittedParameters,
          confirmedParameters,
          currencyCode: "KGS",
          priceSnapshotIds: [],
          priceItems: [],
          rowOverrides: {},
          customRows: [],
          maximumResourceRows: 5_000,
          hashJson: sha256,
        });
        firstCalculation = {
          status: "COMPILED_FROM_APPROVED_MINIMUM_INPUT_PROJECTION",
          inputKind: "DECLARED_CONSTRAINT_BOUNDARY_WITH_APPROVED_GEOMETRY_OVERRIDE",
          isProjectAssertion: false,
          submittedMinimumInputs: minimumSubmittedParameters,
          inputProvenance: boundaryInput.provenance,
          approvedGeometryOverrides: approvedGeometryInputs,
          confirmedManagedBaselineInputs: confirmedParameters,
          effectiveParameters: compiled.parameters,
          calculatedRowCount: compiled.rows.length,
          preliminaryNeedCount: compiled.preliminaryNeeds.length,
          rows: compiled.rows.map((row) => ({
            rowId: row.row_id,
            titleRu: row.title_ru,
            rowType: row.row_type,
            formulaId: row.formula_id,
            quantity: row.quantity,
            unitId: row.unit_id,
            includedInEstimate: row.included_in_estimate,
            includedInProcurement: row.included_in_procurement,
            calculationTrace: row.calculation_trace,
          })),
          preliminaryNeeds: compiled.preliminaryNeeds.map((need) => ({
            rowId: need.row_id,
            titleRu: need.title_ru,
            quantity: need.quantity,
            unitId: need.unit_id,
            needState: need.need_state,
            missingParameterIds: need.missing_parameter_ids,
          })),
          totalsWithoutPriceSnapshot: compiled.totals,
        };
      } catch (error) {
        firstCalculation = {
          status: "FAILED",
          errorCode: compileError(error),
          inputKind: "DECLARED_CONSTRAINT_BOUNDARY_WITH_APPROVED_GEOMETRY_OVERRIDE",
          isProjectAssertion: false,
          submittedMinimumInputs: minimumSubmittedParameters,
          inputProvenance: boundaryInput.provenance,
          approvedGeometryOverrides: approvedGeometryInputs,
          confirmedManagedBaselineInputs: confirmedParameters,
        };
      }

      const durableSources = definitionBindings.map((binding) => ({
        rowId: binding.row_id,
        formulaId: binding.formula_id,
        sourceKey: binding.source_key,
        sourceTitleRu: binding.source_title_ru,
        authority: binding.authority,
        officialUrl: binding.official_url,
        artifactSha256: binding.artifact_sha256,
        locatorKey: binding.locator_key,
        exactLocator: binding.locator,
        excerptSha256: binding.excerpt_sha256,
        applicability: binding.applicability,
        projectSourcePackage: binding.source_metadata?.projectSourcePackage ?? null,
      }));
      const rowsWithoutArtifact = [...new Set(durableSources
        .filter((source) => source.artifactSha256 == null || source.excerptSha256 == null)
        .map((source) => String(source.rowId)))].sort();
      const definitionCandidates = candidateGroups.get(definitionId) ?? [];
      const definitionAcceptances = acceptanceGroups.get(definitionId) ?? [];
      const exactHumanAccepted = definition.exact_human_accepted === true;
      const packetStatus = rowsWithoutArtifact.length > 0
          ? "REVIEW_INPUT_READY_OFFICIAL_SOURCE_ARTIFACT_RETRIEVAL_REQUIRED"
        : exactHumanAccepted
          ? "HUMAN_ACCEPTANCE_PRESENT"
          : "REVIEW_INPUT_READY_HUMAN_AUTHOR_AND_REVIEWER_REQUIRED";

      packets.push({
        schemaVersion: "rik-expo-app.s27-8.f09-human-engineering-review-item.v2",
        status: packetStatus,
        catalogId: definition.catalog_id,
        titleRu: definition.title_ru,
        definitionVersionId: definitionId,
        definitionVersion: definition.definition_version,
        definitionSha256: definition.definition_sha256,
        sourceBatch: definition.source_batch,
        releaseState: {
          publicationState: definition.publication_state,
          runtimePublicationState: definition.runtime_publication_state,
          contentStatus: definition.content_status,
          contentGateStatus: definition.content_gate_status,
        },
        applicability: definition.applicability,
        contentPassport: {
          sha256: definition.content_passport_sha256,
          physicalResultRu: definition.physical_result_ru,
          includedScopeRu: definition.included_scope_ru,
          excludedScopeRu: definition.excluded_scope_ru,
          capabilityMatrix: definition.capability_matrix,
        },
        parameters: definitionParameters.map((parameter) => ({
          parameterId: parameter.parameter_id,
          ordinal: parameter.ordinal,
          titleRu: parameter.title_ru,
          valueType: parameter.value_type,
          unitId: parameter.unit_id,
          required: parameter.required,
          defaultValue: parameter.default_value,
          constraints: parameter.constraints_json,
          truthMetadata: (parameter as Json).truth_metadata,
        })),
        formulasWithUnits: definitionFormulas.map((formula) => ({
          formulaId: formula.formula_id,
          outputUnitId: (formula as Json).output_unit_id,
          expression: (formula as Json).expression_source,
          inputParameterIds: formula.input_parameter_ids,
          astSha256: formula.ast_sha256,
        })),
        independentComposition: definitionResources.map((resource) => ({
          rowId: resource.row_id,
          ordinal: resource.ordinal,
          section: resource.section,
          category: resource.category,
          rowType: resource.row_type,
          titleRu: resource.title_ru,
          unitId: resource.unit_id,
          formulaId: resource.formula_id,
          inclusionAst: resource.inclusion_ast,
          resourceGraph: resource.resource_graph,
          procurementEligible: resource.procurement_eligible,
          costOwnerId: resource.cost_owner_id,
          priceKeys: (resource as Json)._binding_price_keys,
          rowSha256: resource.row_sha256,
        })),
        durableSourceAndExactNumericLocators: durableSources,
        sourceReview: {
          durableBindingCount: durableSources.length,
          artifactAndExcerptBackedBindingCount: durableSources.filter((source) =>
            source.artifactSha256 != null && source.excerptSha256 != null).length,
          rowsRequiringOfficialSourceArtifactRetrieval: rowsWithoutArtifact,
          automaticHttpAvailabilityIsNotAcceptance: true,
        },
        firstCalculationAtMinimumInput: firstCalculation,
        currentHumanWorkflowState: {
          technologyPassportCandidates: definitionCandidates,
          activeAcceptanceDecisions: definitionAcceptances,
          acceptedDecisionCount: exactHumanAccepted ? 1 : 0,
          exactCurrentHumanAcceptancePresent: exactHumanAccepted,
          latestDecisionSemantics: true,
          agentCreatedAcceptanceCount: definitionAcceptances.filter((row) => row.created_by_agent !== false).length,
        },
        unsignedHumanWorkflowTemplate: {
          candidateContract: CANDIDATE_CONTRACT,
          acceptanceContract: ACCEPTANCE_CONTRACT,
          tenantId: null,
          technologyVariantId: null,
          authorId: null,
          authorAuditIdentity: null,
          authorRole: "ENGINEER",
          authorshipOrigin: "HUMAN_ENGINEERING_WORKFLOW",
          authorCreatedByAgent: false,
          reviewerId: null,
          reviewerRole: "engineer",
          reviewerScope: null,
          decision: null,
          reviewComment: null,
          signatureOrAuditId: null,
          acceptanceOrigin: "HUMAN_SIGNED_AUDIT",
          createdByAgent: false,
          authorMustDifferFromReviewer: true,
        },
        exactReviewerQuestionRu: [
          `Подтверждаете ли вы как назначенный независимый инженер применимость паспорта «${definition.title_ru}»`,
          `(${definition.catalog_id}, definition ${definition.definition_sha256}) для указанной области применения,`,
          "включая независимый состав ресурсов, числовые нормы и их точные source locators, формулы и единицы,",
          "первый расчёт на минимальном входе, условия включения и перечисленные исключения?",
          "Зафиксируйте ACCEPTED, NEEDS_CHANGES или REJECTED, предметный комментарий и реальный signature/audit ID.",
        ].join(" "),
        decisionBoundary: {
          humanAcceptanceRequiredFor: "NORMATIVE_OR_CONTRACTUAL_TECHNOLOGY_PASSPORT_ADMISSION",
          humanAcceptanceNotFabricatedFor: "PREPARED_INACTIVE_PRELIMINARY_RUNTIME_VERIFICATION",
          promotionAllowedNow: exactHumanAccepted && rowsWithoutArtifact.length === 0,
          productionOrActivationAllowedByThisPackage: false,
        },
      });
    }

    const failedCalculations = packets.filter((packet) =>
      packet.firstCalculationAtMinimumInput.status === "FAILED");
    const preliminaryCalculations = packets.filter((packet) =>
      Number(packet.firstCalculationAtMinimumInput.preliminaryNeedCount ?? 0) > 0);
    const missingArtifactPackets = packets.filter((packet) =>
      packet.sourceReview.rowsRequiringOfficialSourceArtifactRetrieval.length > 0);
    const acceptedPackets = packets.filter((packet) =>
      packet.currentHumanWorkflowState.acceptedDecisionCount > 0);
    invariant(definitions.every((definition) => catalogIds.includes(String(definition.catalog_id))),
      "STOP_S278_F09_REVIEW_SCOPE_DRIFT");

    const generatedAtUtc = new Date().toISOString();
    const packageWithoutHash = {
      schemaVersion: CONTRACT,
      generatedAtUtc,
      status: failedCalculations.length === 0 && preliminaryCalculations.length === 0
        ? "GREEN_REVIEW_INPUT_PACKAGE_READY_HUMAN_DECISIONS_PENDING"
        : "RED_REVIEW_INPUT_PACKAGE_CALCULATION_GAPS",
      source: {
        branch: git("branch", "--show-current"),
        head: git("rev-parse", "HEAD"),
        productTree: git("write-tree"),
        masterPath: MASTER_PATH,
        masterSha256: fileSha256(MASTER_PATH),
        currentReleasePath: repoPath(CURRENT_RELEASE_PATH),
        inventoryPath: repoPath(INVENTORY_PATH),
        inventorySha256: fileSha256(INVENTORY_PATH),
      },
      release,
      contractFinding: {
        definitionsInScope: 68,
        humanAcceptanceRequiredDefinitions: 68,
        reason: "All 68 are new current-lineage F09 technology definitions. Normative or contractual technology-passport admission is governed by the R3 append-only human engineering workflow; preliminary prepared/inactive runtime verification does not create that signature.",
        author: {
          role: "ENGINEER",
          origin: "HUMAN_ENGINEERING_WORKFLOW",
          createdByAgent: false,
        },
        reviewer: {
          role: "engineer",
          mustBeTenantAuthorizedForScope: true,
          mustDifferFromAuthor: true,
          acceptanceOrigin: "HUMAN_SIGNED_AUDIT",
          createdByAgent: false,
        },
      },
      totals: {
        packets: packets.length,
        firstCalculationsCompiled: packets.length - failedCalculations.length,
        firstCalculationsWithNoPreliminaryNeeds: packets.length - preliminaryCalculations.length,
        definitionsWithArtifactAndExcerptGaps: missingArtifactPackets.length,
        technologyPassportCandidatesPresent: candidates.length,
        activeAcceptanceDecisionsPresent: acceptances.length,
        humanAccepted: acceptedPackets.length,
        authorizationEventsObservedAcrossLocalDatabase: authorizations.length,
      },
      externalDecisionsRequired: {
        tenantAndEngineeringScope: "Choose the real tenant and scope; the agent may not invent them.",
        humanAuthor: "An identified human ENGINEER must author/attest each candidate and its source claims.",
        independentReviewer: "A different tenant-authorized engineer must decide each exact hash-bound candidate.",
        officialSourceRetrieval: missingArtifactPackets.map((packet) => ({
          catalogId: packet.catalogId,
          rows: packet.sourceReview.rowsRequiringOfficialSourceArtifactRetrieval,
        })),
      },
      databaseWrites: 0,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      releasePerformed: false,
      acceptancesFabricated: 0,
      packets,
    };
    const packagePayloadSha256 = sha256(packageWithoutHash);
    const output = { ...packageWithoutHash, packagePayloadSha256 };
    const outputPath = resolve(OUTPUT_ROOT, "review-package.json");
    atomicJson(outputPath, output);

    const indexPath = resolve(OUTPUT_ROOT, "REVIEW_INDEX.md");
    const markdown = [
      "# S27.9 F09 — пакет инженерной предметной приёмки",
      "",
      `Статус: **${output.status}**. Это вход для реального human review, а не подпись и не разрешение production/activation.`,
      "",
      `Release: \`${releaseId}\` (prepared, inactive). F09: ${packets.length}. Human accepted: ${acceptedPackets.length}.`,
      `Первый расчёт без preliminary needs: ${packets.length - preliminaryCalculations.length}/${packets.length}.`,
      `Определения без полного artifact+excerpt backing хотя бы для одной строки: ${missingArtifactPackets.length}.`,
      "",
      "## Кто уполномочен",
      "",
      "Кандидат создаётся реальным автором с ролью ENGINEER и origin HUMAN_ENGINEERING_WORKFLOW. Решение принимает другой инженер, имеющий действующее tenant/scope authorization; требуется HUMAN_SIGNED_AUDIT, предметный комментарий и реальный signature/audit ID. Агент не вправе заполнять эти поля.",
      "",
      "## Реестр вопросов",
      "",
      "| Catalog ID | Работа | Источники | Artifact gap rows | Расчёт | Вопрос |",
      "|---|---|---:|---:|---|---|",
      ...packets.map((packet) => [
        markdownEscape(packet.catalogId),
        markdownEscape(packet.titleRu),
        packet.sourceReview.durableBindingCount,
        packet.sourceReview.rowsRequiringOfficialSourceArtifactRetrieval.length,
        markdownEscape(packet.firstCalculationAtMinimumInput.status),
        markdownEscape(packet.exactReviewerQuestionRu),
      ].join(" | ").replace(/^/u, "|").replace(/$/u, "|")),
      "",
      `JSON package payload SHA-256: \`${packagePayloadSha256}\``,
      "",
    ].join("\n");
    atomicWrite(indexPath, markdown);

    const receipt = {
      schemaVersion: "rik-expo-app.s27-9.f09-human-engineering-review-package-receipt.v3",
      generatedAtUtc,
      status: output.status,
      releaseId,
      package: { path: repoPath(outputPath), sha256: fileSha256(outputPath), payloadSha256: packagePayloadSha256 },
      index: { path: repoPath(indexPath), sha256: fileSha256(indexPath) },
      totals: output.totals,
      databaseWrites: 0,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      acceptancesFabricated: 0,
    };
    const receiptPath = resolve(OUTPUT_ROOT, "receipt.json");
    atomicJson(receiptPath, receipt);
    process.stdout.write(`${JSON.stringify({ ...receipt, receipt: {
      path: repoPath(receiptPath),
      sha256: fileSha256(receiptPath),
    } }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
