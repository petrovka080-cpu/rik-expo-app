import fs from "node:fs";
import path from "node:path";
import {
  productionNormSourceEvidenceRegistryV1,
  PRODUCTION_NORM_SOURCE_EVIDENCE_V1,
  PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1,
} from "../../src/lib/estimate/v4/domainFactory/productionNormSourceEvidenceRegistryV1";

describe("production norm-source evidence registry v1", () => {
  it("merges reviewed domain evidence without admitting synthetic or unverified rate labels", () => {
    const accepted = productionNormSourceEvidenceRegistryV1.listAcceptedSourceIds();

    expect(PRODUCTION_NORM_SOURCE_EVIDENCE_V1.map((item) => item.source_id)).toEqual([
      "eaeu_tr_ts_014_2011",
      "kg_mtd_road_quality_control",
      "kg_krer_2015_collection_27",
      "manufacturer_bitumina_emulsion_technical_note",
      "kg_krer_27_roadworks_2015",
      "kg_krer_11_floors_2015",
    ]);
    expect(new Set(accepted).size).toBe(accepted.length);
    expect(PRODUCTION_NORM_SOURCE_EVIDENCE_V1.every((item) =>
      item.review_status === "REVIEWED_SOURCE_EVIDENCE" &&
      /^https:\/\//u.test(item.official_reference) &&
      Boolean(item.source_document_version) &&
      Boolean(item.evidence_digest)
    )).toBe(true);
    expect(accepted).not.toEqual(expect.arrayContaining([
      "verified_equipment_productivity",
      "verified_ratebook:road_marking",
      "src_professional_norm_pack_catalog_roadworks_labor_labor_m2_v1",
      "kg_sp_kr_32_107_2024_consultation_draft",
    ]));
  });

  it("binds every exact locator alias to reviewed evidence and an executable domain declaration", () => {
    const asphaltBindingSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/estimate/v4/asphalt/asphaltM1NormativeBindingsV1.ts"),
      "utf8",
    );

    expect(PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1).toHaveLength(15);
    for (const alias of PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1) {
      expect(productionNormSourceEvidenceRegistryV1.getEvidence(alias.canonical_source_id)).not.toBeNull();
      expect(productionNormSourceEvidenceRegistryV1.getAlias(alias.alias_source_id)).toEqual(alias);
      expect(alias.exact_locator).not.toHaveLength(0);
      expect(asphaltBindingSource).toContain(alias.alias_source_id);
    }
  });
});
