import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifyLegacyClaimCatalogPromise,
  LEGACY_PACK_SOURCE_IDS,
  VERIFIED_SOURCE_IDS,
} from "../../scripts/estimate/candidateNormSourceResidualAudit";

describe("current candidate normative source residual audit", () => {
  it("does not treat a generated _form_ key as proof of a standalone formwork work", () => {
    expect(classifyLegacyClaimCatalogPromise({
      sourceId: "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
      catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_standard",
      canonicalNameRu: "устройство бетонной плиты в стандартной зоне",
      primaryUom: "м³",
    })).toBe("FULL_WORK_COMPONENT_APPLICABILITY_REVIEW_REQUIRED");
    expect(classifyLegacyClaimCatalogPromise({
      sourceId: "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
      catalogId: "canonical-work:base:explicit_formwork",
      canonicalNameRu: "съёмная опалубка стены",
      primaryUom: "м²",
    })).toBe("STANDALONE_FORMWORK_PROMISE");
  });

  it("keeps the exact 8+4 denominator explicit and disjoint", () => {
    expect(LEGACY_PACK_SOURCE_IDS).toHaveLength(8);
    expect(VERIFIED_SOURCE_IDS).toHaveLength(4);
    expect(new Set([...LEGACY_PACK_SOURCE_IDS, ...VERIFIED_SOURCE_IDS]).size).toBe(12);
  });

  it("uses typed exact source identity across the inherited manifest and normalized bindings", () => {
    const source = readFileSync(
      resolve("scripts/estimate/candidateNormSourceResidualAudit.ts"),
      "utf8",
    );

    expect(source).toContain("jsonb_array_elements");
    expect(source).toContain("trace->>'normSourceId'=any($1::text[])");
    expect(source).toContain("manifest.release_id=$1");
    expect(source).toContain("estimate_cumulative_manifest_entry");
    expect(source).toContain("estimate_work_normative_binding");
    expect(source).toContain("estimate_normative_locator");
    expect(source).toContain("estimate_normative_source");
    expect(source.toLowerCase()).not.toContain(" like ");
  });

  it("is wired into the existing professional norm audit instead of a second entrypoint", () => {
    const owner = readFileSync(
      resolve("scripts/estimate/auditRealProfessionalNormPacks.ts"),
      "utf8",
    );

    expect(owner).toContain("--candidate-release-id");
    expect(owner).toContain("runCandidateNormSourceResidualAudit");
  });
});
