import type { AiAppContextGraphBuildInput, AiContextGraphBuildResult } from "../appContextGraph";
import type { UniversalExternalWebResult, UniversalRoleQaOrchestratorInput } from "../universalRoleQa";
import type { AiLiveScreenButton } from "./aiLiveScreenButtonContract";
import { getAiLiveScreenManifest } from "./aiLiveScreenManifest";

const CONTEXT_TO_SCREEN: Record<string, string> = {
  director: "director",
  foreman: "foreman",
  buyer: "buyer",
  accountant: "accountant",
  warehouse: "warehouse",
  contractor: "contractor",
  documents: "documents",
  document: "documents",
  pdf: "documents",
  market: "market",
  marketplace: "market",
  office: "office",
  client: "client",
};

export type AiLiveScreenCopilotRunOptions = {
  graph?: AiContextGraphBuildResult;
  appContextGraphInput?: AiAppContextGraphBuildInput;
  externalWebConnected?: boolean;
  externalWebResults?: UniversalExternalWebResult[];
  userId?: string;
  companyId?: string;
  countryCode?: string;
  cityOrRegion?: string;
  referenceDate?: string;
};

export function resolveAiLiveScreenId(contextOrScreenId: string | null | undefined): string {
  const key = String(contextOrScreenId || "director").trim().toLowerCase();
  return CONTEXT_TO_SCREEN[key] ?? key;
}

export function createAiLiveScreenQaInput(
  button: AiLiveScreenButton,
  options: AiLiveScreenCopilotRunOptions = {},
): UniversalRoleQaOrchestratorInput {
  const manifest = getAiLiveScreenManifest(button.screenId);
  return {
    questionRu: button.concreteQuestionRu,
    role: manifest.role === "documents" ? "office" : manifest.role,
    screenId: manifest.screenId,
    route: manifest.route,
    userId: options.userId,
    companyId: options.companyId,
    graph: options.graph,
    appContextGraphInput: options.appContextGraphInput,
    externalWebConnected: options.externalWebConnected,
    externalWebResults: options.externalWebResults,
    countryCode: options.countryCode ?? "KG",
    cityOrRegion: options.cityOrRegion,
    referenceDate: options.referenceDate ?? "2026-05-20",
  };
}
