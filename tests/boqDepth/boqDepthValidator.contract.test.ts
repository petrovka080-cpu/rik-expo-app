import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
} from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("global estimate BOQ depth validator", () => {
  it("requires rows, materials, labor, equipment or delivery, assumptions, factors, questions, sources and tax", () => {
    const estimate = stripFoundationEstimate();
    const depth = validateEstimateBoqDepth(estimate);

    expect(depth).toMatchObject({
      passed: true,
      minimumRows: 0,
      hasMaterials: true,
      hasLabor: true,
      hasEquipmentOrDeliveryOrWarning: true,
      hasAssumptions: true,
      hasCostFactors: true,
      hasClarifyingQuestions: true,
      hasSourceEvidence: true,
      hasTaxStatusOrWarning: true,
      blockers: [],
    });
  });

  it("blocks a truncated complex work by missing technological groups, not by a numeric quota", () => {
    const estimate = stripFoundationEstimate();
    const invalid = {
      ...estimate,
      regionalRisks: [],
      clarifyingQuestions: [],
      sections: estimate.sections.map((section) => ({
        ...section,
        rows: section.rows.slice(0, section.type === "materials" ? 4 : 0),
      })),
    };

    const depth = validateEstimateBoqDepth(invalid);

    expect(depth.passed).toBe(false);
    expect(depth.actualRows).toBe(4);
    expect(depth.blockers.some((blocker) => blocker.includes("DEPTH_TOO_SHORT"))).toBe(false);
    expect(depth.blockers).toContain("BOQ_LABOR_GROUP_MISSING");
    expect(depth.blockers).toContain("BOQ_EQUIPMENT_DELIVERY_OR_WARNING_MISSING");
    expect(depth.blockers).toContain("BOQ_CLARIFYING_QUESTIONS_MISSING");
  });

  it("keeps generated complex scopes semantically complete without manufactured padding", () => {
    for (const workKey of ["concrete_slab", "pipe_replacement", "electrical_basic", "mini_chp_preparation"]) {
      const estimate = estimateForWorkKey(workKey, workKey === "pipe_replacement" ? 40 : 100, workKey === "pipe_replacement" ? "linear_m" : "sq_m");
      const depth = validateEstimateBoqDepth(estimate);
      expect({ workKey, depth }).toMatchObject({
        depth: {
          passed: true,
          minimumRows: 0,
          genericRows: [],
          artificialPaddingRows: [],
        },
      });
    }
  });

  it("keeps unknown conditional quantities separate from the priced meaningful composition", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на электромонтаж квартиры 80 м²",
      volume: 80,
      unit: "sq_m",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const rows = estimate.sections.flatMap((section) => section.rows);
    const blockedRows = rows.filter((row) =>
      row.sourceParameters?.conditionalStatus === "blocked_missing_parameters"
    );
    const depth = validateEstimateBoqDepth(estimate);

    expect(blockedRows.length).toBeGreaterThan(0);
    expect(blockedRows.every((row) =>
      Number.isFinite(row.quantity) &&
      row.quantity >= 0 &&
      row.includedInEstimate === false &&
      row.includedInProcurement === false &&
      row.priceStatus === "unavailable" &&
      Array.isArray(row.sourceParameters?.parameterBlockerIds) &&
      (row.sourceParameters?.parameterBlockerIds as unknown[]).length > 0
    )).toBe(true);
    expect(depth.rowsWithoutQuantity).toEqual([]);
    expect(depth.meaningfulRows).toBeLessThan(rows.length);
    expect(depth.passed).toBe(true);

    const malformedEstimate = structuredClone(estimate);
    const malformedRow = malformedEstimate.sections
      .flatMap((section) => section.rows)
      .find((row) => row.sourceParameters?.conditionalStatus === "blocked_missing_parameters");
    expect(malformedRow).toBeDefined();
    if (!malformedRow) throw new Error("blocked conditional row fixture is missing");
    malformedRow.quantity = 0;
    malformedRow.sourceParameters = {
      ...malformedRow.sourceParameters,
      parameterBlockerIds: [],
    };

    const malformedDepth = validateEstimateBoqDepth(malformedEstimate);
    expect(malformedDepth.rowsWithoutQuantity).toContain(malformedRow.code);
    expect(malformedDepth.blockers).toContainEqual(
      expect.stringContaining("BOQ_QUANTITY_MISSING"),
    );
  });
});
