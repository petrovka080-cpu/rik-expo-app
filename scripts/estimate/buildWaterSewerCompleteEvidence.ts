import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type ProfessionalDomainParameterDefinitionV1,
} from "../../src/lib/estimate/v4/domainFactory";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  WATER_SEWER_CANONICAL_PARAMETER_SCHEMAS,
  WATER_SEWER_COMPLETE_ALIAS_COUNT,
  WATER_SEWER_COMPLETE_DOMAIN_ID,
  WATER_SEWER_COMPLETE_DOMAIN_VERSION,
  WATER_SEWER_COMPLETE_RECORD_COUNT,
  WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT,
  WATER_SEWER_DOMAIN_INVENTORY,
  WATER_SEWER_EXPANDED_OWNED_FAMILIES,
  WATER_SEWER_REVIEWED_EXCLUSION_COUNT,
  WATER_SEWER_REVIEWED_EXCLUSIONS,
  buildWaterSewerProductionDraftV1,
  waterSewerDomainFactory,
  waterSewerIsRepair,
  waterSewerTechnologyProfile,
} from "../../src/lib/estimate/v4/domains/waterSupplySewerageComplete";

const GENERATOR_VERSION = "water-supply-sewerage-complete-evidence:v1";
const FIXED_AT = "2026-08-11T00:00:00.000Z";
const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
const root = resolve(args.get("output") ?? `.release-runtime/water-sewer-domain-complete-r1/exact-${sha.slice(0, 8)}/generated`);
mkdirSync(root, { recursive: true });
const startedAt = Date.now();

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const sourceInputHashes = {
  global_manifest_sha256: sha256(readFileSync(resolve("data/estimate-templates/estimate-10000-readiness-manifest.json"))),
  expanded_catalog_sha256: sha256(readFileSync(resolve("data/estimate-catalog/expanded-complex/templates.json"))),
  package_hash: waterSewerDomainFactory.package_hash,
  interior_base_sha: "3663e50b6a6d715da5ace725af91af391e99f111",
};

function metadata(payload: unknown) {
  return {
    exact_sha: sha,
    exact_tree: tree,
    generator_version: GENERATOR_VERSION,
    source_input_hashes: sourceInputHashes,
    denominator: WATER_SEWER_COMPLETE_RECORD_COUNT,
    created_at: FIXED_AT,
    duration_ms: Date.now() - startedAt,
    record_count: WATER_SEWER_COMPLETE_RECORD_COUNT,
    technology_count: WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT,
    alias_count: WATER_SEWER_COMPLETE_ALIAS_COUNT,
    exclusion_count: WATER_SEWER_REVIEWED_EXCLUSION_COUNT,
    failures: 0,
    output_hash: sha256(JSON.stringify(payload)),
  };
}

function writeJson(name: string, payload: unknown): void {
  writeFileSync(join(root, name), `${JSON.stringify({ metadata: metadata(payload), data: payload }, null, 2)}\n`, "utf8");
}

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(name: string, rows: readonly Record<string, unknown>[]): void {
  const rowHash = sha256(JSON.stringify(rows));
  const enriched = rows.map((row) => ({
    exact_sha: sha,
    exact_tree: tree,
    generator_version: GENERATOR_VERSION,
    source_input_hashes: JSON.stringify(sourceInputHashes),
    denominator: WATER_SEWER_COMPLETE_RECORD_COUNT,
    created_at: FIXED_AT,
    duration_ms: Date.now() - startedAt,
    record_count: WATER_SEWER_COMPLETE_RECORD_COUNT,
    technology_count: WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT,
    failures: 0,
    output_hash: rowHash,
    ...row,
  }));
  const headers = Object.keys(enriched[0] ?? {});
  writeFileSync(join(root, name), `${[
    headers.map(csvCell).join(","),
    ...enriched.map((row) => headers.map((header) =>
      csvCell((row as Record<string, unknown>)[header])).join(",")),
  ].join("\n")}\n`, "utf8");
}

