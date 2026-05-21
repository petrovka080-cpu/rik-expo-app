import { actionAnswer, matrixPartial } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI runtime no destructive repair command", () => {
  it("keeps repair suggestions non-destructive", () => {
    expect(matrixPartial().destructive_repair_commands_visible).toBe(0);
    const answer = actionAnswer("safe_repair_suggestion", "dev");
    const commands = answer.runtimeEvents.map((event) => event.safeRepairSuggestion?.command ?? "").join("\n");
    expect(commands).not.toMatch(/rm -rf|drop table|delete from|truncate|supabase db reset|cat \.env|printenv|key dump/i);
  });
});
