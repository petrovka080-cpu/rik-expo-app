import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market web video metadata contract", () => {
  it("keeps HTML metadata first and uses WebM container duration only after a metadata error", () => {
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");

    expect(media).toContain("export function readWebmDurationMsFromArrayBuffer");
    expect(media).toContain("WEBM_TIMECODE_SCALE_DEFAULT_NS = 1_000_000");
    expect(media).toContain("duration * timecodeScale / 1_000_000");
    expect(media).toContain(".catch((error)");
    expect(media).toContain("readWebmContainerMetadata(bytes, file.type)");
    expect(media).toContain("if (metadata.durationMs) return metadata");
    expect(media).toContain("throw error");
    expect(media).toContain("const bytes = await file.arrayBuffer()");
    expect(media).toContain("await readWebVideoMetadata(file, null, bytes)");
    expect(media).toContain("enablePendingPreview");
    expect(media).toContain("pendingPreviewUrl");
    expect(media).toContain("onPendingMediaPreview");
    expect(media).toContain("durationMsValue > MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs");
  });
});
