import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media drafts and preview", () => {
  it("keeps uploaded media as typed draft items with thumbnails and preview modal", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(model).toContain("export type LiveRouteMediaDraftItem");
    expect(model).toContain('uploadStatus: "uploaded"');
    expect(model).toContain("mediaItems: LiveRouteMediaDraftItem[]");
    expect(model).toContain("previewItemId: string | null");
    expect(panel).toContain("renderMediaStrip");
    expect(panel).toContain(".thumbnail-strip");
    expect(panel).toContain(".thumbnail.replace.");
    expect(panel).toContain(".thumbnail.remove.");
    expect(panel).toContain("renderPreviewModal");
    expect(panel).toContain(".preview-modal");
    expect(panel).toContain("React19SafeModal");
  });

  it("preserves media kind through replace and publish snapshot", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

    expect(panel).toContain('mediaKind: currentItem?.mediaKind ?? "photo"');
    expect(panel).not.toContain('this.pickMedia({ mediaKind: "photo", source: "library" })');
    expect(panel).toContain("MEDIA_KIND_ROUTING_MISMATCH");
    expect(panel).toContain("MARKETPLACE_MEDIA_STABLE_PUBLIC_URL_MISSING");
    expect(panel).toContain('requireStablePublicUrl: copy.targetType === "marketplace_product"');
    expect(panel).toContain("const mediaAssets = mediaItems.map");
    expect(panel).toContain("mediaKind: item.mediaKind");
  });
});
