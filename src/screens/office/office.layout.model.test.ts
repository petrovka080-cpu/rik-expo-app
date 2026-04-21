import { EMPTY_DATA, COPY } from "./officeHub.constants";
import { buildOfficeShellContentModel } from "./office.layout.model";

const access = {
  entryCopy: {
    title: "Office",
    subtitle: "Open company workspace",
    cta: "Open",
  },
};

describe("office.layout.model", () => {
  it("builds a deterministic loading shell model", () => {
    expect(
      buildOfficeShellContentModel({
        loading: true,
        data: EMPTY_DATA,
        access,
        companyFeedback: null,
      }),
    ).toEqual({
      kind: "loading",
      title: COPY.title,
      subtitle: COPY.loadingSubtitle,
      helper: COPY.loading,
    });
  });

  it("keeps office subtitle only for no-company content shells", () => {
    expect(
      buildOfficeShellContentModel({
        loading: false,
        data: EMPTY_DATA,
        access,
        companyFeedback: null,
      }),
    ).toEqual({
      kind: "content",
      title: access.entryCopy.title,
      subtitle: access.entryCopy.subtitle,
      hasCompany: false,
      showCompanyFeedback: false,
      showDeveloperOverride: false,
    });
  });

  it("drops the shell subtitle for company-backed office content and exposes visible shell flags", () => {
    expect(
      buildOfficeShellContentModel({
        loading: false,
        data: {
          ...EMPTY_DATA,
          company: {
            id: "company-1",
            owner_user_id: "user-1",
            name: "ACME Build",
            city: "Bishkek",
            address: "Toktogul 1",
            industry: "Construction",
          },
          developerOverride: {
            actorUserId: "user-1",
            isEnabled: true,
            isActive: true,
            allowedRoles: ["director"],
            activeEffectiveRole: "director",
            canAccessAllOfficeRoutes: true,
            canImpersonateForMutations: true,
            expiresAt: null,
            reason: "test_override",
          },
        },
        access,
        companyFeedback: "updated",
      }),
    ).toEqual({
      kind: "content",
      title: access.entryCopy.title,
      subtitle: undefined,
      hasCompany: true,
      showCompanyFeedback: true,
      showDeveloperOverride: true,
    });
  });
});
