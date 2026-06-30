import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media thumbnails", () => {
  it("keeps selected media visible immediately on the add screen", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(panel).toContain("onLocalPreview");
    expect(panel).toContain("createLocalDraftItem");
    expect(panel).toContain("localPreviewUrl");
    expect(panel).toContain(".thumbnail-strip");
    expect(panel).toContain(".preview-image.");
    expect(panel).toContain("videoPreviewItem");
    expect(panel).toContain(".thumbnail.upload-status.");
    expect(panel).toContain("Загрузка...");
    expect(panel).toContain("Загружено");
    expect(model).toContain("mediaDraftItem");
    expect(model).toContain("previewImage");
  });
});
