import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("media storage key leak guard", () => {
  it("keeps storage buckets and keys inside backend contracts, not user-facing live route UI", () => {
    const mediaPanel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const backendService = read("src/lib/media/services/mediaBackendUploadService.ts");

    expect(mediaPanel).not.toContain("storageKey");
    expect(mediaPanel).not.toContain("signedUrl");
    expect(backendService).toContain("storageKeyVisibleToUser: false");
    expect(backendService).not.toContain("route params");
  });
});
