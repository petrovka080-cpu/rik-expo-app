import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/ai-roles-hardening-wave1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/ai-roles-hardening-wave1.summary.json");

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const readJsonIfExists = <T>(relativePath: string): T | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const aiReportsPath = "src/lib/ai_reports.ts";
const chatApiPath = "src/lib/chat_api.ts";
const assistantActionsPath = "src/features/ai/assistantActions.ts";
const assistantClientPath = "src/features/ai/assistantClient.ts";
const assistantScreenPath = "src/features/ai/AIAssistantScreen.tsx";
const assistantScopePath = "src/features/ai/assistantScopeContext.ts";
const assistantVoicePath = "src/features/ai/useAssistantVoiceInput.ts";
const analyticInsightsPath = "src/features/ai/aiAnalyticInsights.ts";
const buyerSheetPath = "src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx";
const directorSheetPath = "src/screens/director/DirectorProposalSheet.tsx";
const foremanAiPath = "src/screens/foreman/foreman.ai.ts";

const sources = {
  aiReports: readText(aiReportsPath),
  chatApi: readText(chatApiPath),
  assistantActions: readText(assistantActionsPath),
  assistantClient: readText(assistantClientPath),
  assistantScreen: readText(assistantScreenPath),
  assistantScope: readText(assistantScopePath),
  assistantVoice: readText(assistantVoicePath),
  analyticInsights: readText(analyticInsightsPath),
  buyerSheet: readText(buyerSheetPath),
  directorSheet: readText(directorSheetPath),
  foremanAi: readText(foremanAiPath),
};

const aiRolesWebSmoke = readJsonIfExists<JsonRecord>("artifacts/ai-roles-web-smoke.summary.json");
const aiReadonlyRecommendation = readJsonIfExists<JsonRecord>(
  "artifacts/ai-readonly-recommendation-wave1.summary.json",
);
const buyerRuntime = readJsonIfExists<JsonRecord>("artifacts/buyer-summary-inbox-backend-cutover.summary.json");
const directorFinanceRuntime = readJsonIfExists<JsonRecord>("artifacts/director-finance-backend-cutover.summary.json");
const directorProposalsWeb = readJsonIfExists<JsonRecord>("artifacts/director-proposals-windowing-web-smoke.summary.json");
const foremanRuntime = readJsonIfExists<JsonRecord>("artifacts/foreman-request-sync-rpc-v2-hard-cut.summary.json");
const foremanBattle = readJsonIfExists<JsonRecord>("artifacts/foreman-ai-hardening-wave1.summary.json");
const foremanVoice = readJsonIfExists<JsonRecord>("artifacts/foreman-ai-voice-runtime.summary.json");

const hasUnsafeBoundary = (source: string) =>
  source.includes("getSupabaseAny")
  || source.includes("supabase as any")
  || source.includes(" as any");

const structural = {
  aiReportsTyped: !hasUnsafeBoundary(sources.aiReports),
  chatApiTyped: !hasUnsafeBoundary(sources.chatApi),
  assistantActionsTyped: !hasUnsafeBoundary(sources.assistantActions),
  assistantClientLoadsConfig: sources.assistantClient.includes("loadAiConfig")
    && sources.assistantClient.includes("loadAssistantPromptConfig"),
  assistantClientSavesReports: sources.assistantClient.includes("saveAiReport")
    && sources.assistantClient.includes("assistant:"),
  assistantScopedFactsConnected: sources.assistantScreen.includes("loadAssistantScopedFacts")
    && sources.assistantClient.includes("scopedFactsSummary")
    && sources.assistantScope.includes("loadBuyerBucketsData")
    && sources.assistantScope.includes("loadDirectorFinanceScreenScope"),
  buyerInsightConnected: sources.buyerSheet.includes("loadProposalAnalyticInsights")
    && sources.buyerSheet.includes("buildProposalAnalyticSummary")
    && sources.analyticInsights.includes("analyzePriceHistory")
    && sources.analyticInsights.includes("getSupplierRecommendations"),
  directorInsightConnected: sources.directorSheet.includes("loadProposalAnalyticInsights")
    && sources.directorSheet.includes("buildProposalAnalyticSummary")
    && sources.analyticInsights.includes("analyzePriceHistory")
    && sources.analyticInsights.includes("getSupplierRecommendations"),
  analyticSummaryHelperPresent:
    sources.analyticInsights.includes("export const buildProposalAnalyticSummary")
    && aiReadonlyRecommendation?.gate === "GREEN",
  assistantShowsDataAwareContext: sources.assistantScreen.includes("Data-aware context"),
  assistantVoiceConnected:
    sources.assistantScreen.includes("useAssistantVoiceInput")
    && sources.assistantScreen.includes("assistant_voice_button")
    && sources.assistantVoice.includes("assistant_voice"),
  noLastUnsafeAiBoundary:
    !hasUnsafeBoundary(sources.aiReports)
    && !hasUnsafeBoundary(sources.chatApi)
    && !hasUnsafeBoundary(sources.assistantActions),
  foremanDeterministicResolveRetained:
    sources.foremanAi.includes("resolveCatalogBySynonymPrimary")
    && sources.foremanAi.includes("applyPackagingResolution"),
};

