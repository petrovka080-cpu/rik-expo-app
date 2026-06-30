import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media drafts and preview", () => {
  it("keeps marketplace media as typed uploaded draft items with inline thumbnail actions", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(model).toContain("export type LiveRouteMediaDraftItem");
    expect(model).toContain('uploadStatus: "uploading" | "uploaded" | "failed"');
    expect(model).toContain("mediaItems: LiveRouteMediaDraftItem[]");
    expect(model).toContain("uploadInProgress?: boolean");
    expect(model).not.toContain("LiveRouteMediaLocalPreview");
    expect(model).not.toContain("onLocalPreview?");
    expect(model).not.toContain("previewItemId: string | null");
    expect(model).not.toContain("mediaPickerVisible: boolean");
    expect(panel).toContain("renderMediaStrip");
    expect(panel).toContain(".thumbnail-strip");
    expect(panel).toContain(".thumbnail-empty-strip");
    expect(panel).toContain("MARKET_ADD_MEDIA_LIMITS.maxPhotos");
    expect(panel).toContain(".thumbnail.cover-badge.");
    expect(panel).toContain(".thumbnail.video-duration.");
    expect(panel).toContain(".thumbnail.upload-status.");
    expect(panel).toContain(".thumbnail.replace.");
    expect(panel).toContain(".thumbnail.remove.");
    expect(panel).not.toContain("renderAddMediaTile");
    expect(panel).not.toContain(".add-media-tile");
    expect(panel).not.toContain("renderMediaPicker");
    expect(panel).not.toContain(".picker-sheet");
    expect(panel).not.toContain("renderPreviewModal");
    expect(panel).not.toContain(".preview-modal");
    expect(panel).not.toContain("React19SafeModal");
    expect(panel).not.toContain("createLocalDraftItem");
    expect(panel).not.toContain("revokeLocalPreviewUrl");
    expect(panel).not.toContain("onLocalPreview");
    expect(panel).not.toContain("setTimeout");
    expect(panel).not.toContain("local:");
  });

  it("preserves media kind through replace and keeps publish snapshot uploaded-only", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

    expect(panel).toContain('mediaKind: currentItem?.mediaKind ?? "photo"');
    expect(panel).not.toContain('this.pickMedia({ mediaKind: "photo", source: "library" })');
    expect(panel).toContain("MEDIA_KIND_ROUTING_MISMATCH");
    expect(panel).toContain("MARKETPLACE_MEDIA_STABLE_PUBLIC_URL_MISSING");
    expect(panel).toContain('requireStablePublicUrl: copy.targetType === "marketplace_product"');
    expect(panel).toContain('mediaItems.filter((item) => item.uploadStatus === "uploaded")');
    expect(panel).toContain("const mediaAssets = uploadedItems.map");
    expect(panel).toContain("mediaKind: item.mediaKind");
    expect(panel).toContain("const uploadInProgress =");
    expect(panel).toContain("mediaDraftCount: mediaItems.length");
  });
});
