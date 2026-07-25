import { readFileSync } from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync, validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { stripFoundationEstimate } from "./boqDepthTestHelpers";

function sourceFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("professional WBS depth is applicability-driven, not row-count padding", () => {
  it("does not keep row-count target padding mechanics in the generator or source audit", () => {
    const calculator = sourceFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
    const passportAudit = sourceFile("scripts/estimate/audit11610ComplexityAdaptiveDeepBoqDepth.ts");
    const passportBuilder = sourceFile("src/lib/estimate/buildProfessionalWorkPassport.ts");

    expect(calculator).not.toMatch(/professionalWbsTargetRows/);
    expect(calculator).not.toMatch(/\btargetRows\b/);
    expect(calculator).not.toMatch(/input\.existingRows/);
    expect(calculator).not.toMatch(/input\.targetRows/);
    expect(calculator).not.toMatch(/while\s*\([^)]*rows\.length\s*<[^)]*(minimum|target)/i);
    expect(calculator).not.toMatch(/rows\.slice\(0,\s*Math\.max\(0,\s*input\.targetRows/);
    expect(calculator).toMatch(/professionalWbsSpecsForScope\(input\)/);
    expect(calculator).toMatch(/specs\.forEach/);
    expect(passportAudit).not.toMatch(/volume:\s*passport\.boqRecipe\.rowCount/);
    expect(passportBuilder).not.toMatch(/while\s*\([^)]*supplemented\.length\s*<\s*minimumRows/i);
    expect(passportBuilder).not.toMatch(/supplemented\.length\s*<\s*minimumRows/);
  });

  it("requires applicability and formula trace on every generated professional WBS row", () => {
    const estimate = stripFoundationEstimate();
    const depth = validateEstimateBoqDepth(estimate);
    const professionalRows = estimate.sections
      .flatMap((section) => section.rows)
      .filter((row) => row.code.startsWith("professional_wbs_"));

    expect(professionalRows.length).toBeGreaterThan(0);
    expect(depth.professionalWbsRowsWithoutApplicability).toEqual([]);
    expect(depth.professionalWbsRowsWithoutSourceApplicability).toEqual([]);
    for (const row of professionalRows) {
      expect(row.applicabilityRule).toBeTruthy();
      expect(row.applicabilityReason).toBeTruthy();
      expect(row.scopeDriver).toBeTruthy();
      expect(row.semanticSignature).toBeTruthy();
      expect(row.quantityFormula).toBeTruthy();
      expect(row.calculationTrace).toBeTruthy();
      expect(row.sourceEvidence.length).toBeGreaterThan(0);
      expect(row.normSourceId).toBeTruthy();
      expect(row.normSourceTitle).toBeTruthy();
      expect(row.normVersion).toBeTruthy();
      expect(row.normReviewStatus).toBe("preliminary_scope_applicability_required");
      expect(row.sourceParameters).toMatchObject({
        normSourceProvenance: "configured_reference_rate_not_normative_pack",
        sourceApplicabilityStatus: "preliminary_reference_requires_project_scope_review_or_rfq",
      });
    }
  });

  it("keeps metal structure WBS units on structural mass semantics", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "снятие металлического каркаса в стандартной зоне 100 м2, город Бишкек.",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const unitSemantics = validateConstructionUnitSemantics(estimate);
    const professionalRows = estimate.sections
      .flatMap((section) => section.rows)
      .filter((row) => row.code.startsWith("professional_wbs_dynamic_metal_structures_estimate_"));

    expect(estimate.work.workKey).toBe("dynamic_metal_structures_estimate");
    expect(unitSemantics.failures).toEqual([]);
    expect(professionalRows.length).toBeGreaterThan(0);
    expect(professionalRows.filter((row) => row.code.endsWith("_materials")).every((row) => row.unit === "kg")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_execution")).every((row) => row.unit === "kg")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_planning")).every((row) => row.unit === "set")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_quality")).every((row) => row.unit === "set")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_equipment")).every((row) => row.unit === "set")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_delivery")).every((row) => row.unit === "trip")).toBe(true);
    expect(
      professionalRows
        .filter((row) => row.code.endsWith("_materials") || row.code.endsWith("_execution"))
        .every((row) => row.calculationTrace?.includes("structural_steel_kg_per_m2=35")),
    ).toBe(true);
  });

  it("keeps concrete pedestal WBS units on formula volume semantics", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на заливку бетонных тумб 12 шт",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const unitSemantics = validateConstructionUnitSemantics(estimate);
    const professionalRows = estimate.sections
      .flatMap((section) => section.rows)
      .filter((row) => row.code.startsWith("professional_wbs_concrete_pedestal_pour_"));

    expect(estimate.work.workKey).toBe("concrete_pedestal_pour");
    expect(unitSemantics.failures).toEqual([]);
    expect(professionalRows.length).toBeGreaterThan(0);
    expect(professionalRows.filter((row) => row.code.endsWith("_materials")).every((row) => row.unit === "m3")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_execution")).every((row) => row.unit === "m3")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_planning")).every((row) => row.unit === "set")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_quality")).every((row) => row.unit === "set")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_equipment")).every((row) => row.unit === "set")).toBe(true);
    expect(professionalRows.filter((row) => row.code.endsWith("_delivery")).every((row) => row.unit === "trip")).toBe(true);
    expect(
      professionalRows
        .filter((row) => row.code.endsWith("_materials") || row.code.endsWith("_execution"))
        .every((row) => row.calculationTrace?.includes("concreteWithWasteM3")),
    ).toBe(true);
  });

  it("limits crane shift semantics to the applicable lifting equipment phase", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text:
        "смета на монтаж металлоконструкций 2 шт в Бишкеке industrial crane, " +
        "зона работ основная зона, условие новое строительство",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const unitSemantics = validateConstructionUnitSemantics(estimate);
    const professionalRows = estimate.sections
      .flatMap((section) => section.rows)
      .filter((row) => row.code.startsWith("professional_wbs_crane_service_"));
    const liftingEquipmentRow = professionalRows.find((row) => row.code.endsWith("_lifting_1_equipment"));
    const nonLiftingRows = professionalRows.filter((row) => !row.code.endsWith("_lifting_1_equipment"));

    expect(estimate.work.workKey).toBe("crane_service");
    expect(unitSemantics.failures).toEqual([]);
    expect(liftingEquipmentRow?.unit).toBe("shift");
    expect(liftingEquipmentRow?.quantityFormula).toBe("ceil(base_quantity_lifting_shifts)");
    expect(nonLiftingRows.length).toBeGreaterThan(0);
    expect(nonLiftingRows.every((row) => row.unit !== "shift")).toBe(true);
  });

  it("derives mini-CHP depth from applicable plant systems with complete row governance", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "Estimate mini_chp_preparation 1 set",
      language: "en",
      countryCode: "KG",
      city: "Bishkek",
    });
    const expectedPhases = [
      "fuel_supply_interface",
      "gas_pressure_reduction",
      "fuel_gas_detection",
      "engine_generator_package",
      "heat_recovery_system",
      "cooling_circuit",
      "lubrication_system",
      "exhaust_stack",
      "combustion_air",
      "acoustic_attenuation",
      "water_treatment",
      "thermal_buffer",
      "circulation_pumps",
      "heat_exchangers",
      "district_heating_interface",
      "auxiliary_power",
      "black_start_system",
      "generator_synchronization",
      "emissions_monitoring",
      "heat_balance_testing",
    ];
    const rows = estimate.sections.flatMap((section) => section.rows);

    expect(estimate.work.workKey).toBe("mini_chp_preparation");
    expect(validateEstimateBoqDepth(estimate).passed).toBe(true);
    for (const phase of expectedPhases) {
      const phaseRows = rows.filter((row) => row.code.startsWith(`professional_wbs_mini_chp_preparation_${phase}_1_`));
      expect(phaseRows).toHaveLength(5);
      expect(phaseRows.map((row) => row.code.split("_").at(-1)).sort()).toEqual([
        "delivery",
        "equipment",
        "execution",
        "materials",
        "planning",
      ]);
      for (const row of phaseRows) {
        expect(row.scopeDriver).toBe(`mini_chp:${phase}`);
        expect(row.sourceParameters?.scopeDriver).toBe(`mini_chp:${phase}`);
        expect(row.applicabilityRule).toContain("work scope matches mini_chp");
        expect(row.applicabilityReason).toContain(`WBS phase ${phase}`);
        expect(row.semanticSignature).toContain(`mini_chp_preparation|${phase}|`);
        expect(row.quantityFormula).toBeTruthy();
        expect(row.calculationTrace).toBeTruthy();
        expect(row.sourceId).toBeTruthy();
        expect(typeof row.includedInProcurement).toBe("boolean");
      }
    }
  });
});
