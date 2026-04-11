import { resolvePdfViewerWebRenderUriCleanup } from "./pdfViewerWebRenderUriCleanup";

describe("pdfViewerWebRenderUriCleanup", () => {
  it("revokes only web blob render URIs", () => {
    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "blob:https://example.com/pdf-render",
      }),
    ).toEqual({
      revokeUri: "blob:https://example.com/pdf-render",
      shouldCommitState: true,
    });

    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "https://example.com/document.pdf",
      }).revokeUri,
    ).toBeNull();

    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "android",
        uri: "blob:https://example.com/pdf-render",
      }).revokeUri,
    ).toBeNull();
  });

  it("can suppress state commit for unmount cleanup", () => {
    expect(
      resolvePdfViewerWebRenderUriCleanup({
        platform: "web",
        uri: "blob:https://example.com/pdf-render",
        commitState: false,
      }),
    ).toEqual({
      revokeUri: "blob:https://example.com/pdf-render",
      shouldCommitState: false,
    });
  });
});
