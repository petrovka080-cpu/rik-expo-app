import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/builtInAiIngress";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation/buildEstimatePresentationViewModel";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import {
  evaluateProfessionalEstimatorQuality,
  isWeakGenericEstimateRowName,
  selfCorrectProfessionalEstimate,
} from "../../src/lib/ai/professionalQuality/professionalEstimatorQualityGate";

const WAVE = "S_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_AND_SELF_CORRECTION_POINT_OF_NO_RETURN";
const GREEN = "GREEN_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_READY";
const RED = "RED_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_NOT_READY";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_AND_SELF_CORRECTION");

type BenchmarkCase = {
  id: string;
  prompt: string;
};

type Failure = {
  id: string;
  prompt: string;
  workKey?: string;
  blockers: string[];
  scores?: Record<string, number>;
};

const CASE_TEMPLATES: { id: string; quantities: readonly number[]; prompt: (quantity: number) => string }[] = [
  { id: "metal_canopy", quantities: [24, 80, 160, 320, 647], prompt: (q) => `смета на металлический навес на площади ${q} кв метров` },
  { id: "paving_stone", quantities: [35, 90, 180, 360, 587], prompt: (q) => `смета на укладку брусчатки на ${q} кв м` },
  { id: "roof_waterproofing", quantities: [40, 100, 220, 480, 900], prompt: (q) => `смета на гидроизоляцию крыши ${q} м²` },
  { id: "passenger_elevator", quantities: [1, 2, 3, 4, 5], prompt: (q) => `смета на пассажирский лифт ${q} комплект` },
  { id: "drainage_channels", quantities: [20, 80, 160, 320, 640], prompt: (q) => `смета на дренажные каналы ${q} пог м` },
  { id: "brick_masonry", quantities: [25, 60, 120, 240, 480], prompt: (q) => `смета на кирпичную кладку ${q} м²` },
  { id: "tile_laying", quantities: [20, 50, 100, 180, 320], prompt: (q) => `смета на укладку плитки ${q} м²` },
  { id: "laminate_laying", quantities: [25, 55, 100, 180, 260], prompt: (q) => `смета на укладку ламината ${q} м²` },
  { id: "drywall_partition", quantities: [20, 45, 90, 160, 260], prompt: (q) => `смета на перегородку из ГКЛ ${q} м²` },
  { id: "electrical_area", quantities: [30, 80, 150, 300, 600], prompt: (q) => `смета на электромонтаж ${q} м²` },
  { id: "plumbing_pipes", quantities: [15, 40, 80, 140, 220], prompt: (q) => `смета заменить сантехнические трубы ${q} м` },
  { id: "ventilation", quantities: [30, 90, 180, 360, 720], prompt: (q) => `смета на вентиляцию ${q} м²` },
  { id: "asphalt", quantities: [200, 800, 1500, 3500, 10000], prompt: (q) => `смета на асфальтирование ${q} м²` },
  { id: "foundation", quantities: [10, 25, 50, 90, 140], prompt: (q) => `смета на ленточный фундамент ${q} м3` },
  { id: "gable_roof", quantities: [45, 120, 240, 480, 900], prompt: (q) => `смета на скатную кровлю ${q} м²` },
  { id: "facade_plaster", quantities: [60, 140, 280, 560, 1200], prompt: (q) => `смета на фасадную штукатурку ${q} м²` },
  { id: "wall_painting", quantities: [50, 120, 240, 480, 960], prompt: (q) => `смета на покраску стен ${q} м²` },
  { id: "wall_plastering", quantities: [40, 110, 220, 440, 880], prompt: (q) => `смета на штукатурку стен ${q} м²` },
  { id: "window_installation", quantities: [2, 5, 10, 20, 40], prompt: (q) => `смета на установку окон ${q} шт` },
  { id: "tile_demolition", quantities: [15, 60, 120, 240, 420], prompt: (q) => `смета на демонтаж плитки ${q} м²` },
];

function benchmarkCases(): BenchmarkCase[] {
  return CASE_TEMPLATES.flatMap((template) =>
    template.quantities.map((quantity, index) => ({
      id: `${template.id}_${index + 1}`,
      prompt: template.prompt(quantity),
    })),
  );
}

function estimateFor(prompt: string): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    currency: "KGS",
  });
}

function weakCanopyFixture(): GlobalEstimateResult {
  const result = JSON.parse(JSON.stringify(estimateFor("смета на металлический навес на площади 120 кв метров"))) as GlobalEstimateResult;
  const rows = result.sections.flatMap((section) => section.rows);
  rows[0].name = "материал";
  rows[1].name = "монтаж";
  rows[2].name = "работы";
  rows[3].name = "крепёж";
  return result;
}

