import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/director-finance-ai-grounding-wave1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/director-finance-ai-grounding-wave1.summary.json");

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

const assistantScopeSource = readText("src/features/ai/assistantScopeContext.ts");
const assistantClientSource = readText("src/features/ai/assistantClient.ts");
const assistantPromptSource = readText("src/features/ai/assistantPrompts.ts");

const directorFinanceCutover = readJsonIfExists<JsonRecord>(
  "artifacts/director-finance-backend-cutover.summary.json",
);
const aiRolesSummary = readJsonIfExists<JsonRecord>("artifacts/ai-roles-hardening-wave1.summary.json");
const aiRolesWeb = readJsonIfExists<JsonRecord>("artifacts/ai-roles-web-smoke.summary.json");

const structural = {
  financeScopeUsesBackendContract:
    assistantScopeSource.includes("loadDirectorFinanceScreenScope")
    && assistantScopeSource.includes("loadDirectorScopedFactsGrounded"),
  financeSummaryFieldsGrounded:
    assistantScopeSource.includes("summary.totalPayable")
    && assistantScopeSource.includes("summary.totalPaid")
    && assistantScopeSource.includes("summary.totalDebt")
    && assistantScopeSource.includes("summary.totalOverpayment")
    && assistantScopeSource.includes("summary.overdueAmount")
    && assistantScopeSource.includes("summary.criticalAmount"),
  supplierRiskLinesGrounded:
    assistantScopeSource.includes("buildDirectorFinanceSupplierLine")
    && assistantScopeSource.includes("\"criticalAmount\"")
    && assistantScopeSource.includes("\"overpayment\""),
  financeScopeEchoIncluded:
    assistantScopeSource.includes("financeFilters")
    && assistantScopeSource.includes("criticalDays")
    && assistantScopeSource.includes("director:finance_panel_v3+pending_proposals_v1"),
  noFabricatedFinanceNumbersRule:
    assistantClientSource.includes("backend/read-only")
    && assistantClientSource.includes("Используй только их для цифр и выводов"),
  directorPromptReadOnly:
    assistantPromptSource.includes("Для роли director делай упор на отчеты, заявки, предложения")
    && assistantPromptSource.includes("не выполняешь мутации"),
};

const summary = {
  status:
    Object.values(structural).every(Boolean)
    && directorFinanceCutover?.gate === "GREEN"
    && aiRolesSummary?.gate === "GREEN"
    && aiRolesWeb?.directorPassed === true
      ? "passed"
      : "failed",
  gate:
    Object.values(structural).every(Boolean)
    && directorFinanceCutover?.gate === "GREEN"
    && aiRolesSummary?.gate === "GREEN"
    && aiRolesWeb?.directorPassed === true
      ? "GREEN"
      : "RED",
  financeBackendOwned: directorFinanceCutover?.primaryOwner === "rpc_v3",
  fallbackUsed: directorFinanceCutover?.fallbackUsed === true,
  directorAiGroundedReadOnly: Object.values(structural).every(Boolean),
  webPassed: aiRolesWeb?.directorPassed === true,
  androidPassed: aiRolesSummary?.androidPassed === true,
  iosPassed: aiRolesSummary?.iosPassed === true,
  iosResidual: aiRolesSummary?.iosResidual ?? null,
};

const full = {
  generatedAt: new Date().toISOString(),
  summary,
  structural,
  reusedArtifacts: {
    directorFinanceCutover: "artifacts/director-finance-backend-cutover.summary.json",
    aiRolesSummary: "artifacts/ai-roles-hardening-wave1.summary.json",
    aiRolesWeb: "artifacts/ai-roles-web-smoke.summary.json",
  },
  artifactPayloads: {
    directorFinanceCutover,
    aiRolesSummary,
    aiRolesWeb,
  },
};

writeJson(fullOutPath, full);
writeJson(summaryOutPath, summary);

if (summary.status !== "passed") {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
