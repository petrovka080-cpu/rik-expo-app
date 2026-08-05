import { resolvePdfViewerWebRenderUriCleanup } from "./pdfViewerWebRenderUriCleanup";

describe("pdfViewerWebRenderUriCleanup", () => {
  it("revokes only blob URLs explicitly owned by the viewer", () => {
    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "blob:https://example.com/pdf-render",
        ownedByViewer: true,
      }),
    ).toEqual({
      revokeUri: "blob:https://example.com/pdf-render",
      shouldCommitState: true,
    });

    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "https://example.com/document.pdf",
        ownedByViewer: true,
      }).revokeUri,
    ).toBeNull();

    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "android",
        uri: "blob:https://example.com/pdf-render",
        ownedByViewer: true,
      }).revokeUri,
    ).toBeNull();

    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "blob:https://example.com/storage-owned",
        ownedByViewer: false,
      }).revokeUri,
    ).toBeNull();
  });

  it("can suppress state commit for unmount cleanup", () => {
    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "blob:https://example.com/pdf-render",
        ownedByViewer: true,
        commitState: false,
      }),
    ).toEqual({
      revokeUri: "blob:https://example.com/pdf-render",
      shouldCommitState: false,
    });
  });
});
