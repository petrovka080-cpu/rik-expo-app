import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4";
import {
  BATCH002_REAL_USEFUL_REQUIRED_BLOCKERS_R1,
  buildBatch002RealUsefulGapAuditR1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulGapAuditR1";

describe("BATCH-002 real-useful shadow gap audit R1", () => {
  it("covers the exact 55 definitions and distinguishes DRAFT from accepted coverage", () => {
    const audit = buildBatch002RealUsefulGapAuditR1();
    expect(audit.expectedCatalogCount).toBe(55);
    expect(audit.observedCatalogCount).toBe(55);
    expect(audit.exactCatalogCoverage).toBe(true);
    expect(audit.rows.map((row) => row.catalogId)).toEqual(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
    expect(audit.independentPassportDraftCoverage).toBe("55/55");
    expect(audit.engineerAcceptedPassportCoverage).toBe("0/55");
    expect(audit.realUsefulGreenCoverage).toBe("0/55");
  });

  it("records the exact equipment contradiction for all 55 current successors", () => {
    const audit = buildBatch002RealUsefulGapAuditR1();
    expect(audit.expectedEquipmentRuleCoverage).toBe("55/55");
    expect(audit.exactRuntimeEquipmentCoverage).toBe("0/55");
    expect(audit.rows.every((row) => row.runtimeRowCounts.exactEquipment === 0)).toBe(true);
    expect(audit.rows.every((row) => row.independentPassport.expectedEquipmentRules === 2)).toBe(true);
    expect(audit.rows.every((row) => row.legacySeparateEquipmentPolicy === "REJECT_SEPARATE_MACHINE_EQUIPMENT")).toBe(true);
    expect(audit.rows.every((row) => row.blockers.includes("EXACT_EQUIPMENT_RUNTIME_ROW_MISSING"))).toBe(true);
    expect(audit.rows.every((row) => row.blockers.includes("LEGACY_EQUIPMENT_POLICY_CONTRADICTS_MASTER"))).toBe(true);
  });

  it("does not promote the old self-referential content GREEN", () => {
    const audit = buildBatch002RealUsefulGapAuditR1();
    expect(audit.legacyContentGreenCount).toBe(55);
    expect(audit.realUsefulRedCount).toBe(55);
    expect(audit.rows.every((row) => row.realUsefulDecision === "RED")).toBe(true);
    expect(audit.rows.every((row) =>
      JSON.stringify(row.blockers) === JSON.stringify(BATCH002_REAL_USEFUL_REQUIRED_BLOCKERS_R1))).toBe(true);
  });

  it("stays shadow-only and leaves the current user runtime untouched", () => {
    const audit = buildBatch002RealUsefulGapAuditR1();
    expect(audit.productionAdmissionAttachedCount).toBe(0);
    expect(audit.rows.every((row) => row.gate.mode === "SHADOW_PREPARED_ONLY")).toBe(true);
    expect(audit.rows.every((row) => row.gate.productionAdmissionAttached === false)).toBe(true);
    expect(audit.rows.every((row) => row.gate.currentUserRuntimeChanged === false)).toBe(true);
  });
});