const bool = (value: unknown): boolean => value === true;
const text = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const buyerRoleRuntimeOk = bool(buyerRuntime?.webPassed) && bool(buyerRuntime?.androidPassed);
const directorRoleRuntimeOk =
  bool(directorFinanceRuntime?.webPassed)
  && bool(directorFinanceRuntime?.androidPassed)
  && bool(directorProposalsWeb?.webPassed);
const foremanRoleRuntimeOk =
  bool(foremanRuntime?.webPassed)
  && bool(foremanRuntime?.androidPassed)
  && bool(foremanVoice?.webPassed)
  && bool(foremanVoice?.androidPassed);

const aiWebRuntimeOk =
  bool(aiRolesWebSmoke?.webPassed)
  && bool(aiRolesWebSmoke?.buyerPassed)
  && bool(aiRolesWebSmoke?.directorPassed)
  && bool(aiRolesWebSmoke?.foremanPassed);

const runtime = {
  buyer: buyerRuntime,
  directorFinance: directorFinanceRuntime,
  directorProposalWeb: directorProposalsWeb,
  aiRolesWebSmoke,
  aiReadonlyRecommendation,
  foreman: foremanRuntime,
  foremanBattle,
  foremanVoice,
};

const iosResidual =
  text(buyerRuntime?.iosResidual)
  || text(directorFinanceRuntime?.iosResidual)
  || text(foremanRuntime?.iosResidual)
  || text(foremanBattle?.iosResidual)
  || text(foremanVoice?.iosResidual);

const summary = {
  status:
    Object.values(structural).every(Boolean)
    && aiWebRuntimeOk
    && buyerRoleRuntimeOk
    && directorRoleRuntimeOk
    && foremanRoleRuntimeOk
      ? "passed"
      : "failed",
  gate:
    Object.values(structural).every(Boolean)
    && aiWebRuntimeOk
    && buyerRoleRuntimeOk
    && directorRoleRuntimeOk
    && foremanRoleRuntimeOk
      ? "GREEN"
      : "RED",
  aiReportsDeadCodeActivated:
    structural.assistantClientLoadsConfig
    && structural.assistantClientSavesReports
    && structural.buyerInsightConnected
    && structural.directorInsightConnected,
  buyerInsightReady: structural.buyerInsightConnected,
  directorInsightReady: structural.directorInsightConnected,
  assistantGroundedReadOnly:
    structural.assistantScopedFactsConnected && structural.assistantShowsDataAwareContext,
  unsafeAiBoundaryRemoved: structural.noLastUnsafeAiBoundary,
  foremanDeterministicResolveReady:
    structural.foremanDeterministicResolveRetained && bool(foremanBattle?.gate === "GREEN"),
  voiceOptionalSafe:
    structural.assistantVoiceConnected
    && (bool(foremanVoice?.gate === "GREEN") || bool(foremanBattle?.voiceLayerDeferred)),
  runtimeSummaryReused: true,
  webPassed:
    aiWebRuntimeOk
    && bool(buyerRuntime?.webPassed)
    && bool(directorFinanceRuntime?.webPassed)
    && bool(directorProposalsWeb?.webPassed)
    && bool(foremanRuntime?.webPassed),
  androidPassed:
    bool(buyerRuntime?.androidPassed)
    && bool(directorFinanceRuntime?.androidPassed)
    && bool(foremanRuntime?.androidPassed)
    && bool(foremanVoice?.androidPassed),
  iosPassed:
    bool(buyerRuntime?.iosPassed)
    && bool(directorFinanceRuntime?.iosPassed)
    && bool(foremanRuntime?.iosPassed)
    && bool(foremanBattle?.iosPassed),
  iosResidual,
};

const full = {
  generatedAt: new Date().toISOString(),
  summary,
  structural,
  roleRuntime: {
    buyerRoleRuntimeOk,
    directorRoleRuntimeOk,
    foremanRoleRuntimeOk,
  },
  runtimeArtifacts: runtime,
  reusedRuntimeArtifacts: [
    "artifacts/buyer-summary-inbox-backend-cutover.summary.json",
    "artifacts/director-finance-backend-cutover.summary.json",
    "artifacts/director-proposals-windowing-web-smoke.summary.json",
    "artifacts/ai-readonly-recommendation-wave1.summary.json",
    "artifacts/foreman-request-sync-rpc-v2-hard-cut.summary.json",
    "artifacts/foreman-ai-hardening-wave1.summary.json",
    "artifacts/foreman-ai-voice-runtime.summary.json",
  ],
  files: {
    aiReportsPath,
    chatApiPath,
    assistantActionsPath,
    assistantClientPath,
    assistantScreenPath,
    assistantScopePath,
    analyticInsightsPath,
    buyerSheetPath,
    directorSheetPath,
    foremanAiPath,
  },
};

writeJson(fullOutPath, full);
writeJson(summaryOutPath, summary);

if (summary.status !== "passed") {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
