import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  R555_MATERIAL_FIRST_CONTRACT,
  buildAllR555MaterialFirstDefinitions,
} from "../estimate/r555/materialFirstConcreteRegressionR555";

type Json = Record<string, any>;

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md",
);
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DATABASE_URL = process.env.R555_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const PREDECESSOR_RELEASE_ID = "d30e2f0d-e55f-5d06-abef-c7cb80d69a73";
const SEARCH_RELEASE_ID = "d08d030d-97e8-53ea-88fd-6012fc82ba9f";
const CONSUMER_TENANT_ID = "55555555-5555-4555-8555-555555555551";
const APPLY = process.argv.includes("--apply");
const OUTPUT = resolve(
  `.release-runtime/r555/evidence/${APPLY
    ? "07_R555_MATERIAL_FIRST_REGRESSION_CANDIDATE_APPLY.json"
    : "07_R555_MATERIAL_FIRST_REGRESSION_CANDIDATE_DRY_RUN.json"}`,
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string"
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function assertLocalDatabase(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `R555_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2", `R555_DATABASE_BOUNDARY_RED:${parsed.host}${parsed.pathname}`);
}

function unitPrice(rowKey: string): { value: number; sourceClass: string } {
  if (rowKey === "concrete_b25") return { value: 6_200, sourceClass: "BBZ_CURRENT_OFFER" };
  if (rowKey === "reinforcement_a500c_12") return { value: 61, sourceClass: "METALLTORG_2026_02_04" };
  if (rowKey === "binding_wire_1_2") return { value: 3_720, sourceClass: "MTT_CURRENT_186_KGS_PER_KG_X_20_KG" };
  if (rowKey === "spacer_40") return { value: 2_400, sourceClass: "PROM23_2026_06_30_PACK_200" };
  if (rowKey === "concrete_pump") return { value: 9_000, sourceClass: "BBZ_CURRENT_OFFER" };
  if (rowKey === "deep_vibrator") return { value: 75, sourceClass: "BISHKEK_RENT_600_KGS_PER_8H_DAY" };
  if (rowKey === "mixer_7m3") return { value: 5_000, sourceClass: "LOCAL_ACCEPTED_TRANSPORT_SCHEDULE" };
  if (rowKey.endsWith("_delivery")) return { value: 15, sourceClass: "LOCAL_ACCEPTED_TRANSPORT_SCHEDULE" };
  if (rowKey === "slump_test") return { value: 800, sourceClass: "LOCAL_ACCEPTED_LABORATORY_SCHEDULE" };
  if (rowKey === "sample_sets") return { value: 1_500, sourceClass: "LOCAL_ACCEPTED_LABORATORY_SCHEDULE" };
  if (rowKey === "compression_test") return { value: 2_500, sourceClass: "LOCAL_ACCEPTED_LABORATORY_SCHEDULE" };
  if (rowKey === "geometry_control") return { value: 2_000, sourceClass: "LOCAL_ACCEPTED_SURVEY_SCHEDULE" };
  if (rowKey === "surface_control") return { value: 500, sourceClass: "LOCAL_ACCEPTED_QUALITY_SCHEDULE" };
  if (rowKey.endsWith("_labor")) return { value: 350, sourceClass: "LOCAL_ACCEPTED_LABOR_SCHEDULE" };
  if (rowKey === "curing_film") return { value: 3_000, sourceClass: "LOCAL_ACCEPTED_SUPPLIER_SCHEDULE" };
  if (rowKey === "anchor_group") return { value: 36_000, sourceClass: "LOCAL_ACCEPTED_PROJECT_SUPPLY_SCHEDULE" };
  if (rowKey === "repair_mortar") return { value: 4_500, sourceClass: "LOCAL_ACCEPTED_SUPPLIER_SCHEDULE" };
  throw new Error(`R555_PRICE_MISSING:${rowKey}`);
}

async function main(): Promise<void> {
  assertLocalDatabase();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R555_MASTER_SHA_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const sourceFiles = [
    "scripts/estimate/concreteBackendR5/concreteR5Model.ts",
    "scripts/estimate/r555/materialFirstConcreteRegressionR555.ts",
    "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    "tests/estimateBackend/r555MaterialFirstRegression.contract.test.ts",
  ];
  const sourceTree = sha256({
    masterSha256: MASTER_SHA256,
    files: sourceFiles.map((path) => [path, sha256(readFileSync(resolve(path)))]),
  });
  const definitions = buildAllR555MaterialFirstDefinitions();
  const releaseKey = `r555-material-first-regression-${sourceTree.slice(0, 12)}`;
  const releaseId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:release:${releaseKey}`);
  const priceRouteId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:price-route:${releaseId}`);
  const priceSnapshotId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:price-snapshot:${releaseId}:2026-08-26`);
  const capabilityId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:capability:${CONSUMER_TENANT_ID}:${releaseId}`);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r555-material-first-apply" : "r555-material-first-dry-run",
  });
  await client.connect();
  let receipt: Json | undefined;
  try {
    await client.query("begin isolation level serializable");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='120s'");
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1 for share",
      [PREDECESSOR_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared", "R555_PREDECESSOR_NOT_PREPARED");
    const search = (await client.query(
      "select id::text,status from public.estimate_search_index_release where id=$1",
      [SEARCH_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(search?.id === SEARCH_RELEASE_ID, "R555_SEARCH_RELEASE_UNAVAILABLE");
    const existing = (await client.query(
      "select id::text,status,source_tree from public.estimate_definition_release where release_key=$1",
      [releaseKey],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared" && existing.source_tree === sourceTree,
        "R555_EXISTING_CANDIDATE_DRIFT");
      await client.query("rollback");
      receipt = {
        schema_version: R555_MATERIAL_FIRST_CONTRACT,
        generated_utc: new Date().toISOString(),
        mode: APPLY ? "APPLY_IDEMPOTENT" : "DRY_RUN_EXISTING",
        master_sha256: MASTER_SHA256,
        release_id: releaseId,
        release_key: releaseKey,
        search_release_id: SEARCH_RELEASE_ID,
        source_head: head,
        source_tree: sourceTree,
        idempotent: true,
        production_accessed: false,
        deployed: false,
        merged: false,
        released: false,
        ota: false,
        status: "GREEN_EXISTING_PREPARED_LOCAL_REGRESSION_CANDIDATE",
      };
      writeJson(OUTPUT, { ...receipt, payload_sha256: sha256(receipt) });
      process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
      return;
    }

    const predecessorTargets = (await client.query(`
      select manifest.catalog_id,manifest.definition_version_id::text old_definition_id,
        manifest.approved_template_baseline_id::text old_baseline_id,definition.definition_version,
        (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameter_count,
        (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formula_count,
        (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resource_count
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      order by manifest.catalog_id
    `, [PREDECESSOR_RELEASE_ID, definitions.map((row) => row.catalogId)])).rows as Json[];
    invariant(predecessorTargets.length === 2, `R555_PREDECESSOR_TARGET_COUNT:${predecessorTargets.length}`);
    const predecessorByCatalog = new Map(predecessorTargets.map((row) => [String(row.catalog_id), row]));
    const oldCounts = predecessorTargets.reduce((sum, row) => ({
      parameters: sum.parameters + Number(row.parameter_count),
      formulas: sum.formulas + Number(row.formula_count),
      resources: sum.resources + Number(row.resource_count),
    }), { parameters: 0, formulas: 0, resources: 0 });
    const newCounts = definitions.reduce((sum, definition) => ({
      parameters: sum.parameters + definition.parameters.length,
      formulas: sum.formulas + definition.formulas.length,
      resources: sum.resources + definition.resources.length,
    }), { parameters: 0, formulas: 0, resources: 0 });
    const releaseCounts = {
      definitions: Number(predecessor.definition_count),
      parameters: Number(predecessor.parameter_count) - oldCounts.parameters + newCounts.parameters,
      formulas: Number(predecessor.formula_count) - oldCounts.formulas + newCounts.formulas,
      resources: Number(predecessor.resource_row_count) - oldCounts.resources + newCounts.resources,
    };
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
      releaseId,
      releaseKey,
      predecessor.schema_version,
      head,
      sourceTree,
      sha256({ masterSha256: MASTER_SHA256, definitions: definitions.map((row) => row.definitionSha256) }),
      releaseCounts.definitions,
      releaseCounts.resources,
      JSON.stringify({
        contract: R555_MATERIAL_FIRST_CONTRACT,
        masterSha256: MASTER_SHA256,
        predecessorReleaseId: PREDECESSOR_RELEASE_ID,
        searchReleaseId: SEARCH_RELEASE_ID,
        localDisposable: true,
        regressionOnly: true,
        activeReleaseSwitched: false,
        searchCutover: false,
        productionAccessed: false,
      }),
      PREDECESSOR_RELEASE_ID,
      sha256({ contract: R555_MATERIAL_FIRST_CONTRACT, sourceTree, definitions }),
      releaseCounts.parameters,
      releaseCounts.formulas,
    ]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state
    ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
      encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
      runtime_publication_state
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [
      releaseId,
      R555_MATERIAL_FIRST_CONTRACT,
      PREDECESSOR_RELEASE_ID,
    ]);

    for (const definition of definitions) {
      const predecessorTarget = predecessorByCatalog.get(definition.catalogId)!;
      const definitionId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:definition:${definition.catalogId}:${definition.definitionSha256}`);
      const baselineId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:baseline:${definition.catalogId}:${definition.definitionSha256}`);
      const nextVersion = Number(predecessorTarget.definition_version) + 1;
      const parameterSchemaSha256 = sha256(definition.parameters.map((row) => [
        row.parameterId, row.ordinal, row.valueType, row.unitId, row.required, row.constraints,
      ]));
      await client.query(`insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata,
        content_status,content_gate_status
      ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
        definitionId,
        releaseId,
        definition.catalogId,
        nextVersion,
        JSON.stringify(definition.passport),
        JSON.stringify(definition.applicability),
        definition.definitionSha256,
        JSON.stringify({
          contract: R555_MATERIAL_FIRST_CONTRACT,
          masterSha256: MASTER_SHA256,
          sourceTree,
          predecessorDefinitionId: predecessorTarget.old_definition_id,
          materialFirst: true,
          workSpecificApplicability: true,
          paddingRows: 0,
          genericRows: 0,
          epsilonRows: 0,
        }),
      ]);
      const formulaConsumers = Object.fromEntries(definition.parameters.map((parameter) => [
        parameter.parameterId,
        definition.formulas.filter((formula) => formula.inputParameterIds.includes(parameter.parameterId)).map((formula) => formula.formulaId),
      ]));
      const resourceConsumers = Object.fromEntries(definition.parameters.map((parameter) => {
        const formulaIds = new Set((formulaConsumers[parameter.parameterId] ?? []) as string[]);
        return [parameter.parameterId, definition.resources.filter((resource) =>
          formulaIds.has(resource.formulaId) || parameter.parameterId === "work_included").map((resource) => resource.rowId)];
      }));
      for (const parameter of definition.parameters) {
        await client.query(`insert into public.estimate_parameter_definition(
          definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,
          constraints_json,truth_metadata,approved_template_baseline_id
        ) values($1,$2,$3,$4,$5,$6,$7,null,$8::jsonb,$9::jsonb,null)`, [
          definitionId,
          parameter.parameterId,
          parameter.ordinal,
          parameter.valueType,
          parameter.unitId,
          parameter.titleRu,
          parameter.required,
          JSON.stringify(parameter.constraints),
          JSON.stringify({
            contract: R555_MATERIAL_FIRST_CONTRACT,
            semantic_parameter_key: `${definition.catalogId}:${parameter.parameterId}`,
            value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
            formula_consumers: formulaConsumers[parameter.parameterId],
            resource_branch_consumers: resourceConsumers[parameter.parameterId],
            provenance: {
              baselineOwner: "approved-template-baseline:r54",
              sourceCatalogId: definition.catalogId,
              sourceReleaseId: releaseId,
              sourceDefinitionVersionId: definitionId,
              sourceParameterSchemaId: parameterSchemaSha256,
              approvedTemplateBaselineId: baselineId,
            },
          }),
        ]);
      }
      for (const formula of definition.formulas) {
        await client.query(`insert into public.estimate_formula_graph(
          definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)`, [
          definitionId,
          formula.formulaId,
          formula.outputUnitId,
          formula.expressionSource,
          JSON.stringify(formula.ast),
          formula.inputParameterIds,
          formula.astSha256,
        ]);
      }
      const resourceIdByRow = new Map<string, string>();
      for (const resource of definition.resources) {
        const resourceId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:resource:${definitionId}:${resource.rowId}`);
        resourceIdByRow.set(resource.rowId, resourceId);
        await client.query(`insert into public.estimate_resource_spec(
          id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
          inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
          resourceId,
          definitionId,
          resource.rowId,
          resource.ordinal,
          resource.section,
          resource.category,
          resource.titleRu,
          resource.rowType,
          resource.unitId,
          resource.formulaId,
          JSON.stringify(resource.inclusionAst),
          JSON.stringify(resource.resourceGraph),
          resource.semanticOwner,
          resource.costOwnerId,
          resource.procurementEligible,
          JSON.stringify(resource.sourceMetadata),
          resource.rowSha256,
        ]);
      }
      const baselineAcceptanceSha = sha256({
        contract: R555_MATERIAL_FIRST_CONTRACT,
        catalogId: definition.catalogId,
        definitionId,
        parameterSchemaSha256,
        baseline: definition.baseline,
        resources: definition.resources.map((row) => row.rowSha256),
      });
      await client.query(`insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
        input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
        normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
        acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
      ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,
        $14::jsonb,$15::jsonb,$16,$17,now(),$18,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
        baselineId,
        `r555-material-first:${definition.catalogId}:${sourceTree.slice(0, 12)}`,
        definition.catalogId,
        definitionId,
        predecessorTarget.old_definition_id,
        parameterSchemaSha256,
        JSON.stringify(definition.baseline),
        JSON.stringify(Object.fromEntries(Object.keys(definition.baseline).map((key) => [key, "ASSUMPTION"]))),
        JSON.stringify(Object.fromEntries(definition.parameters.map((row) => [row.parameterId, row.unitId]))),
        JSON.stringify(formulaConsumers),
        JSON.stringify(resourceConsumers),
        JSON.stringify(Object.fromEntries(definition.parameters.map((row) => [row.parameterId, ["krer_06_2015", "approved_project_baseline_r555"]]))),
        JSON.stringify(Object.fromEntries(definition.parameters.map((row) => [row.parameterId, row.titleRu]))),
        JSON.stringify([{ contract: R555_MATERIAL_FIRST_CONTRACT, masterSha256: MASTER_SHA256, sourceTree }]),
        JSON.stringify([{ scenario: "R555_DEFAULT_MATERIAL_FIRST", expectedRows: definition.resources.length, epsilonRows: 0, genericRows: 0 }]),
        baselineAcceptanceSha,
        releaseId,
        predecessorTarget.old_baseline_id,
      ]);
      const contentDecision = {
        contract: "real-professional-estimates-r3.content-passport.v1",
        allowed: true,
        status: "GREEN",
        materialFirst: true,
        workSpecificApplicability: true,
        paddingRows: 0,
        genericRows: 0,
        epsilonRows: 0,
        publicEnglishWords: 0,
      };
      await client.query(`insert into public.estimate_content_passport_r3(
        definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
        physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,formula_count,
        resource_count,decision,payload_sha256,source_head,source_tree
      ) values($1,$2,$3,'real-professional-estimates-r3.content-passport.v1','WORK',null,$4,$5::jsonb,$6::jsonb,
        $7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14)`, [
        definitionId,
        releaseId,
        definition.catalogId,
        definition.physicalResultRu,
        JSON.stringify(definition.includedScopeRu),
        JSON.stringify(definition.excludedScopeRu),
        JSON.stringify([
          { capability: "PARAMETERS", status: "GREEN" },
          { capability: "FORMULAS", status: "GREEN" },
          { capability: "RESOURCES", status: "GREEN" },
          { capability: "PRICE_AND_PROCUREMENT", status: "GREEN_WITH_SNAPSHOT" },
        ]),
        definition.parameters.length,
        definition.formulas.length,
        definition.resources.length,
        JSON.stringify(contentDecision),
        sha256({ definitionId, definitionSha256: definition.definitionSha256, contentDecision }),
        head,
        sourceTree,
      ]);
      await client.query(`update public.estimate_definition_version set
        content_status='CANDIDATE_READY',content_gate_status='GREEN' where id=$1`, [definitionId]);
      await client.query(`update public.estimate_cumulative_manifest_entry set
        definition_version_id=$3,source_batch='R555_MATERIAL_FIRST_REGRESSION',source_release_id=$1,
        publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$4,baseline_ready=true,
        scenario_ready=true,definition_hash=$5,entry_sha256=$6
        where release_id=$1 and catalog_id=$2`, [
        releaseId,
        definition.catalogId,
        definitionId,
        baselineId,
        definition.definitionSha256,
        sha256({ contract: R555_MATERIAL_FIRST_CONTRACT, releaseId, catalogId: definition.catalogId, definitionId, baselineId }),
      ]);
      await client.query("update public.estimate_work_identity set title_ru=$2 where catalog_id=$1", [
        definition.catalogId,
        definition.titleRu,
      ]);
    }

    await client.query(`insert into public.estimate_price_route(
      id,route_key,currency_code,region_code,priority,source_kind,metadata,active
    ) values($1,$2,'KGS','KG-B',1,'manual',$3::jsonb,true)`, [
      priceRouteId,
      `r555-material-first-regression:${releaseId}`,
      JSON.stringify({
        contract: R555_MATERIAL_FIRST_CONTRACT,
        purpose: "LOCAL_ACCEPTANCE_PRICE_SCHEDULE_NOT_A_PRODUCTION_MARKET_CLAIM",
        sourceOffers: [
          "https://bbz.kg/price/",
          "https://metalltorg.kg/",
          "https://mtt.kg/stal/provoloka-vyazalnaya-1-2-mm",
          "https://kg.prom23.ru/catalog/opalubka/fiksatory-armatury/betonnye/id-betonnyyfiksatorarmaturypiramida40meshok200shtuk/",
        ],
        localScheduleOwner: "R555_LOCAL_REVIEW_TENANT",
        productionEligible: false,
      }),
    ]);
    const allResources = definitions.flatMap((definition) => definition.resources.map((resource) => ({ definition, resource })));
    for (const { definition, resource } of allResources) {
      const definitionId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:definition:${definition.catalogId}:${definition.definitionSha256}`);
      const resourceId = uuid(`${R555_MATERIAL_FIRST_CONTRACT}:resource:${definitionId}:${resource.rowId}`);
      await client.query(`insert into public.estimate_resource_price_route_binding(
        resource_spec_id,route_id,price_key,priority
      ) values($1,$2,$3,1)`, [resourceId, priceRouteId, resource.costOwnerId]);
    }
    const pricePayload = allResources.map(({ resource }) => {
      const rowKey = resource.rowId.split(":").at(-1)!;
      return { priceKey: resource.costOwnerId, unitId: resource.unitId, ...unitPrice(rowKey) };
    });
    await client.query(`insert into public.estimate_price_snapshot(
      id,route_id,snapshot_key,captured_at,valid_until,currency_code,payload_sha256,source_metadata
    ) values($1,$2,$3,$4,$5,'KGS',$6,$7::jsonb)`, [
      priceSnapshotId,
      priceRouteId,
      `r555-local-review-2026-08-26:${sourceTree.slice(0, 12)}`,
      "2026-08-26T00:00:00+06:00",
      "2026-09-02T23:59:59+06:00",
      sha256(pricePayload),
      JSON.stringify({
        contract: R555_MATERIAL_FIRST_CONTRACT,
        region: "Бишкек",
        effectiveDate: "2026-08-26",
        vatMode: "Указано источником либо контрольной ведомостью",
        scheduleClass: "LOCAL_ACCEPTANCE_ONLY",
        productionMarketClaim: false,
      }),
    ]);
    for (const row of pricePayload) {
      await client.query(`insert into public.estimate_price_snapshot_item(
        snapshot_id,price_key,unit_id,unit_price,currency_code,source_row
      ) values($1,$2,$3,$4,'KGS',$5::jsonb)`, [
        priceSnapshotId,
        row.priceKey,
        row.unitId,
        row.value,
        JSON.stringify({
          sourceClass: row.sourceClass,
          effectiveDate: "2026-08-26",
          vatMode: "SOURCE_OR_LOCAL_SCHEDULE",
          localAcceptanceOnly: row.sourceClass.startsWith("LOCAL_ACCEPTED_"),
        }),
      ]);
    }
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
    ) values($1,'r555-web80-real-auth',$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)`, [
      capabilityId,
      CONSUMER_TENANT_ID,
      releaseId,
      SEARCH_RELEASE_ID,
      new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      head,
      sourceTree,
      "prepareR555MaterialFirstRegressionCandidate",
    ]);
    await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=now()
      where id=$1 and status='draft' and sealed_at is null`, [releaseId]);
    const measured = (await client.query(`select
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
      (select count(*)::int from public.estimate_definition_version where release_id=$1) changed_definition_count,
      (select count(*)::int from public.estimate_resource_spec resource join public.estimate_definition_version definition
        on definition.id=resource.definition_version_id where definition.release_id=$1) changed_resource_count,
      (select count(*)::int from public.estimate_price_snapshot_item where snapshot_id=$2) price_item_count,
      (select count(*)::int from public.estimate_definition_version where release_id=$1
        and content_status='CANDIDATE_READY' and content_gate_status='GREEN') green_definition_count
    `, [releaseId, priceSnapshotId])).rows[0] as Json;
    invariant(Number(measured.manifest_count) === Number(predecessor.definition_count), "R555_MANIFEST_COUNT_DRIFT");
    invariant(Number(measured.changed_definition_count) === 2, "R555_CHANGED_DEFINITION_COUNT_DRIFT");
    invariant(Number(measured.changed_resource_count) === 50, "R555_CHANGED_RESOURCE_COUNT_DRIFT");
    invariant(Number(measured.price_item_count) === 50, "R555_PRICE_ITEM_COUNT_DRIFT");
    invariant(Number(measured.green_definition_count) === 2, "R555_GREEN_DEFINITION_COUNT_DRIFT");
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    receipt = {
      schema_version: R555_MATERIAL_FIRST_CONTRACT,
      generated_utc: new Date().toISOString(),
      mode: APPLY ? "APPLY" : "DRY_RUN_ROLLED_BACK",
      master_sha256: MASTER_SHA256,
      branch,
      source_head: head,
      source_tree: sourceTree,
      predecessor_release_id: PREDECESSOR_RELEASE_ID,
      candidate_release_id: releaseId,
      candidate_release_key: releaseKey,
      search_release_id: SEARCH_RELEASE_ID,
      capability_id: capabilityId,
      tenant_id: CONSUMER_TENANT_ID,
      price_snapshot_id: priceSnapshotId,
      price_snapshot_class: "LOCAL_ACCEPTANCE_ONLY_NOT_PRODUCTION_MARKET_CLAIM",
      definitions: definitions.map((definition) => ({
        catalog_id: definition.catalogId,
        title_ru: definition.titleRu,
        definition_sha256: definition.definitionSha256,
        parameters: definition.parameters.length,
        formulas: definition.formulas.length,
        resources: definition.resources.length,
        categories: Object.fromEntries([...new Set(definition.resources.map((row) => row.category))]
          .map((category) => [category, definition.resources.filter((row) => row.category === category).length])),
        missing: [],
      })),
      predecessor_replaced_counts: oldCounts,
      successor_counts: newCounts,
      effective_release_counts: releaseCounts,
      measured,
      active_release_switched: false,
      search_cutover: false,
      runtime_switched: false,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
      status: APPLY
        ? "GREEN_LOCAL_REGRESSION_CANDIDATE_PREPARED_NOT_ACTIVE"
        : "GREEN_DRY_RUN_ROLLED_BACK_NO_PERSISTED_WRITES",
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
  writeJson(OUTPUT, { ...receipt!, payload_sha256: sha256(receipt) });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
