import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { compileProfessionalEstimateDomainV1, constructionNormativeRegistryV1, createProfessionalEstimateDomainFactoryV1, type ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import {
  ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS,
  ELECTRICAL_COMPLETE_ALIAS_COUNT,
  ELECTRICAL_COMPLETE_RECORD_COUNT,
  ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT,
  ELECTRICAL_COMPLETENESS_SLOTS_V2,
  ELECTRICAL_COMPLETE_DOMAIN_PACKAGE_BUILD_TIME_HASH_V1,
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
  ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
  ELECTRICAL_REVIEWED_EXCLUSIONS,
  buildElectricalProductionDraftV1,
  electricalCompletenessDecisionsV2,
  electricalComplexityClassV2,
  electricalCompleteDomainFactory,
  electricalMaximumResourceCandidatesForV2,
} from "../../src/lib/estimate/v4/domains/electricalComplete";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";

const CAPTURED_AT = "2026-08-13T00:00:00.000Z";
type Scope = "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";
const SHARD_COUNT = Math.max(1, Number(process.env.ELECTRICAL_TEST_SHARD_COUNT ?? 1));
const SHARD_INDEX = Math.max(0, Number(process.env.ELECTRICAL_TEST_SHARD_INDEX ?? 0));
const TEST_INVENTORY = ELECTRICAL_DOMAIN_INVENTORY.filter((_, index) => index % SHARD_COUNT === SHARD_INDEX);

function ratedVoltageForIdentity(catalogId: string): number {
  const match = catalogId.match(/(?:^|[_:-])(\d+)(?:kv)(?:[_:-]|$)/iu);
  return match ? Number(match[1]) * 1_000 : 400;
}

function rawValue(parameter: ProfessionalDomainParameterDefinitionV1, scopeCapability: string, scope: Scope, catalogId: string): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scope;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "ELECTRICAL_PROJECT";
  if (parameter.parameter_id === "rated_voltage_v") return ratedVoltageForIdentity(catalogId);
  if (parameter.parameter_id === "phase_count") return 3;
  if (parameter.parameter_id === "earthing_system") return "TN-S";
  if (parameter.parameter_id === "installation_environment") return "PROJECT_SPECIFIED";
  if (parameter.parameter_id === "product_specification_id") return "PROJECT-ELECTRICAL-SPEC-001";
  if (parameter.parameter_id === "exact_krerm_rate_code") return ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1;
  if (parameter.parameter_id === "exact_krerp_rate_code") return ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1;
  if (parameter.parameter_id === "price_basis_reference") return "SUPPLIER-QUOTATION-2026-08-13";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-13";
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return Math.max(parameter.minimum ?? 1, 1);
}

function parameterValues(catalogId: string, scope: Scope): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = electricalCompleteDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`TEST_ELECTRICAL_SCHEMA_NOT_FOUND:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scope === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    const sourceType: ProfessionalParameterValueV4["source_type"] = parameter.parameter_id.startsWith("unit_price_")
      ? "USER_EXPLICIT"
      : parameter.parameter_id.includes("product")
        ? "MATERIAL_PASSPORT"
        : parameter.parameter_id.includes("rate_code") || parameter.parameter_id.includes("project") || parameter.parameter_id.includes("price_basis")
          ? "PROJECT_DOCUMENT"
          : "USER_EXPLICIT";
    return [[parameter.parameter_id, {
      value: rawValue(parameter, binding.scope_capability, scope, catalogId),
      unit_id: parameter.unit_id,
      source_type: sourceType,
      source_id: `electrical-complete-fixture:${catalogId}:${parameter.parameter_id}`,
      captured_at: CAPTURED_AT,
      confidence: "high" as const,
      applicability: `Exact deterministic Electrical fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function compile(catalogId: string, scope: Scope) {
  const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory?.canonical_technology_id ?? "");
  if (!inventory || !technology) throw new Error(`TEST_ELECTRICAL_INVENTORY_NOT_FOUND:${catalogId}`);
  return compileProfessionalEstimateDomainV1(electricalCompleteDomainFactory, constructionNormativeRegistryV1, {
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scope,
    parent_revision_id: null,
    parameter_values: parameterValues(catalogId, scope),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "ELECTRICAL_PROJECT",
      construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-13",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        KG_KRERM_08_2015_ELECTRICAL: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
        KG_KRERP_01_2015_ELECTRICAL: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
      },
    },
  });
}

