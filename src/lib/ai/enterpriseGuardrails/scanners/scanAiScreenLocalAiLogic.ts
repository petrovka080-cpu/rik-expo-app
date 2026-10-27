import { findRegexInFiles, readAiEnterpriseSourceFiles } from "../aiEnterpriseForbiddenPatterns";

export function scanAiScreenLocalAiLogic(rootDir = process.cwd()) {
  return findRegexInFiles({
    scanner: "scanAiScreenLocalAiLogic",
    files: readAiEnterpriseSourceFiles({
      rootDir,
      includeRoots: [
        "src/features/ai/AIAssistantScreen.tsx",
        "src/features/ai/AIAssistantLiveScreenCopilotPanel.tsx",
        "src/screens",
      ],
      exclude: [/\.test\./, /tests\//],
    }),
    pattern: /from\s+["'`].*(universalRoleQa|universalSourcePlanner|universalAnswerComposer|appContextGraph|aiFinanceGraphProvider|aiWarehouseGraphProvider|aiDocumentGraphProvider|aiExternalWebRetriever)["'`]|(classifyIntent|planSources|sourcePlanner|answerComposer)\s*\(/i,
    reason: "Screens may pass context and render answers, but cannot own intent, source planning, providers, or answer composition.",
    ignore: (finding) =>
      finding.file.includes("src/screens/") &&
      !finding.file.endsWith(".tsx"),
  });
}
