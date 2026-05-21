import type { AiSourceRef } from "../appContextGraph";
import { getAiGoldenBusinessDataset } from "../evaluation/goldenBusinessDataset";
import { createAiSafeActionAuditTrail } from "./aiSafeActionAuditTrail";
import { routeAiSafeActionApproval } from "./aiSafeActionApprovalRouter";
import { buildAiSafeActionHumanConfirmation } from "./aiSafeActionHumanConfirmation";
import { buildAiSafeActionImpactDiff } from "./aiSafeActionImpactDiff";
import { createAiSafeActionIdempotencyKey, findReusableAiSafeActionDraft, serializeAiSafeActionIdempotencyKey } from "./aiSafeActionIdempotency";
import { checkAiSafeActionPreconditions } from "./aiSafeActionPreconditionChecker";
import { getAiSafeActionRegistryEntry } from "./aiSafeActionRegistry";
import type {
  AiSafeActionBuildInput,
  AiSafeActionContext,
  AiSafeActionDraft,
  AiSafeActionKind,
} from "./aiSafeActionTypes";

function formatKgs(value: number): string {
  return `${value.toLocaleString("ru-RU")} KGS`;
}

export function createGoldenAiSafeActionContext(): AiSafeActionContext {
  const dataset = getAiGoldenBusinessDataset();
  return {
    sourceRefs: [...dataset.sourceRefs],
    numericFacts: {
      request_quantity: dataset.warehouse.gkl.requiredSheets,
      warehouse_issued: dataset.warehouse.gkl.issuedSheets,
      warehouse_remaining: dataset.warehouse.gkl.remainingSheets,
      gkl_shortage: dataset.warehouse.gkl.shortageSheets,
      payments_missing_docs_count: dataset.finance.paymentsMissingDocsCount,
      payments_missing_docs_sum: dataset.finance.paymentsMissingDocsSumKgs,
      payment_77_sum: dataset.finance.payments[0]?.amountKgs ?? 0,
      payment_78_sum: dataset.finance.payments[1]?.amountKgs ?? 0,
      payment_79_sum: dataset.finance.payments[2]?.amountKgs ?? 0,
    },
    textFactsRu: {
      material: dataset.procurement.mainRequest.materialRu,
      work: dataset.procurement.mainRequest.workRu,
      object: dataset.procurement.mainRequest.objectRu,
      company: dataset.documents.pdfInvoice45.companyRu,
      country: dataset.company.countryCode,
    },
  };
}

function findSourceRefs(context: AiSafeActionContext, ids: readonly string[]): AiSourceRef[] {
  return ids
    .map((id) => context.sourceRefs.find((ref) => ref.id === id))
    .filter((ref): ref is AiSourceRef => Boolean(ref));
}

function openLinksFromRefs(refs: readonly AiSourceRef[]) {
  return refs.map((ref) => ({
    labelRu: ref.labelRu,
    sourceRefId: ref.id,
    route: ref.appLink?.route,
    enabled: ref.permission.canOpen,
    disabledReasonRu: ref.permission.canOpen ? undefined : ref.permission.reasonRu ?? "Доступ ограничен",
  }));
}

function missingDataForAction(actionKind: AiSafeActionKind): string[] {
  const map: Record<AiSafeActionKind, string[]> = {
    procurement_purchase_draft: ["поставщик", "цена", "срок поставки"],
    warehouse_deficit_request_draft: ["поставщик", "цена"],
    warehouse_discrepancy_draft: ["накладная", "подтверждение расхождения"],
    accountant_payment_checklist_draft: [],
    accounting_entry_reference_draft: ["проверка бухгалтером"],
    foreman_act_draft: ["1 фото evidence"],
    work_closeout_checklist_draft: ["фото по двум работам", "акт скрытых работ"],
    contractor_remark_response_draft: ["подтверждение списка замечаний"],
    document_link_suggestion_draft: ["акт выполненных работ"],
    marketplace_product_card_draft: ["цена", "остаток", "поставщик", "размер", "толщина", "производитель"],
    office_reminder_draft: [],
    client_progress_report_draft: ["проверка офисом перед отправкой клиенту"],
  };
  return map[actionKind];
}

