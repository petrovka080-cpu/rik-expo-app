import {
  auditAsphalt35MaterialCompletenessV5,
  buildAsphalt35MaterialCompletenessLedgerV5,
} from "../../src/lib/estimate/v4/roadworks/roadworksWaveASemanticTruth";
import {
  evaluateMaterialCompleteness,
  type MaterialCompletenessContract,
} from "../../src/lib/estimate/materialCompletenessContract";

describe("FINAL R5 Asphalt 35 material and complete-estimate ledger", () => {
  it("proves 35/35 complete professional estimates in deterministic 7 × 5 cohorts", () => {
    const audit = auditAsphalt35MaterialCompletenessV5();
    expect(audit).toMatchObject({
      records: 35,
      positive_vectors: 35,
      complete_professional_estimates: 35,
      complete_typed_boq: 35,
      material_completeness: 35,
      works_completeness: 35,
      labor_completeness: 35,
      equipment_completeness: 35,
      services_completeness: 35,
      logistics_completeness: 35,
      laboratory_completeness: 35,
      documentation_completeness: 35,
      missing_required_material_roles: 0,
      unexpected_material_roles: 0,
      duplicate_material_owners: 0,
      formula_trace_missing: 0,
      source_trace_missing: 0,
      generic_material_fallback: 0,
      blocked_estimates: 0,
      partial_estimates_claimed_as_complete: 0,
    });
    expect(audit.cohorts).toHaveLength(7);
    expect(audit.cohorts.every((cohort) => cohort.works.length === 5)).toBe(true);
  });

  it("keeps every work/passport/vector exact and work-owned", () => {
    const ledger = buildAsphalt35MaterialCompletenessLedgerV5();
    expect(new Set(ledger.map((record) => record.work_key)).size).toBe(35);
    expect(new Set(ledger.map((record) => record.passport_id)).size).toBe(35);
    expect(new Set(ledger.map((record) => record.positive_test_vector_id)).size).toBe(35);
    for (const record of ledger) {
      expect(record.calculation_readiness).toBe("CALCULATION_READY");
      expect(record.typed_boq_complete).toBe(true);
      expect(record.overall_estimate_status).toBe("COMPLETE");
      expect(Object.values(record.category_completeness)).not.toContain("BLOCKED");
      expect(Object.values(record.category_reasons).every(Boolean)).toBe(true);
      for (const evidence of record.category_evidence) {
        expect(evidence.ownerWorkKey).toBe(record.work_key);
        expect(evidence.scopeId).toBe(record.scope_id);
        expect(evidence.sourceContractOwner).toContain(record.work_key);
        expect(evidence.evidenceFingerprint).toMatch(/^eh_[a-f0-9]{16}$/);
        if (evidence.status === "NOT_APPLICABLE_WITH_REASON") {
          expect(evidence.exclusionReasonCode).toBe("CATEGORY_NOT_APPLICABLE_BY_EXACT_SCOPE");
          expect(evidence.reason).toContain(record.work_key);
        }
      }
    }
  });

  it("uses explicit N/A reasons for narrow operations instead of padding their BOQ", () => {
    const compact = buildAsphalt35MaterialCompletenessLedgerV5().find((record) =>
      record.work_key === "paving_roads_landscape_interior_asphalt_compact_standard"
    );
    expect(compact).toBeDefined();
    expect(compact?.present_material_roles).toEqual([]);
    expect(compact?.category_completeness.materials).toBe("NOT_APPLICABLE_WITH_REASON");
    expect(compact?.category_reasons.materials).toContain("уплотнение ранее уложенного слоя");
    expect(compact?.overall_estimate_status).toBe("COMPLETE");
  });

  it("fails closed for a missing, forbidden, or duplicate material owner", () => {
    const contract: MaterialCompletenessContract = {
      contractId: "negative-material-contract",
      contractVersion: "material-completeness-contract:v1",
      ownerWorkKey: "work",
      scopeId: "scope",
      requiredMaterialRoles: ["MIX"],
      conditionalMaterialRoles: [],
      forbiddenMaterialRoles: ["GEOTEXTILE"],
      materialRoleConditions: {},
      materialRoleExclusionReasons: { GEOTEXTILE: "Not selected by project." },
    };
    const result = evaluateMaterialCompleteness({
      contract,
      rows: [
        { rowId: "geo-1", materialRoleId: "GEOTEXTILE", semanticOwnerId: "owner-a", formulaId: "f", sourceIds: ["s"] },
        { rowId: "geo-2", materialRoleId: "GEOTEXTILE", semanticOwnerId: "owner-b", formulaId: "f", sourceIds: ["s"] },
      ],
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.missingMaterialRoles).toEqual(["MIX"]);
    expect(result.unexpectedMaterialRoles).toEqual(["GEOTEXTILE"]);
    expect(result.duplicateMaterialOwners).toEqual(["GEOTEXTILE"]);
  });
});
