import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreInput,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalApprovedBaselineRuntimeParameters } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  canonicalEstimateParameterRequiresManagedProfessionalSource,
  isCanonicalEstimateConsumerSuppliedParameter,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import {
  isCatalogFirstEstimateKnownGeometryParameter,
  isCatalogFirstEstimateProjectSpecificRefinementParameter,
  sourceBackedPhysicalNormOutputParameterIds,
} from "./catalogFirstEstimateMinimumInputAudit.shared";
import { resolveCatalogRefinementFixture } from "./catalogFirstEstimateRefinementFixture";

type Json = Record<string, any>;

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "ff3c6007-a1ec-5bfe-863b-d1a7c294ccbc";
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/catalog-minimum-input-audit-v1");
const BATCH_SIZE = 40;
const CONTRACT = "rik-expo-app.r4-a13-6.catalog-minimum-input-audit.v1";

const EXPERT_INPUT = /(?:productivity|consumption|worker[_-]?h|labou?r|machine[_-]?h|norm|(?:^|_)rate(?:_|$)|factor|coefficient|dosage|coverage|kg_per|l_per|m2_per|m3_per|per_m2|per_m3|per_item)/iu;
const PROFESSIONAL_TITLE = /(?:расход|производительност|трудозатрат|человеко.?час|машино.?час|коэффициент|норм[аы]|на\s+1\s+(?:м|шт|т))/iu;

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`CATALOG_MINIMUM_INPUT_AUDIT:${code}`);
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, value, "utf8");
  renameSync(pending, path);
}

function isExpertParameter(parameter: Json): boolean {
  const parameterId = String(parameter.parameter_id ?? "");
  const titleRu = String(parameter.title_ru ?? "");
  return EXPERT_INPUT.test(parameterId) || PROFESSIONAL_TITLE.test(titleRu);
}

