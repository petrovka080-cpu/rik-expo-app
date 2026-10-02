import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Pool } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from
  "../../src/lib/estimate/estimateDeterministicHash";
import { ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID } from
  "../../src/lib/estimate/v4/asphaltLevelSmallAreaS2716";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/asphalt-level-100-independent-acceptance/acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId);
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const release = (await pool.query(
      `select id::text,status,activated_at,definition_count,parameter_count,
          formula_count,resource_row_count,source_manifest_sha256
       from public.estimate_definition_release where id=$1`,
      [releaseId],
    )).rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S2723_ASPHALT_LEVEL_CURRENT_RELEASE");
    const manifest = (await pool.query(
      `select manifest.definition_version_id::text,manifest.source_batch,
          manifest.runtime_publication_state,definition.content_status,
          definition.content_gate_status,manifest.approved_template_baseline_id::text
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [releaseId, ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_ASPHALT_LEVEL_MANIFEST_MISSING");
    const definitionId = String(manifest.definition_version_id);
    const [parameters, formulas, resources, baselineResult, searchResult] = await Promise.all([
      pool.query(`select * from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal`, [definitionId]),
      pool.query(`select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        from public.estimate_formula_graph where definition_version_id=$1 order by formula_id`, [definitionId]),
      pool.query(`select * from public.estimate_resource_spec
        where definition_version_id=$1 order by ordinal`, [definitionId]),
      pool.query(`select input_values,input_classification,normative_source_ids,
          validation_scenario_refs,acceptance_evidence_sha256
        from public.estimate_approved_template_baseline where id=$1`,
      [manifest.approved_template_baseline_id]),
      pool.query(`select document.definition_version_id::text,document.selectable,
          document.adjudication_class,document.canonical_name_ru,document.aliases,
          document.short_scope_ru,document.key_distinguishing_parameters,
          document.clarification_fields,document.included_boundaries,
          document.excluded_boundaries,document.source_provenance,release.status
        from public.estimate_search_document document
        join public.estimate_search_index_release release
          on release.id=document.search_release_id
        where document.search_release_id=$1 and document.catalog_id=$2`, [
        current.searchReleaseId,
        ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID,
      ]),
    ]);
    const baseline = baselineResult.rows[0] as Json;
    const search = searchResult.rows[0] as Json | undefined;
    invariant(search, "STOP_S2723_ASPHALT_LEVEL_SEARCH_MISSING");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    const compile = async (submittedParameters: Record<string, unknown>) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-asphalt-level-100-independent-acceptance",
      catalogId: ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      parameterDefinitions: parameters.rows,
      formulaDefinitions: formulas.rows,
      resourceDefinitions: resources.rows,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 200,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const areaOnly = await compile({ area_m2: 100 });
    const first = await compile({ area_m2: 100, layer_thickness_mm: 100 });
    const changed = await compile({ area_m2: 100, layer_thickness_mm: 105 });
    const row = (result: typeof first, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId);
    invariant(parameters.rows.length === 30 && formulas.rows.length === 24
      && resources.rows.length === 57, "STOP_S2723_ASPHALT_LEVEL_SHAPE");
    invariant(manifest.runtime_publication_state === "CANDIDATE"
      && manifest.content_status === "CANDIDATE_READY"
      && manifest.content_gate_status === "GREEN",
    "STOP_S2723_ASPHALT_LEVEL_LIFECYCLE");
    const layerThicknessParameter = parameters.rows.find((parameter) =>
      parameter.parameter_id === "layer_thickness_mm");
    invariant(confirmedParameters.area_m2 == null
      && confirmedParameters.layer_thickness_mm == null
      && baseline.input_classification?.area_m2 === "VALIDATION_FIXTURE"
      && baseline.input_classification?.layer_thickness_mm === "VALIDATION_FIXTURE"
      && layerThicknessParameter?.truth_metadata?.visibility_role === "USER_INPUT"
      && layerThicknessParameter?.truth_metadata?.value_source_role === "USER_MEASURED"
      && layerThicknessParameter?.truth_metadata?.hidden_default_forbidden === true,
    "STOP_S2723_ASPHALT_LEVEL_NO_HIDDEN_USER_FACTS");
    invariant(areaOnly.rows.length === 45
      && areaOnly.preliminaryNeeds.length === 12
      && areaOnly.rows.filter((candidate) => candidate.included_in_procurement).length === 3
      && areaOnly.preliminaryNeeds.every((need) =>
        JSON.stringify(need.missing_parameter_ids) === JSON.stringify(["layer_thickness_mm"])),
    "STOP_S2723_ASPHALT_LEVEL_AREA_ONLY_COMPOSITION");
    const areaOnlyNeedIds = new Set(areaOnly.preliminaryNeeds.map((need) => need.row_id));
    invariant(areaOnlyNeedIds.has("asphalt:material:hot-dense-fine-mix")
      && areaOnlyNeedIds.has("asphalt:material:road-bitumen")
      && areaOnlyNeedIds.has("asphalt:labor:road-workers")
      && areaOnlyNeedIds.has("asphalt:equipment:surface-grinder"),
    "STOP_S2723_ASPHALT_LEVEL_AREA_ONLY_DEPENDENT_ROWS");
    invariant(first.rows.length === 57 && first.preliminaryNeeds.length === 0,
      "STOP_S2723_ASPHALT_LEVEL_FIRST_ESTIMATE");
    invariant(first.rows.filter((candidate) => candidate.included_in_procurement).length === 5,
      "STOP_S2723_ASPHALT_LEVEL_PROCUREMENT");
    invariant(row(first, "asphalt:control:geometric-compacted-volume")?.quantity === "10",
      "STOP_S2723_ASPHALT_LEVEL_VOLUME");
    invariant(row(first, "asphalt:material:hot-dense-fine-mix")?.quantity === "23.58",
      "STOP_S2723_ASPHALT_LEVEL_MIX");
    invariant(row(first, "asphalt:material:road-bitumen")?.quantity === "0.02",
      "STOP_S2723_ASPHALT_LEVEL_BITUMEN");
    invariant(row(first, "asphalt:labor:road-workers")?.quantity === "7",
      "STOP_S2723_ASPHALT_LEVEL_LABOR");
    invariant(row(first, "asphalt:equipment:smooth-roller-8t")?.quantity === "0.255"
      && row(first, "asphalt:equipment:asphalt-paver")?.quantity === "0.319",
    "STOP_S2723_ASPHALT_LEVEL_MACHINERY");
    invariant(row(first, "asphalt:equipment:surface-grinder")?.quantity === "0.056",
      "STOP_S2723_ASPHALT_LEVEL_INCREMENT_MACHINERY");
    invariant(row(changed, "asphalt:material:hot-dense-fine-mix")?.quantity === "24.76",
      "STOP_S2723_ASPHALT_LEVEL_RECALCULATION");
    invariant(row(changed, "asphalt:material:road-bitumen")?.quantity === "0.021"
      && row(changed, "asphalt:labor:road-workers")?.quantity === "7.136"
      && row(changed, "asphalt:equipment:surface-grinder")?.quantity === "0.06",
    "STOP_S2723_ASPHALT_LEVEL_INCREMENT_RECALCULATION");
    invariant(first.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null), "STOP_S2723_ASPHALT_LEVEL_UNKNOWN_PRICE_NOT_NULL");
    invariant(search.definition_version_id === definitionId
      && search.selectable === true && search.status === "draft"
      && /выравнив.*асфальтов/iu.test(String(search.canonical_name_ru))
      && Array.isArray(search.key_distinguishing_parameters)
      && search.key_distinguishing_parameters.includes("area_m2")
      && search.key_distinguishing_parameters.includes("layer_thickness_mm"),
    "STOP_S2723_ASPHALT_LEVEL_SEARCH_BINDING");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-23.asphalt-level-100-independent-acceptance.v2",
      status: "GREEN_S27_23_ASPHALT_LEVEL_100_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: {
        id: release.id,
        status: release.status,
        activatedAt: release.activated_at,
        definitionCount: Number(release.definition_count),
        parameterCount: Number(release.parameter_count),
        formulaCount: Number(release.formula_count),
        resourceRowCount: Number(release.resource_row_count),
        sourceManifestSha256: release.source_manifest_sha256,
      },
      releaseId,
      searchReleaseId: String(current.searchReleaseId),
      definitionId,
      inheritedSourceBatch: String(manifest.source_batch),
      lifecycle: {
        runtimePublicationState: String(manifest.runtime_publication_state),
        contentStatus: String(manifest.content_status),
        contentGateStatus: String(manifest.content_gate_status),
      },
      definitionShape: [parameters.rows.length, formulas.rows.length, resources.rows.length],
      ordinaryRoute: {
        prompt: "Выравнивание асфальтового покрытия 100 м².",
        primaryMeasureParameterId: "area_m2",
        submittedParameters: { area_m2: "100" },
        inventedLayerThickness: false,
        routeContract: "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
        searchCanonicalNameRu: search.canonical_name_ru,
        searchAliases: search.aliases,
        clarificationFields: search.clarification_fields,
      },
      areaOnlyEstimate: {
        input: { area_m2: 100 },
        rows: areaOnly.rows.length,
        preliminaryNeeds: areaOnly.preliminaryNeeds.length,
        procurementRows: areaOnly.rows.filter(
          (candidate) => candidate.included_in_procurement,
        ).length,
        needs: areaOnly.preliminaryNeeds.map((need) => ({
          rowId: need.row_id,
          missingParameterIds: need.missing_parameter_ids,
        })),
      },
      firstEstimate: {
        input: { area_m2: 100, layer_thickness_mm: 100 },
        rows: first.rows.length,
        preliminaryNeeds: first.preliminaryNeeds.length,
        procurementRows: first.rows.filter((candidate) => candidate.included_in_procurement).length,
        compactedVolumeM3: row(first, "asphalt:control:geometric-compacted-volume")?.quantity,
        asphaltMixT: row(first, "asphalt:material:hot-dense-fine-mix")?.quantity,
        roadBitumenT: row(first, "asphalt:material:road-bitumen")?.quantity,
        laborManHours: row(first, "asphalt:labor:road-workers")?.quantity,
        rollerMachineHours: row(first, "asphalt:equipment:smooth-roller-8t")?.quantity,
        paverMachineHours: row(first, "asphalt:equipment:asphalt-paver")?.quantity,
        surfaceGrinderMachineHours:
          row(first, "asphalt:equipment:surface-grinder")?.quantity,
      },
      changedThickness: {
        input: { area_m2: 100, layer_thickness_mm: 105 },
        asphaltMixT: row(changed, "asphalt:material:hot-dense-fine-mix")?.quantity,
        roadBitumenT: row(changed, "asphalt:material:road-bitumen")?.quantity,
        laborManHours: row(changed, "asphalt:labor:road-workers")?.quantity,
        surfaceGrinderMachineHours:
          row(changed, "asphalt:equipment:surface-grinder")?.quantity,
      },
      quantityBasis: {
        baseThicknessMm: 30,
        incrementThicknessMm: 5,
        explicit100MmIncrementCount: 14,
        mixFormula:
          "area_m2/1000*(70.6+((layer_thickness_mm-30)/5)*11.8)",
        bitumenFormula:
          "area_m2/1000*(0.06+((layer_thickness_mm-30)/5)*0.01)",
        densityFactorUsed: false,
        wasteFactorUsed: false,
      },
      sourceHashes: {
        sourcePack: sha256File("data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json"),
        definitionOwner: sha256File("src/lib/estimate/v4/asphaltLevelSmallAreaS2716.ts"),
      },
      productionAccessed: false,
      activationPerformed: false,
      webAccepted: false,
      androidAccepted: false,
      procurementUiAccepted: false,
      pdfAccepted: false,
      blocker: "ordinary staging consumer authorization is unavailable",
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
