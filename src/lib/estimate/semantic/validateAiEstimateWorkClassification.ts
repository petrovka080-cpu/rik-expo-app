import { buildAiEstimateCatalogIndex } from "../catalog/buildAiEstimateCatalogIndex";
import { classifyAiEstimateWork } from "./classifyAiEstimateWork";

export type AiEstimateWorkClassificationValidation = {
  ok: boolean;
  semanticWorkClassifierCreated: boolean;
  workFamilyClassificationCoverage: string;
  top1AccuracyOnGoldenCases: number;
  top3AccuracyOnGoldenCases: number;
  unitConflictRegressionsPassed: boolean;
  ruAliasesSupported: boolean;
  workClassifierDoesNotUseHardcodedCapitalRepairOnly: boolean;
  blockingReasons: string[];
};

const GOLDEN_CASES = [
  { text: "капремонт квартиры 154 кв метра", family: "apartment_repair" },
  { text: "ремонт санузла плитка и водоточки", family: "bathroom_repair" },
  { text: "дорога 500 метров асфальт", family: "road" },
  { text: "водоснабжение ПНД 110 длина 5000 м", family: "water_supply" },
  { text: "наружная канализация 110 мм", family: "sewerage" },
  { text: "ЛЭП 10 кВ опоры через 50 м", family: "power_line" },
  { text: "трансформаторная подстанция 10 кВ", family: "substation" },
  { text: "вентфасад 900 м2 утеплитель", family: "facade" },
  { text: "мансардная крыша 6 окон", family: "roof" },
  { text: "алмазное бурение 12 отверстий глубина", family: "drilling" },
  { text: "забор из профлиста 120 м", family: "fence" },
  { text: "дамба укрепление откоса", family: "dam" },
  { text: "мост железобетонный", family: "bridge" },
  { text: "котельная 500 кВт", family: "boiler" },
  { text: "вентиляция воздуховоды", family: "ventilation" },
  { text: "электрика розетки кабель", family: "electrical" },
  { text: "отопление радиаторы", family: "heating" },
  { text: "демонтаж перегородок", family: "demolition" },
  { text: "бетонные работы фундамент", family: "concrete" },
  { text: "остекление витражей", family: "glazing" },
] as const;

export function validateAiEstimateWorkClassification(): AiEstimateWorkClassificationValidation {
  const index = buildAiEstimateCatalogIndex();
  const classifiedCount = index.entries.filter((entry) => classifyAiEstimateWork(entry).family !== "other").length;
  const goldenResults = GOLDEN_CASES.map((item) => ({
    expected: item.family,
    actual: classifyAiEstimateWork(item.text),
  }));
  const top1Passed = goldenResults.filter((item) => item.actual.family === item.expected).length;
  const regressionChecks = {
    area_not_voltage: !classifyAiEstimateWork("154 кв метра").parameterHints.includes("voltage_kv"),
    lep_voltage: classifyAiEstimateWork("ЛЭП 10 кВ").parameterHints.includes("voltage_kv"),
    ceiling_name_not_height_without_phrase: !classifyAiEstimateWork("ceiling panel template").parameterHints.includes("ceiling_height_m"),
    pnd_110_diameter: classifyAiEstimateWork("ПНД 110").parameterHints.includes("diameter_mm"),
    pole_step: classifyAiEstimateWork("опоры через 50 м").parameterHints.includes("pole_step_m"),
    roof_windows: classifyAiEstimateWork("мансардная крыша 6 окон").parameterHints.includes("roof_windows_count"),
  };
  const checks = {
    semantic_work_classifier_created: true,
    work_family_classification_coverage: classifiedCount === index.entries.length,
    top1_accuracy_on_golden_cases: top1Passed / GOLDEN_CASES.length >= 0.95,
    top3_accuracy_on_golden_cases: top1Passed / GOLDEN_CASES.length >= 0.99,
    unit_conflict_regressions_passed: Object.values(regressionChecks).every(Boolean),
    ru_aliases_supported: goldenResults.every((item) => item.actual.family !== "other"),
    work_classifier_does_not_use_hardcoded_capital_repair_only:
      new Set(goldenResults.map((item) => item.actual.family)).size >= 18,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    semanticWorkClassifierCreated: true,
    workFamilyClassificationCoverage: `${classifiedCount}/${index.entries.length}`,
    top1AccuracyOnGoldenCases: Math.round((top1Passed / GOLDEN_CASES.length) * 1000) / 10,
    top3AccuracyOnGoldenCases: Math.round((top1Passed / GOLDEN_CASES.length) * 1000) / 10,
    unitConflictRegressionsPassed: checks.unit_conflict_regressions_passed,
    ruAliasesSupported: checks.ru_aliases_supported,
    workClassifierDoesNotUseHardcodedCapitalRepairOnly: checks.work_classifier_does_not_use_hardcoded_capital_repair_only,
    blockingReasons,
  };
}
