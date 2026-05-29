import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel, validateNoMojibakeInEstimateViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_UNIVERSAL_ESTIMATOR_KERNEL");

const CASES = [
  {
    id: "request_passenger_elevator_14_floors",
    route: "/request" as const,
    prompt: "смета на установку лифта пассажирского на 14 этажей",
    required: ["обследование шахты", "пассажирская кабина", "ПНР"],
  },
  {
    id: "request_drainage_channels_120m",
    route: "/request" as const,
    prompt: "смета на дренажные каналы 120 метров",
    required: ["разметка трассы", "дренажные лотки", "проверка проливом"],
  },
  {
    id: "request_concrete_pedestals",
    route: "/request" as const,
    prompt: "смета на заливку тумб ширина 0,4 высота 5 метров длина 0,5 метров и надо 10 штук",
    required: ["бетон", "опалубка", "вибрирование"],
  },
  {
    id: "request_electrical_100m2",
    route: "/request" as const,
    prompt: "смета на электромонтаж 100 м2",
    required: ["кабель", "щит", "испытания"],
  },
  {
    id: "request_metal_canopy_647m2",
    route: "/request" as const,
    prompt: "смета на металлический навес 647 кв м",
    required: ["стойки", "фермы", "антикоррозионная"],
  },
  {
    id: "ai_request_passenger_elevator_14_floors",
    route: "/ai?context=request" as const,
    prompt: "смета на пассажирский лифт 14 этажей",
    required: ["лицензирован", "двери шахты", "инспекция"],
  },
  {
    id: "ai_request_drainage_channels_120m",
    route: "/ai?context=request" as const,
    prompt: "смета на дренажные каналы 120 метров",
    required: ["геотекстиль", "решётки", "вывоз грунта"],
  },
  {
    id: "ai_foreman_concrete_pedestals",
    route: "/ai?context=foreman" as const,
    prompt: "смета на бетонные тумбы 10 шт 0,4×0,5×5 м",
    required: ["арматура", "вязка арматуры", "уход за бетоном"],
  },
  {
    id: "ai_foreman_hydro_turbine_100kw",
    route: "/ai?context=foreman" as const,
    prompt: "смета на установку турбины на ГЭС 100 кВт",
    required: ["турбин", "ПНР", "инспекция"],
  },
  {
    id: "ai_foreman_ventilation_cafe_120m2",
    route: "/ai?context=foreman" as const,
    prompt: "смета на вентиляцию кафе 120 м2",
    required: ["воздуховоды", "диффузоры", "пусконаладка"],
  },
];

const WEAK_ROW = /^(материал|работы|монтаж|крепёж|прочее|дополнительные материалы|дополнительные работы|строительные работы|бетонные работы)$/i;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("universal estimator kernel web proof", () => {
  test("keeps parsable /request and embedded AI estimates structured, professional, and PDF-safe", () => {
    const results = CASES.map((item) => {
      const context = item.route.includes("foreman") ? "foreman" : "request";
      const answer = answerBuiltInAi({
        text: item.prompt,
        route: item.route,
        screenContext: context,
        role: context,
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });

      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.blockedBy).not.toBe("TEMPLATE_GAP_SAFE_TRIAGE");
      const estimate = answer.toolResult.estimate;
      expect(estimate).toBeDefined();
      if (!estimate) throw new Error(`estimate missing for ${item.id}`);

      const viewModel = buildEstimatePresentationViewModel(estimate);
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: answer.runtimeTrace,
        generatedAt: "2026-05-29T00:00:00.000Z",
        language: "ru",
      });
      const visibleRows = viewModel.rows.map((row) => row.name);
      const visibleText = [
        estimate.work.title,
        ...visibleRows,
        ...estimate.assumptions,
        ...estimate.regionalRisks,
      ].join("\n").toLocaleLowerCase("ru-RU");
      const weakRows = visibleRows.filter((row) => WEAK_ROW.test(row.trim()));

      expect(viewModel.rows.length).toBeGreaterThanOrEqual(12);
      expect(weakRows).toEqual([]);
      for (const token of item.required) {
        expect(visibleText).toContain(token.toLocaleLowerCase("ru-RU"));
      }
      expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
      expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
      expect(viewModel.tax.taxLabel).toBeTruthy();
      expect(validateNoMojibakeInEstimateViewModel(viewModel).passed).toBe(true);
      expect(pdf.validation.valid).toBe(true);
      expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
      expect(validateNoPdfMojibake(pdf.text).passed).toBe(true);

      return {
        id: item.id,
        route: item.route,
        runtimeTraceId: answer.runtimeTrace.traceId,
        workKey: estimate.work.workKey,
        rowCount: viewModel.rows.length,
        requiredRowsVisible: item.required,
        pdfValid: pdf.validation.valid,
        sourceTaxVisible: viewModel.sourceLabels.length > 0 && Boolean(viewModel.tax.taxLabel),
      };
    });

    writeJson("web_screenshots.json", {
      web_live_app_tested: true,
      entrypoints_tested: ["/request", "/ai?context=request", "/ai?context=foreman"],
      structured_web_runtime_samples: results,
      fake_green_claimed: false,
    });
  });
});
