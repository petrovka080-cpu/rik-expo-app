import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateTechnologyPassportR1 } from "../../src/lib/estimate/backendPlatform/technologyPassportR1";
import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4";
import { buildAllBatch002DrywallSuccessorsR3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import {
  BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1,
  BATCH002_KNAUF_FLEXIBOARD_SHA256_R1,
  BATCH002_KNAUF_INSULATION_SHA256_R1,
  BATCH002_KNAUF_PAPER_TAPE_SHA256_R1,
  BATCH002_USG_J371_SHA256_R1,
  buildAllBatch002DrywallTechnologyPassportDraftsR1,
  buildBatch002DrywallTechnologyPassportDraftR1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsTechnologyPassportR1";
import {
  compileBatch002RealUsefulShadowR1,
  type Batch002MaterialRuntimeInputR1,
  type Batch002RealUsefulShadowCompileInputR1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulShadowCompilerR1";
import { compileBatch002RealUsefulShadowThroughSharedCoreR1 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRealUsefulSharedCoreR1";

const EVIDENCE_SHA = "1".repeat(64);

function exactMaterial(titleRu: string): Batch002MaterialRuntimeInputR1 {
  return {
    exactTitleRu: `${titleRu}, фасовка 25 кг`,
    specificationRu: "Точная позиция выбранной системы, толщина 12,5 мм, упаковка 25 кг",
    unitId: "kg",
    normPerM2: 1.25,
    lossPercent: 8,
    packageTitleRu: "мешок 25 кг",
    packageSize: 10,
  };
}

function completeShadowInput(catalogId: string): Batch002RealUsefulShadowCompileInputR1 {
  const passport = buildBatch002DrywallTechnologyPassportDraftR1(catalogId);
  const includeFirstConditional = passport.requiredMaterialFamilies.length === 0;
  return {
    catalogId,
    sourceIdentity: `batch002-shadow-fixture:${catalogId}`,
    systemPassportReference: "KNAUF/project-system-revision-2026-08-21",
    resultAreaM2: 10,
    requiredMaterials: Object.fromEntries(passport.requiredMaterialFamilies.map((item) => [
      item.familyId,
      exactMaterial(item.titleRu),
    ])),
    conditionalMaterials: Object.fromEntries(passport.conditionalMaterialFamilies.map((item, index) => [
      item.familyId,
      includeFirstConditional && index === 0
        ? { status: "INCLUDED" as const, material: exactMaterial(item.titleRu) }
        : { status: "EXCLUDED" as const, evidenceSha256: EVIDENCE_SHA },
    ])),
    access: { kind: "TOWER_5M", productivityM2PerShift: 18, scissorExclusionEvidenceSha256: EVIDENCE_SHA },
    delivery: passport.deliveryFlows.length > 0
      ? { kind: "SEPARATE_5T_TRUCK", cargoMassT: 0.8, distanceKm: 24 }
      : null,
    waste: passport.wasteFlows.length > 0
      ? { kind: "SEPARATE_5T_TRUCK", wasteMassT: 0.35, distanceKm: 17 }
      : null,
  };
}

describe("BATCH-002 independent TechnologyPassportR1 drafts", () => {
  it("has an explicit delta for every exact catalog identity", () => {
    expect(BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1).toHaveLength(55);
    expect(new Set(BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1.map((delta) => delta.deltaId)).size).toBe(55);
    expect(BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1.map((delta) => delta.catalogId))
      .toEqual(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
    expect(BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1.every((delta) => delta.deltaReasonRu.length > 60)).toBe(true);
  });

  it("keeps all 55 passports DRAFT with only real engineering acceptance missing", () => {
    const passports = buildAllBatch002DrywallTechnologyPassportDraftsR1();
    expect(passports).toHaveLength(55);
    for (const passport of passports) {
      const decision = evaluateTechnologyPassportR1(passport, []);
      expect(passport.provenance.runtimeRowsUsedAsExpectation).toBe(false);
      expect(passport.provenance.review.status).toBe("DRAFT");
      expect(decision).toMatchObject({ status: "RED", allowed: false });
      expect(decision.errors).toEqual(["ENGINEER_ACCEPTANCE_MISSING"]);
    }
  });

  it("requires exact material specification, norm, loss and package inputs", () => {
    for (const passport of buildAllBatch002DrywallTechnologyPassportDraftsR1()) {
      const ids = new Set(passport.userInputs.map((parameter) => parameter.parameterId));
      for (const material of [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies]) {
        expect(material.selectionResolutionR33).toBeDefined();
        expect(ids.has(material.selectionResolutionR33!.selectionParameterId)).toBe(true);
        expect(ids.has(`norm_${material.familyId}`)).toBe(true);
        expect(ids.has(`loss_${material.familyId}_percent`)).toBe(true);
        expect(ids.has(`package_size_${material.familyId}`)).toBe(true);
        expect(material.selectionResolutionR33!.technicalSpecificationRu).toMatch(/\d/u);
        expect(material.selectionResolutionR33!.preliminaryNormPerResultUnit).toBeGreaterThan(0);
        expect(material.selectionResolutionR33!.preliminaryPackageSize).toBeGreaterThan(0);
      }
    }
  });

  it("declares concrete mutually exclusive access equipment for every operation", () => {
    for (const passport of buildAllBatch002DrywallTechnologyPassportDraftsR1()) {
      expect(passport.equipmentRules.map((rule) => rule.titleRu)).toEqual([
        "Вышка-тура, рабочая высота 5 м",
        "Ножничный подъёмник, рабочая высота 8 м, платформа 230 кг",
      ]);
      expect(passport.equipmentRules.every((rule) => rule.mutuallyExclusiveGroupId === "ACCESS_METHOD")).toBe(true);
      expect(passport.equipmentRules.every((rule) =>
        passport.constructionOperations.some((operation) => operation.operationId === rule.operationId))).toBe(true);
    }
  });

  it("separates supplier-included delivery and repair waste without duplicate logistics", () => {
    for (const passport of buildAllBatch002DrywallTechnologyPassportDraftsR1()) {
      expect(passport.deliveryFlows.length).toBeLessThanOrEqual(1);
      expect(passport.deliveryFlows.every((flow) => flow.vehicleTypeRu.includes("5 т"))).toBe(true);
      if (passport.catalogId.includes("_repair_")) {
        expect(passport.wasteFlows).toHaveLength(1);
        expect(passport.wasteFlows[0]?.vehicleTypeRu).toContain("5 т");
      } else expect(passport.wasteFlows).toHaveLength(0);
    }
  });

  it("binds the exact frozen primary-source SHA-256 identities", () => {
    const root = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch002/independent-sources");
    const sha256 = (name: string) => require("node:crypto").createHash("sha256")
      .update(readFileSync(resolve(root, name))).digest("hex");
    expect(sha256("KNAUF_FLEXIBOARD_TDS_2025.pdf")).toBe(BATCH002_KNAUF_FLEXIBOARD_SHA256_R1);
    expect(sha256("KNAUF_PAPER_JOINT_TAPE_2025.pdf")).toBe(BATCH002_KNAUF_PAPER_TAPE_SHA256_R1);
    expect(sha256("KNAUF_CEILING_INSULATION_INSTALL_2024.pdf")).toBe(BATCH002_KNAUF_INSULATION_SHA256_R1);
    expect(sha256("USG_SHEETROCK_J371_2021.pdf")).toBe(BATCH002_USG_J371_SHA256_R1);
  });

  it("does not import runtime rows or the current BATCH-002 successor", () => {
    const source = readFileSync(resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsTechnologyPassportR1.ts"), "utf8");
    expect(source).not.toContain("drywallArchitecturalElementsSuccessorR3");
    expect(source).not.toContain("buildAllBatch002DrywallSuccessorsR3");
    expect(source).not.toContain("compileBatch002DrywallSuccessorR3");
  });

  it("attaches only a fail-closed shadow gate to the current definitions", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      expect(definition.shadowRealUsefulGateR1).toMatchObject({
        mode: "SHADOW_PREPARED_ONLY",
        productionAdmissionAttached: false,
        currentUserRuntimeChanged: false,
        reviewStatus: "DRAFT",
        status: "RED",
        blockers: [
          "ENGINEER_ACCEPTANCE_MISSING",
          "EXACT_EQUIPMENT_RUNTIME_ROW_MISSING",
          "LEGACY_EQUIPMENT_POLICY_CONTRADICTS_MASTER",
        ],
      });
      expect(definition.contentDecision.allowed).toBe(true);
    }
  });

  it("shadow-compiles all 55 exact identities while retaining the DRAFT review RED", () => {
    for (const delta of BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1) {
      const input = completeShadowInput(delta.catalogId);
      const result = compileBatch002RealUsefulShadowR1(input);
      expect(result.status).toBe("RED_DRAFT_REVIEW_REQUIRED");
      if (result.status !== "RED_DRAFT_REVIEW_REQUIRED") continue;
      expect(result.blockers).toEqual(["ENGINEER_ACCEPTANCE_MISSING"]);
      expect(result.projection.catalogId).toBe(delta.catalogId);
      expect(result.projection.equipmentRows.map((row) => row.titleRu)).toEqual([
        "Вышка-тура, рабочая высота 5 м",
      ]);
      const passport = buildBatch002DrywallTechnologyPassportDraftR1(delta.catalogId);
      const includedConditionalCount = passport.conditionalMaterialFamilies
        .filter((item) => input.conditionalMaterials[item.familyId]?.status === "INCLUDED").length;
      expect(result.projection.materialRows).toHaveLength(passport.requiredMaterialFamilies.length + includedConditionalCount);
    }
  });

  it("calculates net, gross, package, delivery and repair-waste shadow truth", () => {
    const catalogId = "drywall_ceiling_interior_curve_repair_standard";
    const result = compileBatch002RealUsefulShadowR1(completeShadowInput(catalogId));
    expect(result.status).toBe("RED_DRAFT_REVIEW_REQUIRED");
    if (result.status !== "RED_DRAFT_REVIEW_REQUIRED") return;
    expect(result.projection.materialRows[0]).toMatchObject({
      netQuantity: "12.5",
      grossQuantity: "13.5",
      lossPercent: "8",
      package: { procurementQuantity: "2" },
    });
    expect(result.projection.deliveryRows).toHaveLength(1);
    expect(result.projection.wasteRows).toHaveLength(1);
    expect(result.projection.deliveryRows[0]?.vehicleTypeRu).toContain("5 т");
    expect(result.projection.wasteRows[0]?.vehicleTypeRu).toContain("5 т");
  });

  it("fails closed before projection when exact material evidence is incomplete", () => {
    const catalogId = "drywall_ceiling_interior_curve_clad_standard";
    const input = completeShadowInput(catalogId);
    const firstFamilyId = buildBatch002DrywallTechnologyPassportDraftR1(catalogId).requiredMaterialFamilies[0]!.familyId;
    const result = compileBatch002RealUsefulShadowR1({
      ...input,
      requiredMaterials: {
        ...input.requiredMaterials,
        [firstFamilyId]: { ...input.requiredMaterials[firstFamilyId]!, exactTitleRu: "Материал" },
      },
    });
    expect(result).toMatchObject({
      status: "NEEDS_REQUIRED_INPUTS",
      projection: null,
      blockers: expect.arrayContaining([`MATERIAL_EXACT_TITLE_INVALID:${firstFamilyId}`]),
    });
  });

  it("keeps representative operations in exact parity with the shared canonical core", async () => {
    const selected = [
      "drywall_ceiling_interior_curve_frame_standard",
      "drywall_ceiling_interior_curve_align_large_area",
      "drywall_ceiling_interior_curve_clad_wet_zone",
      "drywall_ceiling_interior_bulkhead_finish_joint_standard",
      "drywall_ceiling_interior_bulkhead_insulate_technical_room",
      "drywall_ceiling_interior_curve_prepare_small_area",
      "drywall_ceiling_interior_curve_repair_standard",
    ] as const;
    for (const catalogId of selected) {
      const result = await compileBatch002RealUsefulShadowThroughSharedCoreR1(completeShadowInput(catalogId));
      expect(result.status).toBe("RED_DRAFT_REVIEW_REQUIRED");
      if (result.status === "NEEDS_REQUIRED_INPUTS") continue;
      expect(result.parity).toEqual({
        rowCountEqual: true,
        exactTitlesEqual: true,
        quantitiesEqual: true,
        procurementFlagsEqual: true,
        errors: [],
      });
      expect(result.core.rows).toHaveLength([
        ...result.shadow.projection.materialRows,
        ...result.shadow.projection.constructionOperationRows,
        ...result.shadow.projection.equipmentRows,
        ...result.shadow.projection.deliveryRows,
        ...result.shadow.projection.wasteRows,
      ].length);
    }
  });
});
