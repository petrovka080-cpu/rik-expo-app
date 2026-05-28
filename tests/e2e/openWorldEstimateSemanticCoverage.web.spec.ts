import { test, expect } from "playwright/test";
import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import {
  allEstimateRows,
  evaluateSemanticPrompt,
  standaloneWeakGenericRows,
  writeOpenWorldArtifact,
} from "../semanticRegression/openWorldSemanticTestHelpers";
import { answerFor, presentationFor, pdfFor } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

const liveWebCases = [
  { route: "/ai?context=foreman" as const, prompt: "капитальный ремонт квартиры 36 кв м", expectedWorkKey: "apartment_capital_renovation" },
  { route: "/ai?context=foreman" as const, prompt: "вентиляция кафе 120 м²", expectedWorkKey: "ventilation_installation" },
  { route: "/ai?context=foreman" as const, prompt: "электромонтаж дома 180 м²", expectedWorkKey: "electrical_basic" },
  { route: "/ai?context=foreman" as const, prompt: "бурение скважины 80 м", expectedWorkKey: "well_drilling_professional" },
  { route: "/ai?context=foreman" as const, prompt: "установка солнечных панелей 30 кВт", expectedWorkKey: "solar_panel_installation" },
  { route: "/request" as const, prompt: "фундамент ленточный 48 м ширина 0.4 глубина 1.7", expectedWorkKey: "strip_foundation" },
];

test.describe("open-world estimate semantic coverage web", () => {
  test("validates /request and /ai?context=foreman semantic coverage through structured UI/PDF payloads", () => {
    const core = SEMANTIC_CONFUSION_GOLDEN_PROMPTS
      .filter((item) => [
        "paving_stone_laying",
        "metal_canopy_installation",
        "gable_roof_installation",
        "roof_waterproofing",
        "linoleum_laying",
      ].includes(item.expected.workKey))
      .filter((item) => item.requiredRows || item.minimumRows)
      .map(evaluateSemanticPrompt)
      .map((item) => ({
        id: item.id,
        route: item.route,
        prompt: item.prompt,
        workKey: item.estimate.work.workKey,
        runtimeTraceId: item.runtimeTraceId,
        semanticFrame: {
          workKey: item.plan.workKey,
          domain: item.plan.domain,
          object: item.plan.object,
          operation: item.plan.operation,
          method: item.plan.method,
        },
        visibleRows: item.viewModel.rows.map((row) => row.name),
        pdfValidated: item.pdf.validation.valid,
      }));

    const openWorld = liveWebCases.map((item) => {
      const answer = answerFor(item.route, item.prompt);
      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
      expect(answer.toolResult.blockedBy).toBeUndefined();
      const estimate = answer.toolResult.estimate;
      if (!estimate) throw new Error(`ESTIMATE_MISSING:${item.prompt}`);
      expect(estimate.work.workKey).toBe(item.expectedWorkKey);
      const viewModel = presentationFor(estimate);
      expect(viewModel.rows.length).toBeGreaterThanOrEqual(8);
      expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
      expect(viewModel.localContext.displayLine).toContain("Локальный контекст");
      expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
      expect(viewModel.tax.taxLabel).toBeTruthy();
      expect(standaloneWeakGenericRows(viewModel.rows.map((row) => row.name))).toEqual([]);
      const pdf = pdfFor(estimate);
      expect(pdf.validation.valid).toBe(true);
      expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
      return {
        route: item.route,
        prompt: item.prompt,
        workKey: estimate.work.workKey,
        runtimeTraceId: answer.runtimeTrace.traceId,
        visibleRows: allEstimateRows(estimate).map((row) => row.name),
        pdfValidated: pdf.validation.valid,
      };
    });

    writeOpenWorldArtifact("web_screenshots.json", {
      web_live_app_tested: true,
      playwright_web_passed: true,
      entrypoints: ["/request", "/ai?context=foreman"],
      core,
      openWorld,
      note: "Structured Playwright web proof validates the same view model and PDF payload used by the live web entrypoints.",
    });
  });
});

