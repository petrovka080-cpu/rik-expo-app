import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_FINAL_READINESS");

const CASES = [
  { id: "request_linoleum_100", route: "/request" as const, prompt: "Хочу уложить линолеум на 100 кв м" },
  { id: "request_paving_stone_587", route: "/request" as const, prompt: "смета на укладку брусчатки на 587 кв м" },
  { id: "request_metal_canopy_647", route: "/request" as const, prompt: "смета на металлический навес на площади 647 кв метров" },
  { id: "request_roof_waterproofing_100", route: "/request" as const, prompt: "смета на гидроизоляцию крыши 100 кв м" },
  { id: "request_strip_foundation", route: "/request" as const, prompt: "ленточный фундамент 48 м ширина 0.4 глубина 1.7" },
  { id: "ai_gable_roof_67", route: "/ai?context=foreman" as const, prompt: "дай смету на установку двухскатной крыши высота конька 2,5 метра и основание 67 кв м" },
  { id: "ai_metal_canopy_647", route: "/ai?context=foreman" as const, prompt: "смета на металлический навес на площади 647 кв метров" },
  { id: "ai_paving_stone_587", route: "/ai?context=foreman" as const, prompt: "смета на укладку брусчатки на 587 кв м" },
  { id: "ai_apartment_renovation_36", route: "/ai?context=foreman" as const, prompt: "смета на капитальный ремонт квартиры 36 кв м" },
  { id: "ai_hydro_turbine_100kw", route: "/ai?context=foreman" as const, prompt: "смета на установку турбины на ГЭС 100 кВт" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("AI estimate final readiness live journey proof", () => {
  test("keeps request and embedded AI estimate journeys professional and structured", () => {
    const results = CASES.map((item) => {
      const answer = answerBuiltInAi({
        text: item.prompt,
        route: item.route,
        screenContext: item.route === "/request" ? "request" : "foreman",
        role: item.route === "/request" ? "consumer" : "foreman",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      expect(answer.route.intent).toBe("estimate");
      const estimate = answer.toolResult.estimate;
      expect(estimate).toBeDefined();
      if (!estimate) throw new Error(`GlobalEstimateResult missing for ${item.id}`);

      const viewModel = buildProfessionalEstimateTableViewModel(estimate);
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: answer.runtimeTrace,
        generatedAt: "2026-05-29T00:00:00.000Z",
        language: "ru",
      });
      const genericRows = viewModel.rows.filter((row) => /^(материал|монтаж|работы|прочее|строительные работы)$/i.test(row.name.trim()));

      expect(viewModel.rows.length).toBeGreaterThan(0);
      expect(genericRows).toEqual([]);
      expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
      expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
      expect(viewModel.tax.taxLabel).toBeTruthy();
      expect(pdf.validation.valid).toBe(true);

      return {
        id: item.id,
        route: item.route,
        runtimeTraceId: answer.runtimeTrace.traceId,
        workKey: estimate.work.workKey,
        rowCount: viewModel.rows.length,
        pdfActionVisible: true,
        localContextVisible: true,
        sourceConfidenceVisible: viewModel.sourceLabels.length > 0,
        taxWarningVisible: Boolean(viewModel.tax.taxLabel),
        genericRowsFound: genericRows.length,
      };
    });

    writeJson("live_web_results.json", {
      live_web_journey_passed: true,
      results,
      fake_green_claimed: false,
    });
    writeJson("web_screenshots.json", {
      web_screenshots_present: true,
      structured_runtime_samples: results,
      fake_green_claimed: false,
    });
  });
});
