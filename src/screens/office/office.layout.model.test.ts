import { EMPTY_DATA } from "./officeHub.constants";
import { buildOfficeShellContentModel } from "./office.layout.model";

const access = {
  entryCopy: {
    title: "Office",
    subtitle: "Open company workspace",
    cta: "Open",
  },
  officeCards: [],
};

describe("office.layout.model", () => {
  it("keeps initial loading as a content shell instead of a blocking loader", () => {
    expect(
      buildOfficeShellContentModel({
        loading: true,
        data: EMPTY_DATA,
        access,
        companyFeedback: null,
      }),
    ).toEqual({
      kind: "content",
      title: access.entryCopy.title,
      subtitle: access.entryCopy.subtitle,
      hasCompany: false,
      isInitialLoading: true,
      showOfficeDirections: true,
      showCompanyFeedback: false,
      showDeveloperOverride: false,
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
      isInitialLoading: false,
      showOfficeDirections: false,
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
            actorUserId: null,
            actorRole: null,
            entitlement: null,
            authorizationSource: "local_ui_only",
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
      isInitialLoading: false,
      showOfficeDirections: true,
      showCompanyFeedback: true,
      showDeveloperOverride: true,
    });
  });

  it("lets local developer override open role directions without creating a fake company", () => {
    expect(
      buildOfficeShellContentModel({
        loading: false,
        data: {
          ...EMPTY_DATA,
          developerOverride: {
            actorUserId: "user-1",
            actorRole: "platform_developer",
            entitlement: "platform_developer",
            authorizationSource: "server_entitlement",
            isEnabled: true,
            isActive: true,
            allowedRoles: ["director", "buyer", "foreman"],
            activeEffectiveRole: "director",
            canAccessAllOfficeRoutes: true,
            canImpersonateForMutations: false,
            expiresAt: null,
            reason: "local_developer",
          },
        },
        access: {
          ...access,
          officeCards: [
            {
              key: "director",
              title: "Director",
              subtitle: "Director",
              route: "/office/director",
              entryKind: "screen",
              tone: "#0F766E",
              requiredRoles: ["director"],
              inviteRole: "director",
            },
          ],
        },
        companyFeedback: null,
      }),
    ).toEqual({
      kind: "content",
      title: access.entryCopy.title,
      subtitle: access.entryCopy.subtitle,
      hasCompany: false,
      isInitialLoading: false,
      showOfficeDirections: true,
      showCompanyFeedback: false,
      showDeveloperOverride: true,
    });
  });
});
