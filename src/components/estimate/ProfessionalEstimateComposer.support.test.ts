import { formatEstimateSection, formatEstimateUnit, TEXT } from "./ProfessionalEstimateComposer.support";

describe("ProfessionalEstimateComposer display formatters", () => {
  it("renders stored unit and section codes as plain Russian UI labels", () => {
    expect(formatEstimateUnit("sq_m")).toBe("м²");
    expect(formatEstimateUnit("pcs")).toBe("шт.");
    expect(formatEstimateSection("materials")).toBe("Материалы");
    expect(formatEstimateSection("work")).toBe("Работы");
    expect(formatEstimateSection("equipment")).toBe("Машины и оборудование");
    expect(formatEstimateSection("delivery")).toBe("Доставка и вывоз");
  });

  it("keeps primary interface copy free from internal platform terms", () => {
    const visibleCopy = Object.values(TEXT).join(" ");
    expect(visibleCopy).not.toMatch(/backend|canonical|revision|release|anti-desync|server-side/iu);
    expect(TEXT.title).toBe("Предварительная смета");
    expect(TEXT.parametersTitle).toBe("Что нужно уточнить");
  });
});
