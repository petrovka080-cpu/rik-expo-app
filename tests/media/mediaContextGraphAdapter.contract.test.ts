import { buildMediaContextGraph } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("media assets enter app context graph as source refs", () => {
  const graph = buildMediaContextGraph({ assets: [mediaAsset()], role: "foreman", screenId: "foreman" });
  expect(graph.sourceRefs.some((ref) => ref.entityType === "media_asset")).toBe(true);
  expect(graph.providerTrace).toContain("aiContextGraphGenericEntityProvider");
});
