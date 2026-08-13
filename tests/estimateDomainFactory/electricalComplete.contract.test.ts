import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { compileProfessionalEstimateDomainV1, constructionNormativeRegistryV1, type ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import {
  ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS,
  ELECTRICAL_COMPLETE_ALIAS_COUNT,
  ELECTRICAL_COMPLETE_RECORD_COUNT,
  ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT,
  ELECTRICAL_COMPLETENESS_SLOTS,
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_REVIEWED_EXCLUSIONS,
  electricalCompleteDomainFactory,
  electricalResourceCandidatesFor,
} from "../../src/lib/estimate/v4/domains/electricalComplete";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";

const CAPTURED_AT = "2026-08-13T00:00:00.000Z";
type Scope = "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";

function rawValue(parameter: ProfessionalDomainParameterDefinitionV1, scopeCapability: string, scope: Scope): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scope;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "ELECTRICAL_PROJECT";
  if (parameter.parameter_id === "rated_voltage_v") return 400;
  if (parameter.parameter_id === "phase_count") return 3;
  if (parameter.parameter_id === "earthing_system") return "TN-S";
  if (parameter.parameter_id === "installation_environment") return "PROJECT_SPECIFIED";
  if (parameter.parameter_id === "product_specification_id") return "PROJECT-ELECTRICAL-SPEC-001";
  if (parameter.parameter_id === "exact_krerm_rate_code") return "KRERM-08-PROJECT-VERIFIED";
  if (parameter.parameter_id === "exact_krerp_rate_code") return "KRERP-01-PROJECT-VERIFIED-OR-N_A_WITH_REASON";
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
      value: rawValue(parameter, binding.scope_capability, scope),
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
        KG_KRERM_08_2015_ELECTRICAL: "KRERM-08-PROJECT-VERIFIED",
        KG_KRERP_01_2015_ELECTRICAL: "KRERP-01-PROJECT-VERIFIED-OR-N_A_WITH_REASON",
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
    expect(new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.candidate_canonical_technology_id)).size).toBe(107);
    expect(new Set(ELECTRICAL_DOMAIN_INVENTORY.map((row) => row.canonical_technology_id)).size).toBe(605);
  });

  test("compiles all 605 individual estimates in minimal and full scopes without hidden quantities", () => {
    for (const inventory of ELECTRICAL_DOMAIN_INVENTORY) {
      for (const scope of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
        const result = compile(inventory.catalog_id, scope);
        if (result.status !== "COMPILED") throw new Error(`ELECTRICAL_BATCH_RED:${inventory.catalog_id}:${scope}:${result.blockers.join("|")}`);
        const rows = result.compilation?.compiled_rows ?? [];
        expect(rows.length).toBe(scope === "FULL_APPLICABLE_SCOPE"
          ? electricalResourceCandidatesFor(inventory).length
          : electricalResourceCandidatesFor(inventory).filter((candidate) => candidate.minimal).length);
        expect(result.compilation?.assumptions_count).toBe(0);
        expect(result.compilation?.hidden_quantity_defaults).toBe(0);
        expect(rows.every((row) => row.quantity > 0 && (row.unit_price ?? 0) > 0)).toBe(true);
        expect(rows.every((row) => row.formula_expression.length > 0 && row.normative_trace_v3.length === 1)).toBe(true);
        expect(rows.every((row) => row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT")).toBe(true);
        expect(rows.every((row) => row.resource_graph_node_v3?.graph_version === "ProfessionalResourceGraphV3")).toBe(true);
        expect(new Set(rows.map((row) => row.semantic_owner)).size).toBe(rows.length);
        if (scope === "FULL_APPLICABLE_SCOPE") {
          expect(rows.length).toBeGreaterThanOrEqual(39);
          const categories = new Set(rows.map((row) => row.category));
          for (const category of ["material", "labor", "equipment", "machinery", "transport", "temporary_work", "testing", "documentation", "waste", "subcontract_service"] as const) expect(categories.has(category)).toBe(true);
        }
      }
    }
  });

  test("records 22 independent completeness decisions per catalog ID and rejects generic bundles", () => {
    expect(ELECTRICAL_COMPLETENESS_SLOTS).toHaveLength(22);
    expect(ELECTRICAL_COMPLETENESS_SLOTS.length * ELECTRICAL_DOMAIN_INVENTORY.length).toBe(13_310);
    const forbidden = /^(комплект|прочие материалы|кабель и комплектующие|щит в комплекте|электроизмерения)$/iu;
    for (const inventory of ELECTRICAL_DOMAIN_INVENTORY) {
      const candidates = electricalResourceCandidatesFor(inventory);
      expect(new Set(candidates.map((candidate) => candidate.candidate_id)).size).toBe(candidates.length);
      expect(candidates.some((candidate) => candidate.completeness_slot === "PRIMARY_EQUIPMENT_OR_MATERIAL")).toBe(true);
      expect(candidates.some((candidate) => candidate.completeness_slot === "INSTALLATION_OPERATIONS")).toBe(true);
      expect(candidates.every((candidate) => !forbidden.test(candidate.title_ru.trim()))).toBe(true);
    }
  });

  test("registers every exact Electrical identity in the canonical runtime", () => {
    for (const inventory of ELECTRICAL_DOMAIN_INVENTORY) {
      const selection = resolveRegisteredProfessionalEstimateSelectionV1(inventory.catalog_id);
      expect(selection?.domain_id).toBe("electrical_complete");
      expect(selection?.catalog_id).toBe(inventory.catalog_id);
      expect(selection?.work_key).toBe(inventory.work_key);
      expect(selection?.category_key).toBe("electrical");
      expect(selection?.canonical_parameter_schema.canonicalWorkKey).toBe(inventory.work_key);
    }
  });
});

