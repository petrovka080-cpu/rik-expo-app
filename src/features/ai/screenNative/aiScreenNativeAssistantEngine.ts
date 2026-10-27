import { getAiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantEngine";
import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";
import { hydrateAiScreenNativeAssistantContext } from "./aiScreenNativeAssistantHydrator";
import {
  getAiScreenNativeAssistantRegistryEntry,
  listAiScreenNativeCoverageGroups,
  resolveDefaultScreenNativeScreenId,
} from "./aiScreenNativeAssistantRegistry";
import { enforceAiScreenNativeAssistantPolicy } from "./aiScreenNativeAssistantPolicy";
import type {
  AiScreenEvidence,
  AiScreenNativeAssistantHydrationRequest,
  AiScreenNativeAssistantPack,
  AiScreenNativeAssistantRegistryEntry,
  AiScreenReadyOption,
} from "./aiScreenNativeAssistantTypes";
import { sanitizeAiScreenNativeUserCopy } from "./aiScreenNativeUserCopy";

function evidenceFromLabels(labels: string[], fallbackScreenId: string): AiScreenEvidence[] {
  const unique = [...new Set(labels.length ? labels : [`screen:${fallbackScreenId}`])];
  return unique.slice(0, 8).map((label, index) => ({
    id: `evidence.${index}`,
    label,
    source: label.startsWith("document:") ? "document" : label.startsWith("approval:") ? "approval" : "screen",
  }));
}

function rolePackToReadyOptions(rolePack: AiRoleScreenAssistantPack): AiScreenReadyOption[] {
  return rolePack.readyItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    evidence: item.evidence,
    riskLevel: item.riskLevel,
    actionKind: item.actionKind,
    primaryActionLabel: item.primaryActionLabel,
    secondaryActionLabel: item.secondaryActionLabel,
    requiresApproval: item.actionKind === "approval_required",
    canExecuteDirectly: false,
  }));
}

function buildFromRolePack(
  entry: AiScreenNativeAssistantRegistryEntry,
  rolePack: AiRoleScreenAssistantPack,
): AiScreenNativeAssistantPack {
  const optionEvidence = rolePack.readyItems.flatMap((item) => item.evidence);
  const riskEvidence = rolePack.risks.flatMap((risk) => risk.evidence);
  const evidence = evidenceFromLabels([...optionEvidence, ...riskEvidence], rolePack.screenId);
  return enforceAiScreenNativeAssistantPolicy({
    screenId: rolePack.screenId,
    roleScope: entry.roleScope,
    domain: entry.domain,
    title: entry.title || rolePack.title,
    summary: sanitizeAiScreenNativeUserCopy(rolePack.summary || entry.defaultSummary),
    today: rolePack.today ? {
      count: rolePack.today.count,
      amountLabel: rolePack.today.amountLabel,
      criticalCount: rolePack.today.criticalCount,
      overdueCount: rolePack.today.overdueCount,
      pendingApprovalCount: rolePack.nextActions.filter((action) => action.requiresApproval).length,
    } : undefined,
    criticalItems: rolePack.risks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      reason: risk.reason,
      severity: risk.severity,
      evidence: risk.evidence,
    })),
    readyOptions: rolePackToReadyOptions(rolePack),
    risks: rolePack.risks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      reason: risk.reason,
      severity: risk.severity,
      evidence: risk.evidence,
    })),
    missingData: rolePack.missingData,
    evidence,
    nextActions: rolePack.nextActions,
    chatStarterQuestions: entry.chatStarterQuestions,
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
    fakeDataUsed: false,
  });
}