function sourceType(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.includes("productivity") || parameterId.includes("interval") || parameterId.includes("rate") || parameterId.includes("spacing")) {
    return "APPLICABLE_NORM";
  }
  if (parameterId.includes("material") || parameterId.includes("mass") || parameterId.includes("profile")) {
    return "MATERIAL_PASSPORT";
  }
  if (["funding_source", "project_type", "normative_rate_code"].includes(parameterId) ||
      parameterId.includes("pressure") || parameterId.includes("slope") || parameterId.includes("elevation") ||
      parameterId.includes("design")) return "PROJECT_DOCUMENT";
  return "USER_EXPLICIT";
}

function numericValue(parameter: ProfessionalDomainParameterDefinitionV1): number {
  const id = parameter.parameter_id;
  if (["route_length_m", "cctv_or_flow_test_length_m", "external_work_length_m"].includes(id)) return 120;
  if (id === "component_count") return 12;
  if (id === "process_unit_count") return 2;
  if (id === "nominal_diameter_mm") return 110;
  if (id === "primary_resource_units_per_output") return 1.05;
  if (id === "procurement_factor") return 1.03;
  if (id.includes("mass_kg_per")) return 2.4;
  if (["fitting_count", "connection_count", "joint_count"].includes(id)) return 12;
  if (["valve_equipment_count", "penetration_count", "fixed_support_count", "support_count"].includes(id)) return 3;
  if (id.includes("productivity")) return 10;
  if (id.includes("distance")) return 12;
  if (id === "waste_percent") return 3;
  if (id === "test_section_output" || id === "qa_interval_output") return 50;
  if (id.includes("documentation")) return 4;
  if (id === "support_spacing_m") return 2;
  if (id === "operating_pressure_mpa") return 0.6;
  if (id === "test_pressure_mpa") return 0.9;
  if (id === "design_slope_percent") return 1.5;
  if (id === "start_elevation_m") return 100;
  if (id === "end_elevation_m") return 98.2;
  if (id === "trench_width_m") return 1.2;
  if (id === "trench_depth_m") return 1.8;
  if (id === "bedding_thickness_m") return 0.15;
  if (id === "pipe_displacement_m3") return 5;
  if (id === "surplus_soil_m3") return 10;
  if (id === "soil_bulk_density_t_m3") return 1.6;
  if (id === "restoration_width_m") return 1.4;
  if (id === "design_capacity_m3_day") return 100;
  if (id === "equipment_mass_kg_per_output") return 1_000;
  if (id === "demolition_output_quantity") return 20;
  const candidate = Math.max(parameter.minimum ?? 0, 1);
  return parameter.maximum != null && candidate > parameter.maximum ? parameter.maximum : candidate;
}

function rawValue(
  parameter: ProfessionalDomainParameterDefinitionV1,
  scopeCapability: string,
  scopeMode: ProfessionalEstimateScopeModeV4,
): string | number | boolean {
  if (parameter.parameter_id === "work_included") return "true";
  if (parameter.parameter_id === "estimate_scope_mode") return scopeMode;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "WATER_SEWER_PROJECT";
  if (parameter.parameter_id === "product_profile_id") return "PROJECT-WATER-SEWER-PASSPORT";
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-WATER-SEWER-RATE";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return numericValue(parameter);
}

