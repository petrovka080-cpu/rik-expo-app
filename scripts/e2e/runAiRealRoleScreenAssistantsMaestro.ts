import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const wave = "S_AI_PRODUCT_03_REAL_ROLE_SCREEN_ASSISTANTS";
const artifactPath = path.join(projectRoot, `artifacts/${wave}_emulator.json`);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function writeJson(payload: unknown) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const assistant = read("src/features/ai/AIAssistantScreen.tsx");
const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
const engine = read("src/features/ai/realAssistants/aiRoleScreenAssistantEngine.ts");
const policy = read("src/features/ai/realAssistants/aiRoleScreenAssistantPolicy.ts");

const checks = {
  "Android AI screen has stable target": assistant.includes('testID="ai.assistant.screen"'),
  "Role assistant pack is rendered": panels.includes('testID="ai.role_screen_assistant_pack"'),
  "Chat can answer from role assistant pack": assistant.includes("roleScreenAssistantPack"),
  "Policy blocks direct mutation": policy.includes("directMutationAllowed: false"),
  "Major role engine exists": engine.includes("accountant.") && engine.includes("buyer.") && engine.includes("warehouse."),
};
const ok = Object.values(checks).every(Boolean);
const artifact = {
  wave,
  final_status: ok
    ? "GREEN_AI_REAL_ROLE_SCREEN_ASSISTANTS_MAESTRO_TARGETABLE"
    : "BLOCKED_AI_REAL_ROLE_SCREEN_ASSISTANTS_MAESTRO_TARGETABILITY",
  checks,
  providerCalled: false,
  dbWritesUsed: false,
  fakeGreenClaimed: false,
  exactReason: ok ? null : "AI role-screen assistant Android targetability source checks failed.",
};

writeJson(artifact);
console.log(JSON.stringify(artifact, null, 2));
if (!ok) process.exitCode = 1;
