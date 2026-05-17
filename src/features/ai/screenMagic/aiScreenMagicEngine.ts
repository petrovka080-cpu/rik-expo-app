import {
  getAiScreenWorkflowPack,
  listAiScreenWorkflowPacks,
} from "../screenWorkflows/aiScreenWorkflowEngine";
import type {
  AiScreenWorkflowAction,
  AiScreenWorkflowPack,
} from "../screenWorkflows/aiScreenWorkflowTypes";
import { buildAiScreenMagicButton } from "./aiScreenMagicButtonResolver";
import {
  getAiScreenMagicRegistryEntry,
  listAiScreenMagicRegistry,
} from "./aiScreenMagicRegistry";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";
import type {
  AiScreenMagicHydrationRequest,
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

export function buildAiScreenMagicPackFromWorkflowPack(
  workflowPack: AiScreenWorkflowPack,
): AiScreenMagicPack {
  const registry = getAiScreenMagicRegistryEntry(workflowPack.screenId);
  if (!registry) {
    throw new Error(`AI screen magic registry missing for ${workflowPack.screenId}`);
  }

  const evidence = evidenceFromWorkflowPack(workflowPack);
  const missingData = missingDataFromWorkflowPack(workflowPack);
  const preparedWork: AiScreenMagicPreparedWork[] = registry.preparedWork.map((item, index) => ({
    id: `${workflowPack.screenId}.magic.prepared.${index + 1}`,
    title: sanitizeAiScreenMagicUserCopy(item.title),
    description: sanitizeAiScreenMagicUserCopy(item.description),
    evidence,
    missingData,
    riskLevel: item.riskLevel,
  }));

  return enforceAiScreenMagicPolicy({
    screenId: workflowPack.screenId,
    roleScope: [...workflowPack.roleScope],
    domain: workflowPack.domain,
    userGoal: sanitizeAiScreenMagicUserCopy(registry.userGoal),
    screenSummary: sanitizeAiScreenMagicUserCopy(registry.screenSummary),
    aiPreparedWork: preparedWork,
    buttons: workflowPack.actions.map((action) => buildAiScreenMagicButton({
      action,
      label: labelForAction(action, registry.buttonLabels),
    })),
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
    .map((button) => `- ${button.label}: ${button.actionKind} -> ${button.expectedResult}`)
    .join("\n");

  return sanitizeAiScreenMagicUserCopy([
    `SCREEN_MAGIC ${pack.screenId} ${pack.domain}`,
    pack.screenSummary,
    pack.userGoal,
    work ? `Prepared work:\n${work}` : null,
    buttons ? `Buttons:\n${buttons}` : null,
    "AI never performs direct dangerous mutations; approval-required actions route through the ledger.",
  ].filter(Boolean).join("\n"));
}

export function getAiScreenMagicCoverageCount(): number {
  return listAiScreenMagicRegistry().length;
}
