import { actionAnswer } from "./aiSecurityRuntimeTestHelpers";

describe("runtime safe repair suggestions", () => {
  it("only suggests non-destructive verification commands", () => {
    const answer = actionAnswer("safe_repair_suggestion", "dev");
    const commands = answer.runtimeEvents.map((event) => event.safeRepairSuggestion?.command ?? "").join("\n");
    expect(commands).toMatch(/npx tsc --noEmit|npm run release:verify/);
    expect(commands).not.toMatch(/rm -rf|drop table|delete from|truncate|supabase db reset|cat \.env|printenv|key dump/i);
    expect(answer.destructiveCommandSuggested).toBe(false);
  });
});
