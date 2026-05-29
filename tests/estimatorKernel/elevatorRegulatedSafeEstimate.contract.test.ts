import { requestEstimate, rowText, UNIVERSAL_PROMPTS } from "./universalEstimatorTestHelpers";

describe("passenger elevator regulated safe estimate", () => {
  it("returns regulated safe professional BOQ instead of template gap", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.elevator);
    expect(estimate.work.workKey).toBe("passenger_elevator_installation");
    expect(estimate.requiresReview).toBe(true);
    expect(rowText(estimate)).toEqual(expect.stringContaining("обследование шахты"));
    expect(rowText(estimate)).toEqual(expect.stringContaining("пассажирская кабина"));
    expect(rowText(estimate)).toEqual(expect.stringContaining("пнр"));
    expect(rowText(estimate)).toEqual(expect.stringContaining("инспекция"));
    expect([...estimate.regionalRisks.map((risk) => risk.text), ...estimate.clarifyingQuestions].join("\n").toLocaleLowerCase("ru-RU")).toMatch(/лиценз|инспек|грузоподъем|останов/);
  });
});
