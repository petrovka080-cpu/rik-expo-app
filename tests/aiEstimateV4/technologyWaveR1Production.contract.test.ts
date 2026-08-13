import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  isDrywallArchitecturalElementProfessionalCatalogIdV4,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { allTechnologyWaveParts, compileAllTechnologyWaveWorks } from "./technologyWaveR1TestSupport";

describe("technology-domain wave R1 exact professional runtime", () => {
  test("freezes 11 complete operation groups and exactly 55 new identities without overlap", () => {
    const ids = DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4;
    expect(ids).toHaveLength(55);
    expect(new Set(ids).size).toBe(55);
    expect(new Set(ids.map((id) => id.replace(/_(large_area|small_area|standard|technical_room|wet_zone)$/u, ""))).size).toBe(11);
    expect(ids.every(isDrywallArchitecturalElementProfessionalCatalogIdV4)).toBe(true);
    expect(ids.some((id) => id.includes("_install_"))).toBe(false);
    expect(ids.filter((id) => DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3.includes(id as never))).toEqual([]);
  });

  test("compiles all 55 identities through the registered production binding", () => {
    const results = compileAllTechnologyWaveWorks();
    expect(results).toHaveLength(55);
    for (const result of results) {
      expect(result.compile_result.status).toBe("COMPILED");
      expect(result.compile_result.blockers).toEqual([]);
      expect(result.draft?.items.length).toBeGreaterThanOrEqual(35);
      expect(result.draft?.items.every((item) => item.formulaId?.endsWith("FormulaGraphV4"))).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.professionalResourceGraphV3)).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.priceRouteV3)).toBe(true);
      expect(result.draft?.items.every((item) => Array.isArray(item.sourceParameters?.normativeRowTraceV3) && item.sourceParameters.normativeRowTraceV3.length === 4)).toBe(true);
    }
  });

  test("keeps typed cost owners disjoint and variant scopes physically distinct", () => {
    const parts = allTechnologyWaveParts();
    const costOwnerIds = parts.flatMap((part) => part.child_assemblies.flatMap((child) => child.rows.filter((row) => row.cost_ownership !== "informational_output").map((row) => row.cost_owner_id)));
    expect(new Set(costOwnerIds).size).toBe(costOwnerIds.length);
    for (const root of new Set(parts.map((part) => part.contract.group_key))) {
      const members = parts.filter((part) => part.contract.group_key === root);
      const signatures = members.map((part) => part.child_assemblies.flatMap((child) => child.rows.map((row) => row.row_id.split(":row:")[1])).sort().join("|"));
      expect(new Set(signatures).size).toBe(5);
    }
  });

  test("uses explicit KG work, rate, safety and certified-material routes", () => {
    for (const part of allTechnologyWaveParts()) {
      expect(part.contract.normative_source_ids).toContain("KG_SP_KR_65_101_2025");
      expect(part.contract.normative_source_ids).toContain("KG_SN_KR_12_01_2018");
      expect(part.contract.normative_source_ids).toContain("KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE");
      expect(part.contract.normative_source_ids).toContain(part.contract.operation === "REPAIR" ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011");
      expect(part.normative_profile.rejected_foreign_source_ids.length).toBeGreaterThanOrEqual(5);
    }
  });
});
