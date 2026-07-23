import { Platform } from "react-native";

import { getDocumentSessionSnapshot } from "../documents/pdfDocumentSessions";
import { buildGeneratedPdfViewerRouteParams } from "./generatedPdfViewerFile";

describe("generated PDF viewer navigation", () => {
  it("keeps a generated web PDF out of the route URL", async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    const uri = `data:application/pdf;base64,${"A".repeat(2_000_000)}`;

    try {
      const params = await buildGeneratedPdfViewerRouteParams({
        uri,
        title: "Estimate",
        fileName: "estimate.pdf",
        accessKind: "signed-url",
        documentType: "request",
        originModule: "reports",
        source: "generated",
        entityId: "estimate-1",
      });

      expect(params).toEqual({
        sessionId: expect.any(String),
        openToken: "",
      });
      expect("uri" in params).toBe(false);
      if (!("sessionId" in params)) throw new Error("TEST_SESSION_ROUTE_MISSING");
      expect(getDocumentSessionSnapshot(params.sessionId).asset?.uri).toBe(uri);
    } finally {
      Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform });
    }
  });
});
