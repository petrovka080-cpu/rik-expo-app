import {
  getAgentTaskStream,
  type AgentBffAuthContext,
  type AgentTaskStreamCard,
} from "../agent/agentBffRouteShell";
import { type AiDomain, type AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "../tools/aiToolPlanPolicy";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  AI_COMMAND_CENTER_ACTION_TEST_IDS,
  AI_COMMAND_CENTER_SUPPORTED_TOOL_NAMES,
  type AiCommandCenterAction,
  type AiCommandCenterActionBoundary,
  type AiCommandCenterActionView,
  type AiCommandCenterCardView,
  type AiCommandCenterSectionId,
  type AiCommandCenterSectionView,
  type AiCommandCenterViewModel,
  type BuildAiCommandCenterViewModelInput,
} from "./AiCommandCenterTypes";

const INSUFFICIENT_DATA_SUMMARY =
  "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u0430\u043d\u043d\u044b\u0445";
const INSUFFICIENT_DATA_REASON =
  "\u041d\u0443\u0436\u043d\u0430 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u0430 evidence ref";

const SECTION_TITLES: Record<AiCommandCenterSectionId, string> = {
  urgent: "\u0421\u0440\u043e\u0447\u043d\u043e",
  money: "\u0414\u0435\u043d\u044c\u0433\u0438",
  procurement: "\u0417\u0430\u043a\u0443\u043f\u043a\u0438",
  warehouse: "\u0421\u043a\u043b\u0430\u0434",
  documents: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  contractors: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0438",
  reports: "\u041e\u0442\u0447\u0451\u0442\u044b",
};

const ACTION_LABELS: Record<AiCommandCenterAction, string> = {
  ask_why: "\u041f\u043e\u0447\u0435\u043c\u0443?",
  open_source: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
  preview_tool: "\u041f\u0440\u0435\u0432\u044c\u044e",
  create_draft: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
  submit_for_approval: "\u041d\u0430 approval",
};

const DOMAIN_LABELS: Record<AiDomain, string> = {
  control: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c",
  procurement: "\u0417\u0430\u043a\u0443\u043f\u043a\u0438",
  marketplace: "\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0438",
  warehouse: "\u0421\u043a\u043b\u0430\u0434",
  finance: "\u0414\u0435\u043d\u044c\u0433\u0438",
  reports: "\u041e\u0442\u0447\u0451\u0442\u044b",
  documents: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  subcontracts: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0438",
  projects: "\u041e\u0431\u044a\u0435\u043a\u0442\u044b",
  map: "\u041a\u0430\u0440\u0442\u0430",
  chat: "\u0427\u0430\u0442",
  real_estate_future: "\u0411\u0443\u0434\u0443\u0449\u0435\u0435",
};

const PRIORITY_LABELS: Record<AiCommandCenterCardView["priority"], string> = {
  critical: "\u041a\u0440\u0438\u0442\u0438\u0447\u043d\u043e",
  high: "\u0412\u044b\u0441\u043e\u043a\u0438\u0439",
  normal: "\u041d\u043e\u0440\u043c\u0430",
  low: "\u041d\u0438\u0437\u043a\u0438\u0439",
};

const PRIORITY_SORT: Record<AiCommandCenterCardView["priority"], number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const SECTION_ORDER: readonly AiCommandCenterSectionId[] = [
  "urgent",
  "money",
  "procurement",
  "warehouse",
  "documents",
  "contractors",
  "reports",
];

const SCREEN_BY_DOMAIN: Record<AiDomain, string> = {
  control: "director.dashboard",
  procurement: "buyer.main",
  marketplace: "market.home",
  warehouse: "warehouse.main",
  finance: "accountant.main",
  reports: "reports.modal",
  documents: "reports.modal",
  subcontracts: "contractor.main",
  projects: "foreman.main",
  map: "map.main",
  chat: "chat.main",
  real_estate_future: "director.dashboard",
};

