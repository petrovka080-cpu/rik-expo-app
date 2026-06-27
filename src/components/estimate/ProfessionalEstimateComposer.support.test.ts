import { formatEstimateSection, formatEstimateUnit } from "./ProfessionalEstimateComposer.support";

describe("ProfessionalEstimateComposer display formatters", () => {
  it("renders backend unit and section codes as Russian UI labels", () => {
    expect(formatEstimateUnit("sq_m")).toBe("м²");
    expect(formatEstimateUnit("pcs")).toBe("шт");
    expect(formatEstimateSection("materials")).toBe("Материалы");
    expect(formatEstimateSection("work")).toBe("Работы");
  });
});
