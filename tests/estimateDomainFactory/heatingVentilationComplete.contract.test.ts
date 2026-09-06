import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type ProfessionalDomainParameterDefinitionV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  HVAC_COMPLETE_ALIAS_COUNT,
  HVAC_COMPLETE_RECORD_COUNT,
  HVAC_COMPLETE_TECHNOLOGY_COUNT,
  HVAC_DOMAIN_INVENTORY,
  HVAC_REVIEWED_EXCLUSIONS,
  hvacIsRepair,
  hvacDomainFactory,
} from "../../src/lib/estimate/v4/domains/heatingVentilationComplete";

const CAPTURED_AT = "2026-08-11T00:00:00.000Z";
type Scope = "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";

function installLocalStorageMock(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, nextValue) => { values.set(key, nextValue); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => { delete (globalThis as { localStorage?: Storage }).localStorage; };
}

function sourceType(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.includes("productivity") || parameterId.includes("interval") || parameterId.includes("rate")) {
    return "APPLICABLE_NORM";
  }
  if (parameterId.includes("material") || parameterId.includes("mass") || parameterId.includes("profile")) {
    return "MATERIAL_PASSPORT";
  }
  if (["funding_source", "project_type", "normative_rate_code"].includes(parameterId) ||
      parameterId.includes("pressure") || parameterId.includes("slope") || parameterId.includes("elevation")) {
    return "PROJECT_DOCUMENT";
  }
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

function rawParameterValue(
  parameter: ProfessionalDomainParameterDefinitionV1,
  scopeCapability: string,
  scope: Scope,
): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scope;
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

