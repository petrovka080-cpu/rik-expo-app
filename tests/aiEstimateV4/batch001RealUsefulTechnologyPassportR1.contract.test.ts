import { evaluateTechnologyPassportR1 } from "../../src/lib/estimate/backendPlatform/technologyPassportR1";
import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";
import { buildAllBatch001DrywallSuccessorsR3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import {
  BATCH001_SELECTED_CASE_IDS_R1,
  auditAllBatch001DrywallRuntimeDeltasR1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRuntimeDeltaAuditR1";
import {
  compileBatch001RealUsefulShadowR1,
  type Batch001MaterialRuntimeInputR1,
  type Batch001RealUsefulShadowCompileInputR1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRealUsefulShadowCompilerR1";
import { compileBatch001RealUsefulShadowThroughSharedCoreR1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRealUsefulSharedCoreR1";
import {
  BATCH001_DRYWALL_KNAUF_P11_SHA256_R1,
  BATCH001_DRYWALL_MASTER_SHA256_R1,
  BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1,
  buildAllBatch001DrywallTechnologyPassportDraftsR1,
  buildBatch001DrywallTechnologyPassportDraftR1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1";

const RUNTIME_DEFINITION_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RUNTIME_ROWS_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const GENERIC_EQUIPMENT = /(?:оборудование доступа|механизм|техника по ппр|машина для работы|строительная техника|средства механизации)/iu;
const NUMERIC_CHARACTERISTIC = /\d[\d.,–—-]*\s*(?:м|кг)(?=$|[\s,;:.)])/iu;
const EXCLUSION_SHA = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function exactMaterial(titleRu: string): Batch001MaterialRuntimeInputR1 {
  return {
    exactTitleRu: `${titleRu}, точный размер 12,5 мм`,
    specificationRu: "Точная позиция выбранной системы, размер 12,5 мм, подтверждена проектной спецификацией.",
    unitId: "project_material_unit",
    normPerM2: 1.25,
    lossPercent: 7,
    packageTitleRu: "пачка выбранной позиции",
    packageSize: 10,
  };
}

function completeShadowInput(catalogId: string): Batch001RealUsefulShadowCompileInputR1 {
  const passport = buildBatch001DrywallTechnologyPassportDraftR1(catalogId);
  return {
    catalogId,
    sourceIdentity: `batch001-shadow-test:${catalogId}`,
    resultAreaM2: 19.25,
    requiredMaterials: Object.fromEntries(passport.requiredMaterialFamilies.map((item) => [
      item.familyId,
      exactMaterial(item.titleRu),
    ])),
    conditionalMaterials: Object.fromEntries(passport.conditionalMaterialFamilies.map((item) => [
      item.familyId,
      { status: "EXCLUDED", evidenceSha256: EXCLUSION_SHA },
    ])),
    access: {
      kind: "TOWER_5M",
      productivityM2PerShift: 40,
      scissorExclusionEvidenceSha256: EXCLUSION_SHA,
    },
    delivery: passport.deliveryFlows.length > 0
      ? { kind: "SEPARATE_5T_TRUCK", cargoMassT: 3.2, distanceKm: 18 }
      : null,
  };
}

describe("BATCH-001 real-useful TechnologyPassportR1 drafts", () => {
  it("uses an explicit independent delta for each of the exact 16 catalog identities", () => {
    const deltas = BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1;
    const passports = buildAllBatch001DrywallTechnologyPassportDraftsR1();

    expect(deltas).toHaveLength(16);
    expect(new Set(deltas.map((item) => item.catalogId)).size).toBe(16);
    expect(new Set(passports.map((item) => item.catalogId))).toEqual(
      new Set(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3),
    );
    expect(passports.every((item) => item.provenance.expectationBasis === "INDEPENDENT_ENGINEERING_EVIDENCE"
      && item.provenance.runtimeRowsUsedAsExpectation === false)).toBe(true);
  });

  it("is structurally complete but stays RED only because engineering acceptance is intentionally absent", () => {
    for (const passport of buildAllBatch001DrywallTechnologyPassportDraftsR1()) {
      const decision = evaluateTechnologyPassportR1(passport, [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA]);
      expect(decision).toMatchObject({ allowed: false, status: "RED" });
      expect(decision.errors).toEqual(["ENGINEER_ACCEPTANCE_MISSING"]);
      expect(passport.provenance.review).toMatchObject({
        status: "DRAFT",
        reviewerId: "UNASSIGNED_ENGINEERING_REVIEW",
      });
    }
  });

  it("binds every material family to exact specification, norm, loss and package inputs", () => {
    for (const passport of buildAllBatch001DrywallTechnologyPassportDraftsR1()) {
      const parameters = new Set(passport.userInputs.map((item) => item.parameterId));
      const families = [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies];
      for (const material of families) {
        expect(material.selectionResolutionR33).toBeDefined();
        expect(parameters.has(material.selectionResolutionR33!.selectionParameterId)).toBe(true);
        expect(parameters.has(`norm_${material.familyId}`)).toBe(true);
        expect(parameters.has(`loss_${material.familyId}_percent`)).toBe(true);
        expect(parameters.has(`package_size_${material.familyId}`)).toBe(true);
        expect(material.selectionResolutionR33!.technicalSpecificationRu).toMatch(/\d/u);
        expect(material.selectionResolutionR33!.preliminaryNormPerResultUnit).toBeGreaterThan(0);
        expect(material.selectionResolutionR33!.preliminaryPackageSize).toBeGreaterThan(0);
      }
      expect(passport.acceptedPreliminaryAssumptions).toHaveLength(families.length);
    }
  });

  it("defines two exact mutually exclusive access choices and never emits generic equipment", () => {
    for (const passport of buildAllBatch001DrywallTechnologyPassportDraftsR1()) {
      expect(passport.equipmentRules).toHaveLength(2);
      expect(new Set(passport.equipmentRules.map((item) => item.mutuallyExclusiveGroupId))).toEqual(
        new Set(["batch001-access-method"]),
      );
      for (const equipment of passport.equipmentRules) {
        expect(GENERIC_EQUIPMENT.test(equipment.titleRu)).toBe(false);
        expect(GENERIC_EQUIPMENT.test(equipment.equipmentClassRu)).toBe(false);
        expect(equipment.keyCharacteristicsRu.some((item) => NUMERIC_CHARACTERISTIC.test(item))).toBe(true);
        expect(passport.exclusions.some((item) => item.expectationId === equipment.expectationId)).toBe(true);
      }
    }
  });

  it("keeps the selected five BATCH-001 cases technologically different", () => {
    const largeFrame = buildBatch001DrywallTechnologyPassportDraftR1(
      "drywall_ceiling_interior_bulkhead_frame_large_area",
    );
    const wetFrame = buildBatch001DrywallTechnologyPassportDraftR1(
      "drywall_ceiling_interior_bulkhead_frame_wet_zone",
    );
    const standardAlign = buildBatch001DrywallTechnologyPassportDraftR1(
      "drywall_ceiling_interior_bulkhead_align_standard",
    );
    const largeClad = buildBatch001DrywallTechnologyPassportDraftR1(
      "drywall_ceiling_interior_bulkhead_clad_large_area",
    );
    const wetClad = buildBatch001DrywallTechnologyPassportDraftR1(
      "drywall_ceiling_interior_bulkhead_clad_wet_zone",
    );

    expect(largeFrame.conditionalMaterialFamilies.map((item) => item.familyId)).toContain("control_joint_profile");
    expect(wetFrame.conditionalMaterialFamilies.map((item) => item.familyId)).toContain("frame_corrosion_protection");
    expect(standardAlign.requiredMaterialFamilies).toEqual([]);
    expect(standardAlign.conditionalMaterialFamilies).toEqual([]);
    expect(standardAlign.deliveryFlows).toEqual([]);
    expect(largeClad.constructionOperations.map((item) => item.operationId)).toContain("form_control_joints");
    expect(wetClad.conditionalMaterialFamilies.map((item) => item.familyId)).toEqual(expect.arrayContaining([
      "waterproof_primer",
      "waterproof_membrane",
      "waterproof_tape",
      "penetration_cuff",
      "penetration_sealant",
    ]));
  });

  it("pins the two independent evidence artifacts and does not reuse runtime hashes", () => {
    expect(BATCH001_DRYWALL_MASTER_SHA256_R1).toMatch(/^[a-f0-9]{64}$/u);
    expect(BATCH001_DRYWALL_KNAUF_P11_SHA256_R1).toMatch(/^[a-f0-9]{64}$/u);
    expect([BATCH001_DRYWALL_MASTER_SHA256_R1, BATCH001_DRYWALL_KNAUF_P11_SHA256_R1]).not.toContain(
      RUNTIME_DEFINITION_SHA,
    );
    expect([BATCH001_DRYWALL_MASTER_SHA256_R1, BATCH001_DRYWALL_KNAUF_P11_SHA256_R1]).not.toContain(
      RUNTIME_ROWS_SHA,
    );
  });

  it("exposes the remediation only as a RED shadow gate on the existing successor", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      expect(definition.shadowRealUsefulGateR1).toMatchObject({
        mode: "SHADOW_PREPARED_ONLY",
        productionAdmissionAttached: false,
        passportReviewStatus: "DRAFT",
        status: "RED",
        passportDecision: {
          allowed: false,
          status: "RED",
          errors: ["ENGINEER_ACCEPTANCE_MISSING"],
        },
      });
      expect(definition.shadowRealUsefulGateR1.runtimeRemediationBlockers).toEqual(expect.arrayContaining([
        "RUNTIME_ACCESS_METHOD_INPUT_NOT_CONNECTED",
        "RUNTIME_CONCRETE_EQUIPMENT_PROJECTION_NOT_CONNECTED",
      ]));
    }
  });

  it("classifies every current material key and keeps all five selected runtime deltas RED", () => {
    const audits = auditAllBatch001DrywallRuntimeDeltasR1();
    expect(audits).toHaveLength(16);
    expect(audits.every((item) => item.unclassifiedLegacyMaterialKeys.length === 0)).toBe(true);
    const selected = audits.filter((item) => item.selected50Case);
    expect(new Set(selected.map((item) => item.catalogId))).toEqual(new Set(BATCH001_SELECTED_CASE_IDS_R1));
    expect(selected.every((item) => item.verdict === "RED" && item.blockers.length > 0)).toBe(true);
    expect(selected.every((item) => item.passport.decisionErrors.length === 1
      && item.passport.decisionErrors[0] === "ENGINEER_ACCEPTANCE_MISSING")).toBe(true);
    expect(selected.filter((item) => item.operation !== "ALIGN")
      .every((item) => item.currentDeliveryRowsWithoutCapacity.length === 1)).toBe(true);
    expect(selected.every((item) => item.equipmentRulesWithoutRuntimeRows.length === 2)).toBe(true);
  });

  it("fails closed before an exact material specification is supplied", () => {
    const input = completeShadowInput("drywall_ceiling_interior_bulkhead_clad_wet_zone");
    const requiredFamily = Object.keys(input.requiredMaterials)[0]!;
    const result = compileBatch001RealUsefulShadowR1({
      ...input,
      requiredMaterials: { ...input.requiredMaterials, [requiredFamily]: undefined as never },
    });
    expect(result).toMatchObject({
      status: "NEEDS_REQUIRED_INPUTS",
      projection: null,
      blockers: expect.arrayContaining([`MATERIAL_INPUT_MISSING:${requiredFamily}`]),
    });
  });

  it("builds exact shadow rows for the selected five but cannot turn GREEN before engineering review", () => {
    for (const catalogId of BATCH001_SELECTED_CASE_IDS_R1) {
      const result = compileBatch001RealUsefulShadowR1(completeShadowInput(catalogId));
      expect(result.status).toBe("RED_DRAFT_REVIEW_REQUIRED");
      if (result.status !== "RED_DRAFT_REVIEW_REQUIRED") continue;
      expect(result.decision.errors).toEqual(["ENGINEER_ACCEPTANCE_MISSING"]);
      expect(result.projection.materialRows.every((row) => (
        row.titleRu.includes("12,5 мм")
        && Number(row.grossQuantity) >= Number(row.netQuantity)
        && row.package != null
        && Number(row.package.procurementQuantity) > 0
      ))).toBe(true);
      expect(result.projection.equipmentRows).toHaveLength(1);
      expect(result.projection.equipmentRows[0]).toMatchObject({
        equipmentRuleId: "mobile_tower_5m",
        keyCharacteristicsRu: ["рабочая высота 5 м"],
      });
      expect(result.projection.exclusionProofs.every((proof) => proof.conditionProven)).toBe(true);
      if (result.projection.deliveryRows.length > 0) {
        expect(result.projection.deliveryRows[0]!.titleRu).toMatch(/5 т.*1 рейс\., 18 км/iu);
      }
    }
  });

  it("replays the selected five through the canonical shared core with exact title and quantity parity", async () => {
    for (const catalogId of BATCH001_SELECTED_CASE_IDS_R1) {
      const result = await compileBatch001RealUsefulShadowThroughSharedCoreR1(completeShadowInput(catalogId));
      expect(result.status).toBe("RED_DRAFT_REVIEW_REQUIRED");
      if (result.status === "NEEDS_REQUIRED_INPUTS") continue;
      expect(result.parity).toEqual({
        rowCountEqual: true,
        exactTitlesEqual: true,
        quantitiesEqual: true,
        procurementFlagsEqual: true,
        errors: [],
      });
      expect(result.shadow.decision.errors).toEqual(["ENGINEER_ACCEPTANCE_MISSING"]);
      const materialIds = new Set(result.shadow.projection.materialRows.map((row) => row.rowId));
      expect(result.core.rows.filter((row) => materialIds.has(row.row_id)).every((row) => (
        String(row.title_ru).includes("12,5 мм")
        && row.included_in_procurement === true
      ))).toBe(true);
      expect(result.core.revisionProjection.compilerVersion).toBe(
        "real-useful-estimates.batch001-shared-core-shadow-r1.v1",
      );
    }
  });
});
