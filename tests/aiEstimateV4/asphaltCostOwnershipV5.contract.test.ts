import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { buildProfessionalBoqRowsFromConsumerDraft } from "../../src/lib/estimate/createEstimateDraftRevision";
import { calculateProfessionalCostForDraftRows } from "../../src/lib/estimate/professionalCostCalculator";
import { ASPHALT_WORK_ID_V4 } from "../../src/lib/estimate/v4/asphalt/asphaltV4Constants";

function build(mode: "RESOURCE_MODE" | "UNIT_RATE_MODE") {
  const result = buildEstimateFromInlineWorkPrompt({
    rawInput: "Парковка 73 × 9 м, площадь 657 м²",
    selectedWorkKey: ASPHALT_WORK_ID_V4,
    currency: "KGS",
    paramOverrides: {
      selectedRoadScope: { value: "NEW_PARKING_FULL_CONSTRUCTION", source: "user_input" },
      scope_profile: { value: "parking_full_construction", source: "user_input" },
      costing_mode: { value: mode, source: "user_input" },
      geometry_method: { value: "length_width", source: "user_input" },
      length_m: { value: 73, source: "user_input" },
      width_m: { value: 9, source: "user_input" },
      exclusions_m2: { value: 0, source: "user_input" },
      geotextile_required: { value: false, source: "user_input" },
    },
  });
  expect(result.roadScopeResolution?.selectedScopeId).toBe("NEW_PARKING_FULL_CONSTRUCTION");
  expect(result.draft).not.toBeNull();
  const rows = buildProfessionalBoqRowsFromConsumerDraft(result.draft);
  return {
    rows,
    cost: calculateProfessionalCostForDraftRows({
      templateId: ASPHALT_WORK_ID_V4,
      family: "asphalt_pavement",
      rows,
    }),
  };
}

describe("FINAL R5 exclusive Asphalt costing modes", () => {
  it("RESOURCE_MODE prices resource owners and keeps operation rows analytical", () => {
    const { rows, cost } = build("RESOURCE_MODE");
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.every((row) => row.costingMode === "RESOURCE_MODE")).toBe(true);
    expect(rows.filter((row) => row.rowType === "work").every((row) => row.costTreatment === "ANALYTICAL_ONLY")).toBe(true);
    expect(cost.lines.some((line) => line.rowType === "work")).toBe(false);
    expect(cost.summary).toMatchObject({
      costingMode: "RESOURCE_MODE",
      doubleCountingCount: 0,
      unknownCostTreatmentCount: 0,
    });
  });

  it("UNIT_RATE_MODE prices work rates and keeps included resources analytical", () => {
    const { rows, cost } = build("UNIT_RATE_MODE");
    expect(rows.every((row) => row.costingMode === "UNIT_RATE_MODE")).toBe(true);
    expect(rows.filter((row) => row.rowType !== "work").every((row) => row.costTreatment === "ANALYTICAL_ONLY")).toBe(true);
    expect(cost.lines.length).toBeGreaterThan(0);
    expect(cost.lines.every((line) => line.rowType === "work")).toBe(true);
    expect(cost.summary).toMatchObject({
      costingMode: "UNIT_RATE_MODE",
      doubleCountingCount: 0,
      unknownCostTreatmentCount: 0,
    });
  });

  it("fails cost coverage closed when a governed row loses its treatment", () => {
    const { rows } = build("RESOURCE_MODE");
    const corrupted = rows.map((row, index) => index === 0 ? { ...row, costTreatment: null } : row);
    const cost = calculateProfessionalCostForDraftRows({
      templateId: ASPHALT_WORK_ID_V4,
      family: "asphalt_pavement",
      rows: corrupted,
    });
    expect(cost.summary.unknownCostTreatmentCount).toBe(1);
  });
});
