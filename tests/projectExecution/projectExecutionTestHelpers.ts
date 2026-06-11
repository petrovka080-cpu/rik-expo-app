import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import {
  buildStructuredEstimatePayload,
  type StructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";
import {
  buildProjectExecutionDraftFromEstimate,
  type ProjectExecutionDraft,
} from "../../src/lib/projectExecution";

export const PROJECT_EXECUTION_GENERATED_AT = "2026-06-11T00:00:00.000Z";

export function buildRoofWaterproofingSelectedWork(): GlobalSelectedWorkBinding {
  return buildGlobalSelectedWorkBinding({
    selectedWorkKey: "roof_waterproofing",
    rawInput: "\u0423\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u0438 \u043a\u0440\u043e\u0432\u043b\u0438 120 \u043c2",
  });
}

export function buildProjectExecutionFixture(): {
  selectedWork: GlobalSelectedWorkBinding;
  payload: StructuredEstimatePayload;
  draft: ProjectExecutionDraft;
} {
  const selectedWork = buildRoofWaterproofingSelectedWork();
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: selectedWork.rawInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: 120,
        unit: "sq_m",
      },
      selectedWork,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, {
    source: "request",
    selectedWork,
  });
  const draft = buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: PROJECT_EXECUTION_GENERATED_AT,
    sourceRequestId: "request_fixture_001",
  });
  return { selectedWork, payload, draft };
}

export function visibleProjectExecutionText(draft: ProjectExecutionDraft): string {
  return [
    draft.projectTitle,
    draft.customerVisibleTitle,
    ...draft.workPackages.flatMap((workPackage) => [
      workPackage.title,
      workPackage.customerVisibleTitle,
      ...workPackage.checklist.map((item) => item.title),
    ]),
    ...draft.tasks.map((task) => task.title),
    ...draft.procurementItems.flatMap((item) => [
      item.materialVisibleName,
      item.catalogSearchQuery,
      item.notes ?? "",
    ]),
  ].join("\n");
}

export const PROJECT_EXECUTION_FORBIDDEN_VISIBLE_PATTERN =
  /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b|\bwarning\b|\bmaterial_key\b|\bwork_key\b|\bundefined\b|\bNaN\b|\[object Object\]/i;

export const PROJECT_EXECUTION_CONTROL_PATTERN =
  /\bwarning\b|\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430|\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430\s+\u0433\u0435\u0440\u043c\u0435\u0442\u0438\u0447\u043d\u043e\u0441\u0442\u0438|\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043f\u0440\u043e\u0442\u0435\u0447\u0435\u043a/i;
