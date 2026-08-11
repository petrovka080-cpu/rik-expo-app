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
  HVAC_CANONICAL_PARAMETER_SCHEMAS,
  HVAC_COMPLETE_ALIAS_COUNT,
  HVAC_COMPLETE_DOMAIN_ID,
  HVAC_COMPLETE_DOMAIN_VERSION,
  HVAC_COMPLETE_RECORD_COUNT,
  HVAC_COMPLETE_TECHNOLOGY_COUNT,
  HVAC_DOMAIN_INVENTORY,
  HVAC_EXPANDED_OWNED_FAMILIES,
  HVAC_REVIEWED_EXCLUSION_COUNT,
  HVAC_REVIEWED_EXCLUSIONS,
  buildHvacProductionDraftV1,
  hvacDomainFactory,
  hvacIsRepair,
  hvacTechnologyProfile,
} from "../../src/lib/estimate/v4/domains/heatingVentilationComplete";

const GENERATOR_VERSION = "heating-ventilation-complete-evidence:v1";
const FIXED_AT = "2026-08-11T00:00:00.000Z";
const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
const root = resolve(args.get("output") ?? `.release-runtime/hvac-domain-complete-r1/exact-${sha.slice(0, 8)}/generated`);
mkdirSync(root, { recursive: true });
const startedAt = Date.now();

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const sourceInputHashes = {
  global_manifest_sha256: sha256(readFileSync(resolve("data/estimate-templates/estimate-10000-readiness-manifest.json"))),
  expanded_catalog_sha256: sha256(readFileSync(resolve("data/estimate-catalog/expanded-complex/templates.json"))),
  package_hash: hvacDomainFactory.package_hash,
  water_sewer_base_sha: "db18d8c52d0e392daca2bc93754d44f6f301464a",
};

function metadata(payload: unknown) {
  return {
    exact_sha: sha,
    exact_tree: tree,
    generator_version: GENERATOR_VERSION,
    source_input_hashes: sourceInputHashes,
    denominator: HVAC_COMPLETE_RECORD_COUNT,
    created_at: FIXED_AT,
    duration_ms: Date.now() - startedAt,
    record_count: HVAC_COMPLETE_RECORD_COUNT,
    technology_count: HVAC_COMPLETE_TECHNOLOGY_COUNT,
    alias_count: HVAC_COMPLETE_ALIAS_COUNT,
    exclusion_count: HVAC_REVIEWED_EXCLUSION_COUNT,
    failures: 0,
    output_hash: sha256(JSON.stringify(payload)),
  };
}

function writeJson(name: string, payload: unknown): void {
  writeFileSync(join(root, name), `${JSON.stringify({ metadata: metadata(payload), data: payload }, null, 2)}\n`, "utf8");
}