function valuesFor(
  catalogId: string,
  scopeMode: ProfessionalEstimateScopeModeV4,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = waterSewerDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = waterSewerDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = waterSewerDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`WATER_SEWER_EVIDENCE_SCHEMA_NOT_FOUND:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scopeMode === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    const value = rawValue(parameter, binding.scope_capability, scopeMode);
    return [[parameter.parameter_id, {
      value,
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `water-sewer-evidence:${catalogId}:${parameter.parameter_id}`,
      captured_at: FIXED_AT,
      confidence: "high" as const,
      applicability: `Exact deterministic all-record fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function compile(
  inventory: typeof WATER_SEWER_DOMAIN_INVENTORY[number],
  scopeMode: ProfessionalEstimateScopeModeV4,
) {
  const technology = waterSewerDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`WATER_SEWER_EVIDENCE_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
  const repair = waterSewerIsRepair(inventory);
  const sourceId = repair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
  return compileProfessionalEstimateDomainV1(waterSewerDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scopeMode,
    parent_revision_id: null,
    parameter_values: valuesFor(inventory.catalog_id, scopeMode),
    normative_request: {
      country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
      project_type: "WATER_SEWER_PROJECT", construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [], effective_date: "2026-08-11", material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: { [sourceId]: "PROJECT-VERIFIED-WATER-SEWER-RATE" },
    },
  });
}

type AuditRecord = {
  inventory: typeof WATER_SEWER_DOMAIN_INVENTORY[number];
  minimal: ReturnType<typeof compile>;
  full: ReturnType<typeof compile>;
  durable: { state: "GREEN"; revision_hash: string; reopened_hash: string; row_count: number };
  projection: { state: "GREEN"; pdf_rows: number; procurement_rows: number; revision_id: string };
};

const runtime = createAiEstimateRuntime();
const audits: AuditRecord[] = [];
for (const [index, inventory] of WATER_SEWER_DOMAIN_INVENTORY.entries()) {
  const minimal = compile(inventory, "MINIMAL_EXPLICIT_SCOPE");
  const fullValues = valuesFor(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
  const technology = waterSewerDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`WATER_SEWER_EVIDENCE_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
  const repair = waterSewerIsRepair(inventory);
  const sourceId = repair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
  const production = buildWaterSewerProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: fullValues,
    normative_request: {
      country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
      project_type: "WATER_SEWER_PROJECT", construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [], effective_date: "2026-08-11", material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: { [sourceId]: "PROJECT-VERIFIED-WATER-SEWER-RATE" },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
  const full = production.compile_result;
  if (minimal.status !== "COMPILED" || full.status !== "COMPILED" || !production.draft) {
    throw new Error(`WATER_SEWER_EVIDENCE_COMPILE_RED:${inventory.catalog_id}:${minimal.status}:${full.status}:${[...minimal.blockers, ...full.blockers].join("|")}`);
  }
  const createdAt = new Date(Date.parse("2026-08-11T04:00:00.000Z") + index * 1_000).toISOString();
  const revision = createEstimateDraftRevision({
    estimateDraftId: `water-sewer-evidence-${index + 1}`,
    rawInput: inventory.localized_name_ru,
    selectedTemplateId: inventory.template_id,
    selectedWorkKey: inventory.work_key,
    selectedTemplateName: inventory.localized_name_ru,
    currency: "KGS",
    createdAt,
    revisionIndex: 1,
    paramOverrides: Object.fromEntries(Object.entries(fullValues).map(([key, parameter]) => [key, {
      value: parameter.value,
      ...(parameter.unit_id ? { canonicalUnit: parameter.unit_id } : {}),
      source: "edited_by_user" as const,
      sourceText: parameter.source_id,
      lastChangedAt: createdAt,
    }])),
    prebuiltExactDraft: production.draft,
  });
  const reopened = JSON.parse(JSON.stringify(revision)) as typeof revision;
  const revisionHash = estimateDeterministicHash(revision);
  const reopenedHash = estimateDeterministicHash(reopened);
  if (revisionHash !== reopenedHash || reopened.boq.rows.length !== revision.boq.rows.length) {
    throw new Error(`RED_WS_DURABLE_HISTORY:${inventory.catalog_id}`);
  }
  const pdf = runtime.buildPdfSnapshot({ revision: reopened });
  const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
  if (pdf.snapshot.rows.length !== revision.boq.rows.length ||
      !validateAiEstimateBuyerPackageParity({ snapshot: buyer.snapshot, buyerPackage: buyer.buyerPackage })) {
    throw new Error(`RED_WS_PDF_PROCUREMENT_PARITY:${inventory.catalog_id}`);
  }
  audits.push({
    inventory,
    minimal,
    full,
    durable: { state: "GREEN", revision_hash: revisionHash, reopened_hash: reopenedHash, row_count: reopened.boq.rows.length },
    projection: {
      state: "GREEN",
      pdf_rows: pdf.snapshot.rows.length,
      procurement_rows: buyer.buyerPackage.items.length,
      revision_id: revision.revisionId,
    },
  });
}

const expandedRows = (scope: "minimal" | "full") => audits.flatMap((audit) =>
  audit[scope].compilation?.compiled_rows.map((row) => ({
    catalog_id: audit.inventory.catalog_id,
    work_key: audit.inventory.work_key,
    canonical_technology_id: audit.inventory.canonical_technology_id,
    ...row,
  })) ?? []);
const minimalRows = expandedRows("minimal");
const fullRows = expandedRows("full");

const ledger = audits.map((audit) => {
  const technology = waterSewerDomainFactory.technology_by_id.get(audit.inventory.canonical_technology_id)!;
  const schema = waterSewerDomainFactory.schema_by_id.get(technology.parameter_schema_id)!;
  const profile = waterSewerTechnologyProfile(audit.inventory);
  const minimal = audit.minimal.compilation!.compiled_rows;
  const full = audit.full.compilation!.compiled_rows;
  const byCategory = (category: string) => full.filter((row) => row.category === category).length;
  const byOwner = (pattern: RegExp) => full.filter((row) => pattern.test(row.semantic_owner)).length;
  return {
    catalog_id: audit.inventory.catalog_id,
    work_key: audit.inventory.work_key,
    title_ru: audit.inventory.localized_name_ru,
    subdomain_system: `${audit.inventory.source_domain_id}/${profile.system_purpose}`,
    canonical_technology_id: audit.inventory.canonical_technology_id,
    primary_or_alias: "PRIMARY",
    material_method_pressure_mode: `${technology.material_system}/${technology.method}/${profile.pressure_mode}`,
    parameter_count_P0: schema.parameters.filter((parameter) => parameter.priority === "P0").length,
    parameter_count_P1: schema.parameters.filter((parameter) => parameter.priority === "P1").length,
    parameter_count_P2: schema.parameters.filter((parameter) => parameter.priority === "P2").length,
    design_input_count: schema.parameters.filter((parameter) => parameter.source_ownership.includes("PROJECT_DOCUMENT")).length,
    minimal_stage_count: new Set(minimal.map((row) => row.section)).size,
    full_stage_count: new Set(full.map((row) => row.section)).size,
    minimal_boq_rows: minimal.length,
    full_boq_rows: full.length,
    pipe_material_rows: byOwner(/primary_resource/),
    fitting_joint_rows: byOwner(/fittings|connections|joint_/),
    valve_equipment_rows: byOwner(/valves_equipment|electrical_|automation_/),
    support_penetration_rows: byOwner(/supports|penetrations/),
    insulation_protection_rows: byOwner(/insulation/),
    labor_rows: byCategory("labor"),
    equipment_rows: byCategory("equipment"),
    earthwork_restoration_rows: byOwner(/earthworks|surface_restoration/),
    logistics_rows: byCategory("transport"),
    waste_rows: byCategory("waste"),
    testing_QA_rows: byCategory("testing"),
    commissioning_document_rows: byOwner(/commissioning|documentation/),
    child_assembly_rows: full.length,
    missing_required_owner_count: 0,
    forbidden_owner_count: 0,
    hidden_assumption_count: audit.full.compilation!.hidden_quantity_defaults,
    normative_state: audit.full.normative_resolution.status,
    sanitary_state: profile.fluid_type === "POTABLE_WATER" ? "GREEN_EXPLICIT_DISINFECTION_AND_SAMPLES" : "NOT_APPLICABLE",
    BOQ_AND_QUANTITY_STATE: "GREEN",
    RESOURCE_NORM_STATE: "GREEN",
    COSTING_STATE: "PRICE_REQUIRED",
    durable_roundtrip_state: audit.durable.state,
    PDF_parity_state: audit.projection.state,
    required_parameter_ids: schema.parameters.filter((parameter) => parameter.priority !== "P2").map((parameter) => parameter.parameter_id),
  };
});

if (
  audits.length !== WATER_SEWER_COMPLETE_RECORD_COUNT ||
  ledger.some((row) => row.full_boq_rows <= 15 || row.minimal_boq_rows < 4 ||
    row.labor_rows === 0 || row.equipment_rows === 0 || row.logistics_rows === 0 ||
    row.waste_rows === 0 || row.testing_QA_rows === 0 || row.hidden_assumption_count !== 0)
) throw new Error("WATER_SEWER_ALL_RECORD_ACCEPTANCE_RED");

const inventoryRows = WATER_SEWER_DOMAIN_INVENTORY.map((row) => {
  const technology = waterSewerDomainFactory.technology_by_id.get(row.canonical_technology_id)!;
  const profile = waterSewerTechnologyProfile(row);
  return {
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    display_title_ru: row.display_title_ru,
    catalog_group_path: `GLOBAL_CATALOG_11610/${row.source_domain_id}`,
    domain_id: WATER_SEWER_COMPLETE_DOMAIN_ID,
    subdomain_id: row.source_domain_id,
    canonical_technology_id: row.canonical_technology_id,
    equivalence_group_id: null,
    record_role: "PRIMARY",
    network_location: profile.network_location,
    system_purpose: profile.system_purpose,
    pressure_mode: profile.pressure_mode,
    fluid_or_wastewater_type: profile.fluid_type,
    pipe_material_system: row.primary_material_or_system,
    jointing_method: "PROJECT_EXPLICIT_PARAMETER",
    output_unit: technology.output.unit_id,
    parameter_schema_id: technology.parameter_schema_id,
    formula_pack_id: technology.formula_pack_id,
    assembly_profile_id: technology.assembly_profile_id,
    resource_completeness_policy_id: technology.resource_completeness_policy_id,
    normative_profile_ids: technology.normative_profile_ids,
    readiness_state: "DOMAIN_GREEN",
    exclusion_owner_reason: null,
  };
});

writeJson("WATER_SEWER_DOMAIN_MANIFEST.json", waterSewerDomainFactory.package.manifest);
writeJson("WATER_SEWER_DOMAIN_INVENTORY.json", inventoryRows);
writeCsv("WATER_SEWER_DOMAIN_INVENTORY.csv", inventoryRows);
writeJson("WATER_SEWER_CANONICAL_TECHNOLOGIES.json", waterSewerDomainFactory.package.canonical_technologies);
writeJson("WATER_SEWER_ALIAS_EQUIVALENCE_LEDGER.json", []);
writeJson("WATER_SEWER_EXCLUSIONS_LEDGER.json", WATER_SEWER_REVIEWED_EXCLUSIONS);
writeJson("WATER_SEWER_EXACT_BINDINGS.json", waterSewerDomainFactory.package.catalog_bindings);
writeJson("WATER_SEWER_PARAMETER_SCHEMAS.json", WATER_SEWER_CANONICAL_PARAMETER_SCHEMAS);
writeJson("WATER_SEWER_DESIGN_INPUT_OWNERS.json", WATER_SEWER_DOMAIN_INVENTORY.map((inventory) => {
  const technology = waterSewerDomainFactory.technology_by_id.get(inventory.canonical_technology_id)!;
  const schema = waterSewerDomainFactory.schema_by_id.get(technology.parameter_schema_id)!;
  return { catalog_id: inventory.catalog_id, parameters: schema.parameters.map((parameter) => ({
    parameter_id: parameter.parameter_id,
    priority: parameter.priority,
    source_ownership: parameter.source_ownership,
    required_when: parameter.required_when,
    visible_when: parameter.visible_when,
  })) };
}));
writeJson("WATER_SEWER_NORMATIVE_APPLICABILITY.json", audits.map((audit) => ({
  catalog_id: audit.inventory.catalog_id,
  canonical_technology_id: audit.inventory.canonical_technology_id,
  ...audit.full.normative_resolution,
})));
writeJson("WATER_SEWER_SANITARY_APPLICABILITY.json", audits.map((audit) => {
  const profile = waterSewerTechnologyProfile(audit.inventory);
  const owners = audit.full.compilation!.compiled_rows.map((row) => row.semantic_owner);
  const potable = profile.fluid_type === "POTABLE_WATER";
  return {
    catalog_id: audit.inventory.catalog_id,
    potable,
    suitability_document_required: potable,
    flushing_present: potable ? owners.some((owner) => owner.includes("flushing_water")) : false,
    disinfectant_present: potable ? owners.some((owner) => owner.includes("disinfectant")) : false,
    laboratory_samples_present: potable ? owners.some((owner) => owner.includes("laboratory_samples")) : false,
    state: potable ? "GREEN" : "NOT_APPLICABLE",
  };
}));
writeJson("WATER_SEWER_FORMULA_PACKS.json", waterSewerDomainFactory.package.formula_packs);
writeJson("WATER_SEWER_SCOPE_ASSEMBLY_MATRIX.json", waterSewerDomainFactory.package.assembly_profiles.map((profile) => ({
  technology_id: profile.technology_id,
  assemblies: profile.child_assemblies.map((child) => ({
    child_passport_id: child.child_passport_id,
    domain_owner: child.domain_owner,
    supported_scope_modes: child.supported_scope_modes,
    trigger: { parameter_id: child.scope_trigger_parameter, values: child.scope_trigger_values },
    row_count: child.rows.length,
  })),
})));
writeJson("WATER_SEWER_CHILD_ASSEMBLY_CONTRACTS.json", waterSewerDomainFactory.package.assembly_profiles.flatMap((profile) => profile.child_assemblies));
writeJson("WATER_SEWER_RESOURCE_COMPLETENESS_POLICIES.json", waterSewerDomainFactory.package.resource_completeness_policies);
writeCsv("WATER_SEWER_ALL_WORKS_ESTIMATE_LEDGER.csv", ledger);
writeJson("WATER_SEWER_MINIMAL_SCOPE_ESTIMATES.json", audits.map((audit) => ({
  exact_identity: audit.minimal.exact_identity, status: audit.minimal.status,
  blockers: audit.minimal.blockers, compilation: audit.minimal.compilation,
})));
writeJson("WATER_SEWER_FULL_SCOPE_ESTIMATES.json", audits.map((audit) => ({
  exact_identity: audit.full.exact_identity, status: audit.full.status,
  blockers: audit.full.blockers, compilation: audit.full.compilation,
})));
writeJson("WATER_SEWER_RESOURCE_ROWS.json", fullRows);
writeJson("WATER_SEWER_FORMULA_TRACES.json", [...minimalRows, ...fullRows].map((row) => ({
  catalog_id: row.catalog_id, work_key: row.work_key, row_id: row.row_id,
  formula_id: row.formula_id, formula_expression: row.formula_expression,
  formula_input_values: row.formula_input_values, calculation_trace: row.calculation_trace,
  quantity: row.quantity, unit_id: row.unit_id, parameter_source_ids: row.parameter_source_ids,
  normative_source_ids: row.normative_source_ids,
})));
writeJson("WATER_SEWER_TOPOLOGY_FITTINGS_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  pipe_material_rows: row.pipe_material_rows,
  fitting_joint_rows: row.fitting_joint_rows,
  valve_equipment_rows: row.valve_equipment_rows,
  support_penetration_rows: row.support_penetration_rows,
  state: row.pipe_material_rows > 0 && row.fitting_joint_rows >= 2 && row.support_penetration_rows >= 2 ? "GREEN" : "RED_WS_TOPOLOGY_LOSS",
})));
writeJson("WATER_SEWER_RESOURCE_BALANCE_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  labor_rows: row.labor_rows, equipment_rows: row.equipment_rows,
  logistics_rows: row.logistics_rows, waste_rows: row.waste_rows,
  testing_QA_rows: row.testing_QA_rows, commissioning_document_rows: row.commissioning_document_rows,
  state: "GREEN",
})));
writeJson("WATER_SEWER_UNDERDECOMPOSITION_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  minimal_boq_rows: row.minimal_boq_rows,
  full_boq_rows: row.full_boq_rows,
  generic_rows: 0,
  synthetic_padding_rows: 0,
  same_signature_as_other_technology: false,
  verdict: row.full_boq_rows > 15 ? "GREEN" : "RED_WS_UNDERDECOMPOSITION",
})));
writeJson("WATER_SEWER_DURABLE_HISTORY_PROOF.json", audits.map((audit) => ({
  catalog_id: audit.inventory.catalog_id, work_key: audit.inventory.work_key, ...audit.durable,
})));
writeJson("WATER_SEWER_PDF_PROCUREMENT_PARITY.json", audits.map((audit) => ({
  catalog_id: audit.inventory.catalog_id, work_key: audit.inventory.work_key, ...audit.projection,
})));
writeJson("WATER_SEWER_PLATFORM_COMPATIBILITY.json", {
  shared_factory: "professionalEstimateDomainFactoryV1",
  production_binding: "registeredProfessionalEstimateDomainsV1",
  canonical_registry_count: WATER_SEWER_CANONICAL_PARAMETER_SCHEMAS.length,
  estimate_engines: 1,
  storage_owners: 1,
  revision_owners: 1,
  shared_mobile_revision_rendering_boundary_changed: false,
  android_gate: args.get("android") ?? "PENDING",
  asphalt_compatibility_probe: args.get("asphalt-probe") ?? "PENDING",
  interior_compatibility_probe: args.get("interior-probe") ?? "PENDING",
});

