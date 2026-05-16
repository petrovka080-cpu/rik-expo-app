import {
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionEntry } from "../screenAudit/aiScreenButtonRoleActionTypes";
import { sanitizeAiScreenWorkflowUserCopy } from "./aiScreenWorkflowUserCopy";
import { hydrateAiScreenWorkflowContext } from "./aiScreenWorkflowHydrator";
import {
  getAiScreenWorkflowCoverageCount,
  getAiScreenWorkflowRegistryEntry,
  listAiScreenWorkflowRegistry,
  resolveDefaultAiScreenWorkflowScreenId,
} from "./aiScreenWorkflowRegistry";
import { buildAiScreenWorkflowAction } from "./aiScreenWorkflowButtonResolver";
import { enforceAiScreenWorkflowPolicy } from "./aiScreenWorkflowPolicy";
import type {
  AiScreenWorkflowAction,
  AiScreenWorkflowHydrationRequest,
  AiScreenWorkflowPack,
  AiScreenWorkflowReadyBlock,
  AiScreenWorkflowReadyOption,
  AiScreenWorkflowRiskLevel,
} from "./aiScreenWorkflowTypes";

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function evidenceForScreen(entries: readonly AiScreenButtonActionEntry[], hydratedEvidence: readonly string[], screenId: string): string[] {
  return unique([
    ...hydratedEvidence,
    ...entries.flatMap((entry) => entry.evidenceSources.map((source) => `source:${source}`)),
    `screen:${screenId}`,
  ]).slice(0, 8);
}

function riskLevelForAction(action: AiScreenWorkflowAction): AiScreenWorkflowRiskLevel {
  if (action.actionKind === "forbidden") return "critical";
  if (action.actionKind === "approval_required") return "high";
  if (action.actionKind === "draft_only") return "medium";
  return "low";
}

function buildReadyBlocks(params: {
  screenId: string;
  preparedOutputLabels: readonly string[];
  evidence: readonly string[];
  summary: string;
}): AiScreenWorkflowReadyBlock[] {
  const labels = params.preparedOutputLabels.length > 0
    ? params.preparedOutputLabels
    : ["summary", "risks", "missing data", "next action"];
  return labels.slice(0, 4).map((label, index) => ({
    id: `${params.screenId}.ready_block.${index + 1}`,
    title: label,
    body: index === 0
      ? params.summary
      : `AI prepared ${label} from available screen context and audited action policy.`,
    evidence: [...params.evidence],
    severity: index === 0 ? "low" : "medium",
  }));
}

function buildReadyOptions(params: {
  screenId: string;
  actions: readonly AiScreenWorkflowAction[];
  evidence: readonly string[];
}): AiScreenWorkflowReadyOption[] {
  return params.actions
    .filter((action) => action.actionKind !== "forbidden")
    .slice(0, 6)
    .map((action, index) => ({
      id: `${params.screenId}.ready_option.${index + 1}`,
      title: action.label,
      description: action.actionKind === "approval_required"
        ? "Ready as approval-ledger submission; AI cannot execute it directly."
        : action.actionKind === "draft_only"
          ? "Ready as a client-safe draft action without DB writes."
          : "Ready as a safe read/explain action from screen context.",
      evidence: [...params.evidence],
      riskLevel: riskLevelForAction(action),
      actionKind: action.actionKind,
      primaryActionId: action.id,
    }));
}

