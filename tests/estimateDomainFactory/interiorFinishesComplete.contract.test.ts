import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type ProfessionalDomainParameterDefinitionV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  INTERIOR_FINISHES_COMPLETE_RECORD_COUNT,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  INTERIOR_FINISHES_NEW_INVENTORY,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
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

function sourceType(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.includes("productivity") || parameterId.includes("interval")) return "APPLICABLE_NORM";
  if (parameterId.includes("material") || parameterId.includes("consumption") || parameterId.includes("mass")) {
    return "MATERIAL_PASSPORT";
  }
  if (["funding_source", "project_type", "normative_rate_code"].includes(parameterId)) return "PROJECT_DOCUMENT";
  return "USER_EXPLICIT";
}

function numericValue(parameter: ProfessionalDomainParameterDefinitionV1): number {
  if (parameter.parameter_id === "area_m2") return 120;
  if (parameter.parameter_id === "length_m") return 12;
  if (parameter.parameter_id === "width_m") return 10;
  if (parameter.parameter_id.includes("distance")) return 12;
  if (parameter.parameter_id.includes("documentation")) return 3;
  if (parameter.parameter_id.includes("coat_count")) return 2;
  const candidate = Math.max(parameter.minimum ?? 0, 1);
  if (parameter.maximum != null && candidate > parameter.maximum) return parameter.maximum;
  return candidate;
}

function rawParameterValue(
  parameter: ProfessionalDomainParameterDefinitionV1,
  bindingScope: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scopeMode;
  if (parameter.parameter_id === "scope_capability") return bindingScope;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "RESIDENTIAL_INTERIOR";
  if (parameter.parameter_id === "product_profile_id") return "PROJECT-MATERIAL-PASSPORT-INTERIOR";
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-INTERIOR-RATE";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return numericValue(parameter);
}

