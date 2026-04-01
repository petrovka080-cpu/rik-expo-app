import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ProfileContent } from "./ProfileContent";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLoadProfileScreenData = jest.fn();
const mockBuildProfileModeFromCompany = jest.fn();

let capturedMainProps: Record<string, unknown> | null = null;
let capturedModalProps: Record<string, unknown> | null = null;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("./components/ProfileMainSections", () => ({
  ProfileMainSections: (props: Record<string, unknown>) => {
    const React = require("react");
    const { Text } = require("react-native");
    capturedMainProps = props;
    return React.createElement(
      Text,
      { testID: "profile-main-sections" },
      "main-sections",
    );
  },
}));

jest.mock("./components/ProfileModalStack", () => ({
  ProfileModalStack: (props: Record<string, unknown>) => {
    const React = require("react");
    const { Text } = require("react-native");
    capturedModalProps = props;
    return React.createElement(
      Text,
      { testID: "profile-modal-stack" },
      "modal-stack",
    );
  },
}));

jest.mock("./profile.services", () => ({
  buildProfileModeFromCompany: (...args: unknown[]) =>
    mockBuildProfileModeFromCompany(...args),
  createCompanyInvite: jest.fn(),
  createMarketListing: jest.fn(),
  ensureCompanyCabinetAccess: jest.fn(),
  loadCatalogItems: jest.fn(),
  loadProfileScreenData: (...args: unknown[]) => mockLoadProfileScreenData(...args),
  saveCompanyProfile: jest.fn(),
  saveProfileDetails: jest.fn(),
  saveProfileUsage: jest.fn(),
  searchCatalogItems: jest.fn(),
  signOutProfileSession: jest.fn(),
}));

describe("ProfileContent composition shell", () => {
  beforeEach(() => {
    capturedMainProps = null;
    capturedModalProps = null;
    mockPush.mockReset();
    mockReplace.mockReset();
    mockBuildProfileModeFromCompany.mockReset();
    mockLoadProfileScreenData.mockReset();

    mockBuildProfileModeFromCompany.mockReturnValue("person");
    mockLoadProfileScreenData.mockResolvedValue({
      profile: {
        id: "profile-1",
        user_id: "user-1",
        full_name: "Айбек",
        phone: "+996700000000",
        city: "Бишкек",
        usage_market: true,
        usage_build: true,
      },
      company: {
        id: "company-1",
        owner_user_id: "user-1",
        name: "ACME Build",
        city: "Бишкек",
      },
      profileRole: "director",
      profileEmail: "aybek@example.com",
      profileAvatarUrl: null,
      myListings: [],
      profileMode: "company",
    });
  });

  it("loads screen data and delegates rendering to extracted boundaries", async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ProfileContent />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "profile-main-sections" })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "profile-modal-stack" })).toBeTruthy();

    expect(mockLoadProfileScreenData).toHaveBeenCalledTimes(1);
    expect(mockBuildProfileModeFromCompany).toHaveBeenCalledTimes(1);
    expect(capturedMainProps).not.toBeNull();
    expect(capturedMainProps?.profileName).toBe("Айбек");
    expect(capturedMainProps?.profileMode).toBe("person");
    expect(capturedMainProps?.companyCardTitle).toBeTruthy();
    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps?.editProfileOpen).toBe(false);
    expect(capturedModalProps?.listingModalOpen).toBe(false);
    expect(capturedModalProps?.inviteModalOpen).toBe(false);
  });
});