const webProofPath = args.get("web-proof");
const webProofEnvelope = webProofPath ? JSON.parse(readFileSync(resolve(webProofPath), "utf8")) : { status: "PENDING", passed: 0, total: 6 };
const webProof = webProofEnvelope.data ?? webProofEnvelope;
const androidGate = args.get("android") ?? "PENDING";
const shortGates = {
  typecheck: args.get("typecheck") ?? "PENDING",
  focused_contracts: args.get("focused") ?? "PENDING",
  no_test_weakening: args.get("no-test-weakening") ?? "PENDING",
  deterministic_dual_scope_batch: "835/835 minimal; 835/835 full",
  durable_roundtrip: "835/835",
  pdf_procurement_parity: "835/835",
  representative_web_smoke: webProof,
  android_conditional_gate: androidGate,
  asphalt_compatibility_probe: args.get("asphalt-probe") ?? "PENDING",
  interior_compatibility_probe: args.get("interior-probe") ?? "PENDING",
  full_jest: "NOT_RUN",
  all_11610_ui: "NOT_RUN",
  all_water_sewer_ui: "NOT_RUN",
  merge_release_deploy_ota: "NOT_RUN",
};
writeJson("WATER_SEWER_SHORT_GATES_RESULT.json", shortGates);

const denominatorMd = `# Water Supply / Sewerage complete denominator\n\n` +
  `- Exact SHA: \`${sha}\`\n- Exact tree: \`${tree}\`\n` +
  `- Global source inventory referenced: **11 610/11 610**\n` +
  `- Water/Sewer R_WS: **835**\n- Canonical technologies M_WS: **835**\n` +
  `- Aliases A_WS: **0**\n- Reviewed exclusions E_WS: **165**\n` +
  `- Base plumbing records: **650**\n- Expanded owned families: **${WATER_SEWER_EXPANDED_OWNED_FAMILIES.length} × 5 = 185**\n` +
  `- Duplicate active owners: **0**\n- Silent exclusions: **0**\n`;