function parameterValues(
  catalogId: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
  geometry: "AREA" | "LENGTH_WIDTH" = "AREA",
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = interiorFinishesDomainFactory.binding_by_catalog_id.get(catalogId);
  if (!binding) throw new Error(`TEST_INTERIOR_BINDING_NOT_FOUND:${catalogId}`);
  const technology = interiorFinishesDomainFactory.technology_by_id.get(binding.canonical_technology_id);
  const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`TEST_INTERIOR_SCHEMA_NOT_FOUND:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scopeMode === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    if (geometry === "LENGTH_WIDTH" && parameter.parameter_id === "area_m2") return [];
    if (geometry === "AREA" && ["length_m", "width_m"].includes(parameter.parameter_id)) return [];
    const raw = rawParameterValue(parameter, binding.scope_capability, scopeMode);
    return [[parameter.parameter_id, {
      value: raw,
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `interior-complete-fixture:${catalogId}:${parameter.parameter_id}`,
      captured_at: CAPTURED_AT,
      confidence: "high" as const,
      applicability: `Exact deterministic fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function compile(
  catalogId: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
  geometry: "AREA" | "LENGTH_WIDTH" = "AREA",
) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TEST_INTERIOR_INVENTORY_NOT_FOUND:${catalogId}`);
  const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`TEST_INTERIOR_TECHNOLOGY_NOT_FOUND:${catalogId}`);
  const repair = inventory.scope_capability === "repair" || ["repair", "replace"].includes(inventory.work_type);
  const sourceId = repair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
  return compileProfessionalEstimateDomainV1(interiorFinishesDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scopeMode,
    parent_revision_id: null,
    parameter_values: parameterValues(catalogId, scopeMode, geometry),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-11",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: { [sourceId]: "PROJECT-VERIFIED-INTERIOR-RATE" },
    },
  });
}

describe("Interior Finishes complete professional domain", () => {
  test("freezes the complete 2250-record denominator without silent exclusions or fan-in", () => {
    expect(INTERIOR_FINISHES_COMPLETE_RECORD_COUNT).toBe(2_250);
    expect(INTERIOR_FINISHES_DOMAIN_INVENTORY).toHaveLength(2_250);
    expect(INTERIOR_FINISHES_NEW_INVENTORY).toHaveLength(2_166);
    expect(interiorFinishesDomainFactory.binding_by_catalog_id.size).toBe(2_250);
    expect(interiorFinishesDomainFactory.technology_by_id.size).toBe(2_250);
    expect(new Set(INTERIOR_FINISHES_DOMAIN_INVENTORY.map((row) => row.catalog_id)).size).toBe(2_250);
    expect(new Set(INTERIOR_FINISHES_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size).toBe(2_250);
  });

  test("compiles every exact record in both scopes with professional resource ownership", () => {
    for (const inventory of INTERIOR_FINISHES_DOMAIN_INVENTORY) {
      for (const scopeMode of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
        const result = compile(inventory.catalog_id, scopeMode);
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
        if (scopeMode === "FULL_APPLICABLE_SCOPE") {
          const categories = new Set(rows.map((row) => row.category));
          expect(categories).toEqual(new Set([
            "material", "labor", "equipment", "transport", "waste", "testing", "documentation",
          ]));
          expect(rows.length).toBeGreaterThan(11);
          expect(rows.some((row) => row.unit_id === "man_hour")).toBe(true);
          expect(rows.some((row) => row.unit_id === "machine_hour")).toBe(true);
        }
      }
    }
  });

  test("accepts either area or length multiplied by width for area-based complete-domain records", () => {
    const inventory = INTERIOR_FINISHES_NEW_INVENTORY.find((row) => row.scope_capability === "standard");
    if (!inventory) throw new Error("TEST_INTERIOR_STANDARD_RECORD_MISSING");
    const area = compile(inventory.catalog_id, "MINIMAL_EXPLICIT_SCOPE", "AREA");
    const dimensions = compile(inventory.catalog_id, "MINIMAL_EXPLICIT_SCOPE", "LENGTH_WIDTH");
    expect(area.status).toBe("COMPILED");
    expect(dimensions.status).toBe("COMPILED");
    expect(dimensions.compilation?.compiled_rows.map((row) => [row.row_id, row.quantity])).toEqual(
      area.compilation?.compiled_rows.map((row) => [row.row_id, row.quantity]),
    );
    expect(dimensions.compilation?.compiled_rows.every((row) =>
      row.parameter_source_ids.some((sourceId) => sourceId.startsWith("derived:area_m2:length_m × width_m:")) ||
      !row.formula_input_values.area_m2)).toBe(true);
  });

  test("one Apply creates one durable revision and edit/reload preserves exact identity and BOQ", () => {
    const uninstall = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
    const inventory = INTERIOR_FINISHES_NEW_INVENTORY.find((row) =>
      row.source_domain_id === "flooring" && row.scope_capability === "standard");
    if (!inventory) throw new Error("TEST_INTERIOR_APPLY_RECORD_MISSING");
    const selection = resolveRegisteredProfessionalEstimateSelectionV1(inventory.catalog_id);
    if (!selection) throw new Error("TEST_INTERIOR_REGISTERED_SELECTION_MISSING");
    const aiDraft = buildRegisteredProfessionalEstimateParameterCollectionDraftV1({
      selection,
      raw_input: inventory.localized_name_ru,
    });
    const created = createConsumerRepairRequestDraft({
      consumerUserId: "interior-complete-apply-user",
      problemText: inventory.localized_name_ru,
      repairType: inventory.work_key,
      city: "Bishkek",
      selectedWork: aiDraft.selectedWork,
      aiDraft,
    });
    const values = parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE", "LENGTH_WIDTH");
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
    expect(r1?.boq.rows.length).toBeGreaterThan(11);
    expect(r1?.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);
    expect(r1Bundle.draft.selectedWorkKey).toBe(inventory.work_key);
    const r2Bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      patches: [{ operation: "update_param", paramKey: "length_m", rawValue: "18" }],
      userId: created.draft.consumerUserId,
      createdAt: "2026-08-11T03:01:00.000Z",
    });
    expect(r2Bundle.estimateDraftRevisionState?.revisions).toHaveLength(2);
    const r2 = r2Bundle.estimateDraftRevisionState?.revisions[1];
    expect(r2?.previousRevisionId).toBe(r1?.revisionId);
    expect(r2?.resolvedIdentity?.requestedCatalogWorkId).toBe(inventory.catalog_id);
    __simulateConsumerRepairRequestStoreReloadForTests();
    const cold = getConsumerRepairRequest(created.draft.id);
    expect(cold.estimateDraftRevisionState?.currentRevisionId).toBe(r2?.revisionId);
    expect(cold.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(cold.items.map((item) => item.sourceParameters?.rowCode)).toEqual(r2?.boq.rows.map((row) => row.rowId));
    uninstall();
  });
});
