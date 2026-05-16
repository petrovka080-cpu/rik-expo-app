import {
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import {
  getAiScreenNativeAssistantRegistryEntry,
  resolveDefaultScreenNativeScreenId,
} from "../screenNative/aiScreenNativeAssistantRegistry";
import {
  getAiRoleMagicBlueprint,
  listAiRoleMagicBlueprints,
} from "../roleMagic/aiRoleMagicBlueprintRegistry";
import { listAiRoleMagicQaExpectations } from "../roleMagic/aiRoleMagicQaExpectations";
import type {
  AiScreenWorkflowQaExample,
  AiScreenWorkflowRegistryEntry,
} from "./aiScreenWorkflowTypes";

const DOCUMENTS_ALIAS = "agent.documents.knowledge";

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function firstText(values: readonly (string | undefined | null)[], fallback: string): string {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? fallback;
}

function findRoleMagicScreen(screenId: string) {
  for (const blueprint of listAiRoleMagicBlueprints()) {
    const screen = blueprint.screenCoverage.find((entry) => entry.screenId === screenId);
    if (screen) return { blueprint, screen };
  }
  return null;
}

function qaForScreen(screenId: string): AiScreenWorkflowQaExample[] {
  const match = findRoleMagicScreen(screenId);
  const screenQuestions = match?.screen.aiQuestionsMustAnswer ?? [];
  const roleQuestions = match ? listAiRoleMagicQaExpectations(match.blueprint.roleId).map((entry) => entry.question) : [];
  return uniqueSorted([...screenQuestions, ...roleQuestions])
    .slice(0, 5)
    .map((question) => ({
      question,
      expectedAnswerIntent: "answer_from_hydrated_screen_context",
    }));
}

function buildRegistryEntry(screenId: string): AiScreenWorkflowRegistryEntry {
  const auditEntries = listAiScreenButtonRoleActionEntriesForScreen(screenId);
  const nativeEntry = getAiScreenNativeAssistantRegistryEntry(screenId);
  const roleMagic = findRoleMagicScreen(screenId);
  const roleScope = uniqueSorted([
    ...(nativeEntry?.roleScope ?? []),
    ...auditEntries.flatMap((entry) => entry.roleScope),
  ]);
  const domain = firstText([
    nativeEntry?.domain,
    auditEntries[0]?.primaryDomain,
  ], "operations");
  const preparedOutputLabels = uniqueSorted([
    ...(roleMagic?.screen.aiPreparedOutput ?? []),
    ...(nativeEntry?.defaultNextActions ?? []),
  ]).slice(0, 6);

  return Object.freeze({
    screenId,
    roleScope,
    domain,
    title: firstText([nativeEntry?.title, roleMagic?.screen.screenId], screenId),
    userGoal: firstText([roleMagic?.screen.screenUserGoal, nativeEntry?.defaultSummary], "Prepare safe screen workflow work from hydrated context."),
    defaultSummary: firstText([
      nativeEntry?.defaultSummary,
      roleMagic ? `${roleMagic.blueprint.roleLabel}: ${roleMagic.screen.screenUserGoal}` : null,
    ], "AI prepared a safe screen workflow pack from audited actions and available evidence."),
    preparedOutputLabels: preparedOutputLabels.length > 0 ? preparedOutputLabels : ["summary", "risks", "missing data", "next action"],
    qaExamples: qaForScreen(screenId),
    actionIds: auditEntries.map((entry) => entry.actionId).sort(),
  } satisfies AiScreenWorkflowRegistryEntry);
}

export const AI_SCREEN_WORKFLOW_REQUIRED_SCREEN_IDS = AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS;

export const AI_SCREEN_WORKFLOW_REGISTRY: readonly AiScreenWorkflowRegistryEntry[] = Object.freeze(
  AI_SCREEN_WORKFLOW_REQUIRED_SCREEN_IDS.map(buildRegistryEntry),
);

export function listAiScreenWorkflowRegistry(): AiScreenWorkflowRegistryEntry[] {
  return [...AI_SCREEN_WORKFLOW_REGISTRY];
}

export function getAiScreenWorkflowRegistryEntry(screenId: string): AiScreenWorkflowRegistryEntry | null {
  const normalized = String(screenId || "").trim();
  if (normalized === DOCUMENTS_ALIAS) {
    return getAiScreenWorkflowRegistryEntry("documents.main");
  }
  return AI_SCREEN_WORKFLOW_REGISTRY.find((entry) => entry.screenId === normalized) ?? null;
}

export function resolveDefaultAiScreenWorkflowScreenId(context: Parameters<typeof resolveDefaultScreenNativeScreenId>[0]): string {
  const screenId = resolveDefaultScreenNativeScreenId(context);
  return screenId === DOCUMENTS_ALIAS ? "documents.main" : screenId;
}

export function getAiScreenWorkflowCoverageCount(): number {
  return AI_SCREEN_WORKFLOW_REGISTRY.length;
}

export function getAiRoleMagicBlueprintForWorkflowScreen(screenId: string) {
  const match = findRoleMagicScreen(screenId);
  return match ? getAiRoleMagicBlueprint(match.blueprint.roleId) : null;
}