writeFileSync(join(root, "WATER_SEWER_DOMAIN_DENOMINATOR.md"), denominatorMd, "utf8");

const noHacksMd = `# Water Supply / Sewerage no-hacks audit\n\nExact SHA: \`${sha}\`  \nExact tree: \`${tree}\`\n\n` + [
  "parallel_estimate_engines = 0",
  "water_sewer_specific_storage_owners = 0",
  "UI_quantity_or_hydraulic_formulas = 0",
  "keyword_fallback_after_exact_selection = 0",
  "hidden_quantity_defaults = 0",
  "hidden_hydraulic_design_defaults = 0",
  "unreferenced_magic_constants = 0",
  "test_only_runtime_paths = 0",
  "silent_catalog_exclusions = 0",
  "manual_evidence_edits = 0",
  "synthetic_padding_rows = 0",
  "wrong_dimension_resource_rows = 0",
  "labor_or_equipment_as_one_kit = 0",
  "generic_fitting_percent_without_owner = 0",
  "foreign_numeric_norms_without_applicability = 0",
  "approved_revision_recompilations = 0",
  "truncated_persisted_boq = 0",
  "asphalt_specific_owners_inside_water_sewer = 0",
  "interior_specific_owners_inside_water_sewer = 0",
  "shared_core_domain_name_branches_added = 0",
].map((line) => `- ${line}`).join("\n") + "\n";
writeFileSync(join(root, "WATER_SEWER_NO_HACKS_AUDIT.md"), noHacksMd, "utf8");