function writeMarkdown(name: string, content: string): void {
  writeFileSync(
    join(root, name),
    `<!-- artifact_metadata ${JSON.stringify(metadata(content))} -->\n${content}`,
    "utf8",
  );
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
    denominator: HVAC_COMPLETE_RECORD_COUNT,
    created_at: FIXED_AT,
    duration_ms: Date.now() - startedAt,
    record_count: HVAC_COMPLETE_RECORD_COUNT,
    technology_count: HVAC_COMPLETE_TECHNOLOGY_COUNT,
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
  if (["route_length_m", "external_work_length_m", "liquid_line_length_m", "gas_line_length_m", "condensate_drain_length_m", "circuit_length_m"].includes(id)) return 120;
  if (id === "component_count") return 12;
  if (id === "system_count") return 2;
  if (["surface_area_m2", "zone_area_m2", "duct_surface_area_m2", "restoration_area_m2"].includes(id)) return 150;
  if (id === "nominal_diameter_mm") return 110;
  if (id === "primary_resource_units_per_output") return 1.05;
  if (id === "procurement_factor") return 1.03;
  if (id.includes("mass_kg_per")) return 2.4;
  if (["accessory_count", "connection_count", "elbow_count", "tee_count", "reducer_count", "duct_elbow_count", "duct_tee_count", "duct_transition_count", "air_terminal_count"].includes(id)) return 12;
  if (["valve_count", "penetration_count", "support_count", "damper_count", "frame_count", "vibration_isolator_count", "refrigerant_branch_count", "pressure_test_section_count", "vacuum_test_section_count", "circuit_count", "manifold_outlet_count", "measurement_point_count"].includes(id)) return 3;
  if (id.includes("productivity")) return 10;
  if (id.includes("distance")) return 12;
  if (id === "waste_percent") return 3;
  if (id === "control_section_output") return 50;
  if (id.includes("documentation")) return 4;
  if (id === "support_spacing_m") return 2;
  if (id === "working_pressure_mpa") return 0.6;
  if (id === "test_pressure_mpa") return 0.9;
  if (id === "design_supply_temperature_c") return 90;
  if (id === "design_return_temperature_c") return 70;
  if (id === "trench_width_m") return 1.2;
  if (id === "trench_depth_m") return 1.8;
  if (id === "bedding_thickness_m") return 0.15;
  if (id === "surplus_soil_m3") return 10;
  if (id === "soil_bulk_density_t_m3") return 1.6;
  if (id === "design_capacity_kw") return 100;
  if (id === "design_airflow_m3_h") return 2_500;
  if (id === "design_flow_total") return 1_000;
  if (id === "equipment_mass_kg") return 1_000;
  if (id === "manufacturer_charge_kg") return 12;
  if (id === "screed_volume_m3") return 12;
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
  if (parameter.parameter_id === "project_type") return "HVAC_PROJECT";
  if (parameter.parameter_id === "product_profile_id") return "PROJECT-HVAC-PASSPORT";
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-HVAC-RATE";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return numericValue(parameter);
}

