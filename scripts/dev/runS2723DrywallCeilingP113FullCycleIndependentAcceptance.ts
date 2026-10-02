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
import { DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID } from
  "../../src/lib/estimate/v4/drywallCeilingP113FullCycleS2723";

type Json = Record<string, any>;

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-23/drywall-ceiling-p113-full-cycle-successor/independent-acceptance.json",
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
  const write = process.argv.includes("--write");
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
      "STOP_S2723_DRYWALL_P113_CURRENT_RELEASE");
    const manifest = (await pool.query(
      `select manifest.definition_version_id::text,manifest.source_batch,
          manifest.runtime_publication_state,definition.content_status,
          definition.content_gate_status,manifest.approved_template_baseline_id::text
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [releaseId, DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID],
    )).rows[0] as Json | undefined;
    invariant(manifest, "STOP_S2723_DRYWALL_P113_MANIFEST_MISSING");
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
        DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID,
      ]),
    ]);
    const baseline = baselineResult.rows[0] as Json;
    const search = searchResult.rows[0] as Json | undefined;
    invariant(search, "STOP_S2723_DRYWALL_P113_SEARCH_MISSING");
    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    const compile = async (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-drywall-p113-independent-acceptance",
      catalogId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      parameterDefinitions: parameters.rows,
      formulaDefinitions: formulas.rows,
      resourceDefinitions: resources.rows,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 100,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile({ area_m2: 500 });
    const complete = await compile({
      area_m2: 500,
      room_length_m: 25,
      room_width_m: 20,
      control_joint_length_m: 20,
    });
    const changed = await compile({
      area_m2: 600,
      room_length_m: 25,
      room_width_m: 20,
      control_joint_length_m: 20,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;
    const expectedNeeds = [
      "ceiling-p113-full:02:material:pn-profile-pieces",
      "ceiling-p113-full:02:fastener:perimeter-packages",
      "ceiling-p113-full:02:consumable:sealing-tape-rolls",
      "ceiling-p113-full:02:operation:perimeter-installation",
      "ceiling-p113-full:04:material:separation-tape-rolls",
      "ceiling-p113-full:06:material:control-joint-pieces",
      "ceiling-p113-full:06:operation:control-joint-installation",
    ].sort();

    invariant(parameters.rows.length === 38 && formulas.rows.length === 38
      && resources.rows.length === 54, "STOP_S2723_DRYWALL_P113_SHAPE");
    invariant(manifest.runtime_publication_state === "CANDIDATE"
      && manifest.content_status === "CANDIDATE_READY"
      && manifest.content_gate_status === "GREEN",
    "STOP_S2723_DRYWALL_P113_LIFECYCLE");
    invariant(confirmedParameters.area_m2 == null
      && confirmedParameters.room_length_m == null
      && confirmedParameters.room_width_m == null
      && confirmedParameters.control_joint_length_m == null,
    "STOP_S2723_DRYWALL_P113_NO_HIDDEN_GEOMETRY");
    invariant(first.rows.length === 47 && first.preliminaryNeeds.length === 7,
      "STOP_S2723_DRYWALL_P113_FIRST_ESTIMATE");
    invariant(JSON.stringify(first.preliminaryNeeds.map((need) => need.row_id).sort())
      === JSON.stringify(expectedNeeds), "STOP_S2723_DRYWALL_P113_VISIBLE_NEEDS");
    invariant(first.rows.filter((candidate) => candidate.included_in_procurement).length === 23,
      "STOP_S2723_DRYWALL_P113_FIRST_PROCUREMENT");
    for (const need of first.preliminaryNeeds) {
      const expectedMissing = need.row_id.startsWith("ceiling-p113-full:06:")
        ? ["control_joint_length_m"]
        : ["room_length_m", "room_width_m"];
      invariant(JSON.stringify(need.missing_parameter_ids) === JSON.stringify(expectedMissing),
        `STOP_S2723_DRYWALL_P113_NEED_INPUTS:${need.row_id}`);
    }
    invariant(complete.rows.length === 54 && complete.preliminaryNeeds.length === 0,
      "STOP_S2723_DRYWALL_P113_COMPLETE_ESTIMATE");
    invariant(complete.rows.filter((candidate) => candidate.included_in_procurement).length === 28,
      "STOP_S2723_DRYWALL_P113_PROCUREMENT");
    invariant(quantity(complete, "ceiling-p113-full:02:material:pp-profile-pieces") === "508"
      && quantity(complete, "ceiling-p113-full:03:material:gsp-sheets") === "219"
      && quantity(complete, "ceiling-p113-full:03:fastener:tn25-packages") === "12"
      && quantity(complete, "ceiling-p113-full:04:material:joint-compound-bags") === "9"
      && quantity(complete, "ceiling-p113-full:05:material:primer-cans") === "6",
    "STOP_S2723_DRYWALL_P113_QUANTITIES");
    invariant(quantity(changed, "ceiling-p113-full:02:material:pp-profile-pieces") === "609"
      && quantity(changed, "ceiling-p113-full:03:material:gsp-sheets") === "263",
    "STOP_S2723_DRYWALL_P113_RECALCULATION");
    invariant(complete.rows.every((candidate) => candidate.unit_price == null
      && candidate.amount == null), "STOP_S2723_DRYWALL_P113_UNKNOWN_PRICE_NOT_NULL");
    invariant(new Set(complete.rows.map((candidate) => candidate.section)).size === 8,
      "STOP_S2723_DRYWALL_P113_STAGE_COUNT");
    invariant(search.definition_version_id === definitionId
      && search.selectable === true && search.status === "draft"
      && /потол.*113|п\s*113/iu.test(String(search.canonical_name_ru)),
    "STOP_S2723_DRYWALL_P113_SEARCH_BINDING");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-23.drywall-ceiling-p113-independent-acceptance.v2",
      status: "GREEN_S27_23_DRYWALL_CEILING_P113_500M2_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
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
      sourceBatch: String(manifest.source_batch),
      lifecycle: {
        runtimePublicationState: String(manifest.runtime_publication_state),
        contentStatus: String(manifest.content_status),
        contentGateStatus: String(manifest.content_gate_status),
      },
      definitionShape: [parameters.rows.length, formulas.rows.length, resources.rows.length],
      ordinaryRoute: {
        prompt: "Полное устройство потолка из гипсокартона 500 м².",
        primaryMeasureParameterId: "area_m2",
        submittedParameters: { area_m2: "500" },
        inventedRoomGeometry: false,
        routeContract: "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
        searchCanonicalNameRu: search.canonical_name_ru,
        searchAliases: search.aliases,
        clarificationFields: search.clarification_fields,
      },
      firstEstimate: {
        input: { area_m2: 500 },
        rows: first.rows.length,
        preliminaryNeeds: first.preliminaryNeeds.length,
        preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
        procurementRows: first.rows.filter((candidate) => candidate.included_in_procurement).length,
        ppProfilePieces: quantity(first, "ceiling-p113-full:02:material:pp-profile-pieces"),
        boardSheets: quantity(first, "ceiling-p113-full:03:material:gsp-sheets"),
      },
      completedGeometry: {
        input: { area_m2: 500, room_length_m: 25, room_width_m: 20, control_joint_length_m: 20 },
        rows: complete.rows.length,
        stageCount: new Set(complete.rows.map((candidate) => candidate.section)).size,
        preliminaryNeeds: complete.preliminaryNeeds.length,
        procurementRows: complete.rows.filter((candidate) => candidate.included_in_procurement).length,
        perimeterM: quantity(complete, "ceiling-p113-full:02:operation:perimeter-installation"),
        ppProfilePieces: quantity(complete, "ceiling-p113-full:02:material:pp-profile-pieces"),
        ppProfileRemainderM: quantity(complete, "ceiling-p113-full:02:control:pp-profile-remainder"),
        boardSheets: quantity(complete, "ceiling-p113-full:03:material:gsp-sheets"),
        boardRemainderM2: quantity(complete, "ceiling-p113-full:03:control:gsp-remainder"),
        tn25Packages: quantity(complete, "ceiling-p113-full:03:fastener:tn25-packages"),
        jointCompoundBags: quantity(complete, "ceiling-p113-full:04:material:joint-compound-bags"),
        jointTapeRolls: quantity(complete, "ceiling-p113-full:04:material:joint-tape-rolls"),
        primerCans: quantity(complete, "ceiling-p113-full:05:material:primer-cans"),
      },
      changedArea: {
        input: { area_m2: 600, room_length_m: 25, room_width_m: 20, control_joint_length_m: 20 },
        ppProfilePieces: quantity(changed, "ceiling-p113-full:02:material:pp-profile-pieces"),
        boardSheets: quantity(changed, "ceiling-p113-full:03:material:gsp-sheets"),
      },
      sourceHashes: {
        sourcePack: sha256File("data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json"),
        definitionOwner: sha256File("src/lib/estimate/v4/drywallCeilingP113FullCycleS2723.ts"),
      },
      scopeBoundary: {
        class: "FULL_P113_CEILING_INSTALLATION",
        preparationOnlyAcceptedAsFullWork: false,
        frameOnlyAcceptedAsFullWork: false,
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
    evidence.receiptSha256 = sha256(evidence);
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