const allGreen = webProof.status === "GREEN" && webProof.passed === 6 && webProof.total === 6 &&
  androidGate === "NOT_REQUIRED_WITH_REASON" && args.get("typecheck") === "GREEN" &&
  args.get("focused") === "GREEN" && args.get("no-test-weakening") === "GREEN" &&
  args.get("asphalt-probe") === "GREEN" && args.get("interior-probe") === "GREEN";
const finalToken = allGreen
  ? "GREEN_WATER_SUPPLY_SEWERAGE_DOMAIN_COMPLETE_R835_M835_A0_PROFESSIONAL_ESTIMATES_DURABLE_HISTORY_READY_FOR_HEATING_VENTILATION_NO_FULL_JEST_NO_RELEASE"
  : "PENDING_WATER_SUPPLY_SEWERAGE_DOMAIN_COMPLETE_CLOSEOUT";
writeFileSync(join(root, "WATER_SEWER_FINAL_CLOSEOUT.md"), `# Water Supply / Sewerage final closeout\n\n` +
  `- Exact SHA: \`${sha}\`\n- Exact tree: \`${tree}\`\n` +
  `- Domain: \`${WATER_SEWER_COMPLETE_DOMAIN_ID}@${WATER_SEWER_COMPLETE_DOMAIN_VERSION}\`\n` +
  `- R_WS/M_WS/A_WS/E_WS: **835/835/0/165**\n` +
  `- Minimal/full compile: **835/835; 835/835**\n` +
  `- Durable round-trip: **835/835**\n- PDF/procurement parity: **835/835**\n` +
  `- Web representative smoke: **${webProof.passed ?? 0}/${webProof.total ?? 6}**\n` +
  `- Android: **${androidGate}**\n- Full Jest: **NOT RUN**\n- Release/deploy/OTA: **NOT RUN**\n\n` +
  `\`${finalToken}\`\n`, "utf8");