export function getAiScreenWorkflowPack(request: AiScreenWorkflowHydrationRequest): AiScreenWorkflowPack {
  const hydrated = hydrateAiScreenWorkflowContext(request);
  const requestedScreenId = hydrated.workflowScreenId || resolveDefaultAiScreenWorkflowScreenId(request.context);
  const entry = getAiScreenWorkflowRegistryEntry(requestedScreenId)
    ?? getAiScreenWorkflowRegistryEntry(resolveDefaultAiScreenWorkflowScreenId(request.context));
  if (!entry) {
    throw new Error(`AI screen workflow registry missing for ${requestedScreenId}`);
  }

  const auditEntries = listAiScreenButtonRoleActionEntriesForScreen(entry.screenId);
  const evidence = evidenceForScreen(auditEntries, hydrated.evidenceLabels, entry.screenId);
  const actions = auditEntries.map(buildAiScreenWorkflowAction);
  const hasHydratedWork = hydrated.hasRealHydratedEvidence || Boolean(hydrated.criticalTitle || hydrated.readyOptionTitle);
  const missingData = [
    ...(!hasHydratedWork ? [{
      id: `${entry.screenId}.missing.context`,
      label: "hydrated screen data is missing; AI can show workflow policy and next safe action, but cannot invent business facts",
      blocksAction: true,
    }] : []),
    ...actions
      .filter((action) => action.exactBlocker && action.actionKind !== "forbidden")
      .map((action) => ({
        id: `${action.id}.missing.route`,
        label: action.exactBlocker ?? "route missing",
        blocksAction: true,
      })),
  ];
  const criticalAction = actions.find((action) => action.actionKind === "approval_required")
    ?? actions.find((action) => action.actionKind === "forbidden")
    ?? actions[0];
  const summary = sanitizeAiScreenWorkflowUserCopy(
    hydrated.scopedFactsSummary || entry.defaultSummary,
  );

  return enforceAiScreenWorkflowPolicy({
    screenId: entry.screenId,
    roleScope: entry.roleScope,
    domain: entry.domain,
    title: entry.title,
    userGoal: entry.userGoal,
    summary,
    readyBlocks: buildReadyBlocks({
      screenId: entry.screenId,
      preparedOutputLabels: entry.preparedOutputLabels,
      evidence,
      summary,
    }),
    criticalItems: criticalAction ? [{
      id: `${entry.screenId}.critical.workflow`,
      title: hydrated.criticalTitle || criticalAction.label,
      reason: hydrated.criticalReason || (
        criticalAction.actionKind === "forbidden"
          ? criticalAction.forbiddenReason ?? "Forbidden action is blocked from direct execution."
          : "This screen has a workflow action that must stay safe, draft-only, or approval-ledger routed."
      ),
      evidence,
      nextActionId: criticalAction.id,
    }] : [],
    readyOptions: buildReadyOptions({ screenId: entry.screenId, actions, evidence }),
    missingData,
    actions,
    qaExamples: entry.qaExamples,
    safety: {
      fakeDataUsed: false,
      directDangerousMutationAllowed: false,
      providerRequired: false,
      dbWriteUsed: false,
      approvalBypassAllowed: false,
    },
  });
}

export function listAiScreenWorkflowPacks(): AiScreenWorkflowPack[] {
  return listAiScreenWorkflowRegistry().map((entry) => getAiScreenWorkflowPack({
    role: "unknown",
    context: "unknown",
    screenId: entry.screenId,
  }));
}

export function describeAiScreenWorkflowPack(pack: AiScreenWorkflowPack): string {
  const blocks = pack.readyBlocks.slice(0, 3).map((block) => `- ${block.title}: ${block.body}`).join("\n");
  const actions = pack.actions.slice(0, 6).map((action) => (
    `- ${action.label}: ${action.actionKind}${action.approvalRoute ? " via approval ledger" : ""}${action.exactBlocker ? ` (${action.exactBlocker})` : ""}`
  )).join("\n");
  const missing = pack.missingData.slice(0, 4).map((item) => `- ${item.label}`).join("\n");
  return [
    `SCREEN_WORKFLOW ${pack.screenId} ${pack.domain}`,
    pack.title,
    pack.userGoal,
    pack.summary,
    blocks ? `Prepared work:\n${blocks}` : null,
    actions ? `Actions:\n${actions}` : null,
    missing ? `Missing data:\n${missing}` : null,
    "Dangerous actions cannot execute directly; approval-required actions route to the ledger.",
  ].filter(Boolean).join("\n");
}

export { getAiScreenWorkflowCoverageCount };
