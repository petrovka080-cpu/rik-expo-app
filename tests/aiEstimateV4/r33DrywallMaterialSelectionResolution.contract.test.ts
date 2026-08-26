import { evaluateTechnologyPassportR1 } from "../../src/lib/estimate/backendPlatform/technologyPassportR1";
import { buildAllBatch001DrywallTechnologyPassportDraftsR1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1";
import { buildAllBatch002DrywallTechnologyPassportDraftsR1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsTechnologyPassportR1";
import {
  DRYWALL_MATERIAL_SELECTION_R33_CONTRACT,
  MASTER_TZ_R33_SHA256,
  MASTER_TZ_R33_SOURCE_ID,
  drywallMaterialSelectionInventoryR33,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallMaterialSelectionR33";

const FORBIDDEN_PLACEHOLDER = /(?:^|\s)(?:указать|выбранн(?:ый|ая|ое|ые)\s+(?:материал|позици|систем)|project[_ -]?(?:system|material)|точная\s+позиция\s+выбранной\s+системы)/iu;

describe("MASTER R3.3 drywall material-selection resolution", () => {
  const batch001 = buildAllBatch001DrywallTechnologyPassportDraftsR1();
  const batch002 = buildAllBatch002DrywallTechnologyPassportDraftsR1();
  const passports = [...batch001, ...batch002];
  const materials = passports.flatMap((passport) => [
    ...passport.requiredMaterialFamilies,
    ...passport.conditionalMaterialFamilies,
  ]);

  it("resolves the exact 400/400 frozen material occurrences in 71/71 passports", () => {
    expect(batch001).toHaveLength(16);
    expect(batch002).toHaveLength(55);
    expect(passports).toHaveLength(71);
    expect(batch001.flatMap((passport) => [
      ...passport.requiredMaterialFamilies,
      ...passport.conditionalMaterialFamilies,
    ])).toHaveLength(106);
    expect(batch002.flatMap((passport) => [
      ...passport.requiredMaterialFamilies,
      ...passport.conditionalMaterialFamilies,
    ])).toHaveLength(294);
    expect(materials).toHaveLength(400);
    expect(passports.flatMap((passport) => passport.requiredMaterialFamilies)).toHaveLength(194);
    expect(passports.flatMap((passport) => passport.conditionalMaterialFamilies)).toHaveLength(206);
    expect(materials.every((material) => material.selectionResolutionR33 != null)).toBe(true);
    expect(drywallMaterialSelectionInventoryR33()).toHaveLength(59);
  });

  it("publishes exact names, numeric characteristics and usable formulas instead of abstract specifications", () => {
    for (const passport of passports) {
      const parameters = new Map(passport.userInputs.map((parameter) => [parameter.parameterId, parameter]));
      const formulas = new Map(passport.quantityFormulas.map((formula) => [formula.formulaId, formula]));
      const procurement = new Map(passport.procurementRules.map((rule) => [rule.procurementRuleId, rule]));
      const passportMaterials = [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies];

      expect(passport.acceptedPreliminaryAssumptions).toHaveLength(passportMaterials.length);
      for (const material of passportMaterials) {
        const resolution = material.selectionResolutionR33!;
        const selectionInput = parameters.get(resolution.selectionParameterId);
        const normInput = parameters.get(`norm_${material.familyId}`);
        const lossInput = parameters.get(`loss_${material.familyId}_percent`);
        const packageInput = parameters.get(`package_size_${material.familyId}`);
        const formula = formulas.get(material.formulaId);
        const purchaseRule = procurement.get(material.procurementRuleId);

        expect(resolution.contract).toBe(DRYWALL_MATERIAL_SELECTION_R33_CONTRACT);
        expect(resolution.sourceIds).toContain(MASTER_TZ_R33_SOURCE_ID);
        expect(material.titleRu).toBe(resolution.publicBoqTitleRu);
        expect(resolution.publicBoqTitleRu).toMatch(/\d/u);
        expect(resolution.technicalSpecificationRu).toMatch(/\d/u);
        expect(FORBIDDEN_PLACEHOLDER.test(resolution.publicBoqTitleRu)).toBe(false);
        expect(FORBIDDEN_PLACEHOLDER.test(resolution.technicalSpecificationRu)).toBe(false);
        expect(FORBIDDEN_PLACEHOLDER.test(resolution.plainHintRu)).toBe(false);
        expect(selectionInput).toMatchObject({
          titleRu: resolution.selectionParameterTitleRu,
          guideRu: resolution.plainHintRu,
          required: resolution.confirmationRequired,
          acceptedDefault: resolution.preliminaryValueRu,
          defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID,
        });
        expect(normInput).toMatchObject({ acceptedDefault: resolution.preliminaryNormPerResultUnit });
        expect(lossInput).toMatchObject({ acceptedDefault: resolution.preliminaryLossPercent });
        expect(packageInput).toMatchObject({ acceptedDefault: resolution.preliminaryPackageSize });
        expect(formula?.outputUnitId).toBe(resolution.materialUnitId);
        expect(purchaseRule?.packageUnitRu).toBe(resolution.packageUnitRu);
        expect(resolution.preliminaryNormPerResultUnit).toBeGreaterThan(0);
        expect(resolution.preliminaryLossPercent).toBeGreaterThanOrEqual(0);
        expect(resolution.preliminaryPackageSize).toBeGreaterThan(0);
      }
    }
  });

  it("keeps confirmation fail-closed and does not fabricate any engineer acceptance", () => {
    expect(MASTER_TZ_R33_SHA256).toMatch(/^[a-f0-9]{64}$/u);
    expect(materials.filter((material) => material.selectionResolutionR33!.strategy === "TECHNOLOGY_DERIVED")).toHaveLength(102);
    expect(materials.filter((material) => material.selectionResolutionR33!.strategy === "ACCEPTED_PRELIMINARY_VALUE")).toHaveLength(168);
    expect(materials.filter((material) => material.selectionResolutionR33!.strategy === "REQUIRED_PROJECT_INPUT")).toHaveLength(130);
    for (const passport of passports) {
      expect(passport.provenance.review).toMatchObject({
        status: "DRAFT",
        reviewerId: "UNASSIGNED_ENGINEERING_REVIEW",
      });
      expect(evaluateTechnologyPassportR1(passport, [])).toMatchObject({
        status: "RED",
        allowed: false,
        errors: ["ENGINEER_ACCEPTANCE_MISSING"],
      });
    }
  });
});
