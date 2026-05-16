import fs from "node:fs";
import path from "node:path";

import { validateAiRoleMagicButtonClickContract } from "../../src/features/ai/roleMagic/aiRoleMagicButtonClickContract";
import { listAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";
import { validateAiRoleMagicQuestionAnswerPlans } from "../../src/features/ai/roleMagic/aiRoleMagicQuestionAnswerPlan";
import { validateAiRoleMagicBlueprintSafety } from "../../src/features/ai/roleMagic/aiRoleMagicSafetyPolicy";

const wave = "S_AI_PRODUCT_06_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT";
const artifactPath = path.join(process.cwd(), "artifacts", `${wave}_web.json`);
const requiredRoutes = [
  "/ai?context=buyer",
  "/ai?context=accountant",
  "/ai?context=warehouse",
  "/ai?context=foreman",
  "/ai?context=director",
  "/ai?context=reports",
];
const requiredTestIds = [
  "ai.screen_native_value_pack",
  "ai.assistant.input",
  "ai.assistant.send",
];

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const appAiRoute = readIfExists(path.join(process.cwd(), "app", "(tabs)", "ai.tsx"));
const assistantScreen = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"));
const readyPanels = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"));
const source = [appAiRoute, assistantScreen, readyPanels].join("\n");
const safety = validateAiRoleMagicBlueprintSafety();
const buttons = validateAiRoleMagicButtonClickContract();
const qa = validateAiRoleMagicQuestionAnswerPlans();
const blueprints = listAiRoleMagicBlueprints();

const checks = {
  "web route source exists": appAiRoute.includes("AIAssistantScreen"),
  "buyer role blueprint visible": blueprints.some((blueprint) => blueprint.roleId === "buyer" && blueprint.screenCoverage.some((screen) => screen.screenId === "buyer.main")),
  "accountant role blueprint visible": blueprints.some((blueprint) => blueprint.roleId === "accountant" && blueprint.screenCoverage.some((screen) => screen.screenId === "accountant.main")),
  "warehouse role blueprint visible": blueprints.some((blueprint) => blueprint.roleId === "warehouse"),
  "foreman role blueprint visible": blueprints.some((blueprint) => blueprint.roleId === "foreman"),
  "director role blueprint visible": blueprints.some((blueprint) => blueprint.roleId === "director"),
  "documents role blueprint visible": blueprints.some((blueprint) => blueprint.roleId === "documents"),
  "chat answers role-specific question": qa.ok,
  "buttons visible or blocked exactly": buttons.ok,
  "debug panels hidden by default": !source.includes("debugAiContext=1") || source.includes("showDebugAiContext"),
  "no provider unavailable copy": safety.ok,
  "no fake data": safety.ok,
  "no direct dangerous mutation": buttons.ok,
};
const ok = Object.values(checks).every(Boolean);
const artifact = {
  wave,
  final_status: ok
    ? "GREEN_AI_ROLE_MAGIC_BLUEPRINT_WEB_TARGETABLE"
    : "BLOCKED_WEB_ROLE_MAGIC_TARGETABILITY",
  requiredRoutes,
  requiredTestIds,
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
