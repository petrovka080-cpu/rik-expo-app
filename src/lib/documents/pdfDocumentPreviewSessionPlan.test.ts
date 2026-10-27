import { resolvePdfDocumentPreviewSessionPlan } from "./pdfDocumentPreviewSessionPlan";

describe("pdfDocumentPreviewSessionPlan", () => {
  it("uses materialized cache-backed sessions for Android remote-url viewer routes", () => {
    expect(
      resolvePdfDocumentPreviewSessionPlan({
        platform: "android",
        sourceKind: "remote-url",
        hasRouter: true,
      }),
    ).toEqual({
      action: "use_materialized_session",
      reason: "mobile_requires_local_cache",
    });
  });

  it("uses materialized cache-backed sessions for iOS remote-url viewer routes", () => {
    expect(
      resolvePdfDocumentPreviewSessionPlan({
        platform: "ios",
        sourceKind: "remote-url",
        hasRouter: true,
      }),
    ).toEqual({
      action: "use_materialized_session",
      reason: "mobile_requires_local_cache",
    });
  });

  it("keeps web on the existing materialized session contract", () => {
    expect(
      resolvePdfDocumentPreviewSessionPlan({
        platform: "web",
        sourceKind: "remote-url",
        hasRouter: true,
      }),
    ).toEqual({
      action: "use_materialized_session",
      reason: "platform_requires_materialization",
    });
  });

  it("requires a router before using in-memory viewer sessions", () => {
    expect(
      resolvePdfDocumentPreviewSessionPlan({
        platform: "ios",
        sourceKind: "remote-url",
        hasRouter: false,
      }),
    ).toEqual({
      action: "use_materialized_session",
      reason: "missing_router",
    });
  });

  it("keeps local files on the materialized session path", () => {
    expect(
      resolvePdfDocumentPreviewSessionPlan({
        platform: "android",
        sourceKind: "local-file",
        hasRouter: true,
      }),
    ).toEqual({
      action: "use_materialized_session",
      reason: "non_remote_source",
    });
  });
});
