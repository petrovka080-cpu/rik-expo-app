import { mkdirSync } from "node:fs";
import path from "node:path";
import { stableJson, writeDeterministic } from "./postM1ReadmissionR2Core";
import type { ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import { compileProfessionalEstimateDomainV1, constructionNormativeRegistryV1 } from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  ELECTRICAL_DOMAIN_INVENTORY,
  buildElectricalProductionDraftV1,
  electricalCompleteDomainFactory,
  electricalMaximumResourceCandidatesForV2,
} from "../../src/lib/estimate/v4/domains/electricalComplete";

const args = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/u, "").split("=");
  return [key, value.join("=")];
}));
const shardCount = Math.max(1, Number(args["shard-count"] ?? 1));
const shardIndex = Math.max(0, Number(args["shard-index"] ?? 0));
if (!Number.isInteger(shardCount) || !Number.isInteger(shardIndex) || shardIndex >= shardCount) throw new Error("BATCH005_RUNTIME_SHARD_ARGUMENT_RED");

function rawValue(parameter: ProfessionalDomainParameterDefinitionV1, scopeCapability: string, scope: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE"): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scope;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "ELECTRICAL_PROJECT";
  if (parameter.parameter_id === "rated_voltage_v") return 400;
  if (parameter.parameter_id === "phase_count") return 3;
  if (parameter.parameter_id === "earthing_system") return "TN-S";
  if (parameter.parameter_id === "installation_environment") return "PROJECT_SPECIFIED";
  if (parameter.parameter_id === "product_specification_id") return "PROJECT-ELECTRICAL-SPEC-V2";
  if (parameter.parameter_id === "exact_krerm_rate_code") return "KRERM-08-PROJECT-VERIFIED";
  if (parameter.parameter_id === "exact_krerp_rate_code") return "KRERP-01-PROJECT-VERIFIED-OR-N_A_WITH_REASON";
  if (parameter.parameter_id === "price_basis_reference") return "VERIFIED-SUPPLIER-QUOTE-2026-08-14";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-14";
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "text") return `PROJECT_INPUT:${parameter.parameter_id}`;
  return Math.max(parameter.minimum ?? 1, 1);
}

function parameterValues(catalogId: string, scope: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE"): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = electricalCompleteDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`BATCH005_RUNTIME_SCHEMA_MISSING:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scope === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    return [[parameter.parameter_id, {
      value: rawValue(parameter, binding.scope_capability, scope),
      unit_id: parameter.unit_id,
      source_type: parameter.parameter_id.includes("product") ? "MATERIAL_PASSPORT" : parameter.parameter_id.includes("rate_code") || parameter.parameter_id.includes("project") ? "PROJECT_DOCUMENT" : "USER_EXPLICIT",
      source_id: `batch005-v2-runtime:${catalogId}:${parameter.parameter_id}`,
      captured_at: "2026-08-14T00:00:00.000+06:00",
      confidence: "high",
      applicability: `Exact shard fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

const selected = ELECTRICAL_DOMAIN_INVENTORY.filter((_, index) => index % shardCount === shardIndex);
const results = selected.map((inventory) => {
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`BATCH005_RUNTIME_TECHNOLOGY_MISSING:${inventory.catalog_id}`);
  const commonRequest = {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    parent_revision_id: null,
    normative_request: {
      country: "KG" as const,
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED" as const,
      project_type: "ELECTRICAL_PROJECT",
      construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" as const : "NEW" as const,
      contract_basis: [],
      effective_date: "2026-08-14",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        KG_KRERM_08_2015_ELECTRICAL: "KRERM-08-PROJECT-VERIFIED",
        KG_KRERP_01_2015_ELECTRICAL: "KRERP-01-PROJECT-VERIFIED-OR-N_A_WITH_REASON",
      },
    },
  };
  const minimalValues = parameterValues(inventory.catalog_id, "MINIMAL_EXPLICIT_SCOPE");
  const minimal = compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
    ...commonRequest,
    scope_mode: "MINIMAL_EXPLICIT_SCOPE",
    parameter_values: minimalValues,
  });
  if (minimal.status !== "COMPILED" || !minimal.compilation) throw new Error(`BATCH005_RUNTIME_MINIMAL_RED:${inventory.catalog_id}:${minimal.blockers.join("|")}`);
  const fullValues = parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
  const production = buildElectricalProductionDraftV1({
    ...commonRequest,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: fullValues,
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
  if (!production.draft || production.compile_result.status !== "COMPILED" || !production.compile_result.compilation) throw new Error(`BATCH005_RUNTIME_FULL_RED:${inventory.catalog_id}:${production.compile_result.blockers.join("|")}`);
  const expected = electricalMaximumResourceCandidatesForV2(inventory);
  const rows = production.compile_result.compilation.compiled_rows;
  const cold = JSON.parse(JSON.stringify(production.draft)) as typeof production.draft;
  if (rows.length !== expected.length || cold.items.length !== rows.length) throw new Error(`BATCH005_RUNTIME_ROW_DENOMINATOR_RED:${inventory.catalog_id}`);
  if (production.compile_result.compilation.assumptions_count !== 0 || production.compile_result.compilation.hidden_quantity_defaults !== 0) throw new Error(`BATCH005_RUNTIME_HIDDEN_DEFAULT_RED:${inventory.catalog_id}`);
  if (rows.some((row) => row.quantity <= 0 || !row.formula_expression || row.normative_trace_v3.length !== 1 || !row.resource_graph_node_v3 || !row.price_route_v3)) throw new Error(`BATCH005_RUNTIME_TRACE_RED:${inventory.catalog_id}`);
  if (rows.some((row) => row.cost_ownership !== "informational_output" && (row.unit_price ?? 0) <= 0)) throw new Error(`BATCH005_RUNTIME_PRICE_RED:${inventory.catalog_id}`);
  if (cold.items.some((item) => !item.sourceParameters?.smartEstimateProjectionV2 || !item.sourceParameters?.rowCode)) throw new Error(`BATCH005_RUNTIME_WOW_PROJECTION_RED:${inventory.catalog_id}`);
  const procurementRows = rows.filter((row) => row.procurement_eligible).length;
  if (cold.items.filter((item) => item.sourceParameters?.includedInProcurement === true).length !== procurementRows) throw new Error(`BATCH005_RUNTIME_PROCUREMENT_RED:${inventory.catalog_id}`);
  return {
    catalogId: inventory.catalog_id,
    rows: rows.length,
    minimalRows: minimal.compilation.compiled_rows.length,
    durableRows: cold.items.length,
    pdfRows: cold.items.length,
    procurementRows,
    informationalTypedChildRows: rows.filter((row) => row.cost_ownership === "informational_output").length,
    verdict: "GREEN",
  };
});

const report = {
  schemaVersion: "Batch005MaximumDepthRuntimeShardR1",
  shardCount,
  shardIndex,
  works: results.length,
  catalogIds: results.map((result) => result.catalogId),
  rows: results.reduce((sum, result) => sum + result.rows, 0),
  results,
  verdict: "GREEN_RUNTIME_SHARD",
};
if (args.output) {
  const output = path.resolve(args.output);
  mkdirSync(path.dirname(output), { recursive: true });
  writeDeterministic(path.dirname(output), path.basename(output), stableJson(report));
}
process.stdout.write(stableJson({ shardCount, shardIndex, works: report.works, rows: report.rows, verdict: report.verdict }));
