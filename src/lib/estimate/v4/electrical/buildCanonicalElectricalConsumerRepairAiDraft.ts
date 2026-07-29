import { resolveFormulaForEstimatorPlan } from "../../../ai/constructionFormulas";
import {
  buildRegulatedSafeEstimatePlan,
} from "../../../ai/estimatorKernel";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { buildGlobalEstimateFromEstimatorKernel } from "../../../ai/globalEstimate/globalEstimateCalculator";
import { compileDynamicProfessionalBoq } from "../../../ai/professionalBoq/compileDynamicProfessionalBoq";
import { expandOwnedDomainProfessionalBoq } from "../../ownedDomain/expandOwnedDomainBoqRows";
import {
  ELECTRICAL_CANONICAL_WORK_KEY,
  buildElectricalCanonicalParameterSession,
  type ElectricalCanonicalParameterValues,
} from "./electricalCanonicalV1";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../../consumerRequests/consumerRequestGlobalEstimateIntegration";
import type {
  ConsumerRepairAiDraft,
  ConsumerRepairSelectedWork,
} from "../../../consumerRequests/consumerRequestTypes";
import {
  buildElectricalCircuitScheduleV1,
} from "./electricalCircuitScheduleV1";
import {
  assertElectricalBoqIntegrityV1,
} from "./electricalBoqIntegrityV1";

function recordCanonicalElectricalBuildTiming(
  stage: string,
  startedAt: number,
): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  console.info("[RikCanonicalElectricalBuild]", JSON.stringify({
    stage,
    elapsedMs: Date.now() - startedAt,
  }));
}

function selectedWork(
  text: string,
  explicit?: ConsumerRepairSelectedWork | null,
): ConsumerRepairSelectedWork {
  return explicit
    ? {
        ...explicit,
        selectedCatalogWorkId:
          explicit.selectedCatalogWorkId ?? explicit.selectedWorkKey,
        selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
      }
    : {
    selectedCatalogWorkId: ELECTRICAL_CANONICAL_WORK_KEY,
    selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
    selectedWorkTitleRu: "Электромонтаж",
    selectedWorkCategoryKey: "electrical",
    selectedWorkCategoryTitleRu: "Электромонтажные работы",
    selectedWorkRawInput: text,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

export function buildCanonicalElectricalConsumerRepairAiDraft(input: {
  text: string;
  countryCode?: string;
  city?: string;
  currency?: string;
  selectedWork?: ConsumerRepairSelectedWork | null;
  parameterOverrides?: ElectricalCanonicalParameterValues;
}): ConsumerRepairAiDraft {
  const buildStartedAt = Date.now();
  const changedAt = new Date().toISOString();
  const parameterSession = buildElectricalCanonicalParameterSession({
    text: input.text,
    overrides: input.parameterOverrides,
    draftId: "electrical-canonical-preview",
    revisionId: "electrical-canonical-preview:1",
    changedAt,
  });
  const electricalCircuitSchedule =
    buildElectricalCircuitScheduleV1(parameterSession);
  recordCanonicalElectricalBuildTiming("PARAMETER_SESSION_READY", buildStartedAt);
  const boundWork = selectedWork(input.text, input.selectedWork);
  if (parameterSession.status === "BLOCKING_REQUIRED") {
    const blockingLabels = parameterSession.parameters
      .filter((parameter) =>
        parameterSession.blockingMissingParameterIds.includes(parameter.parameterId)
      )
      .map((parameter) => parameter.label);
    return {
      titleRu: "Электромонтаж: нужны исходные данные",
      summaryRu: "Работа распознана, но профессиональная смета ещё не рассчитана: заполните обязательные параметры объекта, трассы и электрических точек.",
      repairType: ELECTRICAL_CANONICAL_WORK_KEY,
      selectedWork: boundWork,
      dangerousDiyBlocked: false,
      missingData: blockingLabels,
      items: [],
      electricalCircuitSchedule,
    };
  }
  const initialPlan = buildOwnedDomainEstimatorReasoningPlan({
    text: input.text,
    owner: "electrical",
    currency: input.currency ?? "KGS",
    canonicalParameters: Object.fromEntries(
      parameterSession.parameters
        .filter((parameter) => parameter.value != null)
        .map((parameter) => [parameter.parameterId, parameter.value!]),
    ),
  });
  recordCanonicalElectricalBuildTiming("REASONING_PLAN_READY", buildStartedAt);
  const plan = buildRegulatedSafeEstimatePlan({
    ...initialPlan,
    formulas: resolveFormulaForEstimatorPlan(initialPlan),
  });
  recordCanonicalElectricalBuildTiming("REGULATED_PLAN_READY", buildStartedAt);
  const boq = expandOwnedDomainProfessionalBoq(
    compileDynamicProfessionalBoq(plan),
  );
  recordCanonicalElectricalBuildTiming("BOQ_READY", buildStartedAt);
  const globalEstimate = buildGlobalEstimateFromEstimatorKernel(
    plan,
    boq,
    {
      text: input.text,
      volume: plan.quantities.areaM2 ?? plan.quantities.lengthM ?? 1,
      unit: plan.quantities.areaM2 != null
        ? "sq_m"
        : plan.quantities.lengthM != null
          ? "linear_m"
          : "set",
      countryCode: input.countryCode ?? "KG",
      city: input.city ?? "Bishkek",
      currency: input.currency ?? "KGS",
      language: "ru",
      estimateDetailLevel: "professional_expanded",
    },
  );
  recordCanonicalElectricalBuildTiming("GLOBAL_ESTIMATE_READY", buildStartedAt);
  const draft = buildConsumerRepairAiDraftFromGlobalEstimate(
    globalEstimate,
    undefined,
    boundWork,
  );
  assertElectricalBoqIntegrityV1(draft.items.map((item) => ({
    rowCode: String(item.sourceParameters?.rowCode ?? ""),
    semanticOwner: String(item.sourceParameters?.semanticOwner ?? ""),
    titleRu: item.titleRu,
    resourceType: item.itemType,
    quantity: item.quantity,
    unit: item.unit,
  })));
  recordCanonicalElectricalBuildTiming("REQUEST_DRAFT_READY", buildStartedAt);
  const missingLabels = parameterSession.parameters
    .filter((parameter) => parameter.source === "MISSING")
    .map((parameter) => parameter.label);
  const assumptionLabels = parameterSession.parameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => `${parameter.label}: ${parameter.assumption ?? "предварительное допущение"}`);
  return {
    ...draft,
    electricalCircuitSchedule,
    missingData: [...new Set([
      ...draft.missingData,
      ...missingLabels,
      ...assumptionLabels,
    ])],
  };
}
