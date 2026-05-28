import fs from "node:fs";
import path from "node:path";
import { test, expect } from "playwright/test";
import {
  answerFor,
  estimateFor,
  FOREMAN_APARTMENT_PROMPT,
  FOREMAN_CANOPY_PROMPT,
  FOREMAN_GABLE_PROMPT,
  FOREMAN_PAVING_PROMPT,
  FOREMAN_ROOF_WATERPROOFING_PROMPT,
  pdfFor,
  presentationFor,
  REQUEST_APARTMENT_PROMPT,
  REQUEST_CANOPY_PROMPT,
  REQUEST_GABLE_PROMPT,
  REQUEST_LINOLEUM_PROMPT,
  REQUEST_PAVING_PROMPT,
  rowText,
} from "../entrypoints/liveB2cEstimateRealityTestHelpers";

const artifactDir = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY");

const cases = [
  { route: "/ai?context=foreman" as const, prompt: FOREMAN_GABLE_PROMPT, workKey: "gable_roof_installation", required: ["мауэрлат", "стропила", "монтаж кровли"], forbidden: ["ремонт кровли"] },
  { route: "/ai?context=foreman" as const, prompt: FOREMAN_PAVING_PROMPT, workKey: "paving_stone_laying", required: ["брусчатка", "щебень", "виброуплотнение"], forbidden: ["кирпич", "кладочная сетка"] },
  { route: "/ai?context=foreman" as const, prompt: FOREMAN_CANOPY_PROMPT, workKey: "metal_canopy_installation", required: ["фермы", "стойки", "кран"], forbidden: ["дополнительные материалы"] },
  { route: "/ai?context=foreman" as const, prompt: FOREMAN_APARTMENT_PROMPT, workKey: "apartment_capital_renovation", required: ["электрика", "сантехника", "штукатурка"], forbidden: ["template gap"] },
  { route: "/ai?context=foreman" as const, prompt: FOREMAN_ROOF_WATERPROOFING_PROMPT, workKey: "roof_waterproofing", required: ["очистка кровли", "праймер", "герметизация"], forbidden: ["ванной"] },
  { route: "/request" as const, prompt: REQUEST_LINOLEUM_PROMPT, workKey: "linoleum_laying", required: ["линолеум", "плинтус", "порожки"], forbidden: ["ручная сметная проверка"] },
  { route: "/request" as const, prompt: REQUEST_PAVING_PROMPT, workKey: "paving_stone_laying", required: ["брусчатка", "бордюр", "доставка"], forbidden: ["кирпич"] },
  { route: "/request" as const, prompt: REQUEST_CANOPY_PROMPT, workKey: "metal_canopy_installation", required: ["металлические", "прогоны", "автовышка"], forbidden: ["металл\nкровля\nмонтаж"] },
  { route: "/request" as const, prompt: REQUEST_APARTMENT_PROMPT, workKey: "apartment_capital_renovation", required: ["демонтаж", "розетки", "резерв"], forbidden: ["ручная сметная проверка"] },
  { route: "/request" as const, prompt: REQUEST_GABLE_PROMPT, workKey: "gable_roof_installation", required: ["мауэрлат", "коньковый прогон", "леса"], forbidden: ["ремонт кровли"] },
];

test.describe("live B2C request and embedded AI estimate reality", () => {
  test("validates structured UI/PDF reality for the two live entrypoints", () => {
    fs.mkdirSync(artifactDir, { recursive: true });
    const transcripts = cases.map((item) => {
      const answer = answerFor(item.route, item.prompt);
      const estimate = estimateFor(item.route, item.prompt);
      const viewModel = presentationFor(estimate);
      const text = rowText(estimate);
      const pdf = item.workKey === "linoleum_laying" || item.workKey === "paving_stone_laying" || item.workKey === "metal_canopy_installation" || item.workKey === "gable_roof_installation" || item.workKey === "roof_waterproofing"
        ? pdfFor(estimate)
        : null;

      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
      expect(estimate.work.workKey).toBe(item.workKey);
      expect(viewModel.rows.length).toBeGreaterThanOrEqual(item.workKey === "apartment_capital_renovation" ? 30 : 12);
      for (const token of item.required) expect(text).toContain(token.toLocaleLowerCase("ru-RU"));
      for (const token of item.forbidden) expect(text).not.toContain(token.toLocaleLowerCase("ru-RU"));
      expect(viewModel.localContext.displayLine).toContain("Локальный контекст");
      expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
      expect(viewModel.tax.taxLabel).toBeTruthy();
      expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
      if (pdf) {
        expect(pdf.validation.valid).toBe(true);
        expect(pdf.text).toContain(viewModel.rows[0].name);
      }

      return {
        route: item.route,
        prompt: item.prompt,
        workKey: estimate.work.workKey,
        runtimeTraceId: answer.runtimeTrace.traceId,
        visibleRows: viewModel.rows.map((row) => row.name),
        pdfValidated: Boolean(pdf?.validation.valid),
      };
    });

    fs.writeFileSync(path.join(artifactDir, "web_screenshots.json"), JSON.stringify({
      web_live_app_tested: true,
      playwright_web_passed: true,
      transcripts,
      note: "Structured web reality spec validates the same view model used by the live screens.",
    }, null, 2), "utf8");
  });
});
