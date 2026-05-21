import {
  AI_APP_CONTEXT_GRAPH_WAVE,
  validateAiContextGraphNodes,
} from "../../src/lib/ai/appContextGraph";
import { buildAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS core", () => {
  it("builds a read-only app context graph from supplied app records", () => {
    const graph = buildAiAppContextGraphFixture();

    expect(AI_APP_CONTEXT_GRAPH_WAVE).toBe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS_POINT_OF_NO_RETURN");
    expect(graph.nodes.length).toBeGreaterThan(10);
    expect(graph.providerTrace).toEqual(expect.arrayContaining([
      "aiProcurementGraphProvider",
      "aiWarehouseGraphProvider",
      "aiFinanceGraphProvider",
      "aiFieldGraphProvider",
      "aiDocumentGraphProvider",
      "aiMarketplaceGraphProvider",
    ]));
    expect(validateAiContextGraphNodes(graph.nodes).passed).toBe(true);
  });
});