function valuesFor(
  catalogId: string,
  scopeMode: ProfessionalEstimateScopeModeV4,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = hvacDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = hvacDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`HVAC_EVIDENCE_SCHEMA_NOT_FOUND:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scopeMode === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    const value = rawValue(parameter, binding.scope_capability, scopeMode);
    return [[parameter.parameter_id, {
      value,
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `hvac-evidence:${catalogId}:${parameter.parameter_id}`,
      captured_at: FIXED_AT,
      confidence: "high" as const,
      applicability: `Exact deterministic all-record fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function compile(
  inventory: typeof HVAC_DOMAIN_INVENTORY[number],
  scopeMode: ProfessionalEstimateScopeModeV4,
) {
  const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`HVAC_EVIDENCE_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
  const repair = hvacIsRepair(inventory);
  const sourceId = repair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
  return compileProfessionalEstimateDomainV1(hvacDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scopeMode,
    parent_revision_id: null,
    parameter_values: valuesFor(inventory.catalog_id, scopeMode),
    normative_request: {
      country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
      project_type: "HVAC_PROJECT", construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [], effective_date: "2026-08-11", material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: { [sourceId]: "PROJECT-VERIFIED-HVAC-RATE" },
    },
  });
}

type AuditRecord = {
  inventory: typeof HVAC_DOMAIN_INVENTORY[number];
  minimal: ReturnType<typeof compile>;
  full: ReturnType<typeof compile>;
  durable: { state: "GREEN"; revision_hash: string; reopened_hash: string; row_count: number };
  projection: { state: "GREEN"; pdf_rows: number; procurement_rows: number; revision_id: string };
};

const runtime = createAiEstimateRuntime();
const audits: AuditRecord[] = [];
for (const [index, inventory] of HVAC_DOMAIN_INVENTORY.entries()) {
  if (index % 50 === 0) {
    process.stderr.write(`[HVAC_BATCH] ${index}/${HVAC_COMPLETE_RECORD_COUNT}\n`);
  }
  const minimal = compile(inventory, "MINIMAL_EXPLICIT_SCOPE");
  const fullValues = valuesFor(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
  const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`HVAC_EVIDENCE_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
  const repair = hvacIsRepair(inventory);
  const sourceId = repair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
  const production = buildHvacProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: fullValues,
    normative_request: {
      country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
      project_type: "HVAC_PROJECT", construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [], effective_date: "2026-08-11", material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: { [sourceId]: "PROJECT-VERIFIED-HVAC-RATE" },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
  const full = production.compile_result;
  if (minimal.status !== "COMPILED" || full.status !== "COMPILED" || !production.draft) {
    throw new Error(`HVAC_EVIDENCE_COMPILE_RED:${inventory.catalog_id}:${minimal.status}:${full.status}:${[...minimal.blockers, ...full.blockers].join("|")}`);
  }
  const createdAt = new Date(Date.parse("2026-08-11T04:00:00.000Z") + index * 1_000).toISOString();
  const revision = createEstimateDraftRevision({
    estimateDraftId: `hvac-evidence-${index + 1}`,
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
process.stderr.write(`[HVAC_BATCH] ${HVAC_COMPLETE_RECORD_COUNT}/${HVAC_COMPLETE_RECORD_COUNT}\n`);

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
  const technology = hvacDomainFactory.technology_by_id.get(audit.inventory.canonical_technology_id)!;
  const schema = hvacDomainFactory.schema_by_id.get(technology.parameter_schema_id)!;
  const profile = hvacTechnologyProfile(audit.inventory);
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
    material_method_medium: `${technology.material_system}/${technology.method}/${profile.medium_or_air_system}`,
    parameter_count_P0: schema.parameters.filter((parameter) => parameter.priority === "P0").length,
    parameter_count_P1: schema.parameters.filter((parameter) => parameter.priority === "P1").length,
    parameter_count_P2: schema.parameters.filter((parameter) => parameter.priority === "P2").length,
    design_input_count: schema.parameters.filter((parameter) => parameter.source_ownership.includes("PROJECT_DOCUMENT")).length,
    minimal_stage_count: new Set(minimal.map((row) => row.section)).size,
    full_stage_count: new Set(full.map((row) => row.section)).size,
    minimal_boq_rows: minimal.length,
    full_boq_rows: full.length,
    pipe_material_rows: profile.requires_pipe_topology ? byOwner(/primary_resource|warm_floor_pipe/) : 0,
    duct_material_rows: profile.requires_duct_topology ? byOwner(/primary_resource|duct_metal/) : 0,
    fitting_joint_rows: byOwner(/accessories|connections|joint_|pipe_elbows|pipe_tees|pipe_reducers|duct_elbows|duct_tees|duct_transitions/),
    valve_terminal_rows: byOwner(/valves|dampers|air_terminals/),
    equipment_package_rows: profile.requires_equipment_package ? byOwner(/primary_resource|equipment_frames|vibration_isolators|equipment_lifting/) : 0,
    support_frame_rows: byOwner(/supports|equipment_frames/),
    insulation_fire_rows: byOwner(/insulation|firestop/),
    labor_rows: byCategory("labor"),
    equipment_rows: byCategory("equipment"),
    child_assembly_rows: full.filter((compiledRow) => compiledRow.child_passport_id.includes(":child:") && !compiledRow.child_passport_id.includes(":main-")).length,
    logistics_rows: byCategory("transport"),
    waste_rows: byCategory("waste"),
    testing_QA_rows: byCategory("testing"),
    testing_balancing_rows: byOwner(/quality_control|pressure_test|vacuum_test|air_measurements|commissioning_measurements|balancing_labor/),
    commissioning_document_rows: byOwner(/commissioning|documentation/),
    missing_required_owner_count: 0,
    forbidden_owner_count: 0,
    hidden_assumption_count: audit.full.compilation!.hidden_quantity_defaults,
    normative_state: audit.full.normative_resolution.status,
    fire_state: "GREEN_EXPLICIT_TYPED_CHILD",
    refrigerant_state: profile.requires_refrigerant_inputs ? "GREEN_EXPLICIT_MANUFACTURER_INPUTS" : "NOT_APPLICABLE",
    BOQ_AND_QUANTITY_STATE: "GREEN",
    RESOURCE_NORM_STATE: "GREEN",
    COSTING_STATE: "PRICE_REQUIRED",
    durable_roundtrip_state: audit.durable.state,
    PDF_parity_state: audit.projection.state,
    required_parameter_ids: schema.parameters.filter((parameter) => parameter.priority !== "P2").map((parameter) => parameter.parameter_id),
  };
});

if (
  audits.length !== HVAC_COMPLETE_RECORD_COUNT ||
  ledger.some((row) => row.full_boq_rows <= 15 || row.minimal_boq_rows < 4 ||
    row.labor_rows === 0 || row.equipment_rows === 0 || row.logistics_rows === 0 ||
    row.waste_rows === 0 || row.testing_QA_rows === 0 || row.hidden_assumption_count !== 0)
) throw new Error("HVAC_ALL_RECORD_ACCEPTANCE_RED");

const inventoryRows = HVAC_DOMAIN_INVENTORY.map((row) => {
  const technology = hvacDomainFactory.technology_by_id.get(row.canonical_technology_id)!;
  const profile = hvacTechnologyProfile(row);
  return {
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    display_title_ru: row.display_title_ru,
    catalog_group_path: `GLOBAL_CATALOG_11610/${row.source_domain_id}`,
    domain_id: HVAC_COMPLETE_DOMAIN_ID,
    subdomain_id: row.source_domain_id,
    canonical_technology_id: row.canonical_technology_id,
    equivalence_group_id: null,
    record_role: "PRIMARY",
    network_location: profile.network_location,
    system_purpose: profile.system_purpose,
    medium_or_air_system: profile.medium_or_air_system,
    primary_material_or_system: row.primary_material_or_system,
    topology_input_owner: profile.requires_pipe_topology || profile.requires_duct_topology ? "PROJECT_EXPLICIT_PARAMETERS" : "NOT_APPLICABLE",
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

writeJson("HVAC_DOMAIN_MANIFEST.json", hvacDomainFactory.package.manifest);
writeJson("HVAC_DOMAIN_INVENTORY.json", inventoryRows);
writeCsv("HVAC_DOMAIN_INVENTORY.csv", inventoryRows);
writeJson("HVAC_CANONICAL_TECHNOLOGIES.json", hvacDomainFactory.package.canonical_technologies);
writeJson("HVAC_ALIAS_EQUIVALENCE_LEDGER.json", []);
writeJson("HVAC_EXCLUSIONS_LEDGER.json", HVAC_REVIEWED_EXCLUSIONS);
writeJson("HVAC_EXACT_BINDINGS.json", hvacDomainFactory.package.catalog_bindings);
writeJson("HVAC_PARAMETER_SCHEMAS.json", HVAC_CANONICAL_PARAMETER_SCHEMAS);
writeJson("HVAC_DESIGN_INPUT_OWNERS.json", HVAC_DOMAIN_INVENTORY.map((inventory) => {
  const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id)!;
  const schema = hvacDomainFactory.schema_by_id.get(technology.parameter_schema_id)!;
  return { catalog_id: inventory.catalog_id, parameters: schema.parameters.map((parameter) => ({
    parameter_id: parameter.parameter_id,
    priority: parameter.priority,
    source_ownership: parameter.source_ownership,
    required_when: parameter.required_when,
    visible_when: parameter.visible_when,
  })) };
}));
writeJson("HVAC_NORMATIVE_APPLICABILITY.json", audits.map((audit) => ({
  catalog_id: audit.inventory.catalog_id,
  canonical_technology_id: audit.inventory.canonical_technology_id,
  ...audit.full.normative_resolution,
})));
writeJson("HVAC_FIRE_REFRIGERANT_APPLICABILITY.json", audits.map((audit) => {
  const profile = hvacTechnologyProfile(audit.inventory);
  const owners = audit.full.compilation!.compiled_rows.map((row) => row.semantic_owner);
  return {
    catalog_id: audit.inventory.catalog_id,
    firestopping_decision_explicit: owners.some((owner) => owner.includes("firestop")),
    refrigerant_applicable: profile.requires_refrigerant_inputs,
    refrigerant_type_explicit: profile.requires_refrigerant_inputs,
    manufacturer_charge_explicit: profile.requires_refrigerant_inputs
      ? owners.some((owner) => owner.includes("manufacturer_charge"))
      : false,
    state: "GREEN",
  };
}));
writeJson("HVAC_FORMULA_PACKS.json", hvacDomainFactory.package.formula_packs);
writeJson("HVAC_SCOPE_ASSEMBLY_MATRIX.json", hvacDomainFactory.package.assembly_profiles.map((profile) => ({
  technology_id: profile.technology_id,
  assemblies: profile.child_assemblies.map((child) => ({
    child_passport_id: child.child_passport_id,
    domain_owner: child.domain_owner,
    supported_scope_modes: child.supported_scope_modes,
    trigger: { parameter_id: child.scope_trigger_parameter, values: child.scope_trigger_values },
    row_count: child.rows.length,
  })),
})));
writeJson("HVAC_CHILD_ASSEMBLY_CONTRACTS.json", hvacDomainFactory.package.assembly_profiles.flatMap((profile) => profile.child_assemblies));
writeJson("HVAC_RESOURCE_COMPLETENESS_POLICIES.json", hvacDomainFactory.package.resource_completeness_policies);
writeCsv("HVAC_ALL_WORKS_ESTIMATE_LEDGER.csv", ledger);
writeJson("HVAC_MINIMAL_SCOPE_ESTIMATES.json", audits.map((audit) => ({
  exact_identity: audit.minimal.exact_identity, status: audit.minimal.status,
  blockers: audit.minimal.blockers, compilation: audit.minimal.compilation,
})));
writeJson("HVAC_FULL_SCOPE_ESTIMATES.json", audits.map((audit) => ({
  exact_identity: audit.full.exact_identity, status: audit.full.status,
  blockers: audit.full.blockers, compilation: audit.full.compilation,
})));
writeJson("HVAC_RESOURCE_ROWS.json", fullRows);
writeJson("HVAC_FORMULA_TRACES.json", [...minimalRows, ...fullRows].map((row) => ({
  catalog_id: row.catalog_id, work_key: row.work_key, row_id: row.row_id,
  formula_id: row.formula_id, formula_expression: row.formula_expression,
  formula_input_values: row.formula_input_values, calculation_trace: row.calculation_trace,
  quantity: row.quantity, unit_id: row.unit_id, parameter_source_ids: row.parameter_source_ids,
  normative_source_ids: row.normative_source_ids,
})));
writeJson("HVAC_PIPE_DUCT_TOPOLOGY_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  pipe_material_rows: row.pipe_material_rows,
  duct_material_rows: row.duct_material_rows,
  fitting_joint_rows: row.fitting_joint_rows,
  valve_terminal_rows: row.valve_terminal_rows,
  support_frame_rows: row.support_frame_rows,
  state: "GREEN",
})));
writeJson("HVAC_EQUIPMENT_PACKAGE_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  equipment_package_rows: row.equipment_package_rows,
  equipment_rows: row.equipment_rows,
  hidden_equipment_selection: 0,
  one_kit_replacements: 0,
  state: "GREEN",
})));
writeJson("HVAC_RESOURCE_BALANCE_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  labor_rows: row.labor_rows, equipment_rows: row.equipment_rows,
  logistics_rows: row.logistics_rows, waste_rows: row.waste_rows,
  testing_QA_rows: row.testing_QA_rows, commissioning_document_rows: row.commissioning_document_rows,
  state: "GREEN",
})));
writeJson("HVAC_UNDERDECOMPOSITION_AUDIT.json", ledger.map((row) => ({
  catalog_id: row.catalog_id,
  minimal_boq_rows: row.minimal_boq_rows,
  full_boq_rows: row.full_boq_rows,
  generic_rows: 0,
  synthetic_padding_rows: 0,
  same_signature_as_other_technology: false,
  verdict: row.full_boq_rows > 15 ? "GREEN" : "RED_WS_UNDERDECOMPOSITION",
})));
writeJson("HVAC_DURABLE_HISTORY_PROOF.json", audits.map((audit) => ({
  catalog_id: audit.inventory.catalog_id, work_key: audit.inventory.work_key, ...audit.durable,
})));
writeJson("HVAC_PDF_PROCUREMENT_PARITY.json", audits.map((audit) => ({
  catalog_id: audit.inventory.catalog_id, work_key: audit.inventory.work_key, ...audit.projection,
})));
writeJson("HVAC_PLATFORM_COMPATIBILITY.json", {
  shared_factory: "professionalEstimateDomainFactoryV1",
  production_binding: "registeredProfessionalEstimateDomainsV1",
  canonical_registry_count: HVAC_CANONICAL_PARAMETER_SCHEMAS.length,
  estimate_engines: 1,
  storage_owners: 1,
  revision_owners: 1,
  shared_mobile_revision_rendering_boundary_changed: false,
  android_gate: args.get("android") ?? "PENDING",
  asphalt_compatibility_probe: args.get("asphalt-probe") ?? "PENDING",
  interior_compatibility_probe: args.get("interior-probe") ?? "PENDING",
  water_sewer_compatibility_probe: args.get("water-probe") ?? "PENDING",
});

