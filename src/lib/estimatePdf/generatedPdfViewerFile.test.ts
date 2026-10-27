import { Platform } from "react-native";

import {
  clearDocumentSessions,
  getDocumentSessionSnapshot,
} from "../documents/pdfDocumentSessions";
import { buildGeneratedPdfViewerRouteParams } from "./generatedPdfViewerFile";

describe("generated PDF viewer navigation", () => {
  it("keeps a generated web PDF out of the route URL", async () => {
    const originalPlatform = Platform.OS;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const createObjectUrl = jest.fn(() => "blob:generated-estimate");
    const revokeObjectUrl = jest.fn();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    const uri = `data:application/pdf;base64,${"A".repeat(2_000_000)}`;
    const cacheIdentity = {
      tenantId: "tenant-1",
      companyId: "company-1",
      userId: "user-1",
      sessionBoundaryId: "auth-session-1",
      revisionId: "revision-1",
      snapshotHash: "snapshot-1",
      rendererVersion: "renderer-1",
      locale: "ru-KG",
      currency: "KGS",
    };

    try {
      const build = (snapshotHash = "snapshot-1") =>
        buildGeneratedPdfViewerRouteParams({
          uri,
          title: "Estimate",
          fileName: "estimate.pdf",
          accessKind: "signed-url",
          documentType: "request",
          originModule: "reports",
          source: "generated",
          entityId: "estimate-1",
          cacheIdentity: { ...cacheIdentity, snapshotHash },
        });
      const [params, repeatedParams] = await Promise.all([build(), build()]);

      expect(params).toEqual({
        sessionId: expect.any(String),
        openToken: "",
      });
      expect(repeatedParams).toEqual(params);
      expect("uri" in params).toBe(false);
      if (!("sessionId" in params)) throw new Error("TEST_SESSION_ROUTE_MISSING");
      const asset = getDocumentSessionSnapshot(params.sessionId).asset;
      expect(asset?.uri).toMatch(/^blob:/);
      expect(asset?.uri).not.toContain("data:application/pdf");
      expect(asset?.objectUrlOwnership).toBe("document-session");
      expect(createObjectUrl).toHaveBeenCalledTimes(1);

      const changedSnapshotParams = await build("snapshot-2");
      expect(changedSnapshotParams).not.toEqual(params);
      expect(createObjectUrl).toHaveBeenCalledTimes(2);
    } finally {
      clearDocumentSessions();
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:generated-estimate");
      Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform });
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectUrl,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectUrl,
      });
    }
  });
});