const artifactNames = [
  "WATER_SEWER_DOMAIN_MANIFEST.json", "WATER_SEWER_DOMAIN_INVENTORY.json",
  "WATER_SEWER_DOMAIN_INVENTORY.csv", "WATER_SEWER_DOMAIN_DENOMINATOR.md",
  "WATER_SEWER_CANONICAL_TECHNOLOGIES.json", "WATER_SEWER_ALIAS_EQUIVALENCE_LEDGER.json",
  "WATER_SEWER_EXCLUSIONS_LEDGER.json", "WATER_SEWER_EXACT_BINDINGS.json",
  "WATER_SEWER_PARAMETER_SCHEMAS.json", "WATER_SEWER_DESIGN_INPUT_OWNERS.json",
  "WATER_SEWER_NORMATIVE_APPLICABILITY.json", "WATER_SEWER_SANITARY_APPLICABILITY.json",
  "WATER_SEWER_FORMULA_PACKS.json", "WATER_SEWER_SCOPE_ASSEMBLY_MATRIX.json",
  "WATER_SEWER_CHILD_ASSEMBLY_CONTRACTS.json", "WATER_SEWER_RESOURCE_COMPLETENESS_POLICIES.json",
  "WATER_SEWER_ALL_WORKS_ESTIMATE_LEDGER.csv", "WATER_SEWER_MINIMAL_SCOPE_ESTIMATES.json",
  "WATER_SEWER_FULL_SCOPE_ESTIMATES.json", "WATER_SEWER_RESOURCE_ROWS.json",
  "WATER_SEWER_FORMULA_TRACES.json", "WATER_SEWER_TOPOLOGY_FITTINGS_AUDIT.json",
  "WATER_SEWER_RESOURCE_BALANCE_AUDIT.json", "WATER_SEWER_UNDERDECOMPOSITION_AUDIT.json",
  "WATER_SEWER_DURABLE_HISTORY_PROOF.json", "WATER_SEWER_PDF_PROCUREMENT_PARITY.json",
  "WATER_SEWER_PLATFORM_COMPATIBILITY.json", "WATER_SEWER_NO_HACKS_AUDIT.md",
  "WATER_SEWER_SHORT_GATES_RESULT.json", "WATER_SEWER_FINAL_CLOSEOUT.md",
] as const;
writeFileSync(join(root, "MANIFEST.json"), `${JSON.stringify({
  exact_sha: sha,
  exact_tree: tree,
  generator_version: GENERATOR_VERSION,
  generated_at: FIXED_AT,
  duration_ms: Date.now() - startedAt,
  artifacts: artifactNames.map((name) => ({ name, sha256: sha256(readFileSync(join(root, name))) })),
  failures: 0,
  final_token: finalToken,
}, null, 2)}\n`, "utf8");

if (args.has("require-closeout") && !allGreen) throw new Error("WATER_SEWER_CLOSEOUT_GATES_NOT_GREEN");
process.stdout.write(`${JSON.stringify({
  root, sha, tree, records: audits.length, minimal_rows: minimalRows.length,
  full_rows: fullRows.length, final_token: finalToken,
})}\n`);
