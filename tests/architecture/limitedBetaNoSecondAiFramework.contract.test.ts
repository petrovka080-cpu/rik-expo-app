import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited beta closeout does not add a second AI framework", () => {
  expectNoLimitedPublicBetaPattern(/from\s+["'](?:langchain|llamaindex|@google\/generative-ai|ai\/react)["']/, "second-ai-framework");
});

