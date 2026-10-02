import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:inspection_chambers";
const CURRENT_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/inspection-chambers-balanced-current/independent-acceptance.json",
);
const PROMPT = "Монтаж 12 смотровых камер: сборные железобетонные круглые камеры, внутренний диаметр 1500 мм, глубина 2,5 м, люк D400, присоединения DN 200 мм, марка KS-15-RC-H2.5-D400-DN200.";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const quantity = (rows: readonly Json[], rowId: string) =>
  rows.find((row) => row.row_id === rowId)?.quantity as string | undefined;
const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId]))
      .rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_RELEASE");
    const target = (await client.query(`select m.definition_version_id::text,m.source_batch,
      m.runtime_publication_state,m.approved_template_baseline_id::text,d.definition_version,
      d.content_status,d.content_gate_status,p.parameter_count,p.formula_count,p.resource_count,
      p.payload_sha256 from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=d.id
      where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG_ID]))
      .rows[0] as Json;
    invariant(target && [target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "55:36:36",
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_SHAPE");
    invariant(target.runtime_publication_state === "CANDIDATE"
      && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN",
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_GATE");

    const pr = await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const fr = await client.query(
      "select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [target.definition_version_id],
    );
    const rr = await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [target.definition_version_id],
    );
    const br = await client.query(
      "select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1",
      [target.approved_template_baseline_id],
    );
    const sr = await client.query(`select d.definition_version_id::text,d.selectable,
      d.excluded_boundaries,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id
      where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG_ID]);
    const lr = await client.query(`select l.locator_key,l.excerpt_sha256
      from public.estimate_work_normative_binding b join public.estimate_normative_locator l
      on l.id=b.locator_id where b.definition_version_id=$1`, [target.definition_version_id]);
    const parameters = pr.rows as (CanonicalEstimateParameterDefinition & Json)[];
    const formulas = fr.rows as CanonicalEstimateFormulaDefinition[];
    const resources = rr.rows as CanonicalEstimateResourceDefinition[];
    const baseline = br.rows[0] as Json;
    const search = sr.rows[0] as Json;
    const locator = lr.rows[0] as Json;
    invariant(baseline && search && locator,
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_FORMULA_GRAPH_DRIFT");
    invariant(locator.locator_key === "inspection-chambers-project-balance-s27-24-v1",
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_LOCATOR");
    invariant(formulas.every((formula) => !/length_m|ceil\(length|golden_rate|normFactor/iu
      .test(String(formula.expression_source))),
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_LEGACY_FORMULA");
    invariant(!/sewer_pipe|sanitary_sewer_route|manhole_spacing/iu
      .test(JSON.stringify(resources)),
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_NETWORK_TEMPLATE_SCOPE");

    const count = /(\d+(?:[,.]\d+)?)\s+смотров\p{L}*\s+камер\p{L}*/iu
      .exec(PROMPT)?.[1];
    const type = /сборн\p{L}*\s+железобетон\p{L}*\s+кругл\p{L}*\s+камер\p{L}*/iu
      .test(PROMPT) ? "PRECAST_RC_CIRCULAR" : undefined;
    const material = /сборн\p{L}*\s+железобетон\p{L}*/iu.test(PROMPT)
      ? "PRECAST_RC" : undefined;
    const diameter = /внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu
      .exec(PROMPT)?.[1];
    const depth = /глубин\p{L}*\s+(\d+(?:[,.]\d+)?)\s*м/iu.exec(PROMPT)?.[1];
    const loadClass = /люк\p{L}*\s+([A-F]\s*\d{3})\b/iu.exec(PROMPT)?.[1]
      ?.replace(/\s+/gu, "").toUpperCase();
    const connector = /присоединен\p{L}*\s+DN\s*(\d+(?:[,.]\d+)?)\s*мм/iu
      .exec(PROMPT)?.[1];
    const designation = /марка\p{L}*\s+([A-Z0-9][A-Z0-9._/-]*)/iu
      .exec(PROMPT)?.[1];
    invariant(count && type && material && diameter && depth && loadClass
      && connector && designation,
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_IDENTITY");
    const ordinary = {
      ich_chamber_count: count,
      ich_chamber_type: type,
      ich_chamber_material: material,
      ich_internal_diameter_mm: diameter.replace(",", "."),
      ich_depth_m: depth.replace(",", "."),
      ich_cover_load_class: loadClass,
      ich_connector_diameter_mm: connector.replace(",", "."),
      ich_chamber_designation: designation.replace(/[.,;:]+$/u, ""),
    };
    invariant(JSON.stringify(ordinary) === JSON.stringify({
      ich_chamber_count: "12",
      ich_chamber_type: "PRECAST_RC_CIRCULAR",
      ich_chamber_material: "PRECAST_RC",
      ich_internal_diameter_mm: "1500",
      ich_depth_m: "2.5",
      ich_cover_load_class: "D400",
      ich_connector_diameter_mm: "200",
      ich_chamber_designation: "KS-15-RC-H2.5-D400-DN200",
    }), "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_ROUTE");

    const confirmedParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    invariant(Number(confirmedParameters.ich_body_retained_spare_piece) === 0
      && Number(confirmedParameters.ich_body_supplier_package_quantity_piece) === 1,
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_RUNTIME_PROFILE");
    const compile = (submittedParameters: Json) => compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-inspection-chambers-independent-db-readback-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "ich_chamber_count",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 45,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = await compile(ordinary);
    const completeInput = baseline.input_values as Json;
    const complete = await compile(completeInput);
    const balanced = await compile({
      ...completeInput,
      ich_body_retained_spare_piece: 1,
      ich_body_supplier_package_quantity_piece: 2,
    });
    const conditional = await compile({
      ...completeInput,
      ich_dewatering_mode: "REQUIRED",
      ich_dewatering_designation: "Дренажный насос по ППР",
      ich_dewatering_machine_h: 96,
      ich_shoring_mode: "REQUIRED",
      ich_shoring_designation: "Инвентарное крепление котлованов",
      ich_shoring_area_m2: 480,
      ich_pavement_restoration_mode: "REQUIRED",
      ich_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
      ich_pavement_restoration_area_m2: 144,
    });
    invariant(first.rows.length === 8 && first.preliminaryNeeds.length === 28,
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_FIRST");
    invariant(complete.rows.length === 33 && complete.preliminaryNeeds.length === 0,
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_COMPLETE");
    invariant(conditional.rows.length === 36 && conditional.preliminaryNeeds.length === 0,
      "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_CONDITIONAL");
    invariant(quantity(balanced.rows, "rc09:ich_body") === "14"
      && quantity(balanced.rows, "rc09:ich-body-balance:package-count") === "7"
      && quantity(balanced.rows, "rc09:ich-body-balance:remainder") === "2"
      && quantity(balanced.rows, "rc09:ich-body-balance:surplus-beyond-spare") === "1",
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_BALANCE");
    invariant(complete.rows.filter((row) => row.row_id.includes(":labor:")).length === 4
      && complete.rows.filter((row) => row.row_id.includes(":equipment:")).length === 4
      && complete.rows.filter((row) => row.row_id.includes(":logistics:")).length === 2,
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_COVERAGE");
    invariant(search.definition_version_id === target.definition_version_id
      && search.selectable === true && search.status === "draft"
      && /трубопровод|длин\p{L}*\s+трасс|цен/iu.test(JSON.stringify(search.excluded_boundaries)),
    "STOP_S27_24_INSPECTION_CHAMBERS_READBACK_SEARCH");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.inspection-chambers-independent-db-readback.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_INSPECTION_CHAMBERS_BALANCED_CORE_ORDINARY_ROUTE_NOT_UI_ACCEPTED",
      release: { id: release.id, status: release.status, activatedAt: release.activated_at },
      searchReleaseId: current.searchReleaseId,
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "36/36 GREEN",
        legacyGenericCoefficientFormulaCount: 0,
        networkTemplateResourceCount: 0,
        normativeLocator: locator,
        payloadSha256: target.payload_sha256,
      },
      ordinaryRoute: {
        prompt: PROMPT,
        submittedParameters: ordinary,
        automaticNetworkEarthworkOrConditionalSelectionPerformed: false,
      },
      firstEstimate: { visibleRowCount: first.rows.length,
        preliminaryNeedCount: first.preliminaryNeeds.length },
      completedProjectProfile: { visibleRowCount: complete.rows.length,
        preliminaryNeedCount: 0 },
      procurementBalance: {
        input: { installedPiece: 12, retainedSparePiece: 1, supplierPackagePiece: 2 },
        orderedPiece: quantity(balanced.rows, "rc09:ich_body"),
        packageCount: quantity(balanced.rows, "rc09:ich-body-balance:package-count"),
        remainderPiece: quantity(balanced.rows, "rc09:ich-body-balance:remainder"),
        surplusPiece: quantity(balanced.rows, "rc09:ich-body-balance:surplus-beyond-spare"),
      },
      conditionalProfile: { visibleRowCount: conditional.rows.length,
        preliminaryNeedCount: 0 },
      uiAcceptance: { web: false, android: false, procurementUi: false, pdf: false,
        reason: "ordinary staging consumer authorization remains unavailable" },
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
      otaPerformed: false,
      storeActionPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      releaseId: release.id,
      definitionVersionId: target.definition_version_id,
      firstRows: first.rows.length,
      completeRows: complete.rows.length,
      receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
