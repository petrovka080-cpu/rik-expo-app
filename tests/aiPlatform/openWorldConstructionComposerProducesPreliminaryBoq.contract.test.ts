import { composeOpenWorldConstructionPreliminaryBoq } from "../../src/lib/ai/estimatorKernel";

describe("open-world construction composer", () => {
  it("uses the estimator kernel to produce a preliminary HVAC BOQ", () => {
    const result = composeOpenWorldConstructionPreliminaryBoq("установка кондиционирования в офисе 258 кв м");
    const rowNames = result.boq?.rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU") ?? "";

    expect(result.classification).toBe("preliminary_boq");
    expect(result.plan?.workKey).toBe("air_conditioning_system_installation");
    expect(result.rowCount).toBeGreaterThanOrEqual(30);
    expect(rowNames).toContain("внутренние блоки");
    expect(rowNames).toContain("медная фреоновая трасса");
    expect(rowNames).toContain("вакуумирование");
  });
});
