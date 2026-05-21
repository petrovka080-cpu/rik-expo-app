import { joinedAiLiveScreenCopilotSources } from "./aiLiveScreenCopilotArchitectureTestHelpers";

describe("AI live screen copilot architecture - no migrations", () => {
  it("does not introduce migration or schema write paths", () => {
    expect(joinedAiLiveScreenCopilotSources()).not.toMatch(/alter\s+table|create\s+table|drop\s+table|schema_migrations/i);
  });
});
