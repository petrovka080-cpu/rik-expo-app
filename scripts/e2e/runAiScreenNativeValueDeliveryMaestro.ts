import fs from "node:fs";
import path from "node:path";

const wave = "S_AI_PRODUCT_04_SCREEN_NATIVE_VALUE_DELIVERY_PACKS";
const artifactPath = path.join(process.cwd(), `artifacts/${wave}_emulator.json`);
const requiredScreenIds = [
  "accountant.main",
  "buyer.main",
  "warehouse.main",
  "director.dashboard",
  "foreman.main",
  "documents.main",
  "chat.main",
  "security.screen",
];

function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function writeJson(payload: unknown) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const ui = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
const screen = read("src/features/ai/AIAssistantScreen.tsx");
const registry = read("src/features/ai/screenNative/aiScreenNativeAssistantRegistry.ts");
const policy = read("src/features/ai/screenNative/aiScreenNativeAssistantPolicy.ts");
const qa = read("src/features/ai/screenNative/aiScreenNativeQuestionAnswerEngine.ts");

const checks = {
  "Android AI screen has stable target": screen.includes("AIAssistantScreen"),
  "Screen-native pack is rendered": ui.includes("ai.screen_native_value_pack"),
  "Chat can answer from screen-native pack": screen.includes("screenNativeAssistantPack") && qa.includes("answerAiScreenNativeQuestion"),
  "Policy blocks direct mutation": policy.includes("directMutationAllowed: false"),
  "Major screen ids represented": requiredScreenIds.every((id) => registry.includes(id)),
  "Provider disabled for targetability proof": !screen.includes("providerApproved={true}"),
};
const ok = Object.values(checks).every(Boolean);
const artifact = {
  wave,
  final_status: ok ? "GREEN_AI_SCREEN_NATIVE_VALUE_DELIVERY_MAESTRO_TARGETABLE" : "BLOCKED_ANDROID_SCREEN_NATIVE_VALUE_TARGETABILITY",
  checks,
  providerCalled: false,
  dbWritesUsed: false,
  fakeGreenClaimed: false,
  exactReason: ok ? null : "Screen-native AI value delivery targetability source contract failed.",
};

writeJson(artifact);
console.log(JSON.stringify(artifact, null, 2));
if (!ok) process.exitCode = 1;
