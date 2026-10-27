import {
  canUseAiCapability,
  hasDirectorFullAiAccess,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { planAiToolUse } from "../tools/aiToolPlanPolicy";
import { getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  hasAiTaskStreamEvidence,
  normalizeAiTaskStreamEvidenceRefs,
  toAiTaskStreamEvidenceRefs,
} from "./aiTaskStreamEvidence";
import type {
  AiTaskStreamAction,
  AiTaskStreamCard,
  AiTaskStreamCardProducer,
  AiTaskStreamDraftEvidence,
  AiTaskStreamProducerMetadata,
  AiTaskStreamProducerResult,
  AiTaskStreamScope,
} from "./aiTaskStreamRuntimeTypes";

const WAREHOUSE_ROLES: readonly AiUserRole[] = ["director", "control", "warehouse"];
const PROCUREMENT_ROLES: readonly AiUserRole[] = ["director", "control", "buyer"];
const DRAFT_ROLES: readonly AiUserRole[] = [
  "director",
  "control",
  "foreman",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
];
const FINANCE_ROLES: readonly AiUserRole[] = ["director", "control", "accountant"];

function emptyProducerResult(): AiTaskStreamProducerResult {
  return { cards: [], evidenceRefs: [], blocks: [] };
}

function metadata(params: Omit<AiTaskStreamProducerMetadata, "evidenceRequired" | "mutation_count">): AiTaskStreamProducerMetadata {
  return {
    ...params,
    evidenceRequired: true,
    mutation_count: 0,
  };
}

function roleCanReadDomain(role: AiUserRole, domain: AiDomain): boolean {
  return canUseAiCapability({ role, domain, capability: "read_context" });
}

function producerDenied(role: AiUserRole, domain: AiDomain, roles: readonly AiUserRole[]): boolean {
  return !roles.includes(role) || !roleCanReadDomain(role, domain);
}

function roleScope(roles: readonly AiUserRole[]): AiTaskStreamScope {
  return {
    kind: "role_domain",
    allowedRoles: roles,
  };
}

function ownOrRoleScope(params: {
  role: AiUserRole;
  ownerUserIdHash?: string;
  roles: readonly AiUserRole[];
}): AiTaskStreamScope {
  if (params.role === "contractor" && params.ownerUserIdHash) {
    return {
      kind: "own_record",
      ownerUserIdHash: params.ownerUserIdHash,
    };
  }
  return roleScope(params.roles);
}

function actionSetForTool(toolName: AiToolName, role: AiUserRole): AiTaskStreamAction[] {
  const base: AiTaskStreamAction[] = ["ask_why", "open_source"];
  const plan = planAiToolUse({ toolName, role });
  if (!plan.allowed) return base;
  if (plan.mode === "read_contract_plan") return [...base, "preview_tool"];
  if (plan.mode === "draft_only_plan") return [...base, "create_draft"];
  if (plan.mode === "approval_gate_plan") return [...base, "submit_for_approval"];
  return base;
}

function toolAllowed(toolName: AiToolName, role: AiUserRole): boolean {
  return planAiToolUse({ toolName, role }).allowed;
}

function baseCard(params: {
  id: string;
  type: AiTaskStreamCard["type"];
  domain: AiDomain;
  title: string;
  summary: string;
  priority: AiTaskStreamCard["priority"];
  evidenceRefs: readonly string[];
  allowedActions: AiTaskStreamAction[];
  requiresApproval: boolean;
  sourceScreenId: string;
  sourceEntityType: string;
  sourceEntityIdHash: string;
  createdAt: string;
  scope: AiTaskStreamScope;
  recommendedToolName?: AiToolName;
  nextActionLabel?: string;
}): AiTaskStreamCard {
  return {
    ...params,
    evidenceRefs: normalizeAiTaskStreamEvidenceRefs(params.evidenceRefs),
  };
}

export const warehouseStatusProducer: AiTaskStreamCardProducer = {
  metadata: metadata({
    name: "warehouseStatusProducer",
    domain: "warehouse",
    roles: WAREHOUSE_ROLES,
    inputPolicy: "evidence_required",
    maxCards: 1,
    riskLevel: "safe_read",
  }),
  produce(context) {
    const evidence = context.evidence.warehouse;
    if (producerDenied(context.auth.role, "warehouse", WAREHOUSE_ROLES)) return emptyProducerResult();
    if (!evidence || !hasAiTaskStreamEvidence(evidence.evidenceRefs)) return emptyProducerResult();
    if (!toolAllowed("get_warehouse_status", context.auth.role)) return emptyProducerResult();

    const evidenceRefs = normalizeAiTaskStreamEvidenceRefs(evidence.evidenceRefs);
    const lowStockFlags = evidence.lowStockFlags ?? [];
    const title = lowStockFlags.length > 0
      ? "\u0421\u043a\u043b\u0430\u0434: \u0435\u0441\u0442\u044c \u0440\u0438\u0441\u043a \u043d\u0435\u0445\u0432\u0430\u0442\u043a\u0438"
      : "\u0421\u043a\u043b\u0430\u0434: \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0441\u0442\u0430\u0442\u043a\u0438";

    return {
      cards: [
        baseCard({
          id: "runtime-warehouse-status",
          type: "warehouse_low_stock",
          domain: "warehouse",
          title,
          summary: evidence.summary,
          priority: lowStockFlags.length > 0 ? "high" : "normal",
          evidenceRefs,
          allowedActions: actionSetForTool("get_warehouse_status", context.auth.role),
          requiresApproval: false,
          sourceScreenId: evidence.sourceScreenId ?? "warehouse.main",
          sourceEntityType: "warehouse_status",
          sourceEntityIdHash: evidence.sourceEntityIdHash ?? "warehouse:status:redacted",
          createdAt: context.nowIso,
          scope: roleScope(WAREHOUSE_ROLES),
          recommendedToolName: "get_warehouse_status",
          nextActionLabel: "preview_tool",
        }),
      ],
      evidenceRefs: toAiTaskStreamEvidenceRefs({
        refs: evidenceRefs,
        source: "safe_read",
        labelPrefix: "warehouse",
      }),
      blocks: [],
    };
  },
};

export const draftReadyProducer: AiTaskStreamCardProducer = {
  metadata: metadata({
    name: "draftReadyProducer",
    domain: "procurement",
    roles: DRAFT_ROLES,
    inputPolicy: "scoped_evidence_required",
    maxCards: 3,
    riskLevel: "draft_only",
  }),
  produce(context) {
    const drafts = context.evidence.drafts ?? [];
    const cards = drafts
      .filter((draft) => draft.draftKind !== "report")
      .filter((draft) => hasAiTaskStreamEvidence(draft.evidenceRefs))
      .filter((draft) => roleCanReadDomain(context.auth.role, draft.domain))
      .filter((draft) => context.auth.role !== "contractor" || draft.ownerUserIdHash === context.auth.userId)
      .slice(0, draftReadyProducer.metadata.maxCards)
      .map((draft) =>
        baseCard({
          id: `runtime-draft-ready-${draft.draftId}`,
          type: draft.draftKind === "report" ? "report_ready" : "draft_ready",
          domain: draft.domain,
          title: draftTitle(draft),
          summary: draft.summary,
          priority: "normal",
          evidenceRefs: draft.evidenceRefs,
          allowedActions: actionSetForTool("submit_for_approval", context.auth.role),
          requiresApproval: true,
          sourceScreenId: draft.sourceScreenId ?? screenForDraft(draft),
          sourceEntityType: `${draft.draftKind}_draft`,
          sourceEntityIdHash: `draft:${draft.draftId}`,
          createdAt: context.nowIso,
          scope: ownOrRoleScope({
            role: context.auth.role,
            ownerUserIdHash: draft.ownerUserIdHash,
            roles: DRAFT_ROLES,
          }),
          recommendedToolName: "submit_for_approval",
          nextActionLabel: "submit_for_approval",
        }),
      );

    return {
      cards,
      evidenceRefs: toAiTaskStreamEvidenceRefs({
        refs: cards.flatMap((card) => card.evidenceRefs),
        source: "draft_preview",
        labelPrefix: "draft",
      }),
      blocks: [],
    };
  },
};

export const reportReadyProducer: AiTaskStreamCardProducer = {
  metadata: metadata({
    name: "reportReadyProducer",
    domain: "reports",
    roles: DRAFT_ROLES,
    inputPolicy: "scoped_evidence_required",
    maxCards: 2,
    riskLevel: "draft_only",
  }),
  produce(context) {
    const drafts = context.evidence.drafts ?? [];
    const reportCards = drafts
      .filter((draft) => draft.draftKind === "report")
      .filter((draft) => hasAiTaskStreamEvidence(draft.evidenceRefs))
      .filter((draft) => roleCanReadDomain(context.auth.role, draft.domain))
      .filter((draft) => context.auth.role !== "contractor" || draft.ownerUserIdHash === context.auth.userId)
      .slice(0, reportReadyProducer.metadata.maxCards)
      .map((draft) =>
        baseCard({
          id: `runtime-report-ready-${draft.draftId}`,
          type: "report_ready",
          domain: draft.domain,
          title: draftTitle(draft),
          summary: draft.summary,
          priority: "normal",
          evidenceRefs: draft.evidenceRefs,
          allowedActions: actionSetForTool("submit_for_approval", context.auth.role),
          requiresApproval: true,
          sourceScreenId: draft.sourceScreenId ?? screenForDraft(draft),
          sourceEntityType: "report_draft",
          sourceEntityIdHash: `draft:${draft.draftId}`,
          createdAt: context.nowIso,
          scope: roleScope(DRAFT_ROLES),
          recommendedToolName: "submit_for_approval",
          nextActionLabel: "submit_for_approval",
        }),
      );
    return {
      cards: reportCards,
      evidenceRefs: toAiTaskStreamEvidenceRefs({
        refs: reportCards.flatMap((card) => card.evidenceRefs),
        source: "draft_preview",
        labelPrefix: "report",
      }),
      blocks: [],
    };
  },
};

export const approvalPendingProducer: AiTaskStreamCardProducer = {
  metadata: metadata({
    name: "approvalPendingProducer",
    domain: "control",
    roles: DRAFT_ROLES,
    inputPolicy: "scoped_evidence_required",
    maxCards: 3,
    riskLevel: "approval_required",
  }),
  produce(context) {
    const approvals = context.evidence.approvals ?? [];
    const cards = approvals
      .filter((approval) => hasAiTaskStreamEvidence(approval.evidenceRefs))
      .filter((approval) => hasDirectorFullAiAccess(context.auth.role) || roleCanReadDomain(context.auth.role, approval.domain))
      .filter((approval) => context.auth.role !== "contractor" || approval.ownerUserIdHash === context.auth.userId)
      .slice(0, approvalPendingProducer.metadata.maxCards)
      .map((approval) =>
        baseCard({
          id: `runtime-approval-pending-${approval.actionId}`,
          type: "approval_pending",
          domain: approval.domain,
          title: "\u041d\u0443\u0436\u0435\u043d approval",
          summary: approval.summary,
          priority: "high",
          evidenceRefs: approval.evidenceRefs,
          allowedActions: actionSetForTool("get_action_status", context.auth.role),
          requiresApproval: true,
          sourceScreenId: approval.screenId,
          sourceEntityType: "approval_action",
          sourceEntityIdHash: `approval:${approval.actionId}`,
          createdAt: context.nowIso,
          scope: ownOrRoleScope({
            role: context.auth.role,
            ownerUserIdHash: approval.ownerUserIdHash,
            roles: DRAFT_ROLES,
          }),
          recommendedToolName: "get_action_status",
          nextActionLabel: "open_source",
        }),
      );

    return {
      cards,
      evidenceRefs: toAiTaskStreamEvidenceRefs({
        refs: cards.flatMap((card) => card.evidenceRefs),
        source: "approval_gate",
        labelPrefix: "approval",
      }),
      blocks: [],
    };
  },
};

export const financeRiskProducer: AiTaskStreamCardProducer = {
  metadata: metadata({
    name: "financeRiskProducer",
    domain: "finance",
    roles: FINANCE_ROLES,
    inputPolicy: "evidence_required",
    maxCards: 1,
    riskLevel: "safe_read",
  }),
  produce(context) {
    const tool = getAiToolDefinition("get_finance_summary");
    if (!tool || tool.riskLevel !== "safe_read") {
      return {
        cards: [],
        evidenceRefs: [],
        blocks: [
          {
            producer: "financeRiskProducer",
            code: "BLOCKED_FINANCE_TOOL_NOT_READY",
            reason: "get_finance_summary safe-read tool is not ready",
          },
        ],
      };
    }
    if (producerDenied(context.auth.role, "finance", FINANCE_ROLES)) return emptyProducerResult();

    const evidence = context.evidence.finance;
    if (!evidence || !hasAiTaskStreamEvidence(evidence.evidenceRefs)) return emptyProducerResult();
    if (!toolAllowed("get_finance_summary", context.auth.role)) return emptyProducerResult();

    const hasRisk =
      (evidence.debtAmount ?? 0) > 0 ||
      (evidence.overdueCount ?? 0) > 0 ||
      (evidence.riskFlags ?? []).some((flag) => flag !== "no_finance_risk_flags");
    if (!hasRisk) return emptyProducerResult();

    const evidenceRefs = normalizeAiTaskStreamEvidenceRefs(evidence.evidenceRefs);
    return {
      cards: [
        baseCard({
          id: "runtime-finance-risk",
          type: "finance_risk",
          domain: "finance",
          title: "\u0424\u0438\u043d\u0430\u043d\u0441\u044b: \u0440\u0438\u0441\u043a \u043a \u0440\u0430\u0437\u0431\u043e\u0440\u0443",
          summary: evidence.summary,
          priority: (evidence.overdueCount ?? 0) > 0 ? "critical" : "high",
          evidenceRefs,
          allowedActions: actionSetForTool("get_finance_summary", context.auth.role),
          requiresApproval: false,
          sourceScreenId: "accountant.main",
          sourceEntityType: "finance_summary",
          sourceEntityIdHash: "finance:summary:redacted",
          createdAt: context.nowIso,
          scope: roleScope(FINANCE_ROLES),
          recommendedToolName: "get_finance_summary",
          nextActionLabel: "preview_tool",
        }),
      ],
      evidenceRefs: toAiTaskStreamEvidenceRefs({
        refs: evidenceRefs,
        source: "safe_read",
        labelPrefix: "finance",
      }),
      blocks: [],
    };
  },
};

export const procurementNextActionProducer: AiTaskStreamCardProducer = {
  metadata: metadata({
    name: "procurementNextActionProducer",
    domain: "marketplace",
    roles: PROCUREMENT_ROLES,
    inputPolicy: "scoped_evidence_required",
    maxCards: 1,
    riskLevel: "safe_read",
  }),
  produce(context) {
    if (producerDenied(context.auth.role, "marketplace", PROCUREMENT_ROLES)) return emptyProducerResult();
    const evidence = context.evidence.procurement;
    if (!evidence || !hasAiTaskStreamEvidence(evidence.evidenceRefs) || evidence.materialIds.length === 0) {
      return emptyProducerResult();
    }
    if (!toolAllowed("compare_suppliers", context.auth.role)) return emptyProducerResult();

    const evidenceRefs = normalizeAiTaskStreamEvidenceRefs(evidence.evidenceRefs);
    return {
      cards: [
        baseCard({
          id: "runtime-procurement-next-action",
          type: "recommended_next_action",
          domain: "marketplace",
          title: "\u0417\u0430\u043a\u0443\u043f\u043a\u0438: \u0441\u0440\u0430\u0432\u043d\u0438\u0442\u044c \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u043e\u0432",
          summary: evidence.summary,
          priority: "normal",
          evidenceRefs,
          allowedActions: actionSetForTool("compare_suppliers", context.auth.role),
          requiresApproval: false,
          sourceScreenId: evidence.sourceScreenId ?? "buyer.main",
          sourceEntityType: "procurement_signal",
          sourceEntityIdHash: "procurement:signal:redacted",
          createdAt: context.nowIso,
          scope: roleScope(PROCUREMENT_ROLES),
          recommendedToolName: "compare_suppliers",
          nextActionLabel: "preview_tool",
        }),
      ],
      evidenceRefs: toAiTaskStreamEvidenceRefs({
        refs: evidenceRefs,
        source: "safe_read",
        labelPrefix: "procurement",
      }),
      blocks: [],
    };
  },
};

function draftTitle(draft: AiTaskStreamDraftEvidence): string {
  if (draft.draftKind === "report") {
    return "\u041e\u0442\u0447\u0451\u0442: \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0433\u043e\u0442\u043e\u0432";
  }
  if (draft.draftKind === "act") {
    return "\u0410\u043a\u0442: \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0433\u043e\u0442\u043e\u0432";
  }
  return "\u0417\u0430\u044f\u0432\u043a\u0430: \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0433\u043e\u0442\u043e\u0432";
}

function screenForDraft(draft: AiTaskStreamDraftEvidence): string {
  if (draft.sourceScreenId) return draft.sourceScreenId;
  if (draft.draftKind === "request") return "buyer.main";
  if (draft.draftKind === "act") return "contractor.main";
  return "reports.modal";
}

export const AI_TASK_STREAM_CARD_PRODUCERS: readonly AiTaskStreamCardProducer[] = [
  warehouseStatusProducer,
  draftReadyProducer,
  approvalPendingProducer,
  procurementNextActionProducer,
  financeRiskProducer,
  reportReadyProducer,
] as const;
