import { getGlobalEstimateTemplate, verifyGlobalEstimateTemplateCoverage } from "../../src/lib/ai/globalEstimate";

describe("global estimate template service", () => {
  it("loads templates for all work types", () => {
    expect(verifyGlobalEstimateTemplateCoverage()).toMatchObject({ passed: true });
    const template = getGlobalEstimateTemplate("laminate_laying");
    expect(template.sections.map((section) => section.type)).toEqual(["materials", "labor"]);
    expect(template.sections[0].rows.length).toBeGreaterThanOrEqual(5);
  });
});