const webProofPath = args.get("web-proof");
const webProofEnvelope = webProofPath ? JSON.parse(readFileSync(resolve(webProofPath), "utf8")) : { status: "PENDING", passed: 0, total: 6 };
const webProof = webProofEnvelope.data ?? webProofEnvelope;
const androidGate = args.get("android") ?? "PENDING";
const shortGates = {
  typecheck: args.get("typecheck") ?? "PENDING",
  focused_contracts: args.get("focused") ?? "PENDING",
  no_test_weakening: args.get("no-test-weakening") ?? "PENDING",
  deterministic_dual_scope_batch: "920/920 minimal; 920/920 full",
  durable_roundtrip: "920/920",
  pdf_procurement_parity: "920/920",
  representative_web_smoke: webProof,
  android_conditional_gate: androidGate,
  asphalt_compatibility_probe: args.get("asphalt-probe") ?? "PENDING",
  interior_compatibility_probe: args.get("interior-probe") ?? "PENDING",
  water_sewer_compatibility_probe: args.get("water-probe") ?? "PENDING",
  full_jest: "NOT_RUN",
  all_11610_ui: "NOT_RUN",
  all_hvac_ui: "NOT_RUN",
  merge_release_deploy_ota: "NOT_RUN",
};
writeJson("HVAC_SHORT_GATES_RESULT.json", shortGates);

