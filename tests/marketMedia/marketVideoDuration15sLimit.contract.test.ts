import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market media video duration limit", () => {
  it("keeps the 15 second video limit shared by picker, uploader and UI", () => {
    const limits = read("src/lib/media/mediaLimits.ts");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

    expect(limits).toContain("maxVideoDurationMs: 15_000");
    expect(limits).toContain("maxVideoBytes: 50 * 1024 * 1024");
    expect(media).toContain("MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs");
    expect(media).toContain("expectedDurationMsMax");
    expect(media).toContain("if (!isPhoto && (media.durationMs ?? 0) > MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs)");
    expect(panel).toContain("formatDuration(item.durationMs)");
    expect(panel).toContain(".thumbnail.video-duration.");
  });
});
