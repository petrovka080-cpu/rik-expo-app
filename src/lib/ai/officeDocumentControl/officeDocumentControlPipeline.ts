import { getOfficeActionQuestion } from "./officeActionQuestionMap";
import { composeOfficeDocumentControlAnswer } from "./officeAnswerComposer";
import { OFFICE_DATA_PROVIDER_FUNCTIONS } from "./officeDataProviders";
import { routeOfficeIntent } from "./officeIntentRouter";
import {
  officeHiddenTechnicalData,
  sanitizeOfficeContext,
} from "./officeSourceSanitizer";
import type {
  OfficeDataProviderResult,
  OfficeDocumentControlAnswer,
  OfficeDocumentControlContext,
  OfficeDocumentControlIntent,
  OfficeProviderKey,
} from "./officeDocumentControlTypes";

function providerKeysForIntent(intent: OfficeDocumentControlIntent): OfficeProviderKey[] {
  const always: OfficeProviderKey[] = [
    "aiOfficeSourceSanitizer",
    "aiOfficeScreenContextProvider",
    "aiOfficeTasksProvider",
    "aiOfficeDocumentsQueueProvider",
    "aiOfficeApprovalPackagesProvider",
    "aiOfficeRemindersProvider",
    "aiOfficeDeadlinesProvider",
    "aiOfficeAnswerComposer",
  ];
  const byIntent: Partial<Record<OfficeDocumentControlIntent, OfficeProviderKey[]>> = {
    stuck_today: ["aiOfficePaymentBlockersProvider", "aiOfficeWorkCloseoutBlockersProvider"],
    documents_to_process: ["aiOfficeDocumentDetailProvider"],
    unlinked_documents: ["aiOfficeDocumentDetailProvider"],
    incomplete_approval_packages: ["aiOfficeDirectorPrepProvider"],
    next_owner: ["aiOfficePaymentBlockersProvider", "aiOfficeWorkCloseoutBlockersProvider"],
    reminder_draft: ["aiOfficeRemindersProvider"],
    deadline_review: ["aiOfficeDeadlinesProvider"],
    payment_blockers: ["aiOfficePaymentBlockersProvider", "aiOfficeApprovalPackagesProvider"],
    work_closeout_blockers: ["aiOfficeWorkCloseoutBlockersProvider", "aiOfficeDocumentsQueueProvider"],
    prepare_director_package: ["aiOfficeDirectorPrepProvider", "aiOfficeApprovalPackagesProvider"],
    document_detail: ["aiOfficeDocumentDetailProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

function runProviders(context: OfficeDocumentControlContext, intent: OfficeDocumentControlIntent): {
  results: OfficeDataProviderResult[];
  providerTrace: string[];
} {
  const keys = providerKeysForIntent(intent);
  return {
    providerTrace: [
      "officeDocumentControlPipeline",
      "role:office",
      "source_chain:tasks>documents_queue>approval_packages>reminders>deadlines>payment_blockers>work_closeout_blockers",
      ...keys,
    ],
    results: keys.map((key) => OFFICE_DATA_PROVIDER_FUNCTIONS[key](context)),
  };
}

export function answerOfficeDocumentControlQuestion(params: {
  context: OfficeDocumentControlContext;
  questionRu: string;
  actionId?: OfficeDocumentControlIntent;
}): OfficeDocumentControlAnswer {
  const hiddenTechnicalData = officeHiddenTechnicalData(params.context);
  const safeContext = sanitizeOfficeContext(params.context);
  const action = params.actionId ? getOfficeActionQuestion(params.actionId, safeContext.screenId) : null;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = action?.actionId ?? routeOfficeIntent(questionRu).intent;
  const { results, providerTrace } = runProviders(safeContext, intent);
  const missingData = [
    ...results.flatMap((result) => result.missingData),
  ];
  return composeOfficeDocumentControlAnswer({
    context: safeContext,
    intent,
    questionRu,
    providerTrace,
    missingData: [...new Set(missingData)],
    hiddenTechnicalData,
  });
}

export function answerOfficeAction(params: {
  context: OfficeDocumentControlContext;
  actionId: OfficeDocumentControlIntent;
}): OfficeDocumentControlAnswer {
  const action = getOfficeActionQuestion(params.actionId, params.context.screenId);
  return answerOfficeDocumentControlQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildOfficeAiBlockViewModel(context: OfficeDocumentControlContext): {
  titleRu: string;
  stuckCount: number;
  documentsCount: number;
  unlinkedDocumentsCount: number;
  incompletePackagesCount: number;
  overdueCount: number;
  missingData: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const sourceBacked = (refs: string[]) => refs.some((ref) => context.sources.some((source) => source.id === ref));
  const stuckCount =
    context.tasks.filter((item) => item.status === "stuck" || item.status === "overdue").length +
    context.documentsQueue.filter((item) => item.status !== "ready_for_review").length +
    context.approvalPackages.filter((item) => item.status !== "ready_for_review").length;
  const actions = [
    "What is stuck today",
    "Documents to process",
    "Unlinked PDFs",
    "Incomplete packages",
    "Prepare reminder",
    "Deadlines",
    "Payment blockers",
    "Work closeout blockers",
    "Prepare for director",
  ];
  return {
    titleRu: "AI office control ready",
    stuckCount,
    documentsCount: context.documentsQueue.length,
    unlinkedDocumentsCount: context.documentsQueue.filter((item) => item.status === "unlinked").length,
    incompletePackagesCount: context.approvalPackages.filter((item) => item.status !== "ready_for_review").length,
    overdueCount: context.deadlines.filter((item) => item.status === "overdue").length,
    missingData: [
      ...(context.period?.labelRu ? [] : ["period missing"]),
      ...(context.sources.length ? [] : ["sources missing"]),
      ...context.documentsQueue.filter((item) => !sourceBacked(item.sourceRefs)).map((item) => `Document ${item.id}: source missing`),
      ...context.tasks.filter((item) => !sourceBacked(item.sourceRefs)).map((item) => `Task ${item.id}: source missing`),
      ...context.approvalPackages.filter((item) => !sourceBacked(item.sourceRefs)).map((item) => `Package ${item.id}: source missing`),
    ],
    inputPlaceholderRu: "Ask about office documents, stuck work, packages, reminders, deadlines...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

export const officeDocumentControlPipeline = answerOfficeDocumentControlQuestion;