function payloadForAction(actionKind: AiSafeActionKind, context: AiSafeActionContext): Record<string, unknown> {
  const facts = context.numericFacts;
  const text = context.textFactsRu;
  if (actionKind === "procurement_purchase_draft" || actionKind === "warehouse_deficit_request_draft") {
    return {
      materialRu: text.material,
      quantity: facts.gkl_shortage,
      unit: "лист",
      requestNumber: 124,
      required: facts.request_quantity,
      issued: facts.warehouse_issued,
      remaining: facts.warehouse_remaining,
      objectRu: text.object,
      workRu: text.work,
      finalPurchaseCreated: false,
    };
  }
  if (actionKind === "accountant_payment_checklist_draft") {
    return {
      paymentsCount: facts.payments_missing_docs_count,
      totalKgs: facts.payments_missing_docs_sum,
      payments: [
        { number: 77, amountKgs: facts.payment_77_sum, missing: "акт" },
        { number: 78, amountKgs: facts.payment_78_sum, missing: "договор", partialPaidKgs: 30000 },
        { number: 79, amountKgs: facts.payment_79_sum, missing: "подтверждающий PDF" },
      ],
      paymentPosted: false,
    };
  }
  if (actionKind === "document_link_suggestion_draft") {
    return {
      document: "PDF счета №45",
      amountKgs: facts.payment_77_sum,
      companyRu: text.company,
      suggestedPayment: "№77",
      suggestedRequest: "№124",
      finalLinkCreated: false,
    };
  }
  if (actionKind === "marketplace_product_card_draft") {
    return {
      titleRu: "Профиль металлический для ГКЛ",
      categoryRu: "Строительные материалы",
      missing: missingDataForAction(actionKind),
      productPublished: false,
      priceInvented: false,
    };
  }
  if (actionKind === "office_reminder_draft") {
    return {
      to: ["бухгалтер", "прораб", "директор"],
      textRu: "Просьба проверить платеж №77, загрузить недостающие документы и подтвердить статус заявки №124.",
      finalSent: false,
    };
  }
  if (actionKind === "client_progress_report_draft") {
    return {
      completedTasks: 5,
      blockedBy: `${facts.gkl_shortage} листов ГКЛ и акт по электрике`,
      clientVisibleOnly: true,
      finalReportSent: false,
    };
  }
  return {
    actionKind,
    draftOnly: true,
    finalSubmit: false,
  };
}

function humanDraftForAction(actionKind: AiSafeActionKind, context: AiSafeActionContext): string {
  const facts = context.numericFacts;
  const text = context.textFactsRu;
  if (actionKind === "procurement_purchase_draft") {
    return [
      `Коротко: подготовлен черновик закупки на ${facts.gkl_shortage} листов ${text.material}.`,
      `Основание: заявка №124, требуется ${facts.request_quantity}, выдано ${facts.warehouse_issued}, остаток ${facts.warehouse_remaining}, недостача ${facts.gkl_shortage}.`,
      "Закупка не создана финально. Требуется согласование.",
    ].join("\n");
  }
  if (actionKind === "accountant_payment_checklist_draft") {
    return [
      `Коротко: подготовлен чеклист по ${facts.payments_missing_docs_count} платежам без документов на сумму ${formatKgs(facts.payments_missing_docs_sum)}.`,
      `Платеж №77: ${formatKgs(facts.payment_77_sum)}, есть PDF счета №45, не хватает акта.`,
      "Платежи не проведены. Данные не изменены.",
    ].join("\n");
  }
  if (actionKind === "warehouse_deficit_request_draft") {
    return [
      `Коротко: подготовлен черновик заявки на дефицит ${facts.gkl_shortage} листов ${text.material}.`,
      `Основание: требуется ${facts.request_quantity}, выдано ${facts.warehouse_issued}, остаток ${facts.warehouse_remaining}.`,
      "Склад не изменен. Требуется согласование.",
    ].join("\n");
  }
  if (actionKind === "document_link_suggestion_draft") {
    return [
      `Коротко: подготовлен черновик связи PDF счета №45 с платежом №77 и заявкой №124.`,
      `Сумма: ${formatKgs(facts.payment_77_sum)}. Компания: ${text.company}. Акт отсутствует.`,
      "Документ не связан финально. Требуется проверка.",
    ].join("\n");
  }
  if (actionKind === "marketplace_product_card_draft") {
    return [
      "Коротко: подготовлен черновик карточки товара.",
      "Название: Профиль металлический для ГКЛ. Категория: Строительные материалы.",
      "Товар не опубликован. Цена и остаток не придуманы.",
    ].join("\n");
  }
  return "Коротко: подготовлен безопасный черновик. Финальное действие не выполнено.";
}

