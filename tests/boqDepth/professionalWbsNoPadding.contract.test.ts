import { readFileSync } from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync, validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { stripFoundationEstimate } from "./boqDepthTestHelpers";

function sourceFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function rowsOf(estimate: ReturnType<typeof calculateGlobalConstructionEstimateSync>) {
  return estimate.sections.flatMap((section) => section.rows);
}

function expectNoManufacturedRows(rows: ReturnType<typeof rowsOf>): void {
  expect(rows.some((row) => row.code.startsWith("professional_wbs_"))).toBe(false);
  expect(rows.some((row) => /assurance|material_extra|labor_extra|padding/i.test(row.code))).toBe(false);
  expect(rows.some((row) => /работы по указанному домену|позиции|статус цены/iu.test(row.name))).toBe(false);
}

describe("professional BOQ composition is applicability-driven, not row-count padding", () => {
  it("does not keep numeric padding mechanics in any general BOQ generator", () => {
    const calculator = sourceFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
    const dynamicCompiler = sourceFile("src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts");
    const seedData = sourceFile("src/lib/ai/globalEstimate/globalEstimateSeedData.ts");
    const passportAudit = sourceFile("scripts/estimate/audit11610ComplexityAdaptiveDeepBoqDepth.ts");
    const passportBuilder = sourceFile("src/lib/estimate/buildProfessionalWorkPassport.ts");

    expect(calculator).not.toMatch(/professionalWbsTargetRows|professionalWbsSpecsForScope|buildProfessionalWbsSupplementRows/);
    expect(dynamicCompiler).not.toMatch(/\bpadRows\b|assurance_\$\{|while\s*\([^)]*rows\.length\s*</i);
    expect(seedData).not.toMatch(/while\s*\(padded(?:Material|Labor)Rows\.length\s*</i);
    expect(passportAudit).not.toMatch(/volume:\s*passport\.boqRecipe\.rowCount/);
    expect(passportBuilder).not.toMatch(/while\s*\([^)]*supplemented\.length\s*<\s*minimumRows/i);
  });

  it("keeps the strip-foundation lifecycle explicit and source-governed", () => {
    const estimate = stripFoundationEstimate();
    const rows = rowsOf(estimate);
    const depth = validateEstimateBoqDepth(estimate);
    const requiredCodes = [
      "strip_foundation_geodesy_benchmark",
      "strip_foundation_excavation",
      "strip_foundation_longitudinal_rebar",
      "strip_foundation_concrete_m300",
      "strip_foundation_concrete_pour",
      "strip_foundation_waterproofing_install",
      "strip_foundation_concrete_pump",
      "strip_foundation_concrete_delivery",
      "strip_foundation_as_built_photo_register",
      "strip_foundation_as_built_scheme",
    ];

    expect(requiredCodes.every((code) => rows.some((row) => row.code === code))).toBe(true);
    expectNoManufacturedRows(rows);
    expect(depth).toMatchObject({
      passed: true,
      minimumRows: 0,
      genericRows: [],
      artificialPaddingRows: [],
      rowsWithoutFormulaOrTrace: [],
      rowsWithoutSourceLink: [],
    });
  });

  it("uses a real technological composition for elevated steel structures", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на монтаж металлоконструкций 100 м2 в Бишкеке",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const rows = rowsOf(estimate);
    const byCode = new Map(rows.map((row) => [row.code, row]));

    expect(estimate.work.workKey).toBe("dynamic_metal_structures_estimate");
    expect(validateConstructionUnitSemantics(estimate).failures).toEqual([]);
    expect(byCode.get("structural_steel")).toMatchObject({ unit: "kg", quantity: 3500 });
    expect(byCode.get("structural_bolts_anchors")).toMatchObject({ unit: "pcs", quantity: 400 });
    expect(byCode.get("steel_mobile_crane")).toMatchObject({ unit: "shift" });
    expect(byCode.get("steel_aerial_platform")).toMatchObject({ unit: "shift" });
    expect(byCode.get("steel_weld_inspection_tools")).toMatchObject({ unit: "set" });
    expect(byCode.get("steel_long_load_delivery")).toMatchObject({ unit: "trip" });
    expectNoManufacturedRows(rows);
  });

  it("keeps concrete pedestal resources on their physical units", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на заливку бетонных тумб 12 шт",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const rows = rowsOf(estimate);
    const byCode = new Map(rows.map((row) => [row.code, row]));

    expect(estimate.work.workKey).toBe("concrete_pedestal_pour");
    expect(validateConstructionUnitSemantics(estimate).failures).toEqual([]);
    expect(byCode.get("concrete")?.unit).toBe("m3");
    expect(byCode.get("rebar")?.unit).toBe("kg");
    expect(byCode.get("formwork_install")?.unit).toBe("sq_m");
    expect(byCode.get("required_plan_equipment_3")?.name).toContain("виброплита");
    expect(byCode.get("materials_delivery")?.unit).toBe("trip");
    expectNoManufacturedRows(rows);
  });

  it("keeps crane and height equipment attached to the actual steel erection scope", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на монтаж металлоконструкций 2 шт в Бишкеке industrial crane, зона работ основная зона, условие новое строительство",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const rows = rowsOf(estimate);
    const byCode = new Map(rows.map((row) => [row.code, row]));

    expect(estimate.work.workKey).toBe("crane_service");
    expect(validateConstructionUnitSemantics(estimate).failures).toEqual([]);
    expect(byCode.get("crane_service_install")).toMatchObject({ unit: "set" });
    expect(byCode.get("steel_mobile_crane")).toMatchObject({ unit: "shift" });
    expect(byCode.get("steel_aerial_platform")).toMatchObject({ unit: "shift" });
    expect(byCode.get("steel_crane_unloading")).toMatchObject({ unit: "shift" });
    expect(rows.filter((row) => row.unit === "shift").every((row) =>
      /кран|свароч|подъёмник|разгруз/iu.test(row.name)
    )).toBe(true);
    expectNoManufacturedRows(rows);
  });

  it("models mini-CHP by real plant systems, installation, testing and handover", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      explicitWorkKey: "mini_chp_preparation",
      volume: 1,
      unit: "set",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const rows = rowsOf(estimate);
    const codes = new Set(rows.map((row) => row.code));
    const requiredCodes = [
      "mini_chp_engine_generator",
      "mini_chp_gas_train",
      "mini_chp_heat_recovery",
      "mini_chp_generator_switchgear",
      "mini_chp_sync_protection",
      "mini_chp_gas_fire_detection",
      "mini_chp_generator_rigging",
      "mini_chp_hydraulic_test",
      "mini_chp_grid_synchronization",
      "mini_chp_performance_test",
      "mini_chp_emissions_test",
      "mini_chp_handover",
      "mini_chp_mobile_crane",
      "mini_chp_electrical_lab",
      "mini_chp_heavy_delivery",
    ];

    expect(estimate.work.workKey).toBe("mini_chp_preparation");
    expect(requiredCodes.every((code) => codes.has(code))).toBe(true);
    expect(validateEstimateBoqDepth(estimate).passed).toBe(true);
    expect(rows.every((row) => row.quantityFormula && row.calculationTrace && row.sourceEvidence.length > 0)).toBe(true);
    expectNoManufacturedRows(rows);
  });
});
