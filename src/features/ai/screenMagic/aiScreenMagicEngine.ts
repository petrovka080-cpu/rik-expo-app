import {
  getAiScreenWorkflowPack,
  listAiScreenWorkflowPacks,
} from "../screenWorkflows/aiScreenWorkflowEngine";
import type {
  AiScreenWorkflowAction,
  AiScreenWorkflowPack,
} from "../screenWorkflows/aiScreenWorkflowTypes";
import {
  buildAiScreenMagicButton,
  buildAiScreenMagicIntentButton,
} from "./aiScreenMagicButtonResolver";
import {
  getAiScreenMagicRegistryEntry,
  listAiScreenMagicRegistry,
} from "./aiScreenMagicRegistry";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";
import type {
  AiScreenMagicHydrationRequest,
  AiScreenMagicButton,
  AiScreenMagicPack,
  AiScreenMagicPreparedWork,
  AiScreenMagicRegistryEntry,
} from "./aiScreenMagicTypes";
import { enforceAiScreenMagicPolicy } from "./aiScreenMagicPolicy";

function evidenceFromWorkflowPack(pack: AiScreenWorkflowPack): string[] {
  return [
    ...new Set([
      ...pack.readyBlocks.flatMap((block) => block.evidence),
      ...pack.criticalItems.flatMap((item) => item.evidence),
      ...pack.readyOptions.flatMap((item) => item.evidence),
      `screen:${pack.screenId}`,
    ]),
  ].slice(0, 8);
}

function missingDataFromWorkflowPack(pack: AiScreenWorkflowPack): string[] {
  return [...new Set(pack.missingData.map((item) => item.label).filter(Boolean))].slice(0, 6);
}

function labelForAction(
  action: AiScreenWorkflowAction,
  labels: AiScreenMagicRegistryEntry["buttonLabels"] | undefined,
): string {
  return labels?.[action.actionKind] ?? action.label;
}

function uniqueLabels(buttons: readonly AiScreenMagicButton[]): AiScreenMagicButton[] {
  const seen = new Set<string>();
  return buttons.filter((button) => {
    const key = button.label.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildButtons(
  workflowPack: AiScreenWorkflowPack,
  registry: AiScreenMagicRegistryEntry,
): AiScreenMagicButton[] {
  const workflowButtonPairs = workflowPack.actions.map((action) => ({
    declaredKind: action.actionKind,
    button: buildAiScreenMagicButton({
      action,
      label: labelForAction(action, registry.buttonLabels),
    }),
  }));
  const workflowButtons = workflowButtonPairs.map((pair) => pair.button);
  const templateByKind = new Map(workflowButtonPairs.map((pair) => [pair.declaredKind, pair.button]));
  const intentButtons = registry.buttonIntents.map((intent, index) => buildAiScreenMagicIntentButton({
    screenId: workflowPack.screenId,
    intent,
    template: intent.actionKind === "exact_blocker" ? undefined : templateByKind.get(intent.actionKind),
    index,
  }));
  return uniqueLabels([...intentButtons, ...workflowButtons]);
}

export function buildAiScreenMagicPackFromWorkflowPack(
  workflowPack: AiScreenWorkflowPack,
): AiScreenMagicPack {
  const registry = getAiScreenMagicRegistryEntry(workflowPack.screenId);
  if (!registry) {
    throw new Error(`AI screen magic registry missing for ${workflowPack.screenId}`);
  }

  const evidence = evidenceFromWorkflowPack(workflowPack);
  const missingData = [...new Set([
    ...missingDataFromWorkflowPack(workflowPack),
    ...registry.missingDataSummary,
  ])].slice(0, 6);
  const preparedWork: AiScreenMagicPreparedWork[] = registry.preparedWork.map((item, index) => ({
    id: `${workflowPack.screenId}.magic.prepared.${index + 1}`,
    title: sanitizeAiScreenMagicUserCopy(item.title),
    description: sanitizeAiScreenMagicUserCopy(item.description),
    evidence: evidence.map(sanitizeAiScreenMagicUserCopy),
    missingData: missingData.map(sanitizeAiScreenMagicUserCopy),
    riskLevel: item.riskLevel,
  }));

  return enforceAiScreenMagicPolicy({
    screenId: workflowPack.screenId,
    roleScope: [...registry.roleScope],
    domain: workflowPack.domain,
    userGoal: sanitizeAiScreenMagicUserCopy(registry.userGoal),
    userHeader: sanitizeAiScreenMagicUserCopy(registry.userHeader),
    screenSummary: sanitizeAiScreenMagicUserCopy(registry.screenSummary),
    visibleDomainData: registry.visibleDomainData.map(sanitizeAiScreenMagicUserCopy),
    riskSummary: registry.riskSummary.map(sanitizeAiScreenMagicUserCopy),
    missingDataSummary: registry.missingDataSummary.map(sanitizeAiScreenMagicUserCopy),
    safeActions: registry.safeActions.map(sanitizeAiScreenMagicUserCopy),
    approvalCandidates: registry.approvalCandidates.map(sanitizeAiScreenMagicUserCopy),
    exactBlockers: registry.exactBlockers.map(sanitizeAiScreenMagicUserCopy),
    aiPreparedWork: preparedWork,
    buttons: buildButtons(workflowPack, registry),
    qa: [...registry.qa, ...workflowPack.qaExamples.map((entry) => ({
      question: entry.question,
      answerIntent: entry.expectedAnswerIntent,
    }))].slice(0, 5),
    safety: {
      fakeDataUsed: false,
      directDangerousMutationAllowed: false,
      approvalBypassAllowed: false,
      providerRequired: false,
      dbWriteUsed: false,
    },
  });
}

export function getAiScreenMagicPack(request: AiScreenMagicHydrationRequest): AiScreenMagicPack {
  return buildAiScreenMagicPackFromWorkflowPack(getAiScreenWorkflowPack(request));
}

export function listAiScreenMagicPacks(): AiScreenMagicPack[] {
  return listAiScreenWorkflowPacks().map(buildAiScreenMagicPackFromWorkflowPack);
}

export function describeAiScreenMagicPack(pack: AiScreenMagicPack): string {
  const work = pack.aiPreparedWork
    .slice(0, 4)
    .map((item) => `- ${item.title}: ${item.description}`)
    .join("\n");
  const buttons = pack.buttons
    .slice(0, 6)
    .map((button) => `- ${button.label}`)
    .join("\n");

  return sanitizeAiScreenMagicUserCopy([
    pack.userHeader,
    pack.screenSummary,
    pack.userGoal,
    pack.visibleDomainData.length > 0 ? `Данные экрана: ${pack.visibleDomainData.slice(0, 6).join("; ")}` : null,
    pack.riskSummary.length > 0 ? `Риски: ${pack.riskSummary.slice(0, 5).join("; ")}` : null,
    pack.approvalCandidates.length > 0 ? `На согласование: ${pack.approvalCandidates.slice(0, 3).join("; ")}` : null,
    work ? `Что подготовлено:\n${work}` : null,
    buttons ? `Кнопки:\n${buttons}` : null,
    "AI не выполняет опасные действия напрямую; для согласования используется журнал согласования.",
  ].filter(Boolean).join("\n"));
}

export function getAiScreenMagicCoverageCount(): number {
  return listAiScreenMagicRegistry().length;
}
