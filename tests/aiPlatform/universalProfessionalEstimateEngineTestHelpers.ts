import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, type BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import { composeOpenWorldConstructionPreliminaryBoq, resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";

export type UniversalEstimateRoute = "/request" | "/ai?context=foreman" | "/ai?context=request";

export type UniversalKnownWorkCase = {
  id: string;
  text: string;
  route?: UniversalEstimateRoute;
  expectedWorkKey: string;
  expectedDomain: string;
  expectedObject: string;
  minimumRows: number;
};

export const UNIVERSAL_KNOWN_WORK_CASES: readonly UniversalKnownWorkCase[] = [
  {
    id: "acoustic_panels",
    text: "смета на монтаж акустических панелей в зале 240 м2",
    expectedWorkKey: "acoustic_panel_installation",
    expectedDomain: "interior_acoustic_finish",
    expectedObject: "acoustic_panel_system",
    minimumRows: 30,
  },
  {
    id: "fire_alarm",
    text: "смета на монтаж пожарной сигнализации в офисе 800 м2",
    expectedWorkKey: "fire_alarm_installation",
    expectedDomain: "fire_alarm",
    expectedObject: "fire_alarm_system",
    minimumRows: 30,
  },
  {
    id: "cold_room",
    text: "смета на холодильную камеру 40 м2",
    expectedWorkKey: "cold_room_installation",
    expectedDomain: "cold_rooms",
    expectedObject: "cold_room_system",
    minimumRows: 45,
  },
  {
    id: "dock_leveler",
    text: "смета на доклевеллер",
    expectedWorkKey: "dock_leveler_installation",
    expectedDomain: "loading_docks",
    expectedObject: "dock_leveler",
    minimumRows: 30,
  },
  {
    id: "smoke_extraction",
    text: "смета на дымоудаление",
    expectedWorkKey: "smoke_extraction_system",
    expectedDomain: "smoke_extraction",
    expectedObject: "smoke_extraction_system",
    minimumRows: 30,
  },
  {
    id: "bms_automation",
    text: "смета на BMS автоматику",
    expectedWorkKey: "bms_automation_installation",
    expectedDomain: "automation_bms",
    expectedObject: "bms_automation_system",
    minimumRows: 30,
  },
  {
    id: "industrial_equipment",
    text: "смета на монтаж промышленного оборудования 5 тонн",
    expectedWorkKey: "industrial_equipment_installation",
    expectedDomain: "industrial_equipment",
    expectedObject: "industrial_equipment",
    minimumRows: 45,
  },
  {
    id: "drainage_channel",
    text: "смета на устройство дренажного лотка 120 м",
    expectedWorkKey: "drainage_channel_installation",
    expectedDomain: "drainage",
    expectedObject: "drainage_channel",
    minimumRows: 18,
  },
  {
    id: "passenger_elevator",
    text: "смета на пассажирский лифт 14 этажей",
    expectedWorkKey: "passenger_elevator_installation",
    expectedDomain: "vertical_transport",
    expectedObject: "passenger_elevator",
    minimumRows: 30,
  },
  {
    id: "solar_panels",
    text: "смета на солнечные панели 30 кВт",
    expectedWorkKey: "solar_panel_installation",
    expectedDomain: "solar",
    expectedObject: "solar_power_system",
    minimumRows: 45,
  },
];

export function rowsOf(estimate: GlobalEstimateResult): GlobalEstimateResult["sections"][number]["rows"] {
  return estimate.sections.flatMap((section) => section.rows);
}

export function answerKnownWork(
  testCase: UniversalKnownWorkCase,
  route: UniversalEstimateRoute = testCase.route ?? "/request",
): BuiltInAiAnswer {
  const foreman = route === "/ai?context=foreman";
  return answerBuiltInAi({
    text: testCase.text,
    route,
    screenContext: foreman ? "foreman" : "request",
    role: foreman ? "foreman" : "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function requireKnownWorkEstimate(
  testCase: UniversalKnownWorkCase,
  route: UniversalEstimateRoute = testCase.route ?? "/request",
): GlobalEstimateResult {
  const answer = answerKnownWork(testCase, route);
  expect(answer.route.intent).toBe("estimate");
  expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
  expect(answer.toolResult.blockedBy).toBeUndefined();
  expect(answer.toolResult.fallbackUsed).toBeUndefined();
  const estimate = answer.toolResult.estimate;
  expect(estimate).toBeDefined();
  if (!estimate) throw new Error(`estimate_missing:${testCase.id}`);
  expect(estimate.work.workKey).toBe(testCase.expectedWorkKey);
  expect(rowsOf(estimate).length).toBeGreaterThanOrEqual(testCase.minimumRows);
  return estimate;
}

export function requireEstimatorPlan(testCase: UniversalKnownWorkCase) {
  const outcome = resolveEstimatorOutcome({ text: testCase.text, currency: "KGS" });
  expect(outcome.failures).toEqual([]);
  expect(outcome.plan?.workKey).toBe(testCase.expectedWorkKey);
  expect(outcome.plan?.semanticFrame.domain).toBe(testCase.expectedDomain);
  expect(outcome.plan?.semanticFrame.object).toBe(testCase.expectedObject);
  return outcome;
}

export function requireOpenWorldBoq(testCase: UniversalKnownWorkCase) {
  const composed = composeOpenWorldConstructionPreliminaryBoq(testCase.text);
  expect(composed.classification).toBe("preliminary_boq");
  expect(composed.plan?.workKey).toBe(testCase.expectedWorkKey);
  expect(composed.rowCount).toBeGreaterThanOrEqual(testCase.minimumRows);
  return composed;
}

export function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function sourceFilesUnder(relativeRoot: string): string[] {
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files: string[] = [];
  const walk = (root: string): void => {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const absolute = path.join(root, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      files.push(path.relative(process.cwd(), absolute).replace(/\\/g, "/"));
    }
  };
  walk(absoluteRoot);
  return files;
}