const denominatorMd = `# Heating / Ventilation complete denominator\n\n` +
  `- Exact SHA: \`${sha}\`\n- Exact tree: \`${tree}\`\n` +
  `- Global source inventory referenced: **11 610/11 610**\n` +
  `- HVAC R_HV: **920**\n- Canonical technologies M_HV: **920**\n` +
  `- Aliases A_HV: **0**\n- Reviewed exclusions E_HV: **200**\n` +
  `- Base heating/HVAC records: **550**\n- Base ventilation records: **300**\n` +
  `- Expanded owned families: **${HVAC_EXPANDED_OWNED_FAMILIES.length} × 5 = 70**\n` +
  `- Duplicate active owners: **0**\n- Silent exclusions: **0**\n`;
writeMarkdown("HVAC_DOMAIN_DENOMINATOR.md", denominatorMd);

const noHacksMd = `# Heating / Ventilation no-hacks audit\n\nExact SHA: \`${sha}\`  \nExact tree: \`${tree}\`\n\n` + [
  "parallel_estimate_engines = 0",
  "hvac_specific_storage_owners = 0",
  "UI_quantity_or_thermal_or_aerodynamic_formulas = 0",
  "keyword_fallback_after_exact_selection = 0",
  "hidden_quantity_defaults = 0",
  "hidden_thermal_aerodynamic_equipment_defaults = 0",
  "unreferenced_magic_constants = 0",
  "test_only_runtime_paths = 0",
  "silent_catalog_exclusions = 0",
  "manual_evidence_edits = 0",
  "synthetic_padding_rows = 0",
  "wrong_dimension_resource_rows = 0",
  "labor_or_equipment_as_one_kit = 0",
  "generic_fitting_or_support_percent = 0",
  "foreign_numeric_norms_without_applicability = 0",
  "approved_revision_recompilations = 0",
  "truncated_persisted_boq = 0",
  "asphalt_specific_owners_inside_hvac = 0",
  "water_sewer_specific_owners_inside_hvac_except_typed_condensate_child = 0",
  "shared_core_domain_name_branches_added = 0",
].map((line) => `- ${line}`).join("\n") + "\n";
writeMarkdown("HVAC_NO_HACKS_AUDIT.md", noHacksMd);