const ENTITY_BY_DOMAIN: Record<AiDomain, string> = {
  control: "approval",
  procurement: "request",
  marketplace: "catalog_item",
  warehouse: "warehouse_item",
  finance: "finance_summary",
  reports: "report",
  documents: "document",
  subcontracts: "subcontract",
  projects: "project",
  map: "map_marker",
  chat: "chat_thread",
  real_estate_future: "future_signal",
};

function emptyViewModel(params: {
  role: AiUserRole;
  status: AiCommandCenterViewModel["status"];
  runtimeStatus: AiCommandCenterViewModel["runtimeStatus"];
  denied: boolean;
  errorMessage: string | null;
  blockedReason?: string | null;
}): AiCommandCenterViewModel {
  return {
    contractId: "ai_command_center_view_model_v1",
    documentType: "ai_command_center",
    endpoint: "GET /agent/task-stream",
    role: params.role,
    roleScoped: true,
    readOnly: true,
    evidenceRequired: true,
    mutationCount: 0,
    directMutationAllowed: false,
    directSupabaseFromUi: false,
    modelProviderFromUi: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    providerPayloadStored: false,
    denied: params.denied,
    empty: true,
    status: params.status,
    runtimeStatus: params.runtimeStatus,
    taskStreamLoaded: false,
    blockedReason: params.blockedReason ?? null,
    nextCursor: null,
    countsByType: {},
    errorMessage: params.errorMessage,
    cards: [],
    sections: SECTION_ORDER.map((id) => ({
      id,
      title: SECTION_TITLES[id],
      cards: [],
    })),
    source: "bff:agent_task_stream_unavailable",
  };
}

function isSupportedToolName(value: string | undefined): value is AiToolName {
  return Boolean(
    value &&
      AI_COMMAND_CENTER_SUPPORTED_TOOL_NAMES.some((toolName) => toolName === value),
  );
}

function hasEvidence(card: AgentTaskStreamCard): boolean {
  return card.evidenceRefs.some((ref) => ref.trim().length > 0);
}

function normalizeEvidenceRefs(card: AgentTaskStreamCard): string[] {
  return card.evidenceRefs.map((ref) => ref.trim()).filter(Boolean);
}

function sourceEntityIdHash(card: AgentTaskStreamCard): string {
  return `task:${card.id}`;
}

function sectionForCard(card: AgentTaskStreamCard): AiCommandCenterSectionId {
  if (card.priority === "critical" || card.priority === "high") return "urgent";
  if (card.domain === "finance") return "money";
  if (card.domain === "procurement" || card.domain === "marketplace") return "procurement";
  if (card.domain === "warehouse") return "warehouse";
  if (card.domain === "documents") return "documents";
  if (card.domain === "subcontracts" || card.domain === "projects") return "contractors";
  return "reports";
}

function actionBoundary(action: AiCommandCenterAction): AiCommandCenterActionBoundary {
  switch (action) {
    case "ask_why":
      return "local_explain";
    case "open_source":
      return "source_navigation";
    case "preview_tool":
      return "safe_tool_preview";
    case "create_draft":
      return "draft_only";
    case "submit_for_approval":
      return "approval_gate";
  }
}

function actionToolName(params: {
  action: AiCommandCenterAction;
  recommendedToolName: AiToolName | null;
}): AiToolName | null {
  if (params.action === "submit_for_approval") return "submit_for_approval";
  if (params.action === "create_draft" || params.action === "preview_tool") {
    return params.recommendedToolName;
  }
  return null;
}

function buildActionView(params: {
  action: AiCommandCenterAction;
  enabled: boolean;
  recommendedToolName: AiToolName | null;
  disabledReason?: string | null;
}): AiCommandCenterActionView {
  return {
    action: params.action,
    label: ACTION_LABELS[params.action],
    testID: AI_COMMAND_CENTER_ACTION_TEST_IDS[params.action],
    enabled: params.enabled,
    boundary: actionBoundary(params.action),
    toolName: actionToolName({
      action: params.action,
      recommendedToolName: params.recommendedToolName,
    }),
    disabledReason: params.enabled ? null : params.disabledReason ?? null,
    mutationCount: 0,
    executed: false,
    finalMutation: false,
  };
}

