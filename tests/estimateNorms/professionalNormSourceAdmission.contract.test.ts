import {
  classifyProfessionalNormSourceAdmission,
  isAdmittedProfessionalNormSource,
} from "../../src/lib/estimate/professionalNormSourceAdmission";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
} from "../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";

describe("professional norm source admission", () => {
  const binding = CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1[0];

  it("admits an exact applied physical resolution registered in both production registries", () => {
    expect(binding).toBeDefined();
    const result = classifyProfessionalNormSourceAdmission({
      normSourceId: binding.source_id,
      normId: binding.norm_id,
      normVersion: binding.source_document_version,
      sourceParameters: {
        professionalPhysicalNormApplicabilityV1: {
          status: "APPLIED",
          source_id: binding.source_id,
          norm_id: binding.norm_id,
          source_document_version: binding.source_document_version,
          source_definition_hash: binding.source_definition_hash,
          blockers: [],
        },
      },
    });

    expect(result).toEqual({
      admitted: true,
      route: "CANONICAL_PHYSICAL_APPLICABILITY",
      reason: "ADMITTED_CANONICAL_PHYSICAL_APPLICABILITY",
    });
  });

  it("does not admit a registry source without an applied row-specific resolution", () => {
    expect(isAdmittedProfessionalNormSource({
      normSourceId: binding.source_id,
      normId: binding.norm_id,
      normVersion: binding.source_document_version,
      sourceParameters: {},
    })).toBe(false);
  });

  it("rejects generated catalog source ids and tampered physical identity", () => {
    expect(isAdmittedProfessionalNormSource({
      normSourceId: "src_professional_norm_pack_catalog_concrete_material_materials_kg_v1",
      normId: "generated-catalog-norm",
      normVersion: "2026.07",
      sourceParameters: {},
    })).toBe(false);
    expect(isAdmittedProfessionalNormSource({
      normSourceId: binding.source_id,
      normId: binding.norm_id,
      normVersion: binding.source_document_version,
      sourceParameters: {
        professionalPhysicalNormApplicabilityV1: {
          status: "APPLIED",
          source_id: binding.source_id,
          norm_id: binding.norm_id,
          source_document_version: binding.source_document_version,
          source_definition_hash: "tampered",
          blockers: [],
        },
      },
    })).toBe(false);
  });
});
