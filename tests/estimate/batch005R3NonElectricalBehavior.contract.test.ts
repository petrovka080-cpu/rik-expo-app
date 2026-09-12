import crypto from "node:crypto";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_1000_CONSTRUCTION_CASES } from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";
import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";
import { createRealMaterialQuantityPreview } from "../../src/lib/ai/professionalEstimateCalculator/realMaterialQuantityEngine";
import { compileAsphaltProfessionalEstimateV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4";
import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

const ASPHALT_BASELINE_RUNTIME_SHA256 = "efb53c0bb013164fea3584edd0228532ede2d9771c73a3fac0ebdd1ab1295916";

describe("BATCH005 R3 non-Electrical behavior immutability", () => {
  test("keeps the BATCH004 Asphalt runtime output byte-equivalent", () => {
    const result = compileAsphaltProfessionalEstimateV4({
      raw_text: "Полное строительство автомобильной дороги длиной 100 м, шириной 7 м",
    });
    const projection = {
      rows: result.compiled_rows,
      passport: result.passport,
      quantityBasis: result.quantity_basis,
      policy: result.preliminary_assembly_policy,
    };
    const runtimeSha256 = crypto.createHash("sha256").update(JSON.stringify(projection)).digest("hex");

    expect(result.compiled_rows).toHaveLength(122);
    expect(runtimeSha256).toBe(ASPHALT_BASELINE_RUNTIME_SHA256);
  });

  test("keeps Drywall and Masonry composition while product-specific norms fail closed", () => {
    const drywall = compileProductionExpandedEstimate10000({
      workKey: "drywall_ceiling_interior_drywall_partition_install_standard",
      quantity: 80,
      countryCode: "KG",
    });
    const drywallRealRows = drywall.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    expect(drywall.rows).toHaveLength(59);
    expect(drywallRealRows).toEqual([]);
    expect(drywall.rows.every((row) =>
      row.normSourceId.startsWith("src_professional_norm_pack_catalog_") &&
      row.calculationTrace.includes("normSource=")
    )).toBe(true);
    expect(drywall.rows.some((row) => row.normSourceId.includes("drywall_knauf_fugenfueller"))).toBe(false);

    const masonry = compileProductionExpandedEstimate10000({
      workKey: "masonry_interior_gas_block_lay_standard",
      quantity: 400,
      countryCode: "KG",
    });
    const masonryRealRows = masonry.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    expect(masonry.rows).toHaveLength(59);
    expect(masonryRealRows).toEqual([]);
    expect(masonry.rows.every((row) =>
      row.normSourceId.startsWith("src_professional_norm_pack_catalog_") &&
      row.calculationTrace.includes("normSource=")
    )).toBe(true);
    expect([...new Set(masonry.rows.map((row) => row.unit))]).toEqual(["m2", "m3", "piece", "set"]);
    const preview = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метров",
      parameters: { material_type: "газоблок", wall_thickness_mm: 200 },
    });
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    expect(preview.rowsInsertedBeforeConfirmation).toBe(false);
  });

  test("keeps Concrete intent and quantity behavior unchanged", () => {
    const result = expectProfessionalBoqEstimate("залить фундамент 30 м3", "foundation_concrete");
    expect(result.work.category).toBe("foundation");
    expect(result.input).toEqual(expect.objectContaining({ volume: 30, unit: "m3" }));
  });

  test("keeps the governed Waterproofing route unchanged", () => {
    const testCase = BUILT_IN_AI_1000_CONSTRUCTION_CASES.find((item) => item.id === "0044");
    if (!testCase) throw new Error("MISSING_BUILT_IN_AI_1000_CASE:0044");
    const answer = answerBuiltInAi({
      text: testCase.promptRu,
      screenContext: "chat",
      route: "/chat",
      role: "unknown",
      userId: "batch005-r3-non-electrical-regression",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    expect(answer.route).toEqual(expect.objectContaining({ intent: "estimate", workKey: testCase.workKey }));
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe(testCase.workKey);
    expect(answer.toolResult.estimate?.outputContract.format).toBe("professional_boq");
  });
});
