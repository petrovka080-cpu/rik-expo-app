import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { canonicalApprovedBaselineRuntimeParameters } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateResourceDefinition } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { assertCanonicalPurchaseReadinessV1 } from "../../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { validateMasterFormulaGraphConsistency } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const CATALOG = "canonical-work:base:electrical_interior_cable_channel_install_standard";
const OUTPUT = resolve(".release-runtime/r568/s27-31/elecor-accepted-order-current/independent-acceptance.json");
const SOURCE = resolve("data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json");
const PREFIX = "electrical-elecor:";
const OWNERS = ["02:material:channel-packs", "02:consumable:cutting-blades", "03:fastener:packages", "03:consumable:drill-bits",
  "04:component:straight-connector-sets", "05:component:inner-corner-sets", "05:component:outer-corner-sets", "05:component:flat-angle-sets",
  "05:component:tee-sets", "05:component:end-cap-sets", "07:consumable:waste-bags"].map(id => PREFIX + id);
const CONTROLS = ["02:control:channel-order", "02:control:channel-remainder", "03:control:fastener-order", "03:control:fastener-remainder",
  "04:control:straight-connector-order", "04:control:straight-connector-remainder"].map(id => PREFIX + id);
const BINDINGS = [
  { owner: "02:material:channel-packs", alias: "elecor_effective_channel_packs" },
  { owner: "03:fastener:packages", alias: "elecor_effective_fastener_packages" },
  { owner: "04:component:straight-connector-sets", alias: "elecor_effective_connector_sets" },
] as const;
const CONTROL_BINDINGS = [
  { row: "02:control:channel-order", alias: "elecor_effective_channel_packs", unit: "m" },
  { row: "02:control:channel-remainder", alias: "elecor_effective_channel_packs", unit: "m" },
  { row: "03:control:fastener-order", alias: "elecor_effective_fastener_packages", unit: "item" },
  { row: "03:control:fastener-remainder", alias: "elecor_effective_fastener_packages", unit: "item" },
  { row: "04:control:straight-connector-order", alias: "elecor_effective_connector_sets", unit: "item" },
  { row: "04:control:straight-connector-remainder", alias: "elecor_effective_connector_sets", unit: "item" },
] as const;
const TITLE_BINDINGS = [
  { row: "02:material:channel-packs", parameter: "channel_transport_pack_m", type: "decimal", changed: "25" },
  { row: "02:operation:cutting", parameter: "channel_section_length_m", type: "decimal", changed: "2.5" },
  { row: "03:fastener:packages", parameter: "fastener_package_item", type: "integer", changed: "125" },
  { row: "04:component:straight-connector-sets", parameter: "accessory_items_per_set", type: "integer", changed: "5" },
  { row: "05:component:inner-corner-sets", parameter: "accessory_items_per_set", type: "integer", changed: "5" },
  { row: "05:component:outer-corner-sets", parameter: "accessory_items_per_set", type: "integer", changed: "5" },
  { row: "05:component:flat-angle-sets", parameter: "accessory_items_per_set", type: "integer", changed: "5" },
  { row: "05:component:tee-sets", parameter: "accessory_items_per_set", type: "integer", changed: "5" },
  { row: "05:component:end-cap-sets", parameter: "accessory_items_per_set", type: "integer", changed: "5" },
] as const;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const sameIds = (actual: string[], expected: unknown) => Array.isArray(expected) && expected.length === actual.length
  && new Set(expected).size === actual.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));

