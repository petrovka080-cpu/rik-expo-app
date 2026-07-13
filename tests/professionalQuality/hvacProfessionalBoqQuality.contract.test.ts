import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";

describe("HVAC professional BOQ quality", () => {
  it("contains HVAC-specific materials, labor, equipment, delivery, and formula-backed depth", () => {
    const outcome = resolveEstimatorOutcome({ text: "смета на установку системы кондиционирования на 258 кв метров" });
    if (!outcome.plan) throw new Error("HVAC_PLAN_MISSING");
    const boq = compileDynamicProfessionalBoq(outcome.plan);
    const sectionTypes = new Set(boq.rows.map((row) => row.sectionType));
    const rowNames = boq.rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU");

    expect(boq.rows.length).toBeGreaterThanOrEqual(30);
    expect(sectionTypes.has("materials")).toBe(true);
    expect(sectionTypes.has("labor")).toBe(true);
    expect(sectionTypes.has("equipment")).toBe(true);
    expect(sectionTypes.has("delivery")).toBe(true);
    expect(rowNames).toContain("холодопроизводительности 30.96 квт");
    expect(rowNames).toContain("наружные блоки кондиционирования");
    expect(rowNames).toContain("дренаж конденсата");
    expect(rowNames).toContain("пусконаладка системы кондиционирования");
  });
});
