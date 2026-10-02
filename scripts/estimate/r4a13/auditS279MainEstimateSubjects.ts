import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { createEstimateDraftRevision } from "../../../src/lib/estimate/createEstimateDraftRevision";
import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
  BRIDGE_ASPHALT_COMPLETE_PROFILE_SUMMARY,
  BRIDGE_ASPHALT_COMPLETE_RESOURCES,
  BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  compileBridgeAsphaltCompletePreliminaryProfileR1,
} from "../../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1";
import { ASPHALT_INSTALL_KRER27_CATALOG_ID } from
  "../../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";
import { ASPHALT_COMPACTION_PROFILE_CATALOG_ID } from
  "../../../src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1";

type Json = Record<string, any>;
type ParameterRow = CanonicalEstimateParameterDefinition & Json;
type FormulaRow = CanonicalEstimateFormulaDefinition & Json;
type ResourceRow = CanonicalEstimateResourceDefinition & Json & { _binding_price_keys: string[] };

const CONTRACT = "rik-expo-app.s27-9.main-estimate-subject-reconciliation.v1";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const POINTER_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const JEST_RESULT_PATH = resolve(
  ".release-runtime/r568/s27-9/p6/main-estimates-subject-reconciliation-v1/jest-result.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-9/p6/main-estimates-subject-reconciliation-v1/acceptance.json",
);

const FULL_FOUNDATION_ID = "canonical-work:expanded:strip_foundation";
const FULL_FOUNDATION_REVISION_ID = "fe215c4c-5b7f-40a0-a27a-6ef99bd847e4";
const PLACEMENT_ONLY_ID =
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_large_area";
const PLACEMENT_ONLY_REVISION_ID = "65dbc2bd-238b-4666-b2d2-430f30097331";