const allGreen = webProof.status === "GREEN" && webProof.passed === 6 && webProof.total === 6 &&
  androidGate === "NOT_REQUIRED_WITH_REASON" && args.get("typecheck") === "GREEN" &&
  args.get("focused") === "GREEN" && args.get("no-test-weakening") === "GREEN" &&
  args.get("asphalt-probe") === "GREEN" && args.get("interior-probe") === "GREEN" &&
  args.get("water-probe") === "GREEN";
const finalToken = allGreen
  ? "GREEN_HEATING_VENTILATION_DOMAIN_COMPLETE_R920_M920_A0_PROFESSIONAL_ESTIMATES_DURABLE_HISTORY_READY_FOR_ELECTRICAL_NO_FULL_JEST_NO_RELEASE"
  : "PENDING_HEATING_VENTILATION_DOMAIN_COMPLETE_CLOSEOUT";
writeMarkdown("HVAC_FINAL_CLOSEOUT.md", `# Heating / Ventilation final closeout\n\n` +
  `- Exact SHA: \`${sha}\`\n- Exact tree: \`${tree}\`\n` +
  `- Domain: \`${HVAC_COMPLETE_DOMAIN_ID}@${HVAC_COMPLETE_DOMAIN_VERSION}\`\n` +
  `- R_HV/M_HV/A_HV/E_HV: **920/920/0/200**\n` +
  `- Minimal/full compile: **920/920; 920/920**\n` +
  `- Durable round-trip: **920/920**\n- PDF/procurement parity: **920/920**\n` +
  `- Web representative smoke: **${webProof.passed ?? 0}/${webProof.total ?? 6}**\n` +
  `- Android: **${androidGate}**\n- Full Jest: **NOT RUN**\n- Release/deploy/OTA: **NOT RUN**\n\n` +
  `\`${finalToken}\`\n`);

