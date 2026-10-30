import type {
  DocumentAsset,
  DocumentSession,
} from "../../src/lib/documents/pdfDocumentSessions";
import {
  resolvePdfViewerRouteModel,
  resolvePdfViewerSnapshot,
} from "../../src/lib/pdf/pdfViewer.route";

const registrySession: DocumentSession = {
  sessionId: "session-1",
  assetId: "asset-1",
  status: "ready",
  createdAt: "2026-04-20T10:00:00.000Z",
};

const registryAsset: DocumentAsset = {
  assetId: "asset-1",
  uri: "https://example.com/registry.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/registry.pdf",
  },
  sourceKind: "remote-url",
  fileName: "registry.pdf",
  title: "Registry PDF",
  mimeType: "application/pdf",
  documentType: "director_report",
  originModule: "director",
  source: "generated",
  createdAt: "2026-04-20T10:00:00.000Z",
};

describe("pdfViewer.route", () => {
  it("normalizes valid route params and preserves direct snapshot inputs", () => {
    const route = resolvePdfViewerRouteModel({
      sessionId: ["session-1"],
      openToken: "open-1",
      uri: "https://example.com/direct.pdf",
      fileName: "direct.pdf",
      title: "Direct PDF",
      sourceKind: "remote-url",
      documentType: "director_report",
      originModule: "director",
      source: "generated",
      entityId: "object-1",
    });

    expect(route).toMatchObject({
      sessionId: "session-1",
      openToken: "open-1",
      hasUri: true,
      receivedSessionId: "session-1",
      uri: "https://example.com/direct.pdf",
      fileName: "direct.pdf",
      title: "Direct PDF",
      sourceKind: "remote-url",
      documentType: "director_report",
      originModule: "director",
      source: "generated",
      entityId: "object-1",
      validation: {
        isValid: true,
        reason: "ok",
        canResolveDirectSnapshot: true,
      },
    });
  });

  it("maps missing route sources to a deterministic validation error", () => {
    const route = resolvePdfViewerRouteModel({});

    expect(route.validation).toEqual({
      isValid: false,
      reason: "missing_uri_and_session",
      errorMessage: "Missing PDF viewer route source.",
      canResolveDirectSnapshot: false,
    });
    expect(route.receivedSessionId).toBeNull();
    expect(route.uri).toBeNull();
  });

  it("keeps registry snapshot as the authoritative source when session already exists", () => {
    const route = resolvePdfViewerRouteModel({
      sessionId: "session-1",
      uri: "https://example.com/direct.pdf",
    });

    const snapshot = resolvePdfViewerSnapshot({
      route,
      registrySnapshot: {
        session: registrySession,
        asset: registryAsset,
      },
    });

    expect(snapshot).toEqual({
      session: registrySession,
      asset: registryAsset,
    });
  });

  it("falls back to a direct snapshot when registry session is absent but route uri is valid", () => {
    const route = resolvePdfViewerRouteModel({
      uri: "https://example.com/direct.pdf",
      fileName: "direct.pdf",
      title: "Direct PDF",
      sourceKind: "remote-url",
      documentType: "attachment_pdf",
      originModule: "reports",
      source: "generated",
      entityId: "object-2",
    });

    const snapshot = resolvePdfViewerSnapshot({
      route,
      registrySnapshot: {
        session: null,
        asset: null,
      },
    });

    expect(snapshot.session?.status).toBe("ready");
    expect(snapshot.asset).toMatchObject({
      uri: "https://example.com/direct.pdf",
      fileName: "direct.pdf",
      title: "Direct PDF",
      sourceKind: "remote-url",
      documentType: "attachment_pdf",
      originModule: "reports",
      entityId: "object-2",
    });
  });

  it("returns an empty snapshot when neither registry nor direct route source can resolve", () => {
    const route = resolvePdfViewerRouteModel({
      sessionId: "session-1",
    });

    expect(
      resolvePdfViewerSnapshot({
        route,
        registrySnapshot: {
          session: null,
          asset: null,
        },
      }),
    ).toEqual({
      session: null,
      asset: null,
    });
  });
});
