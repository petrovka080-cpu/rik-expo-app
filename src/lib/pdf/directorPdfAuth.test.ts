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
      companyMemberRoles: [],
      appMetadataRole: "director",
      rpcRole: "buyer",
    });
  });

  it("prefers director company membership before signed metadata or rpc role", () => {
    expect(
      resolveDirectorPdfRoleAccess({
        user: { app_metadata: { role: "buyer" } },
        rpcRole: "contractor",
        companyMemberRoles: ["director", "buyer"],
      }),
    ).toEqual({
      isDirector: true,
      source: "company_members",
      companyMemberRoles: ["director", "buyer"],
      appMetadataRole: "buyer",
      rpcRole: "contractor",
    });
  });

  it("allows director PDF through active developer override", () => {
    expect(
      resolveDirectorPdfRoleAccess({
        user: { app_metadata: { role: "buyer" } },
        rpcRole: "contractor",
        companyMemberRoles: ["buyer"],
        developerOverrideActive: true,
        developerOverrideEffectiveRole: "director",
      }),
    ).toEqual({
      isDirector: true,
      source: "developer_override",
      companyMemberRoles: ["buyer"],
      appMetadataRole: "buyer",
      rpcRole: "contractor",
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
      companyMemberRoles: [],
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
      companyMemberRoles: [],
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
