import {
  buildGlobalCatalogInventoryV1,
  buildProfessionalEstimateDomainReferenceV1,
  constructionNormativeRegistryV1,
} from "../../src/lib/estimate/v4/domainFactory";
import { INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE } from "../../src/lib/estimate/v4/domains/interiorFinishesWave1";

describe("Professional Estimate Domain Factory bootstrap", () => {
  test("freezes all 11 610 production catalog records with exact arithmetic", () => {
    const inventory = buildGlobalCatalogInventoryV1([{
      domain_package: INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE,
      readiness: "DETERMINISTIC_COMPILE_GREEN",
    }]);

    expect(inventory.catalog_total).toBe(11_610);
    expect(inventory.rows).toHaveLength(11_610);
    expect(new Set(inventory.rows.map((row) => row.catalog_id)).size).toBe(11_610);
    expect(inventory.arithmetic.classified + inventory.arithmetic.unclassified).toBe(11_610);
    expect(inventory.arithmetic.bound + inventory.arithmetic.unbound).toBe(11_610);
    expect(inventory.arithmetic.domain_denominator_sum).toBe(11_610);
    expect(inventory.arithmetic.duplicate_catalog_id).toBe(0);
    expect(inventory.arithmetic.orphan_binding).toBe(0);
    expect(inventory.arithmetic.silent_exclusion).toBe(0);
    expect(inventory.delta_from_baseline).toEqual({
      changed_records: 84,
      readiness_transitions: { "BLOCKED_SOURCE_REQUIRED->DETERMINISTIC_COMPILE_GREEN": 84 },
      overlay_domain_ids: ["interior_finishes_wave_1"],
    });
    expect(inventory.readiness_counts.DETERMINISTIC_COMPILE_GREEN).toBe(84);
    expect(inventory.rows.filter((row) => row.current_readiness === "DETERMINISTIC_COMPILE_GREEN"))
      .toHaveLength(84);
    expect(inventory.rows.every((row) =>
      row.catalog_id.length > 0 &&
      row.work_key.length > 0 &&
      row.domain_id.length > 0 &&
      row.operation_class.length > 0 &&
      row.candidate_canonical_technology_id.length > 0 &&
      row.classification_evidence.length > 0 &&
      row.source_hash.length > 0 &&
      row.row_hash.length > 0
    )).toBe(true);
  }, 120_000);

  test("keeps KG resource guidance fail-closed until the exact rate identity is supplied", () => {
    const blocked = constructionNormativeRegistryV1.resolve({
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: "NEW",
      contract_basis: [],
      effective_date: "2026-08-11",
      material_system: "PLASTER",
      operation_class: "APPLY",
      requested_source_ids: ["kg_krer_2015_application_guidance"],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
    });
    expect(blocked.status).toBe("BLOCKED_SOURCE_REQUIRED");
    expect(blocked.required_project_inputs).toEqual([
      "exact_rate_code:kg_krer_2015_application_guidance",
    ]);

    const applicable = constructionNormativeRegistryV1.resolve({
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: "NEW",
      contract_basis: [],
      effective_date: "2026-08-11",
      material_system: "PLASTER",
      operation_class: "APPLY",
      requested_source_ids: ["kg_krer_2015_application_guidance"],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rate_code_by_source_id: {
        kg_krer_2015_application_guidance: "PROJECT_VERIFIED_EXACT_RATE_CODE",
      },
    });
    expect(applicable.status).toBe("APPLICABLE");
    expect(applicable.applicable_sources.map((source) => source.document_code)).toEqual(["КРЕР-2015"]);
  });

  test("rejects foreign norms without an explicit contract basis and separates paint safety from resource rates", () => {
    const paint = constructionNormativeRegistryV1.resolve({
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: "NEW",
      contract_basis: [],
      effective_date: "2026-08-11",
      material_system: "PAINT",
      operation_class: "APPLY",
      requested_source_ids: ["eaeu_tr_053_2026_paint_safety"],
      requested_source_types: ["LAW_OR_TECHNICAL_REGULATION"],
    });
    expect(paint.status).toBe("APPLICABLE");
    expect(paint.applicable_sources[0]).toMatchObject({
      document_code: "ТР ЕАЭС 053/2026; Решение Совета ЕЭК № 65",
      effective_from: "2026-07-31",
      unit_basis: null,
      exact_rate_code_required: false,
    });

    const foreign = constructionNormativeRegistryV1.resolve({
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: "NEW",
      contract_basis: [],
      effective_date: "2026-08-11",
      material_system: "PAINT",
      operation_class: "APPLY",
      requested_source_ids: ["missing_ru_norm"],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
    });
    expect(foreign.status).toBe("BLOCKED_SOURCE_REQUIRED");
    expect(foreign.required_project_inputs).toEqual(expect.arrayContaining([
      "normative_source:missing_ru_norm",
      "applicable_source_type:RESOURCE_ESTIMATE_NORM",
    ]));
  });

  test("builds the versioned Asphalt reference only from nine hash-verified artifacts", () => {
    const artifacts = Array.from({ length: 9 }, (_, index) => ({
      artifact_name: `artifact-${index + 1}.json`,
      sha256: String(index + 1).padStart(64, "0"),
      bytes: index + 1,
    }));
    const reference = buildProfessionalEstimateDomainReferenceV1({
      source_sha: "f".repeat(40),
      source_tree: "e".repeat(40),
      artifacts,
    });

    expect(reference.reference_artifacts).toHaveLength(9);
    expect(reference.contracts.catalog_binding_contract).toBe("exact-catalog-binding:v1");
    expect(reference.prohibited_copy_rule).toBe("ASPHALT_TECHNOLOGY_DATA_MUST_NOT_BE_COPIED_TO_OTHER_DOMAINS");
    expect(reference.prerequisite_token).toBe(
      "GREEN_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY_READY_FOR_11610_SCALE_NO_FULL_JEST_NO_RELEASE",
    );
  });
});
