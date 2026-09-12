import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { projectEstimateDraftRevisionToCanonicalSession } from "../../src/lib/estimate/canonicalParameters/projectEstimateDraftRevisionToCanonicalSession";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  createConsumerRepairRequestDraft as createEmptyConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import {
  applyCanonicalConsumerRepairAuditParamBatchPatch as applyConsumerRepairDraftRevisionParamBatchPatch,
  createCanonicalConsumerRepairAuditDraft as createConsumerRepairRequestDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE,
  INTERIOR_FINISHES_WAVE_1_INVENTORY,
  buildInteriorFinishesWave1ProductionDraftV1,
  interiorFinishesWave1DomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesWave1";
import {
  buildRegisteredProfessionalEstimateParameterCollectionDraftV1,
  resolveRegisteredProfessionalEstimateSelectionV1,
} from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";

const CAPTURED_AT = "2026-08-11T00:00:00.000Z";

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

function value(
  raw: string | number | boolean,
  unitId: string | null,
  sourceType: ProfessionalParameterValueV4["source_type"] = "USER_EXPLICIT",
): ProfessionalParameterValueV4 {
  return {
    value: raw,
    unit_id: unitId,
    source_type: sourceType,
    source_id: `interior-wave1-fixture:${sourceType}:${String(raw)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Exact deterministic Interior Finishes Wave 1 acceptance fixture",
  };
}

const FIXTURE_NUMBER_BY_PARAMETER: Readonly<Record<string, number>> = {
  area_m2: 120,
  junction_length_m: 48,
  layer_thickness_mm: 2,
  material_consumption_kg_m2_mm: 0.9,
  putty_procurement_quantity_kg: 216,
  selected_consumption_kg_m2: 0.7,
  coat_count: 2,
  material_consumption_kg_m2_coat: 0.18,
  material_consumption_m2_m2: 1.1,
  material_consumption_m_m: 1.05,
  material_mass_kg_per_unit: 0.2,
  labor_productivity_output_per_man_hour: 8,
  equipment_productivity_output_per_machine_hour: 25,
  surface_preparation_productivity_output_per_man_hour: 15,
  auxiliary_material_rate_kg_per_output: 0.05,
  waste_percent: 3,
  delivery_distance_km: 12,
  truck_payload_t: 5,
  loading_productivity_kg_per_man_hour: 500,
  waste_handling_productivity_kg_per_man_hour: 300,
  qa_interval_output_per_test: 100,
  documentation_record_count: 3,
  small_area_detail_productivity_output_per_man_hour: 4,
  large_area_material_handling_productivity_kg_per_machine_hour: 750,
  wet_zone_protection_rate_kg_per_output: 0.35,
  wet_zone_moisture_control_interval_output_per_test: 40,
  technical_room_protective_material_rate_kg_per_output: 0.22,
  technical_room_detailing_productivity_output_per_man_hour: 5,
  high_load_reinforcement_rate_output_per_output: 1.08,
  high_load_reinforcement_productivity_output_per_man_hour: 6,
  repair_removal_quantity_output: 24,
  repair_removed_mass_kg_per_output: 8,
  repair_removal_productivity_output_per_man_hour: 3,
  repair_waste_haul_distance_km: 18,
};

function parameterValues(
  catalogId: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = interiorFinishesWave1DomainFactory.binding_by_catalog_id.get(catalogId);
  if (!binding) throw new Error(`TEST_BINDING_NOT_FOUND:${catalogId}`);
  const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(binding.canonical_technology_id);
  if (!technology) throw new Error(`TEST_TECHNOLOGY_NOT_FOUND:${binding.canonical_technology_id}`);
  const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(technology.parameter_schema_id);
  if (!schema) throw new Error(`TEST_SCHEMA_NOT_FOUND:${technology.parameter_schema_id}`);

  return Object.fromEntries(schema.parameters
    .filter((parameter) => scopeMode === "FULL_APPLICABLE_SCOPE" ||
      parameter.priority === "P0" ||
      parameter.parameter_id === "putty_procurement_quantity_kg")
    .map((parameter) => {
      if (parameter.parameter_id === "work_included") return [parameter.parameter_id, value(true, null)];
      if (parameter.parameter_id === "estimate_scope_mode") return [parameter.parameter_id, value(scopeMode, null)];
      if (parameter.parameter_id === "scope_capability") return [parameter.parameter_id, value(binding.scope_capability, null)];
      if (parameter.parameter_id === "funding_source") return [parameter.parameter_id, value("PRIVATE_RECOMMENDED", null, "PROJECT_DOCUMENT")];
      if (parameter.parameter_id === "project_type") return [parameter.parameter_id, value("RESIDENTIAL_INTERIOR", null, "PROJECT_DOCUMENT")];
      if (parameter.parameter_id === "surface_type") return [parameter.parameter_id, value("PROJECT_SPECIFIED", null)];
      if (parameter.parameter_id === "existing_condition") return [parameter.parameter_id, value("ACCEPTED", null)];
      if (parameter.parameter_id === "application_method") return [parameter.parameter_id, value("MECHANIZED", null)];
      if (parameter.parameter_id === "product_profile_id") {
        return [parameter.parameter_id, value("PROJECT-MATERIAL-PASSPORT-IFW1", null, "MATERIAL_PASSPORT")];
      }
      if (parameter.parameter_id === "normative_rate_code") {
        return [parameter.parameter_id, value("PROJECT-VERIFIED-RATE-IFW1", null, "PROJECT_DOCUMENT")];
      }
      if (parameter.input_type === "boolean") {
        return [parameter.parameter_id, value(false, parameter.unit_id)];
      }
      if (parameter.input_type === "choice") {
        const selected = parameter.choices?.[0]?.value;
        if (!selected) throw new Error(`TEST_PARAMETER_CHOICE_FIXTURE_MISSING:${parameter.parameter_id}`);
        return [parameter.parameter_id, value(selected, parameter.unit_id)];
      }
      if (parameter.input_type === "text") {
        return [parameter.parameter_id, value(`PROJECT:${parameter.parameter_id}`, parameter.unit_id)];
      }
      const numeric = FIXTURE_NUMBER_BY_PARAMETER[parameter.parameter_id];
      if (numeric == null) throw new Error(`TEST_PARAMETER_FIXTURE_MISSING:${parameter.parameter_id}`);
      const normRate = parameter.parameter_id.includes("productivity");
      const materialRate = parameter.parameter_id.includes("material_consumption") ||
        parameter.parameter_id.includes("material_mass") ||
        parameter.parameter_id.includes("auxiliary_material_rate") ||
        parameter.parameter_id.includes("procurement_quantity");
      return [parameter.parameter_id, value(
        numeric,
        parameter.unit_id,
        normRate ? "APPLICABLE_NORM" : materialRate ? "MATERIAL_PASSPORT" : "USER_EXPLICIT",
      )];
    }));
}

function compile(catalogId: string, scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE") {
  const inventory = INTERIOR_FINISHES_WAVE_1_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TEST_INVENTORY_NOT_FOUND:${catalogId}`);
  const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`TEST_TECHNOLOGY_NOT_FOUND:${inventory.canonical_technology_id}`);
  const isRepair = inventory.scope_capability === "repair";
  return compileProfessionalEstimateDomainV1(
    interiorFinishesWave1DomainFactory,
    constructionNormativeRegistryV1,
    {
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_mode: scopeMode,
      parent_revision_id: null,
      parameter_values: parameterValues(catalogId, scopeMode),
      normative_request: {
        country: "KG",
        region: "Bishkek",
        funding_source: "PRIVATE_RECOMMENDED",
        project_type: "RESIDENTIAL_INTERIOR",
        construction_state: isRepair ? "REPAIR" : "NEW",
        contract_basis: [],
        effective_date: "2026-08-11",
        material_system: technology.material_system,
        operation_class: technology.operation_class,
        rate_code_by_source_id: {
          [isRepair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance"]:
            "PROJECT-VERIFIED-RATE-IFW1",
        },
      },
    },
  );
}

describe("Interior Finishes Wave 1 professional domain package", () => {
  test("freezes 84 exact catalog bindings to 84 scope-specific technologies", () => {
    expect(INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.manifest).toMatchObject({
      catalog_record_count: 84,
      canonical_technology_count: 84,
      alias_count: 0,
      excluded_count: 0,
    });
    expect(new Set(INTERIOR_FINISHES_WAVE_1_INVENTORY.map((row) => row.catalog_id)).size).toBe(84);
    expect(new Set(INTERIOR_FINISHES_WAVE_1_INVENTORY.map((row) => row.canonical_technology_id)).size).toBe(84);
    expect(interiorFinishesWave1DomainFactory.binding_by_catalog_id.size).toBe(84);
  });

  test("compiles every record in minimal and full scope with exact identity and no hidden assumptions", () => {
    for (const inventory of INTERIOR_FINISHES_WAVE_1_INVENTORY) {
      for (const scopeMode of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
        const result = compile(inventory.catalog_id, scopeMode);
        expect(result.status).toBe("COMPILED");
        expect(result.blockers).toEqual([]);
        expect(result.exact_identity).toEqual({
          catalog_id: inventory.catalog_id,
          work_key: inventory.work_key,
          canonical_technology_id: inventory.canonical_technology_id,
        });
        expect(result.compilation?.compiled_rows.length).toBeGreaterThan(0);
        expect(result.compilation?.assumptions_count).toBe(0);
        expect(result.compilation?.hidden_quantity_defaults).toBe(0);
        expect(result.compilation?.requested_catalog_id).toBe(inventory.catalog_id);
        expect(result.compilation?.requested_work_key).toBe(inventory.work_key);
        if (scopeMode === "MINIMAL_EXPLICIT_SCOPE") {
          expect(result.compilation?.compiled_rows.every((row) => row.inclusion_condition === "work_included=true"))
            .toBe(true);
        }
      }
    }
  });

  test("full scope emits separately quantified material, labor, equipment, logistics, waste, QA and documents", () => {
    for (const inventory of INTERIOR_FINISHES_WAVE_1_INVENTORY) {
      const result = compile(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
      const rows = result.compilation?.compiled_rows ?? [];
      const categories = new Set(rows.map((row) => row.category));
      expect(categories).toEqual(new Set([
        "material",
        "labor",
        "equipment",
        "transport",
        "waste",
        "testing",
        "documentation",
      ]));
      expect(rows.some((row) => row.unit_id === "man_hour")).toBe(true);
      expect(rows.some((row) => row.unit_id === "machine_hour")).toBe(true);
      expect(rows.some((row) => row.unit_id === "t_km")).toBe(true);
      expect(rows.some((row) => row.unit_id === "trip")).toBe(true);
      expect(rows.every((row) => row.quantity > 0 && row.formula_expression.length > 0)).toBe(true);
      expect(rows.every((row) => row.calculation_trace.includes("результат="))).toBe(true);
      expect(rows.every((row) => row.normative_source_ids.length > 0)).toBe(true);
      expect(new Set(rows.filter((row) => row.cost_ownership !== "informational_output").map((row) => row.cost_owner_id)).size)
        .toBe(rows.filter((row) => row.cost_ownership !== "informational_output").length);
    }
  });

  test("keeps all seven scope variants semantically distinct and binds repair only to KRERr", () => {
    const expectedScopeRows: Readonly<Record<string, string | null>> = {
      standard: null,
      small_area: "small_area_detail_labor",
      large_area: "large_area_material_handling_equipment",
      wet_zone: "wet_zone_protection_material",
      technical_room: "technical_room_protective_material",
      high_load: "high_load_reinforcement_material",
      repair: "repair_removed_waste",
    };
    const baseWork = "plaster_paint_interior_wall_plaster_apply";
    const variants = INTERIOR_FINISHES_WAVE_1_INVENTORY.filter((row) => row.work_key.startsWith(`${baseWork}_`));
    expect(variants).toHaveLength(7);
    const resourceFingerprints = new Set<string>();
    for (const inventory of variants) {
      const result = compile(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
      const rows = result.compilation?.compiled_rows ?? [];
      const expectedRow = expectedScopeRows[inventory.scope_capability];
      if (expectedRow) expect(rows.some((row) => row.row_id.endsWith(`:row:${expectedRow}`))).toBe(true);
      const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
      if (!technology) throw new Error(`TEST_TECHNOLOGY_NOT_FOUND:${inventory.canonical_technology_id}`);
      expect(technology.method.endsWith(`:${inventory.scope_capability.toUpperCase()}`)).toBe(true);
      const resourceProfile = technology.normative_profile_ids
        .map((id) => interiorFinishesWave1DomainFactory.normative_profile_by_id.get(id))
        .find((profile) => profile?.jurisdiction === "KG");
      expect(resourceProfile?.requested_source_ids).toEqual([
        inventory.scope_capability === "repair"
          ? "kg_krerr_2015_application_guidance"
          : "kg_krer_2015_application_guidance",
      ]);
      expect(new Set(rows.flatMap((row) => row.normative_source_ids))).toEqual(new Set([
        inventory.scope_capability === "repair"
          ? "kg_krerr_2015_application_guidance"
          : "kg_krer_2015_application_guidance",
      ]));
      if (technology.material_system === "PAINT" || technology.material_system === "PRIMER") {
        expect(result.normative_resolution.applicable_sources.map((source) => source.source_id))
          .toContain("eaeu_tr_053_2026_paint_safety");
      }
      resourceFingerprints.add(rows.map((row) => row.row_id.split(":row:")[1]).join("|"));
    }
    expect(resourceFingerprints.size).toBe(7);
  });

  test("fails closed on missing required values, foreign identity and empty scope", () => {
    const first = INTERIOR_FINISHES_WAVE_1_INVENTORY[0];
    const fullValues = { ...parameterValues(first.catalog_id, "FULL_APPLICABLE_SCOPE") };
    delete fullValues.area_m2;
    const missing = compileProfessionalEstimateDomainV1(
      interiorFinishesWave1DomainFactory,
      constructionNormativeRegistryV1,
      {
        catalog_id: first.catalog_id,
        work_key: first.work_key,
        scope_mode: "FULL_APPLICABLE_SCOPE",
        parent_revision_id: null,
        parameter_values: fullValues,
        normative_request: {
          country: "KG",
          region: "Bishkek",
          funding_source: "PRIVATE_RECOMMENDED",
          project_type: "RESIDENTIAL_INTERIOR",
          construction_state: "NEW",
          contract_basis: [],
          effective_date: "2026-08-11",
          material_system: "PLASTER",
          operation_class: "APPLY",
          rate_code_by_source_id: { kg_krer_2015_application_guidance: "PROJECT-VERIFIED-RATE-IFW1" },
        },
      },
    );
    expect(missing.status).toBe("NEEDS_REQUIRED_INPUTS");
    expect(missing.blockers).toContain("PROJECT_VALUE_REQUIRED_ONE_OF:area_m2");
    expect(() => compileProfessionalEstimateDomainV1(
      interiorFinishesWave1DomainFactory,
      constructionNormativeRegistryV1,
      {
        catalog_id: first.catalog_id,
        work_key: "foreign-work-key",
        scope_mode: "MINIMAL_EXPLICIT_SCOPE",
        parent_revision_id: null,
        parameter_values: parameterValues(first.catalog_id, "MINIMAL_EXPLICIT_SCOPE"),
        normative_request: {
          country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
          project_type: "RESIDENTIAL_INTERIOR", construction_state: "NEW", contract_basis: [],
          effective_date: "2026-08-11", material_system: "PLASTER", operation_class: "APPLY",
        },
      },
    )).toThrow(`DOMAIN_EXACT_WORK_KEY_MISMATCH:${first.catalog_id}:foreign-work-key`);
  });

  test("routes six representative exact selections through the production inline entry", () => {
    const representatives = INTERIOR_FINISHES_WAVE_1_INVENTORY.filter((row) => row.scope_capability === "standard").slice(0, 6);
    expect(representatives).toHaveLength(6);
    for (const [index, inventory] of representatives.entries()) {
      const values = parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
      const createdAt = `2026-08-11T00:0${index}:00.000Z`;
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: inventory.template_id,
        selectedWorkKey: inventory.work_key,
        selectedTemplateName: inventory.localized_name_ru,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        paramOverrides: Object.fromEntries(Object.entries(values).map(([key, parameter]) => [key, {
          value: parameter.value,
          ...(parameter.unit_id ? { canonicalUnit: parameter.unit_id } : {}),
          source: "edited_by_user" as const,
          sourceText: parameter.source_id,
          lastChangedAt: createdAt,
        }])),
      });
      expect(result.blockingReason).toBe("CANONICAL_BACKEND_REQUIRED");
      expect(result.canBuildPreliminaryEstimate).toBe(false);
      expect(result.draft).toBeNull();
      expect(result.parseResult.matchedTemplate).toMatchObject({
        templateId: `domain-passport:${inventory.catalog_id}:v1`,
        family: inventory.work_key,
        matchSource: "user_selected",
      });
      expect(result.parseResult.candidateTemplates[0]).toMatchObject({
        workKey: inventory.work_key,
        reason: `exact_professional_domain_binding:${inventory.catalog_id}`,
      });
      expect(result.parseResult.missingInputs.length).toBeGreaterThan(0);
    }
  });

  test("creates exactly one durable R1 from the shared initial Apply path and preserves exact identity on edit", () => {
    const uninstallLocalStorage = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
    const inventory = INTERIOR_FINISHES_WAVE_1_INVENTORY.find((row) =>
      row.scope_capability === "standard" && row.work_key.includes("paint_wall")
    ) ?? INTERIOR_FINISHES_WAVE_1_INVENTORY.find((row) => row.scope_capability === "standard");
    if (!inventory) throw new Error("TEST_STANDARD_INVENTORY_NOT_FOUND");
    const selection = resolveRegisteredProfessionalEstimateSelectionV1(inventory.catalog_id);
    if (!selection) throw new Error("TEST_REGISTERED_SELECTION_NOT_FOUND");
    const aiDraft = buildRegisteredProfessionalEstimateParameterCollectionDraftV1({
      selection,
      raw_input: inventory.localized_name_ru,
    });
    const created = createConsumerRepairRequestDraft({
      consumerUserId: "interior-wave1-apply-user",
      problemText: inventory.localized_name_ru,
      repairType: inventory.work_key,
      city: "Bishkek",
      selectedWork: aiDraft.selectedWork,
      aiDraft,
    });
    expect(created.estimateDraftRevisionState).toBeNull();
    expect(created.canonicalParameterSession?.canonicalWorkKey).toBe(inventory.work_key);

    const fullValues = parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
    const patches = Object.entries(fullValues).map(([paramKey, parameter]) => ({
      operation: "add_param" as const,
      paramKey,
      rawValue: String(parameter.value),
    }));
    const r1Bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      patches,
      userId: created.draft.consumerUserId,
      createdAt: "2026-08-11T02:00:00.000Z",
    });
    const r1State = r1Bundle.estimateDraftRevisionState;
    expect(r1State?.revisions).toHaveLength(1);
    const r1 = r1State?.revisions[0];
    expect(r1?.status).toBe("draft_ready");
    expect(r1?.boq.rows.length).toBeGreaterThan(0);
    expect(r1?.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);
    expect(r1Bundle.draft.selectedCatalogWorkId).toBe(inventory.catalog_id);
    expect(r1Bundle.draft.selectedWorkKey).toBe(inventory.work_key);

    const quantityKey = inventory.work_key.includes("corner_apply") ? "junction_length_m" : "area_m2";
    const r2Bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      patches: [{ operation: "update_param", paramKey: quantityKey, rawValue: "180" }],
      userId: created.draft.consumerUserId,
      createdAt: "2026-08-11T02:01:00.000Z",
    });
    expect(r2Bundle.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(r2Bundle.draft.selectedCatalogWorkId).toBe(inventory.catalog_id);
    expect(r2Bundle.draft.selectedWorkKey).toBe(inventory.work_key);
    const r2 = r2Bundle.estimateDraftRevisionState?.revisions[1];
    expect(r2?.previousRevisionId).toBe(r1?.revisionId);
    expect(r2?.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const cold = getConsumerRepairRequest(created.draft.id);
    expect(cold.estimateDraftRevisionState?.currentRevisionId).toBe(r2?.revisionId);
    expect(cold.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(cold.items.map((item) => item.sourceParameters?.rowCode)).toEqual(
      r2?.boq.rows.map((row) => row.rowId),
    );
    uninstallLocalStorage();
  });

  test("projects exact create/edit revisions through shared history, PDF and procurement boundaries", () => {
    const uninstallLocalStorage = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
    const inventory = INTERIOR_FINISHES_WAVE_1_INVENTORY.find((row) => row.scope_capability === "standard");
    if (!inventory) throw new Error("TEST_STANDARD_INVENTORY_NOT_FOUND");
    const baseBundle = createEmptyConsumerRepairRequestDraft({
      consumerUserId: "interior-wave1-durable-user",
      problemText: inventory.localized_name_ru,
      repairType: inventory.work_key,
    });
    const values = parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE");
    const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    if (!technology) throw new Error("TEST_STANDARD_TECHNOLOGY_NOT_FOUND");
    const production = buildInteriorFinishesWave1ProductionDraftV1({
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parent_revision_id: null,
      parameter_values: values,
      normative_request: {
        country: "KG",
        region: "Bishkek",
        funding_source: "PRIVATE_RECOMMENDED",
        project_type: "RESIDENTIAL_INTERIOR",
        construction_state: "NEW",
        contract_basis: [],
        effective_date: "2026-08-11",
        material_system: technology.material_system,
        operation_class: technology.operation_class,
        rate_code_by_source_id: { kg_krer_2015_application_guidance: "PROJECT-VERIFIED-RATE-IFW1" },
      },
      raw_input: inventory.localized_name_ru,
      currency: "KGS",
    });
    expect(production.draft).not.toBeNull();
    const createdAt = "2026-08-11T01:00:00.000Z";
    const paramOverrides = Object.fromEntries(Object.entries(values).map(([key, parameter]) => [key, {
      value: parameter.value,
      ...(parameter.unit_id ? { canonicalUnit: parameter.unit_id } : {}),
      source: "edited_by_user" as const,
      sourceText: parameter.source_id,
      lastChangedAt: createdAt,
    }]));
    const r1 = createEstimateDraftRevision({
      estimateDraftId: baseBundle.draft.id,
      rawInput: inventory.localized_name_ru,
      selectedTemplateId: `domain-passport:${inventory.catalog_id}:v1`,
      selectedWorkKey: inventory.work_key,
      selectedTemplateName: inventory.localized_name_ru,
      currency: "KGS",
      createdAt,
      revisionIndex: 1,
      paramOverrides,
      prebuiltExactDraft: production.draft,
    });
    expect(r1.status).toBe("draft_ready");
    expect(r1.professionalWorkId).toBe(inventory.work_key);
    expect(r1.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);
    expect(r1.boq.rows).toHaveLength(production.compile_result.compilation?.compiled_rows.length ?? 0);
    expect(r1.legacyRowsCount).toBe(0);
    const session = projectEstimateDraftRevisionToCanonicalSession({
      revision: r1,
      draftId: r1.estimateDraftId,
      createdAt,
    });
    if (session?.status !== "COMPLETE") {
      throw new Error(`TEST_CANONICAL_SESSION_NOT_COMPLETE:${JSON.stringify({
        status: session?.status,
        blocking: session?.blockingMissingParameterIds,
        invalid: session?.invalidParameterIds,
        parameters: session?.parameters.filter((parameter) => !parameter.valid).map((parameter) => ({
          id: parameter.parameterId,
          value: parameter.value,
          issues: parameter.validationIssues,
        })),
      })}`);
    }
    expect(session?.status).toBe("COMPLETE");
    expect(session?.canonicalWorkKey).toBe(inventory.work_key);

    const editValues = {
      ...values,
      area_m2: value(180, "m2"),
    };
    const editedProduction = buildInteriorFinishesWave1ProductionDraftV1({
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parent_revision_id: r1.revisionId,
      parameter_values: editValues,
      normative_request: {
        country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
        project_type: "RESIDENTIAL_INTERIOR", construction_state: "NEW", contract_basis: [],
        effective_date: "2026-08-11", material_system: technology.material_system,
        operation_class: technology.operation_class,
        rate_code_by_source_id: { kg_krer_2015_application_guidance: "PROJECT-VERIFIED-RATE-IFW1" },
      },
      raw_input: inventory.localized_name_ru,
      currency: "KGS",
    });
    if (!editedProduction.draft) throw new Error("TEST_EDIT_DRAFT_NOT_COMPILED");
    const r2 = createEstimateDraftRevision({
      estimateDraftId: r1.estimateDraftId,
      previousRevisionId: r1.revisionId,
      source: "param_edit",
      rawInput: inventory.localized_name_ru,
      selectedTemplateId: r1.selectedTemplateId,
      selectedWorkKey: inventory.work_key,
      selectedTemplateName: inventory.localized_name_ru,
      currency: "KGS",
      createdAt: "2026-08-11T01:01:00.000Z",
      revisionIndex: 2,
      paramOverrides: Object.fromEntries(Object.entries(editValues).map(([key, parameter]) => [key, {
        value: parameter.value,
        ...(parameter.unit_id ? { canonicalUnit: parameter.unit_id } : {}),
        source: "edited_by_user" as const,
        sourceText: parameter.source_id,
        lastChangedAt: "2026-08-11T01:01:00.000Z",
      }])),
      prebuiltExactDraft: editedProduction.draft,
    });
    expect(r2.previousRevisionId).toBe(r1.revisionId);
    expect(r2.revisionId).not.toBe(r1.revisionId);
    expect(r2.params.area_m2.value).toBe(180);
    expect(r1.params.area_m2.value).toBe(120);

    const canonicalR2 = projectEstimateDraftRevisionToCanonicalSession({
      revision: r2,
      draftId: baseBundle.draft.id,
      createdAt: "2026-08-11T01:01:00.000Z",
      previousSession: session,
    });
    if (!canonicalR2) throw new Error("TEST_CANONICAL_R2_MISSING");
    const saved = saveConsumerRepairBundle({
      ...baseBundle,
      draft: {
        ...baseBundle.draft,
        repairType: inventory.work_key,
        selectedCatalogWorkId: inventory.catalog_id,
        selectedWorkKey: inventory.work_key,
        selectedWorkTitleRu: inventory.localized_name_ru,
        selectedWorkCategoryKey: "plaster_paint",
        selectedWorkCategoryTitleRu: "Внутренние отделочные работы",
        selectedWorkRawInput: inventory.localized_name_ru,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      items: r2.boq.rows.map((row, index) => ({
        id: `${baseBundle.draft.id}:item:${index + 1}`,
        requestDraftId: baseBundle.draft.id,
        itemType: row.rowType === "material" ? "material" as const
          : row.rowType === "work" || row.rowType === "labor" ? "work" as const
            : row.rowType === "document" ? "document" as const
              : "service" as const,
        titleRu: row.titleRu,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: null,
        totalPrice: null,
        currency: row.currency,
        source: "reference_price_book" as const,
        category: row.category,
        unitLabel: row.unitLabel,
        sourceId: row.sourceId,
        sourceLabel: row.sourceLabel,
        formulaId: row.formulaId,
        quantityFormula: row.quantityFormula,
        calculationTrace: row.calculationTrace,
        sourceParameters: row.sourceParameters,
        templateId: row.templateId,
        templateVersion: row.templateVersion,
        normSourceId: row.normSourceId,
        normSourceTitle: row.normSourceTitle,
        normVersion: row.normVersion,
        normReviewStatus: row.normReviewStatus,
        priceStatus: "PRICE_MISSING" as const,
        priceSource: "missing" as const,
        costConfidence: "missing" as const,
        confidence: "high" as const,
        addedBy: "system" as const,
        editableByConsumer: true,
        createdAt: "2026-08-11T01:01:00.000Z",
      })),
      editableEstimateSnapshot: null,
      estimateRevisionState: null,
      estimateDraftRevisionState: {
        estimateDraftId: r2.estimateDraftId,
        currentRevisionId: r2.revisionId,
        revisions: [r1, r2],
        diffs: [],
      },
      canonicalParameterSession: canonicalR2,
    });
    expect(saved.estimateDraftRevisionState?.currentRevisionId).toBe(r2.revisionId);
    __simulateConsumerRepairRequestStoreReloadForTests();
    const cold = getConsumerRepairRequest(baseBundle.draft.id);
    expect(cold.estimateDraftRevisionState?.currentRevisionId).toBe(r2.revisionId);
    expect(cold.estimateDraftRevisionState?.revisions).toEqual([r1, r2]);
    expect(cold.items.map((item) => item.sourceParameters?.rowCode)).toEqual(
      r2.boq.rows.map((row) => row.rowId),
    );

    const reopened = JSON.parse(JSON.stringify(r2)) as typeof r2;
    expect(reopened).toEqual(r2);
    const runtime = createAiEstimateRuntime();
    const pdf = runtime.buildPdfSnapshot({ revision: reopened });
    expect(pdf.snapshot.rows).toEqual(reopened.boq.rows);
    expect(pdf.pdf.revisionId).toBe(reopened.revisionId);
    const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
    expect(validateAiEstimateBuyerPackageParity({ snapshot: buyer.snapshot, buyerPackage: buyer.buyerPackage })).toBe(true);
    uninstallLocalStorage();
  });
});
