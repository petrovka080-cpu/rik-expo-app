import {
  externalSourceCanProveInternalFact,
  validateAiExternalSourceRef,
} from "../../src/lib/ai/appContextGraph";
import { createAiAppContextGraphFixtureInput } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS external sources", () => {
  it("requires URL and checkedAt while forbidding external proof for internal app facts", () => {
    const source = createAiAppContextGraphFixtureInput().externalSources?.[0];
    expect(source).toBeDefined();
    expect(validateAiExternalSourceRef(source!).valid).toBe(true);
    expect(source?.url).toMatch(/^https:\/\//);
    expect(source?.checkedAt).toBe("2026-05-20T00:00:00.000Z");
    expect(externalSourceCanProveInternalFact()).toBe(false);
  });
});