function actionViewsForCard(params: {
  card: AgentTaskStreamCard;
  role: AiUserRole;
  evidencePresent: boolean;
  recommendedToolName: AiToolName | null;
}): readonly AiCommandCenterActionView[] {
  const views: AiCommandCenterActionView[] = [
    buildActionView({
      action: "ask_why",
      enabled: true,
      recommendedToolName: params.recommendedToolName,
    }),
    buildActionView({
      action: "open_source",
      enabled: true,
      recommendedToolName: params.recommendedToolName,
    }),
  ];

  const plan = params.recommendedToolName
    ? planAiToolUse({ toolName: params.recommendedToolName, role: params.role })
    : null;
  if (!plan?.allowed) return views;

  if (plan.mode === "read_contract_plan") {
    views.push(
      buildActionView({
        action: "preview_tool",
        enabled: params.evidencePresent,
        recommendedToolName: params.recommendedToolName,
        disabledReason: INSUFFICIENT_DATA_REASON,
      }),
    );
  }

  if (plan.mode === "draft_only_plan") {
    views.push(
      buildActionView({
        action: "create_draft",
        enabled: params.evidencePresent,
        recommendedToolName: params.recommendedToolName,
        disabledReason: INSUFFICIENT_DATA_REASON,
      }),
    );
  }

  if (plan.mode === "approval_gate_plan") {
    views.push(
      buildActionView({
        action: "submit_for_approval",
        enabled: params.evidencePresent,
        recommendedToolName: params.recommendedToolName,
        disabledReason: INSUFFICIENT_DATA_REASON,
      }),
    );
  }

  return views;
}

function allowedActionsFromViews(
  views: readonly AiCommandCenterActionView[],
): AiCommandCenterAction[] {
  return views.filter((view) => view.enabled).map((view) => view.action);
}

function requiresApprovalFromViews(views: readonly AiCommandCenterActionView[]): boolean {
  return views.some(
    (view) =>
      view.action === "submit_for_approval" &&
      view.enabled &&
      view.toolName === "submit_for_approval",
  );
}

export function buildAiCommandCenterCardView(params: {
  card: AgentTaskStreamCard;
  role: AiUserRole;
}): AiCommandCenterCardView {
  const evidenceRefs = normalizeEvidenceRefs(params.card);
  const evidencePresent = hasEvidence(params.card);
  const recommendedToolName = isSupportedToolName(params.card.recommendedToolName)
    ? params.card.recommendedToolName
    : null;
  const actionViews = actionViewsForCard({
    card: params.card,
    role: params.role,
    evidencePresent,
    recommendedToolName,
  });
  const allowedActions = allowedActionsFromViews(actionViews);
  const requiresApproval = requiresApprovalFromViews(actionViews);

  return {
    id: params.card.id,
    taskStreamCardId: params.card.id,
    taskStreamType: params.card.type,
    role: params.role,
    domain: params.card.domain,
    title: params.card.title,
    summary: evidencePresent ? params.card.summary : INSUFFICIENT_DATA_SUMMARY,
    priority: params.card.priority,
    evidenceRefs,
    allowedActions,
    requiresApproval,
    sourceScreenId: SCREEN_BY_DOMAIN[params.card.domain],
    sourceEntityType: ENTITY_BY_DOMAIN[params.card.domain],
    sourceEntityIdHash: sourceEntityIdHash(params.card),
    sectionId: sectionForCard(params.card),
    priorityLabel: PRIORITY_LABELS[params.card.priority],
    domainLabel: DOMAIN_LABELS[params.card.domain],
    evidenceLabel: evidencePresent
      ? `${evidenceRefs.length} evidence`
      : INSUFFICIENT_DATA_SUMMARY,
    insufficientEvidence: !evidencePresent,
    recommendedToolName,
    actionViews,
  };
}

