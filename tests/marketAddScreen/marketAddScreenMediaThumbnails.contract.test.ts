import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media thumbnails", () => {
  it("keeps uploaded media visible without local preview fallbacks", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(panel).toContain(".thumbnail-strip");
    expect(panel).toContain(".preview-image.");
    expect(panel).toContain("videoPreviewItem");
    expect(panel).toContain(".thumbnail.upload-status.");
    expect(panel).toContain("Загрузка...");
    expect(panel).toContain("Загружено");
    expect(panel).not.toContain("onLocalPreview");
    expect(panel).not.toContain("createLocalDraftItem");
    expect(panel).not.toContain("localPreviewUrl");
    expect(model).toContain("mediaDraftItem");
    expect(model).toContain("previewImage");
    expect(model).not.toContain("LiveRouteMediaLocalPreview");
    expect(model).not.toContain("onLocalPreview?");
  });
});
