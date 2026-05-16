import { buildDirectorTodayDecisionAssistant } from "../director/aiDirectorTodayDecisionAssistant";
import { buildDocumentReadySummaryAssistant } from "../documents/aiDocumentReadySummaryAssistant";
import { buildAccountantTodayPaymentAssistant } from "../finance/aiAccountantTodayPaymentAssistant";
import { buildForemanTodayCloseoutAssistant } from "../foreman/aiForemanTodayCloseoutAssistant";
import { buildWarehouseTodayOpsAssistant } from "../warehouse/aiWarehouseTodayOpsAssistant";
import { hydrateAiRoleScreenAssistantContext } from "./aiRoleScreenAssistantHydrator";
import { enforceAiRoleScreenAssistantPolicy } from "./aiRoleScreenAssistantPolicy";
import {
  getAiRoleScreenAssistantRegistryEntry,
  resolveDefaultRoleAssistantScreenId,
} from "./aiRoleScreenAssistantRegistry";
import type {
  AiRoleScreenAssistantHydrationRequest,
  AiRoleScreenAssistantPack,
} from "./aiRoleScreenAssistantTypes";

function buildBuyerAssistantPack(
  hydrated: ReturnType<typeof hydrateAiRoleScreenAssistantContext>,
): AiRoleScreenAssistantPack {
  const bundle = hydrated.readyBuyBundle;
  const options = bundle?.options ?? [];
  const risks = bundle?.risks ?? [];
  const missingData = bundle?.missingData ?? [];
  const bestOption = options[0] ?? null;
  return {
    screenId: hydrated.screenId,
    role: hydrated.role === "unknown" ? "buyer" : hydrated.role,
    domain: "procurement",
    title: hydrated.screenId === "buyer.request.detail" ? "Готовые варианты закупки" : "Снабжение сегодня",
    summary: bundle
      ? `Заявка ${bundle.requestId}: готовые варианты закупки ${options.length}. ${bestOption ? `Лучший видимый вариант: ${bestOption.supplierName}, покрытие ${bestOption.coverageLabel}.` : "Готовых внутренних поставщиков не найдено."}`
      : "Нет загруженного read-only среза входящих заявок. Я не выдумываю поставщиков, цены, сроки или наличие.",
    today: bundle
      ? {
        count: 1,
        criticalCount: risks.length,
        overdueCount: missingData.length,
      }
      : undefined,
    readyItems: options.slice(0, 4).map((option) => ({
      id: `buyer.ready.${option.id}`,
      title: option.supplierName,
      description: [
        `Покрывает: ${option.coverageLabel}.`,
        option.priceSignal ? `Цена: ${option.priceSignal}.` : null,
        option.deliverySignal ? `Срок: ${option.deliverySignal}.` : null,
        option.risks.length ? `Риски: ${option.risks.join(", ")}.` : null,
      ].filter(Boolean).join(" "),
      evidence: option.evidence,
      riskLevel: option.risks.length ? "medium" : "low",
      actionKind: option.recommendedAction === "submit_supplier_choice_for_approval" ? "approval_required" : "draft_only",
      primaryActionLabel: option.recommendedAction === "compare" ? "Сравнить" : "Подготовить запрос",
      secondaryActionLabel: "Смотреть варианты",
    })),
    risks: risks.map((risk, index) => ({
      id: `buyer.risk.${index}`,
      title: "Риск закупки",
      reason: risk,
      severity: "medium",
      evidence: bundle?.options.flatMap((option) => option.evidence).slice(0, 4) ?? [],
    })),
    missingData: missingData.map((label, index) => ({
      id: `buyer.missing.${index}`,
      label,
      blocksAction: true,
    })),
    nextActions: [
      { id: "buyer.review_inbox", label: "Разобрать входящие заявки", kind: "review", requiresApproval: false, canExecuteDirectly: false },
      { id: "buyer.compare", label: "Сравнить поставщиков", kind: "compare", requiresApproval: false, canExecuteDirectly: false },
      { id: "buyer.draft_request", label: "Подготовить запрос", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
      { id: "buyer.approval", label: "Отправить выбор на согласование", kind: "submit_for_approval", requiresApproval: true, canExecuteDirectly: false },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}

function buildGenericAssistantPack(
  screenId: string,
  role: string,
  domain: string,
  title: string,
): AiRoleScreenAssistantPack {
  return {
    screenId,
    role,
    domain,
    title,
    summary: "Готов рабочий срез по экрану: риски, недостающие данные и безопасные следующие действия собраны без прямых мутаций.",
    readyItems: [{
      id: `${screenId}.screen_context`,
      title: "Проверить текущий срез",
      description: "Открыть важные пункты экрана, missing evidence и кандидаты на согласование.",
      evidence: [`screen:${screenId}`],
      riskLevel: "low",
      actionKind: "safe_read",
      primaryActionLabel: "Проверить",
    }],
    risks: [],
    missingData: [],
    nextActions: [
      { id: `${screenId}.review`, label: "Проверить важное", kind: "review", requiresApproval: false, canExecuteDirectly: false },
      { id: `${screenId}.draft`, label: "Подготовить черновик", kind: "draft", requiresApproval: false, canExecuteDirectly: false },
      { id: `${screenId}.approval`, label: "Отправить на согласование", kind: "submit_for_approval", requiresApproval: true, canExecuteDirectly: false },
    ],
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
  };
}

export function getAiRoleScreenAssistantPack(
  request: AiRoleScreenAssistantHydrationRequest,
): AiRoleScreenAssistantPack {
  const hydrated = hydrateAiRoleScreenAssistantContext(request);
  const screenId = hydrated.screenId || resolveDefaultRoleAssistantScreenId(hydrated.context);
  const registryEntry = getAiRoleScreenAssistantRegistryEntry(screenId);
  const role = hydrated.role === "unknown" ? (registryEntry?.role ?? "office") : hydrated.role;

  if (screenId.startsWith("accountant.")) {
    return enforceAiRoleScreenAssistantPolicy(buildAccountantTodayPaymentAssistant({
      screenId,
      role,
      payments: hydrated.finance.payments,
      totalAmountLabel: hydrated.finance.totalAmountLabel,
      waitingApprovalCount: hydrated.finance.waitingApprovalCount,
    }));
  }

  if (screenId.startsWith("buyer.") || screenId === "procurement.copilot") {
    return enforceAiRoleScreenAssistantPolicy(buildBuyerAssistantPack(hydrated));
  }

  if (screenId.startsWith("warehouse.")) {
    return enforceAiRoleScreenAssistantPolicy(buildWarehouseTodayOpsAssistant({
      screenId,
      role,
      items: hydrated.warehouse.items,
      stockRiskCount: hydrated.warehouse.stockRiskCount,
      incomingCount: hydrated.warehouse.incomingCount,
      blockedIssueCount: hydrated.warehouse.blockedIssueCount,
      disputedCount: hydrated.warehouse.disputedCount,
    }));
  }

  if (screenId.startsWith("foreman.") || screenId === "contractor.main") {
    return enforceAiRoleScreenAssistantPolicy(buildForemanTodayCloseoutAssistant({
      screenId,
      role,
      items: hydrated.foreman.items,
      closeoutReadyCount: hydrated.foreman.closeoutReadyCount,
      missingEvidenceCount: hydrated.foreman.missingEvidenceCount,
    }));
  }

  if (screenId.startsWith("director.") || screenId === "approval.inbox") {
    return enforceAiRoleScreenAssistantPolicy(buildDirectorTodayDecisionAssistant({
      screenId,
      role,
      decisions: hydrated.director.decisions,
      approvalCount: hydrated.director.approvalCount,
      blocksWorkCount: hydrated.director.blocksWorkCount,
    }));
  }

  if (screenId === "documents.main" || screenId === "agent.documents.knowledge") {
    return enforceAiRoleScreenAssistantPolicy(buildDocumentReadySummaryAssistant({
      screenId,
      role,
      document: hydrated.documents.document,
    }));
  }

  return enforceAiRoleScreenAssistantPolicy(buildGenericAssistantPack(
    screenId,
    role,
    registryEntry?.domain ?? "office",
    registryEntry?.title ?? "Готово от AI",
  ));
}

export function describeAiRoleScreenAssistantPack(pack: AiRoleScreenAssistantPack): string {
  const ready = pack.readyItems
    .slice(0, 5)
    .map((item) => `- ${item.title}: ${item.description || item.primaryActionLabel || "готово к проверке"}; evidence: ${item.evidence.join(", ") || "screen"}`)
    .join("\n");
  const risks = pack.risks
    .slice(0, 4)
    .map((risk) => `- ${risk.title}: ${risk.reason}`)
    .join("\n");
  const missing = pack.missingData
    .slice(0, 4)
    .map((item) => `- ${item.label}`)
    .join("\n");
  const actions = pack.nextActions
    .slice(0, 5)
    .map((action) => `- ${action.label}${action.requiresApproval ? " (approval)" : ""}`)
    .join("\n");

  return [
    `ROLE_SCREEN_ASSISTANT ${pack.screenId} ${pack.domain}`,
    pack.summary,
    pack.today ? `Today: count ${pack.today.count}, amount ${pack.today.amountLabel ?? "n/a"}, critical ${pack.today.criticalCount ?? 0}, overdue ${pack.today.overdueCount ?? 0}.` : null,
    ready ? `Ready items:\n${ready}` : null,
    risks ? `Risks:\n${risks}` : null,
    missing ? `Missing data:\n${missing}` : null,
    actions ? `Next actions:\n${actions}` : null,
    "No direct order, payment, warehouse mutation, or approval bypass is allowed.",
  ].filter(Boolean).join("\n");
}