function validateEntrypoint(prompt: string, route: "/request" | "/ai?context=foreman"): Failure | null {
  const answer = answerBuiltInAi({
    text: prompt,
    route,
    screenContext: route === "/request" ? "request" : "foreman",
    role: route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;
  if (!estimate) {
    return { id: route, prompt, blockers: [`ESTIMATE_MISSING:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? "none"}`] };
  }
  const report = evaluateProfessionalEstimatorQuality(estimate);
  const presentation = buildEstimatePresentationViewModel(estimate);
  const rowCount = estimate.sections.flatMap((section) => section.rows).length;
  const blockers = [
    ...report.blockers,
    ...(presentation.rows.length === rowCount ? [] : [`UI_ROW_PARITY_FAILED:${presentation.rows.length}:${rowCount}`]),
  ];
  return blockers.length > 0
    ? { id: route, prompt, workKey: estimate.work.workKey, blockers, scores: report.scores }
    : null;
}

function run() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const cases = benchmarkCases();
  const failures: Failure[] = [];
  let weakGenericRowsFound = false;
  let shortComplexEstimatesFound = false;
  let unitSemanticsFailed = false;
  let qualityScoreBelowThresholdFound = false;
  let benchmarkFailures = 0;

  for (const testCase of cases) {
    const estimate = estimateFor(testCase.prompt);
    const report = evaluateProfessionalEstimatorQuality(estimate);
    if (!report.passed) {
      benchmarkFailures += 1;
      failures.push({
        id: testCase.id,
        prompt: testCase.prompt,
        workKey: estimate.work.workKey,
        blockers: report.blockers,
        scores: report.scores,
      });
    }
    weakGenericRowsFound ||= report.weakGenericRows.length > 0;
    shortComplexEstimatesFound ||= report.shortComplexEstimate;
    unitSemanticsFailed ||= !report.unitSemanticsPassed;
    qualityScoreBelowThresholdFound ||= Object.values(report.scores).some((value) => value < report.threshold);
  }

  const requestFailure = validateEntrypoint("смета на металлический навес на площади 647 кв метров", "/request");
  const foremanFailure = validateEntrypoint("смета на гидроизоляцию крыши 100 м²", "/ai?context=foreman");
  if (requestFailure) failures.push(requestFailure);
  if (foremanFailure) failures.push(foremanFailure);

  const weak = weakCanopyFixture();
  const weakReport = evaluateProfessionalEstimatorQuality(weak);
  const corrected = selfCorrectProfessionalEstimate(weak);
  const correctedReport = evaluateProfessionalEstimatorQuality(corrected);
  const correctedNames = corrected.sections.flatMap((section) => section.rows.map((row) => row.name));
  const selfCorrectionFailed =
    weakReport.passed ||
    !correctedReport.passed ||
    correctedNames.some(isWeakGenericEstimateRowName) ||
    !correctedNames.includes("монтаж стропильной системы навеса") ||
    !correctedNames.includes("крепёж для профнастила") ||
    !correctedNames.includes("сварочные материалы для ферм");
  if (selfCorrectionFailed) {
    failures.push({
      id: "self_correction_weak_canopy",
      prompt: weak.input.originalText ?? "weak canopy fixture",
      workKey: corrected.work.workKey,
      blockers: [
        ...(weakReport.passed ? ["WEAK_FIXTURE_DID_NOT_FAIL_BEFORE_CORRECTION"] : []),
        ...correctedReport.blockers,
        ...(correctedNames.some(isWeakGenericEstimateRowName) ? ["WEAK_ROWS_REMAIN_AFTER_CORRECTION"] : []),
      ],
      scores: correctedReport.scores,
    });
  }

  const passed = failures.length === 0;
  const matrix = {
    wave: WAVE,
    final_status: passed ? GREEN : RED,
    benchmark_cases_total: cases.length,
    benchmark_cases_passed: cases.length - benchmarkFailures,
    quality_score_below_threshold_found: qualityScoreBelowThresholdFound,
    weak_generic_rows_found: weakGenericRowsFound,
    short_complex_estimates_found: shortComplexEstimatesFound,
    unit_semantics_failed: unitSemanticsFailed,
    self_correction_failed: selfCorrectionFailed,
    fake_green_claimed: false,
  };

  fs.writeFileSync(path.join(ARTIFACT_DIR, "matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(ARTIFACT_DIR, "failures.json"), `${JSON.stringify(failures, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(matrix, null, 2));
  if (!passed) {
    console.error(JSON.stringify(failures.slice(0, 20), null, 2));
    process.exit(1);
  }
}

run();
