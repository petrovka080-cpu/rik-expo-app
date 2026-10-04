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
const CATALOG = "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_install_large_area";
const OUTPUT = resolve(".release-runtime/r568/s27-31/p113-accepted-order-current/independent-acceptance.json");
const SOURCE = resolve("data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json");
const PREFIX = "ceiling-p113-full:";
const OWNERS = ["02:material:pp-profile-pieces", "02:component:extensions", "02:component:connectors", "02:component:hangers",
  "02:fastener:hanger-anchors", "02:fastener:ln-packages", "02:material:pn-profile-pieces", "02:fastener:perimeter-packages",
  "02:consumable:sealing-tape-rolls", "03:material:gsp-sheets", "03:fastener:tn25-packages", "04:material:joint-compound-bags",
  "04:material:joint-tape-rolls", "04:material:separation-tape-rolls", "05:material:primer-cans", "05:consumable:abrasive", "06:material:control-joint-pieces"].map(id => PREFIX + id);
const CONTROLS = ["02:control:pp-profile-order", "02:control:pp-profile-remainder", "03:control:gsp-order", "03:control:gsp-remainder",
  "04:control:joint-compound-remainder", "04:control:joint-tape-remainder", "05:control:primer-remainder"].map(id => PREFIX + id);
const BINDINGS = [
  { owner: "02:material:pp-profile-pieces", alias: "p113_effective_pp_items" },
  { owner: "03:material:gsp-sheets", alias: "p113_effective_board_items" },
  { owner: "04:material:joint-compound-bags", alias: "p113_effective_compound_items" },
  { owner: "04:material:joint-tape-rolls", alias: "p113_effective_joint_tape_items" },
  { owner: "05:material:primer-cans", alias: "p113_effective_primer_items" },
] as const;
const CONTROL_BINDINGS = [
  { row: "02:control:pp-profile-order", alias: "p113_effective_pp_items", unit: "m" },
  { row: "02:control:pp-profile-remainder", alias: "p113_effective_pp_items", unit: "m" },
  { row: "03:control:gsp-order", alias: "p113_effective_board_items", unit: "m2" },
  { row: "03:control:gsp-remainder", alias: "p113_effective_board_items", unit: "m2" },
  { row: "04:control:joint-compound-remainder", alias: "p113_effective_compound_items", unit: "kg" },
  { row: "04:control:joint-tape-remainder", alias: "p113_effective_joint_tape_items", unit: "m" },
  { row: "05:control:primer-remainder", alias: "p113_effective_primer_items", unit: "l" },
] as const;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const sameIds = (actual: string[], expected: unknown) => Array.isArray(expected) && expected.length === actual.length
  && new Set(expected).size === actual.length && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));