function buildFallbackPack(
  entry: AiScreenNativeAssistantRegistryEntry,
  hydrated: ReturnType<typeof hydrateAiScreenNativeAssistantContext>,
): AiScreenNativeAssistantPack {
  const hasEvidence = hydrated.evidenceLabels.length > 0 || Boolean(hydrated.scopedFactsSummary);
  const evidence = evidenceFromLabels(hydrated.evidenceLabels, hydrated.screenId);
  const missingLabel = hydrated.missingLabel ?? (hasEvidence ? null : "read-only данные экрана не загружены");
  return enforceAiScreenNativeAssistantPolicy({
    screenId: hydrated.screenId,
    roleScope: entry.roleScope,
    domain: entry.domain,
    title: entry.title,
    summary: sanitizeAiScreenNativeUserCopy(hydrated.scopedFactsSummary || entry.defaultSummary),
    today: Object.values(hydrated.today).some((value) => value !== undefined) ? hydrated.today : undefined,
    criticalItems: hydrated.criticalTitle || hydrated.criticalReason ? [{
      id: `${hydrated.screenId}.critical.1`,
      title: hydrated.criticalTitle || "Требует внимания",
      reason: hydrated.criticalReason || "Нужно проверить evidence перед действием.",
      severity: "high",
      evidence: evidence.map((item) => item.label),
    }] : [],
    readyOptions: [{
      id: `${hydrated.screenId}.ready.1`,
      title: hydrated.readyOptionTitle || entry.defaultReadyOptionTitle,
      description: hydrated.readyOptionDescription || entry.defaultReadyOptionDescription,
      evidence: evidence.map((item) => item.label),
      riskLevel: hydrated.riskReason ? "medium" : "low",
      actionKind: "draft_only",
      primaryActionLabel: entry.defaultNextActions[0],
      secondaryActionLabel: entry.defaultNextActions[1],
      requiresApproval: false,
      canExecuteDirectly: false,
    }],
    risks: hydrated.riskReason ? [{
      id: `${hydrated.screenId}.risk.1`,
      title: hydrated.riskTitle || "Риск экрана",
      reason: hydrated.riskReason,
      severity: "medium",
      evidence: evidence.map((item) => item.label),
    }] : [],
    missingData: missingLabel ? [{
      id: `${hydrated.screenId}.missing.1`,
      label: missingLabel,
      blocksAction: true,
    }] : [],
    evidence,
    nextActions: entry.defaultNextActions.map((label, index) => ({
      id: `${hydrated.screenId}.action.${index + 1}`,
      label,
      kind: label.toLowerCase().includes("approval") || label.toLowerCase().includes("соглас")
        ? "submit_for_approval"
        : label.toLowerCase().includes("срав")
          ? "compare"
          : label.toLowerCase().includes("чернов") || label.toLowerCase().includes("draft") || label.toLowerCase().includes("подготов")
            ? "draft"
            : "review",
      requiresApproval: label.toLowerCase().includes("approval") || label.toLowerCase().includes("соглас"),
      canExecuteDirectly: false,
    })),
    chatStarterQuestions: entry.chatStarterQuestions,
    directMutationAllowed: false,
    providerRequired: false,
    dbWriteUsed: false,
    fakeDataUsed: false,
  });
}

export function getAiScreenNativeAssistantPack(
  request: AiScreenNativeAssistantHydrationRequest,
): AiScreenNativeAssistantPack {
  const hydrated = hydrateAiScreenNativeAssistantContext(request);
  const screenId = hydrated.screenId || resolveDefaultScreenNativeScreenId(request.context);
  const entry = getAiScreenNativeAssistantRegistryEntry(screenId)
    ?? getAiScreenNativeAssistantRegistryEntry(resolveDefaultScreenNativeScreenId(request.context));
  if (!entry) {
    throw new Error(`AI screen-native assistant registry missing for ${screenId}`);
  }

  const rolePack = getAiRoleScreenAssistantPack({ ...request, screenId });
  const rolePackIsGeneric = rolePack.readyItems.length === 1
    && rolePack.readyItems[0]?.id === `${screenId}.screen_context`;
  if (
    !rolePackIsGeneric &&
    rolePack.screenId === screenId &&
    (rolePack.readyItems.length > 0 || rolePack.risks.length > 0 || rolePack.missingData.length > 0)
  ) {
    return buildFromRolePack(entry, rolePack);
  }

  return buildFallbackPack(entry, hydrated);
}

export function describeAiScreenNativeAssistantPack(pack: AiScreenNativeAssistantPack): string {
  const ready = pack.readyOptions.slice(0, 5).map((item) => (
    `- ${item.title}: ${item.description}; evidence: ${item.evidence.join(", ")}`
  )).join("\n");
  const critical = pack.criticalItems.slice(0, 4).map((item) => `- ${item.title}: ${item.reason}`).join("\n");
  const risks = pack.risks.slice(0, 4).map((risk) => `- ${risk.title}: ${risk.reason}`).join("\n");
  const missing = pack.missingData.slice(0, 4).map((item) => `- ${item.label}`).join("\n");
  const actions = pack.nextActions.slice(0, 5).map((action) => `- ${action.label}${action.requiresApproval ? " (approval)" : ""}`).join("\n");
  return [
    `SCREEN_NATIVE_ASSISTANT ${pack.screenId} ${pack.domain}`,
    pack.summary,
    pack.today ? `Today: count ${pack.today.count ?? 0}, amount ${pack.today.amountLabel ?? "n/a"}, critical ${pack.today.criticalCount ?? 0}, pending approval ${pack.today.pendingApprovalCount ?? 0}.` : null,
    critical ? `Critical:\n${critical}` : null,
    ready ? `Ready options:\n${ready}` : null,
    risks ? `Risks:\n${risks}` : null,
    missing ? `Missing data:\n${missing}` : null,
    actions ? `Next actions:\n${actions}` : null,
    "No direct order, payment, warehouse mutation, document signing, or approval bypass is allowed.",
  ].filter(Boolean).join("\n");
}

export function getAiScreenNativeCoverageCount(): number {
  return listAiScreenNativeCoverageGroups().length;
}
