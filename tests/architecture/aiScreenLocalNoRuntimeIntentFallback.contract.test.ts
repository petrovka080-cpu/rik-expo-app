import fs from "node:fs";
import path from "node:path";

import { buildAiScreenLocalActionSourcePolicyMatrix } from "../../src/features/ai/assistantOrchestrator/aiScreenLocalActionSourcePolicy";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("AI screen-local no runtime intent fallback", () => {
  it("keeps screen-local action planning sourced from the audited action registry", () => {
    const orchestratorSource = read(
      "src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator.ts",
    );
    const contextSource = read(
      "src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver.ts",
    );

    expect(orchestratorSource).toContain("resolveAiScreenLocalActionSourcePolicy");
    expect(orchestratorSource).not.toContain("fallbackPlanFromRuntimeIntent");
    expect(orchestratorSource).not.toContain("runtimeFallback");
    expect(contextSource).not.toContain("runtime?.availableIntents");
    expect(contextSource).not.toContain("runtime.availableIntents");
    expect(buildAiScreenLocalActionSourcePolicyMatrix()).toMatchObject({
      final_status: "GREEN_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_READY",
      all_screen_local_profiles_have_action_map: true,
      runtime_intent_fallback_allowed: false,
      fallback_used: false,
    });
  });
});