export function buildAiSafeActionDraft(input: AiSafeActionBuildInput): AiSafeActionDraft {
  const entry = getAiSafeActionRegistryEntry(input.actionKind);
  const context = input.context ?? createGoldenAiSafeActionContext();
  const sourceRefs = findSourceRefs(context, entry.requiredSourceRefIds);
  const sourceRefIds = sourceRefs.map((ref) => ref.id);
  const draftPayload = payloadForAction(input.actionKind, context);
  const createdAt = input.nowIso ?? "2026-05-21T12:00:00.000Z";
  const role = input.role ?? entry.defaultRole;
  const screenId = input.screenId ?? entry.defaultScreenId;
  const userId = input.userId ?? "ai-safe-action-user";
  const orgId = input.orgId ?? "golden-org";
  const projectId = input.projectId ?? "golden-project";
  const idempotencyKey = createAiSafeActionIdempotencyKey({
    actionKind: input.actionKind,
    orgId,
    projectId,
    sourceRefIds,
    draftPayload,
    userId,
    questionRu: input.questionRu,
  });
  const id = `ai_safe_action:${input.actionKind}:${serializeAiSafeActionIdempotencyKey(idempotencyKey).slice(0, 96)}`;
  const approvalRoute = routeAiSafeActionApproval(input.actionKind);
  const impactDiff = buildAiSafeActionImpactDiff(input.actionKind);
  const missingData = missingDataForAction(input.actionKind);
  const status = entry.mode === "approval_required" ? "approval_required" : missingData.length > 0 ? "needs_human_confirmation" : "draft_created";
  const draftWithoutAudit = {
    id,
    actionKind: input.actionKind,
    mode: entry.mode,
    role,
    screenId,
    userId,
    orgId,
    projectId,
    questionRu: input.questionRu,
    buttonId: input.buttonId,
    sourceAnswerId: input.sourceAnswerId,
    sourceTraceId: input.sourceTraceId,
    titleRu: entry.titleRu,
    summaryRu: impactDiff.willCreateDrafts[0]?.labelRu ?? entry.titleRu,
    sourceRefIds,
    openLinks: openLinksFromRefs(sourceRefs),
    draftPayload,
    humanReadableDraftRu: humanDraftForAction(input.actionKind, context),
    missingData,
    preconditions: checkAiSafeActionPreconditions({ actionKind: input.actionKind, sourceRefIds }),
    impactDiff,
    approvalRoute,
    humanConfirmation: buildAiSafeActionHumanConfirmation({
      draftId: id,
      titleRu: entry.titleRu,
      approvalRequired: approvalRoute.required,
    }),
    idempotencyKey,
    auditTrail: [],
    status,
    safety: {
      changedData: false,
      finalSubmit: false,
      autoApproval: false,
      dangerousMutation: false,
      requiresHumanConfirmation: true,
    },
    createdAt,
  } satisfies AiSafeActionDraft;

  return {
    ...draftWithoutAudit,
    auditTrail: createAiSafeActionAuditTrail(draftWithoutAudit),
  };
}

export function buildOrReuseAiSafeActionDraft(params: AiSafeActionBuildInput & {
  existingDrafts?: readonly AiSafeActionDraft[];
}): {
  draft: AiSafeActionDraft;
  reusedExisting: boolean;
} {
  const candidate = buildAiSafeActionDraft(params);
  const reusable = findReusableAiSafeActionDraft(params.existingDrafts ?? [], candidate);
  return {
    draft: reusable ?? candidate,
    reusedExisting: Boolean(reusable),
  };
}
