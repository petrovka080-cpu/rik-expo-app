import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { allEstimateRows, evaluateSemanticPrompt, lowerText, writeOpenWorldArtifact } from "./openWorldSemanticTestHelpers";

describe("open-world unit semantics golden lock", () => {
  it("keeps construction-specific row units instead of inheriting user area everywhere", () => {
    const cases = SEMANTIC_CONFUSION_GOLDEN_PROMPTS
      .filter((item) => [
        "paving_stone_laying",
        "metal_canopy_installation",
        "gable_roof_installation",
        "roof_waterproofing",
        "linoleum_laying",
      ].includes(item.expected.workKey))
      .filter((item) => item.requiredRows || item.minimumRows)
      .map(evaluateSemanticPrompt);

    const results = cases.map((item) => {
      const validation = validateConstructionUnitSemantics(item.estimate);
      expect(validation.passed).toBe(true);
      const rows = allEstimateRows(item.estimate);
      const unitSet = new Set(rows.map((row) => row.unit));
      expect(unitSet.size).toBeGreaterThanOrEqual(item.estimate.work.workKey === "metal_canopy_installation" ? 5 : 3);
      for (const row of rows) {
        const name = lowerText(row.name);
        if (/стойк|анкер|закладн/.test(name) && !/фундамент|бетон/.test(name)) expect(row.unit).toBe("pcs");
        if (/ферм|балк|связ|раскос/.test(name)) expect(["kg", "ton", "linear_m"]).toContain(row.unit);
        if (/бетон|фундамент/.test(name) && !/монтаж|установ|устройств/.test(name)) expect(row.unit).toBe("m3");
        if (/бордюр|водосток|прогон|плинтус/.test(name) && !/бетон|стойк/.test(name)) expect(row.unit).toBe("linear_m");
        if (/кран|автовыш|виброплит/.test(name)) expect(row.unit).toBe("shift");
        if (/доставка/.test(name)) expect(["trip", "set"]).toContain(row.unit);
      }
      return {
        id: item.id,
        workKey: item.estimate.work.workKey,
        units: [...unitSet],
        failures: validation.failures,
      };
    });

    writeOpenWorldArtifact("unit_semantics.json", {
      passed: true,
      unit_semantics_failed: false,
      results,
    });
  });

  it("keeps formwork demolition material rows area-based even when their contextual title mentions concrete", () => {
    const answer = answerBuiltInAi({
      text: "смета на демонтаж опалубки 100 м²",
      screenContext: "chat",
      route: "/chat",
      role: "unknown",
      userId: "unit-semantics-formwork-demolition",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;

    expect(estimate).toBeDefined();
    const formworkMaterialRows = estimate!.sections
      .filter((section) => section.type === "materials")
      .flatMap((section) => section.rows)
      .filter((row) => /^formwork_demolition_material_\d+$/.test(row.code));
    expect(formworkMaterialRows.length).toBeGreaterThan(0);
    expect(formworkMaterialRows.every((row) => row.unit === "sq_m")).toBe(true);
    expect(validateConstructionUnitSemantics(estimate!).failures).toEqual([]);
  });

  it("does not treat every professional WBS phase in a concrete-delivery scope as a logistics trip", () => {
    const answer = answerBuiltInAi({
      text: "смета на доставка бетона 30 м³",
      screenContext: "chat",
      route: "/chat",
      role: "unknown",
      userId: "unit-semantics-concrete-delivery",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;

    expect(estimate).toBeDefined();
    const professionalRows = allEstimateRows(estimate!).filter((row) =>
      row.code.startsWith("professional_wbs_concrete_delivery_"),
    );
    expect(professionalRows.length).toBeGreaterThan(0);
    expect(professionalRows.some((row) => row.unit === "m3")).toBe(true);
    expect(validateConstructionUnitSemantics(estimate!).failures).toEqual([]);
  });

  it("keeps generic sheet, cladding, grating, and partition materials area-based", () => {
    for (const text of [
      "смета на оцинкованный лист 100 м²",
      "смета на металлическая облицовка 100 м²",
      "смета на металлические решётки 50 м²",
      "смета на металлическая перегородка 50 м²",
    ]) {
      const answer = answerBuiltInAi({
        text,
        screenContext: "chat",
        route: "/chat",
        role: "unknown",
        userId: "unit-semantics-metal-covering",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      const estimate = answer.toolResult.estimate;

      expect(estimate).toBeDefined();
      const coveringRows = estimate!.sections
        .filter((section) => section.type === "materials")
        .flatMap((section) => section.rows)
        .filter((row) =>
          /^(?:galvanized_sheet_install|metal_cladding|metal_grating_install|metal_partition)_material_\d+$/.test(row.code),
        );
      expect(coveringRows.length).toBeGreaterThan(0);
      expect(coveringRows.every((row) => row.unit === "sq_m")).toBe(true);
      expect(validateConstructionUnitSemantics(estimate!).failures).toEqual([]);
    }
  });
});