function errorCode(error: unknown): string {
  if (error != null && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "UNKNOWN");
  }
  return String(error instanceof Error ? error.message : error).slice(0, 500);
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(
      `select id::text,status,activated_at,parent_release_id::text
       from public.estimate_definition_release where id=$1`,
      [RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release?.activated_at == null,
      "RELEASE_MUST_REMAIN_PREPARED_AND_INACTIVE");

    const definitions = (await client.query(
      `select manifest.catalog_id,manifest.definition_version_id::text definition_version_id,
        manifest.approved_template_baseline_id::text approved_template_baseline_id,
        manifest.domain_id,manifest.source_batch,definition.definition_version,
        definition.passport,identity.title_ru,
        coalesce(baseline.input_values,'{}'::jsonb) input_values,
        coalesce(baseline.input_classification,'{}'::jsonb) input_classification,
        baseline.validation_scenario_refs,baseline.acceptance_evidence_sha256
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
       join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
       join public.estimate_approved_template_baseline baseline
         on baseline.id=manifest.approved_template_baseline_id
       where manifest.release_id=$1 and manifest.baseline_ready and manifest.scenario_ready
       order by manifest.catalog_id`,
      [RELEASE_ID],
    )).rows as Json[];
    invariant(definitions.length > 0, "EMPTY_CUMULATIVE_MANIFEST");

    const outcomes: Json[] = [];
    for (let offset = 0; offset < definitions.length; offset += BATCH_SIZE) {
      const batch = definitions.slice(offset, offset + BATCH_SIZE);
      const definitionIds = batch.map((entry) => entry.definition_version_id);
      const parameters = (await client.query(
        `select * from public.estimate_parameter_definition
         where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal`,
        [definitionIds],
      )).rows as (CanonicalEstimateParameterDefinition & Json)[];
      const formulas = (await client.query(
        `select definition_version_id::text,formula_id,ast,input_parameter_ids,ast_sha256
         from public.estimate_formula_graph where definition_version_id=any($1::uuid[])
         order by definition_version_id,formula_id`,
        [definitionIds],
      )).rows as (CanonicalEstimateFormulaDefinition & Json)[];
      const resources = (await client.query(
        `select resource.*,
          coalesce(binding.price_keys,'{}'::text[]) _binding_price_keys
         from public.estimate_resource_spec resource
         left join lateral (
           select array_agg(distinct route.price_key order by route.price_key) price_keys
           from public.estimate_resource_price_route_binding route
           where route.resource_spec_id=resource.id
         ) binding on true
         where resource.definition_version_id=any($1::uuid[])
         order by resource.definition_version_id,resource.ordinal`,
        [definitionIds],
      )).rows as (CanonicalEstimateResourceDefinition & Json & {
        _binding_price_keys: string[];
      })[];

      for (const definition of batch) {
        const definitionId = String(definition.definition_version_id);
        const definitionParameters = parameters.filter((entry) => String(entry.definition_version_id) === definitionId);
        const definitionFormulas = formulas.filter((entry) => String(entry.definition_version_id) === definitionId);
        const definitionResources = resources.filter((entry) => String(entry.definition_version_id) === definitionId);
        const boundResources = bindCanonicalEstimateResourcePriceKeys(
          definitionResources,
          definitionResources.flatMap((resource) => (resource._binding_price_keys as string[]).map((priceKey) => ({
            resource_spec_id: String(resource.id),
            price_key: String(priceKey),
          }))),
        );
        const runtimeBaseline = canonicalApprovedBaselineRuntimeParameters({
          input_values: definition.input_values,
          input_classification: definition.input_classification,
        });
        const geometryInputs = Object.fromEntries(definitionParameters.flatMap((parameter) => {
          const parameterId = String(parameter.parameter_id);
          const fixtureValue = definition.input_values?.[parameterId];
          return isCatalogFirstEstimateKnownGeometryParameter(parameter, fixtureValue)
            ? [[parameterId, fixtureValue]]
            : [];
        }));
        const declaredRefinementFixture = resolveCatalogRefinementFixture({
          catalogId: String(definition.catalog_id),
          validationScenarioRefs: definition.validation_scenario_refs,
          acceptanceEvidenceSha256: definition.acceptance_evidence_sha256,
        });
        const refinementControlInputs = {
          ...definition.input_values,
          ...(declaredRefinementFixture?.parameters ?? {}),
        };
        for (const parameter of definitionParameters) {
          const parameterId = String(parameter.parameter_id);
          if (refinementControlInputs[parameterId] != null) continue;
          const values = Array.isArray(parameter.constraints_json?.values)
            ? parameter.constraints_json.values.map(String)
            : [];
          const explicitControlValue = [
            "NOT_REQUIRED",
            "NOT_APPLICABLE",
            "INCLUDED_IN_CONTRACTOR_SCOPE",
            "INCLUDED_IN_ACCESS_SYSTEM",
            "NOT_REQUIRED_BY_SELECTED_SYSTEM",
          ].find((value) => values.includes(value));
          if (explicitControlValue != null) refinementControlInputs[parameterId] = explicitControlValue;
        }
        const baseCompileInput: Omit<CanonicalEstimateCompileCoreInput,
          "operation" | "submittedParameters" | "confirmedParameters"> = {
          compilerVersion: "catalog-minimum-input-audit-v1",
          catalogId: String(definition.catalog_id),
          primaryMeasureParameterId: null,
          parameterDefinitions: definitionParameters,
          formulaDefinitions: definitionFormulas,
          resourceDefinitions: boundResources,
          currencyCode: "KGS",
          priceSnapshotIds: [],
          priceItems: [],
          rowOverrides: {},
          customRows: [],
          maximumResourceRows: 5_000,
          hashJson: sha256,
        };

        let minimum: Json;
        try {
          const compiled = await compileCanonicalEstimateCore({
            ...baseCompileInput,
            operation: "compile",
            submittedParameters: geometryInputs,
            confirmedParameters: runtimeBaseline,
          });
          const missingIds = [...new Set(compiled.preliminaryNeeds.flatMap((need) =>
            (need.missing_parameter_ids ?? []).map(String)))].sort();
          const parametersById = new Map(definitionParameters.map((parameter) => [String(parameter.parameter_id), parameter]));
          const sourceBackedPhysicalNormOutputIds = sourceBackedPhysicalNormOutputParameterIds(definitionResources);
          const sourceBackedPhysicalNormOutputsPendingApplicabilityIds = missingIds.filter((parameterId) =>
            sourceBackedPhysicalNormOutputIds.has(parameterId));
          const projectSpecificRefinementIds = missingIds.filter((parameterId) => {
            const parameter = parametersById.get(parameterId);
            return parameter != null
              && isCatalogFirstEstimateProjectSpecificRefinementParameter(parameter);
          });
          const professionalSourceMissingIds = missingIds.filter((parameterId) => {
            const parameter = parametersById.get(parameterId);
            return parameter != null
              && !sourceBackedPhysicalNormOutputIds.has(parameterId)
              && !isCatalogFirstEstimateProjectSpecificRefinementParameter(parameter)
              && (isExpertParameter(parameter)
                || canonicalEstimateParameterRequiresManagedProfessionalSource({
                  parameterId,
                  titleRu: String(parameter.title_ru ?? ""),
                } as never));
          });
          const expertUserInputIds = professionalSourceMissingIds.filter((parameterId) => {
            const parameter = parametersById.get(parameterId);
            if (parameter == null) return false;
            const truth = parameter.truth_metadata ?? {};
            return isCanonicalEstimateConsumerSuppliedParameter({
              parameterId,
              titleRu: String(parameter.title_ru ?? ""),
              valueType: parameter.value_type,
              visibilityRole: truth.visibility_role,
              valueSourceRole: truth.value_source_role,
              formulaConsumers: truth.formula_consumers ?? [],
              resourceBranchConsumers: truth.resource_branch_consumers ?? [],
              constraints: parameter.constraints_json ?? {},
              guide: truth.guide,
            } as never);
          });
          minimum = {
            status: compiled.rows.length + compiled.preliminaryNeeds.length > 0 ? "COMPILED" : "EMPTY",
            calculatedRowCount: compiled.rows.length,
            preliminaryNeedCount: compiled.preliminaryNeeds.length,
            visibleCompositionCount: compiled.rows.length + compiled.preliminaryNeeds.length,
            calculatedRowIds: compiled.rows.map((row) => row.row_id),
            preliminaryNeedRowIds: compiled.preliminaryNeeds.map((need) => need.row_id),
            missingParameterIds: missingIds,
            professionalSourceMissingParameterIds: professionalSourceMissingIds,
            sourceBackedPhysicalNormOutputsPendingApplicabilityParameterIds:
              sourceBackedPhysicalNormOutputsPendingApplicabilityIds,
            projectSpecificRefinementParameterIds: projectSpecificRefinementIds,
            expertUserInputParameterIds: expertUserInputIds,
          };
        } catch (error) {
          minimum = { status: "FAILED", errorCode: errorCode(error) };
        }

        let refinement: Json;
        try {
          const compiled = await compileCanonicalEstimateCore({
            ...baseCompileInput,
            operation: "compile",
            submittedParameters: refinementControlInputs,
            confirmedParameters: runtimeBaseline,
          });
          const refinementMissingParameterIds = [...new Set(compiled.preliminaryNeeds.flatMap((need) =>
            (need.missing_parameter_ids ?? []).map(String)))].sort();
          refinement = {
            status: "COMPILED",
            fixtureKind: declaredRefinementFixture?.fixtureKind
              ?? "validation_baseline_plus_explicit_negative_condition_controls",
            calculatedRowCount: compiled.rows.length,
            preliminaryNeedCount: compiled.preliminaryNeeds.length,
            visibleCompositionCount: compiled.rows.length + compiled.preliminaryNeeds.length,
            preliminaryNeedRowIds: compiled.preliminaryNeeds.map((need) => need.row_id),
            missingParameterIds: refinementMissingParameterIds,
          };
        } catch (error) {
          refinement = { status: "FAILED", errorCode: errorCode(error) };
        }

        const negativeBaselineAssumptions = Object.entries(runtimeBaseline).flatMap(([parameterId, value]) =>
          parameterId.endsWith("_requirement_state")
            && ["NOT_REQUIRED", "NOT_APPLICABLE", "INCLUDED_IN_ACCESS_SYSTEM", "INCLUDED_IN_CONTRACTOR_SCOPE", "INCLUDED_IN_MAIN_CONTRACT"]
              .includes(String(value).toUpperCase())
            && !["NORMATIVE", "DERIVED"].includes(String(definition.input_classification?.[parameterId] ?? "").toUpperCase())
            ? [parameterId]
            : []);
        const verdict = minimum.status !== "COMPILED"
          ? "GAP_NO_USEFUL_MINIMUM_INPUT_ESTIMATE"
          : minimum.expertUserInputParameterIds.length > 0
            ? "GAP_ASKS_USER_FOR_PROFESSIONAL_NORM"
            : minimum.professionalSourceMissingParameterIds.length > 0
              ? "GAP_INTERNAL_PROFESSIONAL_SOURCE_MISSING"
            : refinement.status !== "COMPILED" || refinement.preliminaryNeedCount !== 0
              ? "GAP_REFINEMENT_NOT_COMPLETE"
              : negativeBaselineAssumptions.length > 0
                ? "GAP_NEGATIVE_CONDITION_RESTORED_FROM_BASELINE"
                : "MECHANISM_GREEN_CONTENT_REVIEW_PENDING";
        outcomes.push({
          catalogId: definition.catalog_id,
          titleRu: definition.title_ru,
          domainId: definition.domain_id,
          sourceBatch: definition.source_batch,
          definitionVersionId: definitionId,
          definitionVersion: definition.definition_version,
          firstEstimateThenRefineDeclared: definition.passport?.firstEstimateThenRefine === true,
          technologyResourceCount: definitionResources.length,
          parameterCount: definitionParameters.length,
          knownGeometryInputIds: Object.keys(geometryInputs).sort(),
          runtimeBaselineParameterIds: Object.keys(runtimeBaseline).sort(),
          negativeBaselineAssumptions,
          minimum,
          refinement,
          verdict,
        });
      }
      process.stdout.write(`${JSON.stringify({
        progress: Math.min(offset + batch.length, definitions.length),
        total: definitions.length,
      })}\n`);
    }

    const byVerdict = Object.fromEntries([...new Set(outcomes.map((entry) => entry.verdict))]
      .sort().map((verdict) => [verdict, outcomes.filter((entry) => entry.verdict === verdict).length]));
    const compiled = outcomes.filter((entry) => entry.minimum.status === "COMPILED");
    const summary = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      candidate: {
        definitionReleaseId: RELEASE_ID,
        status: release.status,
        activatedAt: release.activated_at,
      },
      denominator: definitions.length,
      rule: "No expected row count is used. Composition count is an observed result of each definition, its applicability conditions and supplied geometry.",
      counts: {
        minimumCompiled: compiled.length,
        minimumFailed: outcomes.length - compiled.length,
        declaredFirstEstimateThenRefine: outcomes.filter((entry) => entry.firstEstimateThenRefineDeclared).length,
        asksUserForProfessionalNorm: outcomes.filter((entry) =>
          entry.minimum.expertUserInputParameterIds?.length > 0).length,
        missingInternalProfessionalSource: outcomes.filter((entry) =>
          entry.minimum.professionalSourceMissingParameterIds?.length > 0).length,
        sourceBackedPhysicalNormOutputPendingApplicability: outcomes.filter((entry) =>
          entry.minimum.sourceBackedPhysicalNormOutputsPendingApplicabilityParameterIds?.length > 0).length,
        projectSpecificRefinement: outcomes.filter((entry) =>
          entry.minimum.projectSpecificRefinementParameterIds?.length > 0).length,
        negativeBaselineAssumption: outcomes.filter((entry) =>
          entry.negativeBaselineAssumptions.length > 0).length,
        refinedFixtureCompiledWithoutNeeds: outcomes.filter((entry) =>
          entry.refinement.status === "COMPILED" && entry.refinement.preliminaryNeedCount === 0).length,
      },
      observedCompositionRange: compiled.length === 0 ? null : {
        minimum: Math.min(...compiled.map((entry) => entry.minimum.visibleCompositionCount)),
        maximum: Math.max(...compiled.map((entry) => entry.minimum.visibleCompositionCount)),
      },
      byVerdict,
      releaseActivated: false,
      deployPerformed: false,
      otaPerformed: false,
    };
    const receipt = { ...summary, outcomes };
    const receiptSha256 = sha256(receipt);
    writeJson(resolve(OUTPUT_ROOT, "catalog-first-estimate-audit.json"), { ...receipt, receiptSha256 });
    const markdown = [
      "# Аудит минимального ввода всего каталога",
      "",
      `Кандидат: \`${RELEASE_ID}\` (prepared, не активирован).`,
      `Проверено определений: **${definitions.length}**.`,
      "",
      "Число строк не является критерием допуска. Для каждой работы оно зафиксировано только как результат её формул, ресурсов и условий применимости.",
      "",
      "## Итог механизма",
      "",
      `- Минимальная компиляция: ${summary.counts.minimumCompiled}/${definitions.length}.`,
      `- Полное fixture-уточнение без незакрытых потребностей: ${summary.counts.refinedFixtureCompiledWithoutNeeds}/${definitions.length}.`,
      `- Требуют от пользователя профессиональную норму/производительность: ${summary.counts.asksUserForProfessionalNorm}.`,
      `- Имеют незакрытый внутренний источник профессиональной нормы: ${summary.counts.missingInternalProfessionalSource}.`,
      `- Ожидают применимость при уже подтверждённом physical-norm source: ${summary.counts.sourceBackedPhysicalNormOutputPendingApplicability}.`,
      `- Имеют добровольные проектные/PPR/QA-уточнения, не являющиеся универсальной нормой: ${summary.counts.projectSpecificRefinement}.`,
      `- Восстанавливают отрицательное условие из ненормативного baseline: ${summary.counts.negativeBaselineAssumption}.`,
      `- Явно объявляют общий сценарий first-estimate-then-refine: ${summary.counts.declaredFirstEstimateThenRefine}/${definitions.length}.`,
      `- Наблюдаемый диапазон состава: ${summary.observedCompositionRange?.minimum ?? "n/a"}…${summary.observedCompositionRange?.maximum ?? "n/a"}; порог строк не применялся.`,
      "",
      "## Статусы",
      "",
      ...Object.entries(byVerdict).map(([verdict, count]) => `- ${verdict}: ${count}`),
      "",
      "`MECHANISM_GREEN_CONTENT_REVIEW_PENDING` означает только пригодность общего механизма минимального ввода и уточнения. Полнота технологического состава должна подтверждаться независимой картой, а не самим текущим определением.",
      "",
      `Receipt SHA-256: \`${receiptSha256}\``,
      "",
    ].join("\n");
    writeText(resolve(OUTPUT_ROOT, "catalog-first-estimate-audit.md"), markdown);
    process.stdout.write(`${JSON.stringify({ status: "CATALOG_AUDIT_COMPLETE", ...summary, receiptSha256 })}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack ?? error.message : error)}\n`);
  process.exitCode = 1;
});
