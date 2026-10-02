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
import {
  ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
  ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
} from "../../src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1";
import {
  compileAsphaltProfessionalEstimateV4,
  extractAsphaltUserFactsV4,
  parseRoadGeometryV4,
} from "../../src/lib/estimate/v4/asphalt";
import { validateMasterFormulaGraphConsistency } from
  "../estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const SOURCE_PACK_PATH =
  "data/estimate-benchmarks/source-packs/asphalt-compaction-preliminary-profile-r1.json";
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/asphalt-compaction-5000-linear-road-15000-independent-acceptance/acceptance.json",
);
const LINEAR_PROMPT =
  "Дороги, транспорт и площадки: устройство асфальтобетонного покрытия — 15 000 м";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId);
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const manifest = (await pool.query(
      `select manifest.definition_version_id::text,manifest.source_batch,
          manifest.runtime_publication_state,definition.content_status,
          definition.content_gate_status,manifest.approved_template_baseline_id::text
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [releaseId, ASPHALT_COMPACTION_PROFILE_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_ASPHALT_COMPACTION_MANIFEST_MISSING");
    const definitionId = String(manifest.definition_version_id);
    const [parameters, formulas, resources, baselineResult] = await Promise.all([
      pool.query(`select * from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal`, [definitionId]),
      pool.query(`select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        from public.estimate_formula_graph where definition_version_id=$1 order by formula_id`, [definitionId]),
      pool.query(`select * from public.estimate_resource_spec
        where definition_version_id=$1 order by ordinal`, [definitionId]),
      pool.query(`select input_values,input_classification,normative_source_ids
        from public.estimate_approved_template_baseline where id=$1`,
      [manifest.approved_template_baseline_id]),
    ]);
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(
      baselineResult.rows[0] as Json,
    );
    const compileCompaction = async (areaM2: number) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-asphalt-compaction-independent-acceptance",
      catalogId: ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      parameterDefinitions: parameters.rows,
      formulaDefinitions: formulas.rows,
      resourceDefinitions: resources.rows,
      submittedParameters: { area_m2: areaM2 },
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 100,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const compaction5000 = await compileCompaction(5_000);
    const compaction6000 = await compileCompaction(6_000);
    const quantity = (result: typeof compaction5000, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    invariant(parameters.rows.length === 15 && formulas.rows.length === 11
      && resources.rows.length === 49, "STOP_S2723_ASPHALT_COMPACTION_SHAPE");
    invariant(validateMasterFormulaGraphConsistency(formulas.rows).length === 0,
      "STOP_S2723_ASPHALT_COMPACTION_FORMULA_GRAPH_DRIFT");
    invariant(compaction5000.rows.length === 49 && compaction5000.preliminaryNeeds.length === 0,
      "STOP_S2723_ASPHALT_COMPACTION_FIRST_ESTIMATE");
    invariant(compaction5000.rows.every((candidate) => Number(candidate.quantity) > 0),
      "STOP_S2723_ASPHALT_COMPACTION_ZERO_QUANTITY");
    invariant(quantity(compaction5000, "rc09:asphalt_compaction_breakdown_roller") === "3.472222222"
      && quantity(compaction5000, "rc09:asphalt_compaction_intermediate_roller") === "1.479640152"
      && quantity(compaction5000, "rc09:asphalt_compaction_finish_roller") === "1.736111111"
      && quantity(compaction5000, "rc09:asphalt_compaction_crew") === "13.888888888"
      && quantity(compaction5000, "asphalt-compaction:quality:main-mat-density") === "5",
    "STOP_S2723_ASPHALT_COMPACTION_QUANTITIES");
    invariant(quantity(compaction6000, "rc09:asphalt_compaction_breakdown_roller") === "4.166666667"
      && quantity(compaction6000, "rc09:asphalt_compaction_crew") === "16.666666668",
    "STOP_S2723_ASPHALT_COMPACTION_RECALCULATION");
    invariant(!compaction5000.rows.some((candidate) =>
      /hot-dense-fine-mix|paver|truck-machine-hours/u.test(candidate.row_id)),
    "STOP_S2723_ASPHALT_COMPACTION_SCOPE_LEAK");
    invariant(compaction5000.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null), "STOP_S2723_ASPHALT_COMPACTION_UNKNOWN_PRICE_NOT_NULL");

    const parsedGeometry = parseRoadGeometryV4(LINEAR_PROMPT);
    const extractedFacts = extractAsphaltUserFactsV4(LINEAR_PROMPT);
    const preliminaryRoad = compileAsphaltProfessionalEstimateV4({ raw_text: LINEAR_PROMPT });
    const projectRoad = compileAsphaltProfessionalEstimateV4({
      raw_text:
        "Дороги, транспорт и площадки: устройство асфальтобетонного покрытия — длина 15 000 м, ширина 7 м",
    });
    let strictBlocker = "";
    try {
      compileAsphaltProfessionalEstimateV4({
        raw_text: LINEAR_PROMPT,
        assumption_policy: "FORBID_QUANTITY_ASSUMPTIONS",
      });
    } catch (error) {
      strictBlocker = error instanceof Error ? error.message : String(error);
    }
    const areaAssumption = preliminaryRoad.preliminary_assembly_policy.assumptions.find(
      (candidate) => candidate.canonical_key === "area_m2",
    );
    const linearLengthFact = extractedFacts.facts.find((candidate) =>
      candidate.parameter_id === "asphalt_concrete_pavement:parameter:length_m:v4"
    );
    const cementConcreteRows = preliminaryRoad.compiled_rows.filter((candidate) =>
      /цементобетон|cement[_ -]?concrete/iu.test([
        candidate.definition.row_id,
        candidate.definition.professional_name_ru,
        candidate.definition.technical_specification_ru,
      ].join(" "))
    );

    invariant(parsedGeometry.status === "INCOMPLETE" && parsedGeometry.lengthM === 15_000
      && parsedGeometry.widthM == null && parsedGeometry.areaM2 == null,
    "STOP_S2723_LINEAR_ROAD_GEOMETRY_CONVERSION");
    invariant(linearLengthFact?.value === 15_000,
      "STOP_S2723_LINEAR_ROAD_LENGTH_NOT_PRESERVED");
    invariant(preliminaryRoad.quantity_basis.basis_type === "reference"
      && preliminaryRoad.quantity_basis.length_m === 15_000
      && preliminaryRoad.quantity_basis.width_m == null
      && preliminaryRoad.quantity_basis.area_m2 === 1_000
      && preliminaryRoad.quantity_basis.source === "reference_policy"
      && areaAssumption?.value === 1_000
      && areaAssumption.user_confirmed === false,
    "STOP_S2723_LINEAR_ROAD_REFERENCE_PROFILE_NOT_VISIBLE");
    invariant(preliminaryRoad.compiled_rows.length > 0
      && preliminaryRoad.compiled_rows.every((candidate) => candidate.quantity > 0),
    "STOP_S2723_LINEAR_ROAD_ZERO_PRELIMINARY_ESTIMATE");
    invariant(preliminaryRoad.compiled_rows.every((candidate) =>
      candidate.included_in_procurement === false
      && candidate.definition.procurement_eligible === false
      && candidate.definition.informational === true
      && candidate.definition.costing_mode === "ANALYTICAL_ONLY")
      && preliminaryRoad.passport.procurement_lines.length === 0
      && preliminaryRoad.passport.commercial_lines.length === 0
      && preliminaryRoad.price_coverage.total_rows === 0,
    "STOP_S2723_LINEAR_ROAD_REFERENCE_NOT_OBJECT_PROCUREMENT");
    invariant(preliminaryRoad.clarification.critical_required.some((question) =>
      question.parameter_id === "asphalt_concrete_pavement:parameter:width_m:v4")
      && preliminaryRoad.clarification.understood.some((line) =>
        line.label_ru === "Площадь покрытия"
        && line.provenance_ru === "Предварительное допущение — уточнить"),
    "STOP_S2723_LINEAR_ROAD_WIDTH_NEED_NOT_VISIBLE");
    invariant(projectRoad.quantity_basis.basis_type === "project"
      && projectRoad.quantity_basis.length_m === 15_000
      && projectRoad.quantity_basis.width_m === 7
      && projectRoad.quantity_basis.area_m2 === 105_000
      && projectRoad.passport.procurement_lines.length > 0
      && projectRoad.compiled_rows.some((candidate) => candidate.included_in_procurement),
    "STOP_S2723_LINEAR_ROAD_OBJECT_PROCUREMENT_AFTER_WIDTH");
    invariant(strictBlocker.includes(
      "ASPHALT_V4_QUANTITY_BASIS_MISSING;area=null;length=15000;width=null",
    ), "STOP_S2723_LINEAR_ROAD_STRICT_GEOMETRY_NOT_LOCALIZED");
    invariant(cementConcreteRows.length === 0,
      "STOP_S2723_LINEAR_ROAD_CEMENT_CONCRETE_FALLBACK");
    invariant(sha256File(SOURCE_PACK_PATH) === ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
      "STOP_S2723_ASPHALT_COMPACTION_SOURCE_PACK_HASH");

    const evidence = {
      schemaVersion: "rik-expo-app.s27-23.asphalt-compaction-linear-road-independent-acceptance.v1",
      status:
        "GREEN_S27_23_ASPHALT_COMPACTION_5000_CORE__LINEAR_ROAD_15000_VISIBLE_WIDTH_NEED_NO_OBJECT_PROCUREMENT__NOT_UI_ACCEPTED",
      releaseId,
      searchReleaseId: String(current.searchReleaseId),
      compaction: {
        catalogId: ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
        definitionId,
        inheritedSourceBatch: String(manifest.source_batch),
        lifecycle: {
          runtimePublicationState: String(manifest.runtime_publication_state),
          contentStatus: String(manifest.content_status),
          contentGateStatus: String(manifest.content_gate_status),
        },
        definitionShape: [parameters.rows.length, formulas.rows.length, resources.rows.length],
        persistedFormulaGraphExpressionConsistency: "11/11 GREEN",
        firstEstimate: {
          input: { area_m2: 5_000 },
          rows: compaction5000.rows.length,
          preliminaryNeeds: compaction5000.preliminaryNeeds.length,
          procurementRows: compaction5000.rows.filter((candidate) =>
            candidate.included_in_procurement).length,
          breakdownRollerMachineH:
            quantity(compaction5000, "rc09:asphalt_compaction_breakdown_roller"),
          intermediateRollerMachineH:
            quantity(compaction5000, "rc09:asphalt_compaction_intermediate_roller"),
          finishRollerMachineH:
            quantity(compaction5000, "rc09:asphalt_compaction_finish_roller"),
          crewManH: quantity(compaction5000, "rc09:asphalt_compaction_crew"),
          qualityLots: quantity(compaction5000, "asphalt-compaction:quality:main-mat-density"),
        },
        changedArea: {
          input: { area_m2: 6_000 },
          breakdownRollerMachineH:
            quantity(compaction6000, "rc09:asphalt_compaction_breakdown_roller"),
          crewManH: quantity(compaction6000, "rc09:asphalt_compaction_crew"),
        },
        resourceLedger: compaction5000.rows.map((row) => ({
          stage: row.section,
          rowId: row.row_id,
          category: row.category,
          titleRu: row.title_ru,
          quantity: row.quantity,
          unitId: row.unit_id,
          procurement: row.included_in_procurement,
          includedInEstimate: row.included_in_estimate,
        })),
      },
      linearRoad: {
        prompt: LINEAR_PROMPT,
        parsedGeometry,
        preservedLengthM: linearLengthFact?.value,
        preliminaryProfile: preliminaryRoad.preliminary_assembly_policy.profile_id,
        quantityBasis: preliminaryRoad.quantity_basis,
        visibleAreaAssumption: areaAssumption,
        rowCount: preliminaryRoad.compiled_rows.length,
        referenceRowsVisible: preliminaryRoad.compiled_rows.length,
        referenceRowsInObjectProcurement: preliminaryRoad.compiled_rows.filter((candidate) =>
          candidate.included_in_procurement).length,
        objectProcurementAccepted: false,
        missingObjectInputParameterIds: preliminaryRoad.clarification.critical_required
          .map((question) => question.parameter_id),
        strictModeBlocker: strictBlocker,
        cementConcreteFallbackRows: cementConcreteRows.map((candidate) => candidate.definition.row_id),
        confirmedGeometryProof: {
          input: { length_m: 15_000, width_m: 7 },
          areaM2: projectRoad.quantity_basis.area_m2,
          basisType: projectRoad.quantity_basis.basis_type,
          procurementRows: projectRoad.compiled_rows.filter((candidate) =>
            candidate.included_in_procurement).length,
          objectProcurementAccepted: true,
        },
      },
      sourceHashes: {
        compactionSourcePack: sha256File(SOURCE_PACK_PATH),
        compactionDefinitionOwner:
          sha256File("src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1.ts"),
        roadGeometryOwner: sha256File("src/lib/estimate/v4/asphalt/roadScopeTruthV4.ts"),
        roadPreliminaryPolicyOwner:
          sha256File("src/lib/estimate/v4/asphalt/asphaltPreliminaryAssemblyPolicyV4.ts"),
      },
      productionAccessed: false,
      activationPerformed: false,
      webAccepted: false,
      androidAccepted: false,
      persistenceAccepted: false,
      historyAccepted: false,
      procurementUiAccepted: false,
      pdfAccepted: false,
      blocker: "ordinary staging consumer authorization is unavailable",
    };
    if (write) {
      mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
      const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
      writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
      renameSync(temporary, OUTPUT_PATH);
    }
    process.stdout.write(`${JSON.stringify({ ...evidence, mutationPerformed: write }, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
