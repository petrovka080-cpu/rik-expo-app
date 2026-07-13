import { resolveRequestCategoryOverridePolicy } from "../../src/lib/ai/estimatorKernel";

describe("request category chip priority", () => {
  it("keeps typed HVAC work ahead of a stale floor category chip", () => {
    const decision = resolveRequestCategoryOverridePolicy({
      text: "смета на установку системы кондиционирования на 258 кв метров",
      selectedCategory: "Пол",
    });

    expect(decision.typedKnownWorkDetected).toBe(true);
    expect(decision.typedWorkWins).toBe(true);
    expect(decision.categoryOverrideAllowed).toBe(false);
    expect(decision.selectedCategory).toBe("flooring");
    expect(decision.selectedCategoryIgnored).toBe(true);
    expect(decision.resolvedWorkKey).toBe("air_conditioning_system_installation");
    expect(decision.resolvedCategory).toBe("heating_hvac");
  });

  it("keeps typed metal canopy work ahead of a stale plumbing category chip", () => {
    const decision = resolveRequestCategoryOverridePolicy({
      text: "смета на металлический навес 647 кв м",
      selectedCategory: "Сантехника",
    });

    expect(decision.typedKnownWorkDetected).toBe(true);
    expect(decision.typedWorkWins).toBe(true);
    expect(decision.categoryOverrideAllowed).toBe(false);
    expect(decision.selectedCategory).toBe("plumbing");
    expect(decision.selectedCategoryIgnored).toBe(true);
    expect(decision.resolvedWorkKey).toBe("metal_canopy_installation");
    expect(decision.resolvedCategory).toBe("metalworks");
  });

  it("keeps typed passenger elevator work ahead of a stale finishing category chip", () => {
    const decision = resolveRequestCategoryOverridePolicy({
      text: "смета на пассажирский лифт 1 комплект",
      selectedCategory: "Отделка",
    });

    expect(decision.typedKnownWorkDetected).toBe(true);
    expect(decision.typedWorkWins).toBe(true);
    expect(decision.categoryOverrideAllowed).toBe(false);
    expect(decision.selectedCategory).toBe("wall_finishing");
    expect(decision.selectedCategoryIgnored).toBe(true);
    expect(decision.resolvedWorkKey).toBe("passenger_elevator_installation");
    expect(decision.resolvedCategory).toBe("delivery_equipment");
  });
});