async function main() {
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
  const uri = new URL(databaseUrl);
  invariant(uri.hostname === "127.0.0.1" && uri.port === "55432" && uri.pathname === "/rik_r4_runtime_b5_v2", "STOP_P113_DB_IDENTITY");
  const current = JSON.parse(readFileSync(resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"), "utf8")) as Json;
  const db = new Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const identity = (await db.query("select current_database() database,inet_server_port() port")).rows[0];
    const release = (await db.query("select id::text,status,activated_at,source_manifest_sha256 from public.estimate_definition_release where id=$1", [current.definitionReleaseId])).rows[0];
    invariant(release?.status === "prepared" && release.activated_at == null, "STOP_P113_RELEASE");
    const target = (await db.query(`select m.definition_version_id::text,m.runtime_publication_state,m.approved_template_baseline_id::text,
      d.definition_version,d.content_status,d.content_gate_status,d.applicability,p.parameter_count,p.formula_count,p.resource_count
      from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_content_passport_r3 p on p.definition_version_id=m.definition_version_id where m.release_id=$1 and m.catalog_id=$2`, [current.definitionReleaseId, CATALOG])).rows[0] as Json;
    invariant(target?.runtime_publication_state === "CANDIDATE" && target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN"
      && target.applicability.wholeSelectedSupplyOwners === 17, "STOP_P113_TARGET_GATE");
    invariant([target.parameter_count, target.formula_count, target.resource_count].map(Number).join(":") === "43:38:54", "STOP_P113_SHAPE");
    const parameters = (await db.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateParameterDefinition[];
    const formulas = (await db.query("select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await db.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await db.query("select input_values,input_classification,normative_source_ids from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0];
    const search = (await db.query(`select d.definition_version_id::text,d.selectable,r.status from public.estimate_search_document d
      join public.estimate_search_index_release r on r.id=d.search_release_id where d.search_release_id=$1 and d.catalog_id=$2`, [current.searchReleaseId, CATALOG])).rows[0];
    invariant(search?.status === "draft" && search.selectable === true && search.definition_version_id === target.definition_version_id, "STOP_P113_SEARCH_JOIN");
    const locator = (await db.query(`select l.locator from public.estimate_work_normative_binding b join public.estimate_normative_locator l on l.id=b.locator_id
      where b.definition_version_id=$1 and l.locator_key=$2`, [target.definition_version_id, "drywall-ceiling-p113-accepted-order-s27-31"])).rows[0]?.locator as Json;
    invariant(locator?.sourcePackSha256 === sha(readFileSync(SOURCE)) && parameters.length === 43 && formulas.length === 38 && resources.length === 54
      && sameIds(resources.map(row => row.row_id), locator.expectedResourceIds) && sameIds(formulas.map(row => row.formula_id), locator.expectedFormulaIds)
      && sameIds(OWNERS, locator.selectedSupplyOwnerIds) && sameIds(CONTROLS, locator.effectiveControlRowIds), "STOP_P113_EXACT_MATRIX_SOURCE_JOIN");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0, "STOP_P113_FORMULA_DRIFT");
    const ids = new Set(parameters.map(parameter => parameter.parameter_id));
    const byFormula = new Map(formulas.map(formula => [formula.formula_id, formula]));
    for (const resource of resources) {
      const graph = resource.resource_graph as Json, formula = byFormula.get(String(graph.formulaId));
      invariant(formula && resource.formula_id === graph.formulaId && formula.output_unit_id === graph.normalizedUom
        && formula.input_parameter_ids?.every(id => ids.has(id)), "STOP_P113_RESOURCE_BINDING");
    }
    invariant(sameIds(resources.filter(row => row.resource_graph.purchaseBalanceV1).map(row => row.row_id), OWNERS), "STOP_P113_17_OWNERS");
    for (const ownerId of OWNERS) {
      const owner = resources.find(row => row.row_id === ownerId)!, policy = (owner.resource_graph as Json).purchaseBalanceV1;
      invariant(owner.unit_id === "item" && policy.unitId === "item" && policy.quantityMode === "supply_quantum" && policy.orderQuantumExpression === "1"
        && policy.balanceScope === "new_order_vs_required_consumption" && policy.requirementBasis === "selected_order_including_contingency"
        && policy.stockExpression === "0" && policy.reserveExpression === "0" && policy.consumedExpression === byFormula.get(owner.formula_id)!.expression_source,
      "STOP_P113_SELECTED_SUPPLY_BINDING");
    }
    const aliases = parameters.filter(parameter => parameter.truth_metadata?.visibility_role === "INTERNAL_ONLY");
    invariant(sameIds(aliases.map(alias => alias.parameter_id), BINDINGS.map(binding => binding.alias))
      && locator.effectiveOutputBindings?.length === 5
      && sameIds(resources.filter(row => row.resource_graph.effectiveQuantityOutputV1).map(row => row.row_id), BINDINGS.map(binding => PREFIX + binding.owner)), "STOP_P113_ALIAS_COUNT");
    for (const binding of BINDINGS) {
      const alias = aliases.find(parameter => parameter.parameter_id === binding.alias), owner = resources.find(row => row.row_id === PREFIX + binding.owner);
      const declared = (locator.effectiveOutputBindings as Json[]).filter(value => value.ownerRowId === PREFIX + binding.owner);
      invariant(declared.length === 1 && declared[0].parameterId === binding.alias && declared[0].unitId === "item"
        && alias?.default_value == null && alias?.required === false && (alias as Json)?.unit_id === "item"
        && (alias.truth_metadata?.effective_resource_quantity_v1 as Json)?.sourceRowId === PREFIX + binding.owner
        && (alias.truth_metadata?.effective_resource_quantity_v1 as Json)?.unitId === "item"
        && (owner?.resource_graph as Json)?.effectiveQuantityOutputV1?.parameterId === binding.alias
        && (owner?.resource_graph as Json)?.effectiveQuantityOutputV1?.unitId === "item", "STOP_P113_ALIAS_BINDING");
    }
    for (const binding of CONTROL_BINDINGS) {
      const resource = resources.find(row => row.row_id === PREFIX + binding.row), formula = resource && byFormula.get(resource.formula_id);
      invariant(resource?.unit_id === binding.unit && formula?.output_unit_id === binding.unit
        && sameIds(formula.input_parameter_ids.filter(id => BINDINGS.some(value => value.alias === id)), [binding.alias]), "STOP_P113_EFFECTIVE_CONTROL_DEPENDENCY");
    }
    const controls = [];
    for (const [pp, board, ppOrder, ppExcess, boardOrder, boardExcess, deficit] of [
      [null, null, "1524", "74", "525.6", "25.6", false], ["510", "220", "1530", "80", "528", "28", false], ["500", "210", "1500", "50", "504", "4", true],
    ] as const) {
      const result = await compileCanonicalEstimateCore({ operation: pp ? "recalculate" : "compile", compilerVersion: "s27-31-p113-independent-db-readback", catalogId: CATALOG,
        primaryMeasureParameterId: "area_m2", parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: resources,
        submittedParameters: { area_m2: 500, room_length_m: 25, room_width_m: 20, control_joint_length_m: 20 },
        confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline), rowOverrides: pp ? {
          [PREFIX + "02:material:pp-profile-pieces"]: { quantity: pp, includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE whole selected supply" } },
          [PREFIX + "03:material:gsp-sheets"]: { quantity: board!, includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE whole selected supply" } },
          ...(pp === "510" ? Object.fromEntries([
            ["04:material:joint-compound-bags", "10"], ["04:material:joint-tape-rolls", "10"], ["05:material:primer-cans", "7"],
          ].map(([id, quantity]) => [PREFIX + id, { quantity, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE whole selected supply" } }])) : {}),
        } : {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: 54, hashJson: async value => sha(JSON.stringify(value)) });
      const row = (id: string) => result.rows.find(value => value.row_id === PREFIX + id)!;
      const balance = (row("02:material:pp-profile-pieces").calculation_trace as Json).purchaseBalance;
      invariant(result.rows.length === 54 && result.preliminaryNeeds.length === 0 && row("02:control:pp-profile-order").quantity === ppOrder
        && row("02:control:pp-profile-remainder").quantity === ppExcess && row("03:control:gsp-order").quantity === boardOrder
        && row("03:control:gsp-remainder").quantity === boardExcess && balance.plannedConsumption === "484" && balance.requiredSelectedOrder === "508"
        && balance.quantum === "1" && balance.consumptionShortage === (deficit ? "8" : "0")
        && row("02:material:pp-profile-pieces").included_in_procurement === !deficit && row("03:material:gsp-sheets").included_in_procurement === !deficit
        && row("02:control:pp-profile-net").quantity === "1450" && row("03:control:gsp-net").quantity === "500"
        && row("03:operation:board-installation").quantity === "500" && row("01:delivery:materials").quantity === "1"
        && row("04:control:joint-compound-remainder").quantity === (pp === "510" ? "50" : "25")
        && row("04:control:joint-tape-remainder").quantity === (pp === "510" ? "150" : "75")
        && row("05:control:primer-remainder").quantity === (pp === "510" ? "20" : "10"), "STOP_P113_CONTROL");
      if (deficit) {
        let code: unknown; try { assertCanonicalPurchaseReadinessV1(result.rows); } catch (error) { code = (error as { code?: unknown }).code; }
        invariant(code === "PROCUREMENT_MATERIAL_SHORTAGE", "STOP_P113_SHORTAGE_READINESS");
      }
      controls.push({ acceptedPp: pp ?? "508", acceptedBoard: board ?? "219", ppOrder, ppExcess, boardOrder, boardExcess, balance, deficit });
    }
    const receipt = { contract: "s27-31-p113-accepted-order-independent-readback/v1", status: "GREEN_LOCAL_DB_DEFINITION_CONTROLS", capturedAt: new Date().toISOString(),
      identity, release, currentSearchReleaseId: current.searchReleaseId, target, matrixSha256: sha(JSON.stringify(locator)), controls, dbWrites: false,
      actualWriter: false, nativeAcceptance: false, ordinaryActorAcceptance: false };
    mkdirSync(dirname(OUTPUT), { recursive: true }); writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: receipt.status, outputPath: OUTPUT, target: target.definition_version_id })}\n`);
  } finally { await db.end(); }
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