function sortCards(
  cards: readonly AiCommandCenterCardView[],
): AiCommandCenterCardView[] {
  return [...cards].sort((left, right) => {
    const priorityDelta = PRIORITY_SORT[left.priority] - PRIORITY_SORT[right.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return left.title.localeCompare(right.title);
  });
}

function buildSections(
  cards: readonly AiCommandCenterCardView[],
): AiCommandCenterSectionView[] {
  return SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLES[id],
    cards: sortCards(cards.filter((card) => card.sectionId === id)),
  }));
}

export function resolveAiCommandCenterActionBoundary(params: {
  card: AiCommandCenterCardView;
  action: AiCommandCenterAction;
}): AiCommandCenterActionView | null {
  return params.card.actionViews.find((view) => view.action === params.action) ?? null;
}

export function hasUnsafeAiCommandCenterPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafeAiCommandCenterPayload);

  const record = value as Record<string, unknown>;
  const forbiddenKeys = new Set([
    "rawprompt",
    "raw_prompt",
    "providerpayload",
    "provider_payload",
    "rawdbrows",
    "raw_db_rows",
    "dbrows",
    "rows",
  ]);
  return Object.entries(record).some(([key, nested]) => {
    const normalizedKey = key.toLowerCase();
    if (forbiddenKeys.has(normalizedKey)) return true;
    return hasUnsafeAiCommandCenterPayload(nested);
  });
}

export function buildAiCommandCenterViewModel(
  input: BuildAiCommandCenterViewModelInput,
): AiCommandCenterViewModel {
  if (!input.auth || input.auth.role === "unknown") {
    return emptyViewModel({
      role: input.auth?.role ?? "unknown",
      status: "denied",
      runtimeStatus: "denied",
      denied: true,
      errorMessage: "\u0420\u043e\u043b\u044c \u043d\u0435 \u0434\u043e\u043f\u0443\u0449\u0435\u043d\u0430",
    });
  }

  const taskStream = getAgentTaskStream({
    auth: input.auth,
    page: input.page ?? { limit: 50 },
    sourceCards: input.sourceCards,
    runtimeEvidence: input.runtimeEvidence,
    screenId: "ai.command.center",
  });

  if (!taskStream.ok) {
    return emptyViewModel({
      role: input.auth.role,
      status: "error",
      runtimeStatus: "error",
      denied: false,
      errorMessage: taskStream.error.message,
    });
  }

  const cards = sortCards(
    taskStream.data.cards.map((card) =>
      buildAiCommandCenterCardView({ card, role: input.auth!.role }),
    ),
  );
  const sections = buildSections(cards);

  return {
    contractId: "ai_command_center_view_model_v1",
    documentType: "ai_command_center",
    endpoint: "GET /agent/task-stream",
    role: input.auth.role,
    roleScoped: true,
    readOnly: true,
    evidenceRequired: true,
    mutationCount: 0,
    directMutationAllowed: false,
    directSupabaseFromUi: false,
    modelProviderFromUi: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    providerPayloadStored: false,
    denied: false,
    empty: cards.length === 0,
    status: taskStream.data.runtimeStatus === "loaded"
      ? "loaded"
      : taskStream.data.runtimeStatus === "blocked"
        ? "blocked"
        : "empty",
    runtimeStatus: taskStream.data.runtimeStatus,
    taskStreamLoaded: taskStream.data.runtimeStatus === "loaded",
    blockedReason: taskStream.data.blockedReason,
    nextCursor: taskStream.data.page.nextCursor,
    countsByType: taskStream.data.countsByType,
    errorMessage: null,
    cards,
    sections,
    source: taskStream.data.source,
  };
}

export type { AgentBffAuthContext, AgentTaskStreamCard };
