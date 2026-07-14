import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media thumbnails", () => {
  it("shows pending thumbnails while keeping publish snapshots limited to uploaded media", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(panel).toContain(".thumbnail-strip");
    expect(panel).toContain(".preview-image.");
    expect(panel).toContain("videoPreviewItem");
    expect(panel).toContain(".thumbnail.upload-status.");
    expect(panel).toContain("Загрузка...");
    expect(panel).toContain("Загружено");
    expect(panel).toContain("createPendingDraftItem");
    expect(panel).toContain("onPendingMediaPreview");
    expect(panel).toContain("uploadStatus: \"uploading\"");
    expect(panel).toContain("const uploadedItems = mediaItems.filter((item) => item.uploadStatus === \"uploaded\")");
    expect(panel).toContain("revokeDraftObjectUrl");
    expect(model).toContain("mediaDraftItem");
    expect(model).toContain("previewImage");
    expect(model).toContain("LiveRoutePendingMediaPreview");
    expect(model).toContain("onPendingMediaPreview?:");
  });
});
