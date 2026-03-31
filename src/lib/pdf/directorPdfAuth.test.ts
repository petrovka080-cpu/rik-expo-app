import {
  readDirectorPdfSignedAppRole,
  resolveDirectorPdfRoleAccess,
} from "./directorPdfAuth";

describe("directorPdfAuth", () => {
  it("accepts director access from signed app metadata when rpc role drifts", () => {
    expect(
      resolveDirectorPdfRoleAccess({
        user: { app_metadata: { role: "director" } },
        rpcRole: "buyer",
      }),
    ).toEqual({
      isDirector: true,
      source: "app_metadata",
      appMetadataRole: "director",
      rpcRole: "buyer",
    });
  });

  it("accepts director access from rpc when signed metadata is missing", () => {
    expect(
      resolveDirectorPdfRoleAccess({
        user: { app_metadata: {} },
        rpcRole: "director",
      }),
    ).toEqual({
      isDirector: true,
      source: "rpc",
      appMetadataRole: null,
      rpcRole: "director",
    });
  });

  it("rejects non-director access when neither trusted source says director", () => {
    expect(
      resolveDirectorPdfRoleAccess({
        user: { app_metadata: { role: "buyer" } },
        rpcRole: "buyer",
      }),
    ).toEqual({
      isDirector: false,
      source: "none",
      appMetadataRole: "buyer",
      rpcRole: "buyer",
    });
  });

  it("reads only signed app metadata and ignores user metadata lookalikes", () => {
    expect(
      readDirectorPdfSignedAppRole({
        app_metadata: {},
        user_metadata: { role: "director" },
      } as { app_metadata?: unknown }),
    ).toBeNull();
  });
});