async function main() {
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
  const uri = new URL(databaseUrl);
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_ELECOR_DB_IDENTITY");
  const current = JSON.parse(readFileSync(resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"), "utf8")) as Json;
  const db = new Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const identity = (await db.query("select current_database() database,inet_server_port() port")).rows[0];
    const release = (await db.query("select id::text,status,activated_at,source_manifest_sha256 from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "STOP_ELECOR_RELEASE");
    const target = (await db.query(`select m.definition_version_id::text,m.runtime_publication_state,m.approved_template_baseline_id::text,
      d.definition_version,d.content_status,d.content_gate_status,d.applicability,p.parameter_count,p.formula_count,p.resource_count
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=m.definition_version_id where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG])).rows[0] as Json;
    invariant(target?.runtime_publication_state === "CANDIDATE" && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN"
      && target.applicability.wholeSelectedSupplyOwners === 11, "STOP_ELECOR_TARGET_GATE");
    invariant([target.parameter_count, target.formula_count, target.resource_count].map(Number).join(":") === "25:33:41", "STOP_ELECOR_SHAPE");
    const parameters = (await db.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateParameterDefinition[];
    const formulas = (await db.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await db.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await db.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0];
    const search = (await db.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG])).rows[0];
    invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_ELECOR_SEARCH_JOIN");
    const locator = (await db.query(`select l.locator from public.estimate_work_normative_binding b join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1 and l.locator_key=$2`, [target.definition_version_id, "electrical-elecor-accepted-order-s27-31"])).rows[0]?.locator as Json;
    invariant(locator?.sourcePackSha256 === sha(readFileSync(SOURCE)) && parameters.length === 25 && formulas.length === 33 && resources.length === 41
      && sameIds(resources.map(row => row.row_id), locator.expectedResourceIds) && sameIds(formulas.map(row => row.formula_id), locator.expectedFormulaIds)
      && sameIds(OWNERS, locator.selectedSupplyOwnerIds) && sameIds(CONTROLS, locator.effectiveControlRowIds), "STOP_ELECOR_EXACT_MATRIX_SOURCE_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_ELECOR_FORMULA_DRIFT");
    const ids = new Set(parameters.map(parameter => parameter.parameter_id));
    const byFormula = new Map(formulas.map(formula => [formula.formula_id, formula]));
    for (const resource of resources) {
      const graph = resource.resource_graph as Json, formula = byFormula.get(String(graph.formulaId));
      const kitPerCuttingShift = resource.row_id === "electrical-elecor:02:consumable:cutting-blades"
        && resource.formula_id === "electrical_elecor_cutting_shifts_s2723" && formula?.output_unit_id === "shift"
        && resource.unit_id === "item" && graph.normalizedUom === "item";
      invariant(formula && resource.formula_id === graph.formulaId && (formula.output_unit_id === graph.normalizedUom || kitPerCuttingShift)
        && formula.input_parameter_ids?.every(id => ids.has(id)), "STOP_ELECOR_RESOURCE_BINDING");
    }
    invariant(sameIds(resources.filter(row => row.resource_graph.purchaseBalanceV1).map(row => row.row_id), OWNERS), "STOP_ELECOR_11_OWNERS");
    for (const ownerId of OWNERS) {
      const owner = resources.find(row => row.row_id === ownerId)!, policy = (owner.resource_graph as Json).purchaseBalanceV1;
      invariant(owner.unit_id === "item" && policy.unitId === "item" && policy.quantityMode === "supply_quantum" && policy.orderQuantumExpression === "1"
        && policy.balanceScope === "new_order_vs_required_consumption" && policy.requirementBasis === "selected_order_including_contingency"
        && policy.stockExpression === "0" && policy.reserveExpression === "0" && policy.consumedExpression === byFormula.get(owner.formula_id)!.expression_source
        && policy.plannedConsumptionExpression === (ownerId === PREFIX + "02:material:channel-packs"
          ? "ceil(route_length_m/channel_transport_pack_m)" : byFormula.get(owner.formula_id)!.expression_source),
      "STOP_ELECOR_SELECTED_SUPPLY_BINDING");
    }
    const aliases = parameters.filter(parameter => parameter.truth_metadata?.visibility_role === "INTERNAL_ONLY");
    invariant(sameIds(aliases.map(alias => alias.parameter_id), BINDINGS.map(binding => binding.alias))
      && locator.effectiveOutputBindings?.length === 3
      && sameIds(resources.filter(row => row.resource_graph.effectiveQuantityOutputV1).map(row => row.row_id), BINDINGS.map(binding => PREFIX + binding.owner)), "STOP_ELECOR_ALIAS_COUNT");
    for (const binding of BINDINGS) {
      const alias = aliases.find(parameter => parameter.parameter_id === binding.alias), owner = resources.find(row => row.row_id === PREFIX + binding.owner);
      const declared = (locator.effectiveOutputBindings as Json[]).filter(value => value.ownerRowId === PREFIX + binding.owner);
      invariant(declared.length === 1 && declared[0].parameterId === binding.alias && declared[0].unitId === "item"
        && alias?.default_value == null && alias?.required === false && (alias as Json)?.unit_id === "item"
        && (alias.truth_metadata?.effective_resource_quantity_v1 as Json)?.sourceRowId === PREFIX + binding.owner
        && (alias.truth_metadata?.effective_resource_quantity_v1 as Json)?.unitId === "item"
        && (owner?.resource_graph as Json)?.effectiveQuantityOutputV1?.parameterId === binding.alias
        && (owner?.resource_graph as Json)?.effectiveQuantityOutputV1?.unitId === "item", "STOP_ELECOR_ALIAS_BINDING");
    }
    for (const binding of CONTROL_BINDINGS) {
      const resource = resources.find(row => row.row_id === PREFIX + binding.row), formula = resource && byFormula.get(resource.formula_id);
      invariant(resource?.unit_id === binding.unit && formula?.output_unit_id === binding.unit
        && sameIds(formula.input_parameter_ids.filter(id => BINDINGS.some(value => value.alias === id)), [binding.alias]), "STOP_ELECOR_EFFECTIVE_CONTROL_DEPENDENCY");
    }
    invariant(sameIds(resources.filter(row => row.resource_graph.titleSpecificationParameterIds).map(row => row.row_id),
      TITLE_BINDINGS.map(binding => PREFIX + binding.row)), "STOP_ELECOR_EXACT_TITLE_OWNERS");
    for (const binding of TITLE_BINDINGS) {
      const owner = resources.find(row => row.row_id === PREFIX + binding.row)!, parameter = parameters.find(row => row.parameter_id === binding.parameter);
      invariant(sameIds((owner.resource_graph as Json).titleSpecificationParameterIds, [binding.parameter])
        && owner.resource_graph.titleSpecificationMode === "APPEND" && parameter?.value_type === binding.type,
      "STOP_ELECOR_TYPED_TITLE_BINDING:" + binding.row);
    }
    const controls = [];
    for (const [channel, fastener, connector, channelOrder, channelExcess, fastenerOrder, fastenerExcess, connectorOrder, connectorExcess, deficit] of [
      [null, null, null, "120", "15", "300", "99", "52", "3", false],
      ["6", "4", "14", "144", "39", "400", "199", "56", "7", false],
      ["4", "2", "12", "96", "0", "200", "0", "48", "0", true],
    ] as const) {
      const result = await compileCanonicalEstimateCore({ operation: channel ? "recalculate" : "compile", compilerVersion: "s27-31-elecor-independent-db-readback", catalogId: CATALOG,
        primaryMeasureParameterId: "route_length_m", parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
        submittedParameters: { route_length_m: 100, inner_corner_count: 2, outer_corner_count: 2, flat_angle_count: 1, tee_count: 1, open_end_count: 2 },
        confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline), rowOverrides: channel ? Object.fromEntries([
          ["02:material:channel-packs", channel], ["03:fastener:packages", fastener], ["04:component:straight-connector-sets", connector],
        ].map(([id, quantity]) => [PREFIX + id, { quantity, includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE whole selected supply" } }])) : {},
        priceItems: [], currencyCode: "KGS", maximumResourceRows: 41, hashJson: async value => sha(JSON.stringify(value)) });
      const row = (id: string) => result.rows.find(value => value.row_id === PREFIX + id)!;
      invariant(result.rows.length === 41 && result.preliminaryNeeds.length === 0, "STOP_ELECOR_COMPOSITION");
      for (const [id, expected] of [
        ["02:control:channel-order", channelOrder], ["02:control:channel-remainder", channelExcess],
        ["03:control:fastener-order", fastenerOrder], ["03:control:fastener-remainder", fastenerExcess],
        ["04:control:straight-connector-order", connectorOrder], ["04:control:straight-connector-remainder", connectorExcess],
        ["02:operation:cutting", "50"], ["03:fastener:points", "201"], ["04:component:straight-connectors-net", "49"],
        ["06:operation:channel-installation", "100"], ["06:labor:installer-hours", "25"], ["07:delivery:materials", "1"], ["07:delivery:waste", "1"],
      ]) invariant(row(id).quantity === expected, "STOP_ELECOR_CONTROL:" + id);
      for (const [id, required] of [["02:material:channel-packs", "5"], ["03:fastener:packages", "3"], ["04:component:straight-connector-sets", "13"]]) {
        const owner = row(id), balance = (owner.calculation_trace as Json).purchaseBalance;
        invariant(balance.plannedConsumption === required && balance.requiredSelectedOrder === required && balance.quantum === "1"
          && balance.quantityMode === "supply_quantum" && balance.consumptionShortage === (deficit ? "1" : "0")
          && owner.included_in_procurement === !deficit, "STOP_ELECOR_OWNER_READINESS:" + id);
      }
      if (deficit) {
        let code: unknown; try { assertCanonicalPurchaseReadinessV1(result.rows); } catch (error) { code = (error as { code?: unknown }).code; }
        invariant(code === "PROCUREMENT_MATERIAL_SHORTAGE", "STOP_ELECOR_SHORTAGE_READINESS");
      }
      controls.push({ acceptedChannel: channel ?? "5", acceptedFastener: fastener ?? "3", acceptedConnector: connector ?? "13",
        channelOrder, channelExcess, fastenerOrder, fastenerExcess, connectorOrder, connectorExcess, deficit });
    }
    const repacked = await compileCanonicalEstimateCore({ operation: "compile", compilerVersion: "s27-31-elecor-independent-db-repacked-titles", catalogId: CATALOG,
      primaryMeasureParameterId: "route_length_m", parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
      submittedParameters: { route_length_m: 100, inner_corner_count: 2, outer_corner_count: 2, flat_angle_count: 1, tee_count: 1, open_end_count: 2,
        channel_transport_pack_m: 25, accessory_items_per_set: 5, channel_section_length_m: 2.5, fastener_package_item: 125 },
      confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline), priceItems: [], currencyCode: "KGS", maximumResourceRows: 41,
      hashJson: async value => sha(JSON.stringify(value)) });
    invariant(repacked.rows.length === 41 && repacked.preliminaryNeeds.length === 0, "STOP_ELECOR_REPACKED_COMPOSITION");
    const changedTitles = TITLE_BINDINGS.map(binding => {
      const row = repacked.rows.find(value => value.row_id === PREFIX + binding.row)!;
      invariant(typeof row.title_ru === "string", "STOP_ELECOR_REPACKED_TITLE_TYPE:" + binding.row);
      invariant(row.title_ru.endsWith(` — ${binding.changed}`) && !/по\s+24\s*м|по\s+4\s*шт|длиной\s+2\s*м/u.test(row.title_ru),
        "STOP_ELECOR_REPACKED_PUBLIC_TITLE:" + binding.row);
      return { rowId: row.row_id, parameterId: binding.parameter, titleRu: row.title_ru };
    });
    for (const [id, expected] of [["02:material:channel-packs", "5"], ["02:control:channel-order", "125"], ["02:control:channel-remainder", "20"],
      ["02:operation:cutting", "40"], ["03:fastener:packages", "2"], ["03:control:fastener-order", "250"], ["03:control:fastener-remainder", "49"],
      ["04:component:straight-connector-sets", "8"], ["04:control:straight-connector-order", "40"], ["04:control:straight-connector-remainder", "1"]]) {
      invariant(repacked.rows.find(row => row.row_id === PREFIX + id)?.quantity === expected, "STOP_ELECOR_REPACKED_QUANTITY:" + id);
    }
    const receipt = { contract: "s27-31-elecor-accepted-order-independent-readback/v1", status: "GREEN_LOCAL_DB_DEFINITION_CONTROLS", capturedAt: new Date().toISOString(),
      identity, release, currentSearchReleaseId: current.searchReleaseId, target, matrixSha256: sha(JSON.stringify(locator)), controls, changedTitles, dbWrites: false,
      actualWriter: false, nativeAcceptance: false, ordinaryActorAcceptance: false };
    mkdirSync(dirname(OUTPUT), { recursive: true }); writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: receipt.status, outputPath: OUTPUT, target: target.definition_version_id })}\n`);
  } finally { await db.end(); }
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
