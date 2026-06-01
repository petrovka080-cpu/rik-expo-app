import { requireEstimatorPlan, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

describe("known work object confusion guard", () => {
  it("does not confuse visually similar construction objects", () => {
    const outcomes = UNIVERSAL_KNOWN_WORK_CASES.map((testCase) => ({
      id: testCase.id,
      outcome: requireEstimatorPlan(testCase),
    }));
    const byId = new Map(outcomes.map((item) => [item.id, item.outcome.plan?.semanticFrame.object]));
    expect(byId.get("acoustic_panels")).toBe("acoustic_panel_system");
    expect(byId.get("acoustic_panels")).not.toBe("solar_power_system");
    expect(byId.get("cold_room")).toBe("cold_room_system");
    expect(byId.get("cold_room")).not.toBe("security_system");
    expect(byId.get("smoke_extraction")).toBe("smoke_extraction_system");
    expect(byId.get("bms_automation")).toBe("bms_automation_system");
  });
});
