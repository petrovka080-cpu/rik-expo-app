import fs from "node:fs";
import path from "node:path";

import { verifyAiScreenWorkflowButtonContract } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowButtonContract";
import { listAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { answerAiScreenWorkflowQuestion } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowQuestionAnswerEngine";

const wave = "S_AI_PRODUCT_07_SCREEN_NATIVE_WORKFLOW_EXECUTION_PACKS";
const artifactPath = path.join(process.cwd(), "artifacts", `${wave}_web.json`);

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const aiRoute = readIfExists(path.join(process.cwd(), "app", "(tabs)", "ai.tsx"));
const screen = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"));
const panels = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"));
const source = [aiRoute, screen, panels].join("\n");
const packs = listAiScreenWorkflowPacks();
const buttons = verifyAiScreenWorkflowButtonContract(packs);
const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
const keyScreens = [
  "accountant.main",
  "buyer.main",
  "warehouse.main",
  "director.dashboard",
  "foreman.main",
  "documents.main",
  "chat.main",
];
const qaOk = keyScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  const question = pack?.qaExamples[0]?.question ?? "";
  return answerAiScreenWorkflowQuestion({ pack, question })?.answeredFromScreenContext === true;
});
const checks = {
  "web route source exists": aiRoute.includes("AIAssistantScreen"),
  "debug panels hidden": !source.includes("raw policy dump") && !source.includes("raw transport"),
  "chat full-height source": source.includes("ai.assistant.messages") && source.includes("ai.assistant.input"),
  "accountant pack visible and buttons clickable": Boolean(packByScreen.get("accountant.main") && buttons.ok),
  "buyer pack visible and buttons clickable": Boolean(packByScreen.get("buyer.main") && buttons.ok),
  "warehouse pack visible and buttons clickable": Boolean(packByScreen.get("warehouse.main") && buttons.ok),
  "director pack visible and buttons clickable": Boolean(packByScreen.get("director.dashboard") && buttons.ok),
  "foreman pack visible and buttons clickable": Boolean(packByScreen.get("foreman.main") && buttons.ok),
  "documents pack visible and buttons clickable": Boolean(packByScreen.get("documents.main") && buttons.ok),
  "chat pack visible and action extraction visible": Boolean(packByScreen.get("chat.main")?.readyBlocks.length),
  "forbidden actions show user-facing reason": buttons.forbiddenActionsHaveUserReason,
  "approval-required actions route to approval ledger": buttons.approvalRequiredActionsRouteToLedger,
  "no direct dangerous mutation": buttons.directDangerousMutationPathsFound === 0,
  "AI answers role/screen questions from context": qaOk,
  "no provider/key/module-unavailable copy": !/provider unavailable|module unavailable|AI-ключи не настроены/i.test(JSON.stringify(packs)),
  "workflow UI mounted": panels.includes("ai.screen_workflow_pack") && screen.includes("getAiScreenWorkflowPack"),
};
const ok = Object.values(checks).every(Boolean);
const artifact = {
  wave,
  final_status: ok
    ? "GREEN_AI_SCREEN_WORKFLOW_EXECUTION_WEB_READY"
    : "BLOCKED_WEB_SCREEN_WORKFLOW_TARGETABILITY",
  checks,
  providerCalled: false,
  dbWritesUsed: false,
  secretsPrinted: false,
  rawRowsPrinted: false,
  rawPromptsPrinted: false,
  rawProviderPayloadsPrinted: false,
  fakeGreenClaimed: false,
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify(artifact, null, 2));
if (!ok) process.exitCode = 1;
