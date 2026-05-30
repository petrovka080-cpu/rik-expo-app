import { expectNoOwnerReplayPattern } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not add a second AI framework", () => {
  expectNoOwnerReplayPattern(/from\s+["'](?:openai|anthropic|langchain|llamaindex|@ai-sdk\/openai)["']/, "second AI framework");
});
