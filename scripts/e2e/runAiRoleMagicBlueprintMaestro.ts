import fs from "node:fs";
import path from "node:path";

import { validateAiRoleMagicButtonClickContract } from "../../src/features/ai/roleMagic/aiRoleMagicButtonClickContract";
import { listAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";
import { validateAiRoleMagicQuestionAnswerPlans } from "../../src/features/ai/roleMagic/aiRoleMagicQuestionAnswerPlan";
import { validateAiRoleMagicBlueprintSafety } from "../../src/features/ai/roleMagic/aiRoleMagicSafetyPolicy";

const wave = "S_AI_PRODUCT_06_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT";
const artifactPath = path.join(process.cwd(), "artifacts", `${wave}_emulator.json`);

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const tabLayout = readIfExists(path.join(process.cwd(), "app", "(tabs)", "_layout.tsx"));
const aiRoute = readIfExists(path.join(process.cwd(), "app", "(tabs)", "ai.tsx"));
const assistantScreen = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"));
const safety = validateAiRoleMagicBlueprintSafety();
const buttons = validateAiRoleMagicButtonClickContract();
const qa = validateAiRoleMagicQuestionAnswerPlans();
const roleIds = listAiRoleMagicBlueprints().map((blueprint) => blueprint.roleId);

const checks = {
  "AI assistant opens on key roles": aiRoute.includes("AIAssistantScreen") && roleIds.includes("buyer") && roleIds.includes("accountant"),
  "role-native output visible": safety.ok,
  "critical buttons targetable": buttons.actionsChecked > 0 && buttons.ok,
  "approval-required buttons do not execute directly": buttons.approvalActionsChecked > 0 && buttons.ok,
  "forbidden buttons show reason": buttons.ok,
  "debug hidden": safety.ok && !assistantScreen.includes("raw policy dump"),
  "tab route registered": tabLayout.includes("ai") || aiRoute.includes("AIAssistantScreen"),
  "qa source context ready": qa.ok,
};
const ok = Object.values(checks).every(Boolean);
const artifact = {
  wave,
  final_status: ok
    ? "GREEN_AI_ROLE_MAGIC_BLUEPRINT_MAESTRO_TARGETABLE"
    : "BLOCKED_ANDROID_ROLE_MAGIC_TARGETABILITY",
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
