import fs from "node:fs";
import path from "node:path";

import { scanComponentDebt } from "../../scripts/architecture_anti_regression_suite";

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("AI assistant launch runtime ownership", () => {
  const screen = read("src/features/ai/AIAssistantScreen.tsx");
  const runtime = read("src/features/ai/AIAssistantLaunchRuntime.ts");
  const scanner = read("scripts/architecture_anti_regression_suite.ts");

  it("keeps the screen shell below the unchanged callable and physical budgets", () => {
    const debt = scanComponentDebt(process.cwd());
    const screenDebt = debt.topByLines.find(
      (entry) => entry.file === "src/features/ai/AIAssistantScreen.tsx",
    );

    expect(screen.split("\n").length).toBeLessThan(533);
    expect(debt.godComponentLineThreshold).toBe(500);
    expect(screenDebt?.maxCallableMeaningfulLineCount).toBeLessThan(500);
    expect(scanner).toContain("const GOD_COMPONENT_LINE_THRESHOLD = 500");
    expect(scanner).not.toMatch(/AIAssistantScreen[^\n]+(?:exclude|allowlist)/i);
  });

  it("gives launch effects and the pending-intent subscription one named owner", () => {
    expect(screen).toContain("useAIAssistantPendingLaunchSubscription({");
    expect(screen).toContain("useAIAssistantLaunchRuntimeEffects({");
    expect(screen).not.toContain("requestEstimateIntentLifecycle.subscribe");
    expect(screen).not.toContain("AI_AUTO_SEND_STARTED");
    expect(runtime.match(/requestEstimateIntentLifecycle\.subscribe/g)).toHaveLength(1);
    expect(runtime).toContain(
      "return requestEstimateIntentLifecycle.subscribe(syncPendingAiLaunch)",
    );
  });

  it("keeps auto-send, prompt ACK, scrolling and cleanup single-owned", () => {
    expect(runtime.match(/void send\(launchPrompt\)\.then/g)).toHaveLength(1);
    expect(runtime.match(/AI_AUTO_SEND_STARTED/g)).toHaveLength(1);
    expect(runtime.match(/AI_AUTO_SEND_RESOLVED/g)).toHaveLength(1);
    expect(runtime.match(/requestAnimationFrame/g)).toHaveLength(1);
    expect(runtime.match(/cancelAnimationFrame/g)).toHaveLength(1);
    expect(runtime.match(/clearTimeout/g)).toHaveLength(1);
  });

  it("keeps every route hook unconditional and in the governed order", () => {
    const pendingSubscription = screen.indexOf(
      "useAIAssistantPendingLaunchSubscription({",
    );
    const focusInitialization = screen.indexOf("useFocusEffect(");
    const launchEffects = screen.indexOf(
      "useAIAssistantLaunchRuntimeEffects({",
    );
    const bootReturn = screen.indexOf("if (booting) {");

    expect(pendingSubscription).toBeGreaterThan(-1);
    expect(focusInitialization).toBeGreaterThan(pendingSubscription);
    expect(launchEffects).toBeGreaterThan(focusInitialization);
    expect(bootReturn).toBeGreaterThan(launchEffects);
  });
});