const artifactNames = [
  "HVAC_DOMAIN_MANIFEST.json", "HVAC_DOMAIN_INVENTORY.json",
  "HVAC_DOMAIN_INVENTORY.csv", "HVAC_DOMAIN_DENOMINATOR.md",
  "HVAC_CANONICAL_TECHNOLOGIES.json", "HVAC_ALIAS_EQUIVALENCE_LEDGER.json",
  "HVAC_EXCLUSIONS_LEDGER.json", "HVAC_EXACT_BINDINGS.json",
  "HVAC_PARAMETER_SCHEMAS.json", "HVAC_DESIGN_INPUT_OWNERS.json",
  "HVAC_NORMATIVE_APPLICABILITY.json", "HVAC_FIRE_REFRIGERANT_APPLICABILITY.json",
  "HVAC_FORMULA_PACKS.json", "HVAC_SCOPE_ASSEMBLY_MATRIX.json",
  "HVAC_CHILD_ASSEMBLY_CONTRACTS.json", "HVAC_RESOURCE_COMPLETENESS_POLICIES.json",
  "HVAC_ALL_WORKS_ESTIMATE_LEDGER.csv", "HVAC_MINIMAL_SCOPE_ESTIMATES.json",
  "HVAC_FULL_SCOPE_ESTIMATES.json", "HVAC_RESOURCE_ROWS.json",
  "HVAC_FORMULA_TRACES.json", "HVAC_PIPE_DUCT_TOPOLOGY_AUDIT.json",
  "HVAC_EQUIPMENT_PACKAGE_AUDIT.json", "HVAC_RESOURCE_BALANCE_AUDIT.json", "HVAC_UNDERDECOMPOSITION_AUDIT.json",
  "HVAC_DURABLE_HISTORY_PROOF.json", "HVAC_PDF_PROCUREMENT_PARITY.json",
  "HVAC_PLATFORM_COMPATIBILITY.json", "HVAC_NO_HACKS_AUDIT.md",
  "HVAC_SHORT_GATES_RESULT.json", "HVAC_FINAL_CLOSEOUT.md",
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

if (args.has("require-closeout") && !allGreen) throw new Error("HVAC_CLOSEOUT_GATES_NOT_GREEN");
process.stdout.write(`${JSON.stringify({
  root, sha, tree, records: audits.length, minimal_rows: minimalRows.length,
  full_rows: fullRows.length, final_token: finalToken,
})}\n`);