const PRESERVED_EVIDENCE = Object.freeze({
  bridgeWeb: resolve(".release-runtime/s27/acceptance/bridge-connected-web.json"),
  foundationWeb: resolve(
    ".release-runtime/r568/s27-4/delivery-first/acceptance/web-foundation-150/acceptance.json",
  ),
  foundationAndroid: resolve(
    ".release-runtime/r568/s27-4/delivery-first/acceptance/android-native-foundation-150/acceptance.json",
  ),
  asphaltWeb: resolve(".release-runtime/r4a13-6/s26-4/asphalt-install-web/acceptance.json"),
  asphaltAndroid: resolve(".release-runtime/r4a13-6/s26-4/asphalt-install-android/acceptance.json"),
  compactionPrepared: resolve(
    ".release-runtime/r4a13-6/s26-4/master-asphalt-compaction-complete-successor-v2/acceptance.json",
  ),
  ceilingPrepared: resolve(
    ".release-runtime/r4a13-6/s26-5/master-drywall-ceiling-preparation-successor-v2/acceptance.json",
  ),
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STOP_S279_MAIN_ESTIMATE_SUBJECT_${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileEvidence(path: string): Json {
  const bytes = readFileSync(path);
  const parsed = JSON.parse(bytes.toString("utf8")) as Json;
  return {
    path: path.replace(/\\/gu, "/"),
    sha256: sha256(bytes),
    status: parsed.status ?? parsed.globalStatus ?? null,
    generatedAt: parsed.generatedAt ?? parsed.capturedAt ?? null,
  };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function rowSummary(rows: readonly Json[], ids: readonly string[]): Json[] {
  return ids.map((rowId) => {
    const row = rows.find((candidate) => candidate.row_id === rowId);
    invariant(row, `ROW_MISSING_${rowId}`);
    return {
      rowId,
      titleRu: row.title_ru,
      quantity: row.quantity,
      unitId: row.unit_id,
      includedInEstimate: row.included_in_estimate,
      unitPrice: row.unit_price,
    };
  });
}

async function hashJson(value: unknown): Promise<string> {
  return sha256(JSON.stringify(value));
}

async function compilePersisted(input: {
  client: Client;
  releaseId: string;
  catalogId: string;
  primaryMeasureParameterId: string;
  submittedParameters: Json;
}): Promise<{ definition: Json; rows: Json[]; preliminaryNeeds: Json[]; totals: Json }> {
  const definition = (await input.client.query(`select release.status release_status,
      manifest.definition_version_id::text id,manifest.approved_template_baseline_id::text baseline_id,
      manifest.baseline_ready,manifest.scenario_ready,version.definition_version,
      version.source_metadata,baseline.input_values,baseline.input_classification
    from public.estimate_definition_release release
    join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=release.id
    join public.estimate_definition_version version on version.id=manifest.definition_version_id
    join public.estimate_approved_template_baseline baseline
      on baseline.id=manifest.approved_template_baseline_id
    where release.id=$1::uuid and manifest.catalog_id=$2`, [input.releaseId, input.catalogId])).rows[0] as Json;
  invariant(definition?.release_status === "prepared"
    && definition.baseline_ready === true
    && definition.scenario_ready === true, `DEFINITION_${input.catalogId}`);

  const parameters = (await input.client.query(`select * from public.estimate_parameter_definition
    where definition_version_id=$1::uuid order by ordinal`, [definition.id])).rows as ParameterRow[];
  const formulas = (await input.client.query(`select formula_id,ast,input_parameter_ids,ast_sha256
    from public.estimate_formula_graph where definition_version_id=$1::uuid order by formula_id`,
  [definition.id])).rows as FormulaRow[];
  const resourceRows = (await input.client.query(`select resource.*,
      coalesce(binding.price_keys,'{}'::text[]) _binding_price_keys
    from public.estimate_resource_spec resource
    left join lateral (
      select array_agg(distinct route.price_key order by route.price_key) price_keys
      from public.estimate_resource_price_route_binding route
      where route.resource_spec_id=resource.id
    ) binding on true
    where resource.definition_version_id=$1::uuid order by resource.ordinal`,
  [definition.id])).rows as ResourceRow[];
  const resources = bindCanonicalEstimateResourcePriceKeys(
    resourceRows,
    resourceRows.flatMap((resource) => resource._binding_price_keys.map((priceKey) => ({
      resource_spec_id: String(resource.id),
      price_key: String(priceKey),
    }))),
  );
  const compiled = await compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "s27-9-main-estimate-subject-reconciliation-v1",
    catalogId: input.catalogId,
    primaryMeasureParameterId: input.primaryMeasureParameterId,
    parameterDefinitions: parameters,
    formulaDefinitions: formulas,
    resourceDefinitions: resources,
    submittedParameters: input.submittedParameters,
    confirmedParameters: canonicalApprovedBaselineRuntimeParameters({
      input_values: definition.input_values,
      input_classification: definition.input_classification,
    }),
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    rowOverrides: {},
    customRows: [],
    maximumResourceRows: Math.max(200, resourceRows.length),
    hashJson,
  });
  return {
    definition: {
      catalogId: input.catalogId,
      definitionVersionId: definition.id,
      definitionVersion: definition.definition_version,
      sourceContract: definition.source_metadata?.contract,
      parameterCount: parameters.length,
      formulaCount: formulas.length,
      resourceCount: resourceRows.length,
    },
    rows: compiled.rows as Json[],
    preliminaryNeeds: compiled.preliminaryNeeds as Json[],
    totals: compiled.totals as Json,
  };
}

async function revisionParameters(client: Client, revisionId: string): Promise<Json> {
  const row = (await client.query(`select input_parameters from public.estimate_revision where id=$1::uuid`,
    [revisionId])).rows[0] as Json;
  invariant(row?.input_parameters, `REVISION_${revisionId}`);
  return row.input_parameters as Json;
}

async function main(): Promise<void> {
  const pointer = JSON.parse(readFileSync(POINTER_PATH, "utf8")) as Json;
  invariant(pointer.definitionReleaseStatus === "prepared"
    && pointer.productionAccessed === false, "POINTER");

  const jest = JSON.parse(readFileSync(JEST_RESULT_PATH, "utf8")) as Json;
  invariant(jest.success === true && jest.numPassedTestSuites === 7
    && jest.numFailedTestSuites === 0 && jest.numPassedTests === 21
    && jest.numFailedTests === 0, "JEST_RESULT");

  const bridge = await compileBridgeAsphaltCompletePreliminaryProfileR1({
    ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  });
  invariant(BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT.area_m2 === 4_800
    && BRIDGE_ASPHALT_COMPLETE_PROFILE_SUMMARY.composedRows.total > 150
    && bridge.preliminaryNeeds.length === 0
    && bridge.rows.length === BRIDGE_ASPHALT_COMPLETE_RESOURCES.length - 2
    && bridge.rows.every((row) => Number(row.quantity) > 0), "BRIDGE");

  const ceiling = createEstimateDraftRevision({
    rawInput: "подготовка существующего потолка из гипсокартона на большой площади 500 м2",
    city: "Bishkek",
    countryCode: "KG",
    currency: "KGS",
    createdAt: new Date().toISOString(),
  });
  invariant(ceiling.matchedFamily === "drywall_ceiling_preparation"
    && ceiling.selectedTemplateId === "drywall_ceiling_preparation_dynamic_professional_boq_runtime_v1"
    && ceiling.boq.rows.length === 24
    && ceiling.missingInputs.length > 0, "CEILING");
  for (const rowId of [
    "drywall_prepare_protection_cover",
    "drywall_prepare_joint_compound",
    "drywall_prepare_condition_survey",
    "drywall_prepare_surface_cleaning",
    "drywall_prepare_primer_application",
    "drywall_prepare_readiness_control",
    "drywall_prepare_access_equipment",
    "drywall_prepare_fall_protection",
  ]) invariant(ceiling.boq.rows.some((row) => row.rowId === rowId), `CEILING_ROW_${rowId}`);

  const client = new Client({ connectionString: DATABASE_URL, statement_timeout: 60_000 });
  await client.connect();
  try {
    const releaseMembership = (await client.query(`select catalog_id,
        definition_version_id::text definition_version_id
      from public.estimate_cumulative_manifest_entry
      where release_id=$1::uuid and catalog_id=any($2::text[]) order by catalog_id`, [
      pointer.definitionReleaseId,
      [
        BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
        FULL_FOUNDATION_ID,
        PLACEMENT_ONLY_ID,
        ASPHALT_INSTALL_KRER27_CATALOG_ID,
        ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
      ],
    ])).rows as Json[];
    invariant(releaseMembership.length === 5, "CUMULATIVE_MEMBERSHIP");

    const fullFoundation = await compilePersisted({
      client,
      releaseId: pointer.definitionReleaseId,
      catalogId: FULL_FOUNDATION_ID,
      primaryMeasureParameterId: "total_axis_length_m",
      submittedParameters: await revisionParameters(client, FULL_FOUNDATION_REVISION_ID),
    });
    const placementOnly = await compilePersisted({
      client,
      releaseId: pointer.definitionReleaseId,
      catalogId: PLACEMENT_ONLY_ID,
      primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
      submittedParameters: await revisionParameters(client, PLACEMENT_ONLY_REVISION_ID),
    });
    const asphaltInstall = await compilePersisted({
      client,
      releaseId: pointer.definitionReleaseId,
      catalogId: ASPHALT_INSTALL_KRER27_CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      submittedParameters: { area_m2: 5_000 },
    });
    const asphaltCompaction = await compilePersisted({
      client,
      releaseId: pointer.definitionReleaseId,
      catalogId: ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      submittedParameters: { area_m2: 5_000 },
    });

    invariant(fullFoundation.rows.length === 41 && fullFoundation.preliminaryNeeds.length === 0,
      "FULL_FOUNDATION_ROWS");
    invariant(placementOnly.rows.length === 36 && placementOnly.preliminaryNeeds.length === 0,
      "PLACEMENT_ROWS");
    invariant(asphaltInstall.rows.length === 56 && asphaltInstall.preliminaryNeeds.length === 0,
      "ASPHALT_INSTALL_ROWS");
    invariant(asphaltCompaction.rows.length === 49 && asphaltCompaction.preliminaryNeeds.length === 0,
      "ASPHALT_COMPACTION_ROWS");
    invariant(placementOnly.rows.map((row) => `${row.row_id}:${row.title_ru}`).join("|")
      .match(/excavation|reinforc(?:ement|ing)|formwork/iu) == null, "PLACEMENT_SCOPE_LEAK");
    invariant(!asphaltCompaction.rows.some((row) => [
      "asphalt:material:hot-dense-fine-mix",
      "asphalt:material:tack-emulsion",
    ].includes(String(row.row_id))), "COMPACTION_SCOPE_LEAK");

    const preservedEvidence = Object.fromEntries(Object.entries(PRESERVED_EVIDENCE)
      .map(([key, path]) => [key, fileEvidence(path)]));
    invariant(preservedEvidence.bridgeWeb.status === "GREEN_S271_BRIDGE_CONNECTED_WEB",
      "BRIDGE_WEB_EVIDENCE");
    invariant(preservedEvidence.foundationAndroid.status ===
      "GREEN_S27_4_DELIVERY_FIRST_FOUNDATION_BATCH_NATIVE_ANDROID", "FOUNDATION_ANDROID_EVIDENCE");
    invariant(preservedEvidence.asphaltWeb.status ===
      "GREEN_S26_4_ASPHALT_INSTALL_WEB_56_ROWS_APPROVAL_WITHOUT_PRICES_PDF_PROCUREMENT",
    "ASPHALT_WEB_EVIDENCE");
    invariant(preservedEvidence.asphaltAndroid.status ===
      "GREEN_S26_4_ASPHALT_INSTALL_ANDROID_NATIVE_56_ROWS_APPROVAL_WITHOUT_PRICES",
    "ASPHALT_ANDROID_EVIDENCE");

    const body = {
      schemaVersion: CONTRACT,
      generatedAt: new Date().toISOString(),
      status: "GREEN_S279_MAIN_ESTIMATE_SUBJECT_RECONCILIATION",
      master: {
        path: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (49).md",
        sha256: "08b45e6be8274efb8470f7fe9b47474a6e088589794084811110f8769cded777",
      },
      release: {
        definitionReleaseId: pointer.definitionReleaseId,
        searchReleaseId: pointer.searchReleaseId,
        membership: releaseMembership,
        preparedNotRemotelyActivated: true,
      },
      refreshedGate: {
        path: JEST_RESULT_PATH.replace(/\\/gu, "/"),
        sha256: sha256(readFileSync(JEST_RESULT_PATH)),
        suites: { passed: 7, failed: 0 },
        tests: { passed: 21, failed: 0 },
      },
      subjects: {
        bridgeAsphalt150x32: {
          status: "GREEN_CURRENT_MODEL_PLUS_PRESERVED_WEB",
          catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
          geometry: { lengthM: 150, widthM: 32, areaM2: 4_800 },
          composedResourceCount: BRIDGE_ASPHALT_COMPLETE_PROFILE_SUMMARY.composedRows.total,
          applicableRowCount: bridge.rows.length,
          preliminaryNeeds: bridge.preliminaryNeeds,
          samples: rowSummary(bridge.rows as Json[], [
            "bridge:binder:asphalt:material:hot-dense-fine-mix",
            "bridge:wearing:asphalt:material:hot-dense-fine-mix",
            "bridge:screed:material:ready-mix",
            "bridge:screed:reinforcement-mesh",
            "bridge:waterproofing:membrane",
            "bridge:waterproofing:primer",
          ]),
        },
        fullStripFoundation150m: {
          status: "GREEN_CURRENT_PERSISTED_MODEL_PLUS_PRESERVED_WEB_NATIVE",
          ...fullFoundation.definition,
          rowCount: fullFoundation.rows.length,
          preliminaryNeeds: fullFoundation.preliminaryNeeds,
          samples: rowSummary(fullFoundation.rows, [
            "main_concrete",
            "reinforcement",
            "binding_wire",
            "formwork_system",
            "material:waterproofing:system-primer",
            "material:waterproofing:detail-reinforcement",
          ]),
          conditionalBranchesRetainedByContract: [
            "material:waterproofing:horizontal-cutoff",
            "material:earthworks:excavation-support",
          ],
        },
        concretePlacementOnly150m: {
          status: "GREEN_CURRENT_PERSISTED_SCOPE_ISOLATION",
          ...placementOnly.definition,
          rowCount: placementOnly.rows.length,
          preliminaryNeeds: placementOnly.preliminaryNeeds,
          excludesWholeFoundationEarthworksReinforcementFormwork: true,
          samples: rowSummary(placementOnly.rows, [
            "strip-pour:material:ready-mix",
            "strip-pour:equipment:pump",
            "strip-pour:equipment:vibrator",
            "strip-pour:delivery:mixer-trips",
            "strip-pour:quality:compression",
          ]),
        },
        fullAsphaltInstall5000m2: {
          status: "GREEN_CURRENT_PERSISTED_MODEL_PLUS_PRESERVED_WEB_NATIVE",
          ...asphaltInstall.definition,
          rowCount: asphaltInstall.rows.length,
          preliminaryNeeds: asphaltInstall.preliminaryNeeds,
          samples: rowSummary(asphaltInstall.rows, [
            "asphalt:material:hot-dense-fine-mix",
            "asphalt:labor:road-workers",
            "asphalt:equipment:asphalt-paver",
            "asphalt:delivery:truck-machine-hours",
            "asphalt:delivery:truck-trips",
          ]),
        },
        asphaltCompactionOnly5000m2: {
          status: "GREEN_CURRENT_PERSISTED_SCOPE_ISOLATION",
          ...asphaltCompaction.definition,
          rowCount: asphaltCompaction.rows.length,
          preliminaryNeeds: asphaltCompaction.preliminaryNeeds,
          excludesHotMixAndTackEmulsion: true,
          samples: rowSummary(asphaltCompaction.rows, [
            "rc09:asphalt_compaction_breakdown_roller",
            "rc09:asphalt_compaction_intermediate_roller",
            "rc09:asphalt_compaction_finish_roller",
            "asphalt-compaction:quality:main-mat-density",
            "asphalt-compaction:included:wetting-water:breakdown",
          ]),
        },
        existingDrywallCeilingPreparation500m2: {
          status: "GREEN_CURRENT_PRELIMINARY_WITH_EXPLICIT_PROJECT_INPUT_GAPS",
          matchedFamily: ceiling.matchedFamily,
          templateId: ceiling.selectedTemplateId,
          revisionStatus: ceiling.status,
          rowCount: ceiling.boq.rows.length,
          missingInputIds: ceiling.missingInputs.map((entry) => entry.key),
          retainedRows: ceiling.boq.rows.map((row) => row.rowId),
          fabricatedMaterialConsumption: false,
        },
      },
      preservedEvidence,
      boundaries: {
        newWebOrNativeCampaignRequiredForUnchangedSubjects: false,
        reason: "Current affected model tests and cumulative membership are GREEN; preserved UI receipts remain applicable to their exact historical revisions.",
        ordinaryV15Claimed: false,
        productionAccessed: false,
        deployPerformed: false,
        remoteActivationPerformed: false,
      },
    };
    atomicJson(OUTPUT_PATH, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
    process.stdout.write(`${JSON.stringify({
      status: body.status,
      outputPath: OUTPUT_PATH,
      bridgeRows: bridge.rows.length,
      fullFoundationRows: fullFoundation.rows.length,
      placementOnlyRows: placementOnly.rows.length,
      asphaltInstallRows: asphaltInstall.rows.length,
      asphaltCompactionRows: asphaltCompaction.rows.length,
      ceilingRows: ceiling.boq.rows.length,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
