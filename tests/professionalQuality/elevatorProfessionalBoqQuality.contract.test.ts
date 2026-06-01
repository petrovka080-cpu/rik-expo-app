import { compileDynamicProfessionalBoq, validateDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq";
import { requireEstimatorPlan, UNIVERSAL_KNOWN_WORK_CASES } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

const elevatorCase = UNIVERSAL_KNOWN_WORK_CASES.find((testCase) => testCase.id === "passenger_elevator");

describe("elevator professional BOQ quality", () => {
  it("keeps regulated elevator rows specific and deep", () => {
    expect(elevatorCase).toBeDefined();
    if (!elevatorCase) throw new Error("elevator_case_missing");
    const outcome = requireEstimatorPlan(elevatorCase);
    if (!outcome.plan) throw new Error("elevator_plan_missing");
    const boq = compileDynamicProfessionalBoq(outcome.plan);
    const validation = validateDynamicProfessionalBoq(boq);
    const rowNames = boq.rows.map((row) => row.name.toLocaleLowerCase("ru-RU")).join("\n");
    expect(validation.failures).toEqual([]);
    expect(boq.rows.length).toBeGreaterThanOrEqual(30);
    expect(rowNames).toMatch(/кабин|cabin/);
    expect(rowNames).toMatch(/направля|guide/);
    expect(rowNames).toMatch(/инспекц|inspection|сдач/);
  });
});