function parameterValues(catalogId: string, scope: Scope): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = hvacDomainFactory.binding_by_catalog_id.get(catalogId);
  if (!binding) throw new Error(`TEST_HVAC_BINDING_NOT_FOUND:${catalogId}`);
  const technology = hvacDomainFactory.technology_by_id.get(binding.canonical_technology_id);
  const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`TEST_HVAC_SCHEMA_NOT_FOUND:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scope === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    return [[parameter.parameter_id, {
      value: rawParameterValue(parameter, binding.scope_capability, scope),
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `hvac-complete-fixture:${catalogId}:${parameter.parameter_id}`,
      captured_at: CAPTURED_AT,
      confidence: "high" as const,
      applicability: `Exact deterministic fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function compile(catalogId: string, scope: Scope) {
  const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TEST_HVAC_INVENTORY_NOT_FOUND:${catalogId}`);
  const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`TEST_HVAC_TECHNOLOGY_NOT_FOUND:${catalogId}`);
  const repair = hvacIsRepair(inventory);
  const sourceId = repair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
  return compileProfessionalEstimateDomainV1(hvacDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scope,
    parent_revision_id: null,
    parameter_values: parameterValues(catalogId, scope),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "HVAC_PROJECT",
      construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-11",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: { [sourceId]: "PROJECT-VERIFIED-HVAC-RATE" },
    },
  });
}

describe("Heating / Ventilation complete professional domain", () => {
  test("freezes exact R920/M920/A0 with reviewed E200 and no fan-in", () => {
    expect(HVAC_COMPLETE_RECORD_COUNT).toBe(920);
    expect(HVAC_COMPLETE_TECHNOLOGY_COUNT).toBe(920);
    expect(HVAC_COMPLETE_ALIAS_COUNT).toBe(0);
    expect(HVAC_DOMAIN_INVENTORY).toHaveLength(920);
    expect(HVAC_REVIEWED_EXCLUSIONS).toHaveLength(200);
    expect(hvacDomainFactory.binding_by_catalog_id.size).toBe(920);
    expect(hvacDomainFactory.technology_by_id.size).toBe(920);
    expect(new Set(HVAC_DOMAIN_INVENTORY.map((row) => row.catalog_id)).size).toBe(920);
    expect(new Set(HVAC_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size).toBe(920);
  });

  test("compiles all 920 exact records in both scopes with traceable professional resources", () => {
    for (const inventory of HVAC_DOMAIN_INVENTORY) {
      for (const scope of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
        const result = compile(inventory.catalog_id, scope);
        if (result.status !== "COMPILED") {
          throw new Error(`HVAC_BATCH_RED:${inventory.catalog_id}:${scope}:${result.blockers.join("|")}:${JSON.stringify(result.normative_resolution)}`);
        }
        expect(result.status).toBe("COMPILED");
        expect(result.blockers).toEqual([]);
        expect(result.exact_identity).toEqual({
          catalog_id: inventory.catalog_id,
          work_key: inventory.work_key,
          canonical_technology_id: inventory.canonical_technology_id,
        });
        const rows = result.compilation?.compiled_rows ?? [];
        expect(rows.length).toBeGreaterThan(0);
        expect(result.compilation?.assumptions_count).toBe(0);
        expect(result.compilation?.hidden_quantity_defaults).toBe(0);
        expect(rows.every((row) => row.quantity > 0 && row.formula_expression.length > 0)).toBe(true);
        expect(rows.every((row) => row.normative_source_ids.length > 0)).toBe(true);
        expect(new Set(rows.map((row) => row.semantic_owner)).size).toBe(rows.length);
        if (scope === "FULL_APPLICABLE_SCOPE") {
          const categories = new Set(rows.map((row) => row.category));
          for (const category of ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"] as const) {
            expect(categories.has(category)).toBe(true);
          }
          expect(rows.length).toBeGreaterThan(15);
          expect(rows.some((row) => row.unit_id === "man_hour")).toBe(true);
          expect(rows.some((row) => row.unit_id === "machine_hour")).toBe(true);
          expect(rows.some((row) => row.unit_id === "t_km")).toBe(true);
        }
      }
    }
  });

  test("representative heating, duct, refrigerant, external, equipment, commissioning and repair assemblies are explicit", () => {
    const representatives = [
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "heating_hvac" && row.primary_material_or_system === "HEATING_PIPE"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "heating_hvac" && row.primary_material_or_system === "WARM_FLOOR"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "ventilation" && row.primary_material_or_system === "DUCT"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "heating_hvac" && row.primary_material_or_system === "CHILLER"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "expanded:heat_network"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "expanded:ventilation_system"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "ventilation" && row.primary_material_or_system === "COMMISSIONING"),
      HVAC_DOMAIN_INVENTORY.find((row) => row.new_repair_demolition_state === "REPAIR"),
    ].filter((row): row is (typeof HVAC_DOMAIN_INVENTORY)[number] => Boolean(row));
    expect(representatives).toHaveLength(8);
    const rows = representatives.flatMap((inventory) => compile(inventory.catalog_id, "FULL_APPLICABLE_SCOPE").compilation?.compiled_rows ?? []);
    const owners = rows.map((row) => row.semantic_owner).join("|");
    expect(owners).toContain("connections");
    expect(owners).toContain("pipe_elbows");
    expect(owners).toContain("duct_metal");
    expect(owners).toContain("manufacturer_charge");
    expect(owners).toContain("warm_floor_pipe");
    expect(owners).toContain("earthworks");
    expect(owners).toContain("restoration");
    expect(owners).toContain("electrical_automation");
    expect(owners).toContain("balancing_labor");
    expect(owners).toContain("demolition");
  });

  test("one Apply creates one revision and edit/reload preserves exact identity and BOQ", async () => {
    const {
      __resetConsumerRepairRequestStoreForTests,
      __simulateConsumerRepairRequestStoreReloadForTests,
      getConsumerRepairRequest,
      initializeConsumerRepairTransactionalDurableStorage,
    } = require("../../src/lib/consumerRequests") as typeof import("../../src/lib/consumerRequests");
    const {
      applyCanonicalConsumerRepairAuditParamBatchPatch: applyConsumerRepairDraftRevisionParamBatchPatch,
      createCanonicalConsumerRepairAuditDraft: createConsumerRepairRequestDraft,
    } = require("../../scripts/estimate/canonicalConsumerRepairAuditHarness") as typeof import("../../scripts/estimate/canonicalConsumerRepairAuditHarness");
    const {
      buildRegisteredProfessionalEstimateParameterCollectionDraftV1,
      resolveRegisteredProfessionalEstimateSelectionV1,
    } = require("../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1") as typeof import("../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1");
    const { awaitConsumerRepairBundleDurableCommit } = require(
      "../../src/lib/consumerRequests/consumerRequestRepository"
    ) as typeof import("../../src/lib/consumerRequests/consumerRequestRepository");
    const uninstall = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
    const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.source_domain_id === "heating_hvac" && row.primary_material_or_system === "HEATING_PIPE" && row.scope_capability === "standard");
    if (!inventory) throw new Error("TEST_HVAC_APPLY_RECORD_MISSING");
    const selection = resolveRegisteredProfessionalEstimateSelectionV1(inventory.catalog_id);
    if (!selection) throw new Error("TEST_HVAC_REGISTERED_SELECTION_MISSING");
    const aiDraft = buildRegisteredProfessionalEstimateParameterCollectionDraftV1({
      selection,
      raw_input: inventory.localized_name_ru,
    });
    const created = createConsumerRepairRequestDraft({
      consumerUserId: "hvac-complete-apply-user",
      problemText: inventory.localized_name_ru,
      repairType: inventory.work_key,
      city: "Bishkek",
      selectedWork: aiDraft.selectedWork,
      aiDraft,
    });
    const values = parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
    const r1Bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      patches: Object.entries(values).map(([paramKey, parameter]) => ({
        operation: "add_param" as const,
        paramKey,
        rawValue: String(parameter.value),
      })),
      userId: created.draft.consumerUserId,
      createdAt: "2026-08-11T03:00:00.000Z",
    });
    expect(r1Bundle.estimateDraftRevisionState?.revisions).toHaveLength(1);
    const r1 = r1Bundle.estimateDraftRevisionState?.revisions[0];
    expect(r1?.boq.rows.length).toBeGreaterThan(15);
    expect(r1?.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);
    const quantityId = hvacDomainFactory.schema_by_id.get(
      hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id)?.parameter_schema_id ?? "",
    )?.quantity_alternatives[0]?.[0];
    if (!quantityId) throw new Error("TEST_HVAC_QUANTITY_ID_MISSING");
    const r2Bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      patches: [{ operation: "update_param", paramKey: quantityId, rawValue: "180" }],
      userId: created.draft.consumerUserId,
      createdAt: "2026-08-11T03:01:00.000Z",
    });
    expect(r2Bundle.estimateDraftRevisionState?.revisions).toHaveLength(2);
    const r2 = r2Bundle.estimateDraftRevisionState?.revisions[1];
    expect(r2?.previousRevisionId).toBe(r1?.revisionId);
    expect(r2?.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);
    await awaitConsumerRepairBundleDurableCommit({
      requestDraftId: created.draft.id,
      expectedStatus: "draft",
      expectedRevisionId: r2?.revisionId ?? null,
    });
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const cold = getConsumerRepairRequest(created.draft.id);
    expect(cold.estimateDraftRevisionState?.currentRevisionId).toBe(r2?.revisionId);
    expect(cold.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(cold.items.map((item) => item.sourceParameters?.rowCode)).toEqual(r2?.boq.rows.map((row) => row.rowId));
    uninstall();
  });
});