describe("Full Electrical professional domain", () => {
  test("freezes exact E605 / 107 groups / excluded405 with no aliases", () => {
    expect(ELECTRICAL_COMPLETE_RECORD_COUNT).toBe(605);
    expect(ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT).toBe(605);
    expect(ELECTRICAL_COMPLETE_ALIAS_COUNT).toBe(0);
    expect(ELECTRICAL_DOMAIN_INVENTORY).toHaveLength(605);
    expect(ELECTRICAL_REVIEWED_EXCLUSIONS).toHaveLength(405);
    expect(ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS).toHaveLength(605);
    expect(electricalCompleteDomainFactory.binding_by_catalog_id.size).toBe(605);
    expect(electricalCompleteDomainFactory.package_hash).toBe("eh_58ff6f5b1ebbfbe4");
    expect(ELECTRICAL_COMPLETE_DOMAIN_PACKAGE_BUILD_TIME_HASH_V1).toEqual(expect.objectContaining({
      hash_contract: "canonical-domain-package-content:v1",
      domain_id: "electrical_complete",
      catalog_record_count: 605,
    }));
    expect(() => createProfessionalEstimateDomainFactoryV1(
      electricalCompleteDomainFactory.package,
      { ...ELECTRICAL_COMPLETE_DOMAIN_PACKAGE_BUILD_TIME_HASH_V1, domain_version: "tampered-version" },
    )).toThrow("DOMAIN_BUILD_TIME_PACKAGE_HASH_IDENTITY_MISMATCH");
    expect(new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.candidate_canonical_technology_id)).size).toBe(107);
    expect(new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size).toBe(605);
  });

  test("compiles all 605 individual estimates in minimal and full scopes without hidden quantities", () => {
    for (const inventory of TEST_INVENTORY) {
      for (const scope of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
        const result = compile(inventory.catalog_id, scope);
        if (result.status !== "COMPILED") throw new Error(`ELECTRICAL_BATCH_RED:${inventory.catalog_id}:${scope}:${result.blockers.join("|")}`);
        const rows = result.compilation?.compiled_rows ?? [];
        expect(rows.length).toBe(scope === "FULL_APPLICABLE_SCOPE"
          ? electricalMaximumResourceCandidatesForV2(inventory).length
          : electricalMaximumResourceCandidatesForV2(inventory).filter((candidate) => candidate.minimal).length);
        expect(result.compilation?.assumptions_count).toBe(0);
        expect(result.compilation?.hidden_quantity_defaults).toBe(0);
        expect(rows.every((row) => row.quantity > 0 && (row.cost_ownership === "informational_output" || (row.unit_price ?? 0) > 0))).toBe(true);
        expect(rows.every((row) => row.formula_expression.length > 0 && row.normative_trace_v3.length === 1)).toBe(true);
        expect(rows.every((row) => row.cost_ownership === "informational_output"
          ? row.price_route_v3?.kind === "NOT_APPLICABLE_INFORMATIONAL_OUTPUT"
          : row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT")).toBe(true);
        expect(rows.every((row) => row.resource_graph_node_v3?.graph_version === "ProfessionalResourceGraphV3")).toBe(true);
        expect(new Set(rows.map((row) => row.semantic_owner)).size).toBe(rows.length);
        if (scope === "FULL_APPLICABLE_SCOPE") {
          expect(rows.length).toBeGreaterThanOrEqual(35);
          const categories = new Set(rows.map((row) => row.category));
          expect(categories.size).toBeGreaterThanOrEqual(7);
          for (const category of categories) expect(["material", "labor", "equipment", "machinery", "transport", "temporary_work", "testing", "documentation", "waste", "subcontract_service", "work"]).toContain(category);
        }
      }
    }
  });

  test("records 36 independent completeness decisions per catalog ID and rejects generic bundles", () => {
    expect(ELECTRICAL_COMPLETENESS_SLOTS_V2).toHaveLength(36);
    expect(ELECTRICAL_COMPLETENESS_SLOTS_V2.length * ELECTRICAL_DOMAIN_INVENTORY.length).toBe(21_780);
    const forbidden = /^(комплект|прочие материалы|кабель и комплектующие|щит в комплекте|электроизмерения)$/iu;
    for (const inventory of TEST_INVENTORY) {
      const candidates = electricalMaximumResourceCandidatesForV2(inventory);
      expect(new Set(candidates.map((candidate) => candidate.candidate_id)).size).toBe(candidates.length);
      expect(electricalCompletenessDecisionsV2(inventory)).toHaveLength(36);
      expect(electricalComplexityClassV2(inventory)).toMatch(/^E_/u);
      expect(candidates.some((candidate) => candidate.category === "labor" || candidate.category === "testing")).toBe(true);
      expect(candidates.every((candidate) => !forbidden.test(candidate.title_ru.trim()))).toBe(true);
    }
  });

  test("registers every exact Electrical identity in the canonical runtime", () => {
    for (const inventory of TEST_INVENTORY) {
      const selection = resolveRegisteredProfessionalEstimateSelectionV1(inventory.catalog_id);
      expect(selection?.domain_id).toBe("electrical_complete");
      expect(selection?.catalog_id).toBe(inventory.catalog_id);
      expect(selection?.work_key).toBe(inventory.work_key);
      expect(selection?.category_key).toBe("electrical");
      expect(selection?.canonical_parameter_schema.canonicalWorkKey).toBe(inventory.work_key);
    }
  });

  test("binds explicit kV catalog identities to matching rated-voltage proof inputs", () => {
    const highVoltage = ELECTRICAL_DOMAIN_INVENTORY.find((inventory) => /110kv/iu.test(inventory.catalog_id));
    const mediumVoltage = ELECTRICAL_DOMAIN_INVENTORY.find((inventory) => /35kv/iu.test(inventory.catalog_id));
    if (!highVoltage || !mediumVoltage) throw new Error("TEST_ELECTRICAL_VOLTAGE_IDENTITIES_MISSING");
    expect(parameterValues(highVoltage.catalog_id, "FULL_APPLICABLE_SCOPE").rated_voltage_v?.value).toBe(110_000);
    expect(parameterValues(mediumVoltage.catalog_id, "FULL_APPLICABLE_SCOPE").rated_voltage_v?.value).toBe(35_000);
    const compiled = compile(highVoltage.catalog_id, "FULL_APPLICABLE_SCOPE");
    const conditionalTraces = compiled.compilation?.compiled_rows.flatMap((row) => row.normative_trace_v3)
      .filter((trace) => ["EAEU_TR_TS_004_2011", "KG_ELECTRICAL_ACCEPTANCE_2023"].includes(trace.source_id)) ?? [];
    expect(conditionalTraces.length).toBeGreaterThan(0);
    expect(conditionalTraces.every((trace) => trace.applicability.includes("N_A_WITH_REASON"))).toBe(true);
  });

  test("rejects generic rate verification markers that are neither exact codes nor justified individual norms", () => {
    const inventory = ELECTRICAL_DOMAIN_INVENTORY[0];
    const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    if (!technology) throw new Error(`TEST_ELECTRICAL_TECHNOLOGY_MISSING:${inventory.catalog_id}`);
    expect(() => buildElectricalProductionDraftV1({
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parent_revision_id: null,
      parameter_values: parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE"),
      normative_request: {
        country: "KG",
        region: "Bishkek",
        funding_source: "PRIVATE_RECOMMENDED",
        project_type: "ELECTRICAL_PROJECT",
        construction_state: "NEW",
        contract_basis: [],
        effective_date: "2026-08-14",
        material_system: technology.material_system,
        operation_class: technology.operation_class,
        rate_code_by_source_id: {
          KG_KRERM_08_2015_ELECTRICAL: "KRERM-08-PROJECT-VERIFIED",
          KG_KRERP_01_2015_ELECTRICAL: "KRERP-01-PROJECT-VERIFIED-OR-N_A_WITH_REASON",
        },
      },
      raw_input: inventory.localized_name_ru,
      currency: "KGS",
    })).toThrow("ELECTRICAL_NORMATIVE_RATE_RESOLUTION_RED");
  });

  test("preserves every full BOQ through production draft durable JSON, PDF and procurement projections", () => {
    for (const inventory of TEST_INVENTORY) {
      const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
      if (!technology) throw new Error(`TEST_ELECTRICAL_TECHNOLOGY_MISSING:${inventory.catalog_id}`);
      const production = buildElectricalProductionDraftV1({
        catalog_id: inventory.catalog_id,
        work_key: inventory.work_key,
        scope_mode: "FULL_APPLICABLE_SCOPE",
        parent_revision_id: null,
        parameter_values: parameterValues(inventory.catalog_id, "FULL_APPLICABLE_SCOPE"),
        normative_request: {
          country: "KG",
          region: "Bishkek",
          funding_source: "PRIVATE_RECOMMENDED",
          project_type: "ELECTRICAL_PROJECT",
          construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" : "NEW",
          contract_basis: [],
          effective_date: "2026-08-13",
          material_system: technology.material_system,
          operation_class: technology.operation_class,
          rate_code_by_source_id: {
            KG_KRERM_08_2015_ELECTRICAL: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
            KG_KRERP_01_2015_ELECTRICAL: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
          },
        },
        raw_input: inventory.localized_name_ru,
        currency: "KGS",
      });
      if (!production.draft) throw new Error(`TEST_ELECTRICAL_PRODUCTION_BLOCKED:${inventory.catalog_id}`);
      const durableJson = JSON.stringify(production.draft);
      expect(Buffer.byteLength(durableJson, "utf8")).toBeLessThanOrEqual(16 * 1024 * 1024);
      const cold = JSON.parse(durableJson) as typeof production.draft;
      const compiledRows = production.compile_result.compilation?.compiled_rows ?? [];
      expect(cold.items).toHaveLength(compiledRows.length);
      expect(cold.items.map((item) => item.sourceParameters?.rowCode)).toEqual(compiledRows.map((row) => row.row_id));
      expect(cold.items.every((item) => item.formulaId && item.normSourceId && ["REFERENCE_PRICE_ESTIMATE", "PRICE_MISSING"].includes(item.priceStatus ?? ""))).toBe(true);
      expect(cold.items.every((item) => item.priceStatus === "PRICE_MISSING"
        ? item.priceSource === "missing" && item.priceSourceId == null
        : item.priceSource === "reference_price_book" && Boolean(item.priceSourceId))).toBe(true);
      const pdfProjection = cold.items.map((item) => [item.titleRu, item.quantity, item.unit, item.unitPrice]);
      expect(pdfProjection).toHaveLength(cold.items.length);
      const procurementProjection = cold.items.filter((item) => item.sourceParameters?.includedInProcurement === true);
      expect(procurementProjection.length).toBe(compiledRows.filter((row) => row.procurement_eligible).length);
    }
  });
});
