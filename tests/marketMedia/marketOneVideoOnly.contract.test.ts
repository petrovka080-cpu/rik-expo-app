import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market media one video only", () => {
  it("keeps one-video limit enforced by the shared limits and composer", () => {
    const limits = read("src/lib/media/mediaLimits.ts");
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(limits).toContain("maxVideosPerGroup: 1");
    expect(limits).toContain("maxVideos: MEDIA_LIMITS.maxVideosPerGroup");
    expect(panel).toContain("MARKET_ADD_MEDIA_LIMITS.maxVideos");
    expect(panel).toContain("videoLimitReached");
    expect(panel).toContain("Можно добавить только 1 видео");
    expect(model).toContain("maxVideos: 1");
  });
});
