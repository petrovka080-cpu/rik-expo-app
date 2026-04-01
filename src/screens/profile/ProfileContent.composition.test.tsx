import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ProfileContent } from "./ProfileContent";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLoadProfileScreenData = jest.fn();
const mockLoadStoredActiveContext = jest.fn();

let capturedMainProps: Record<string, unknown> | null = null;
let capturedEditModalProps: Record<string, unknown> | null = null;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: "images",
  },
}));

jest.mock("../../lib/appAccessContextStorage", () => ({
  loadStoredActiveContext: (...args: unknown[]) =>
    mockLoadStoredActiveContext(...args),
  persistActiveContext: jest.fn(),
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

jest.mock("./components/EditProfileModal", () => ({
  EditProfileModal: (props: Record<string, unknown>) => {
    const React = require("react");
    const { Text } = require("react-native");
    capturedEditModalProps = props;
    return React.createElement(
      Text,
      { testID: "profile-edit-modal" },
      "edit-modal",
    );
  },
}));

jest.mock("./profile.services", () => ({
  loadProfileScreenData: (...args: unknown[]) =>
    mockLoadProfileScreenData(...args),
  saveProfileDetails: jest.fn(),
  signOutProfileSession: jest.fn(),
}));

describe("ProfileContent composition shell", () => {
  beforeEach(() => {
    capturedMainProps = null;
    capturedEditModalProps = null;
    mockPush.mockReset();
    mockReplace.mockReset();
    mockLoadProfileScreenData.mockReset();
    mockLoadStoredActiveContext.mockReset();

    mockLoadStoredActiveContext.mockResolvedValue("office");
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
      accessSourceSnapshot: {
        userId: "user-1",
        authRole: "director",
        resolvedRole: "director",
        usageMarket: true,
        usageBuild: true,
        ownedCompanyId: "company-1",
        companyMemberships: [{ companyId: "company-1", role: "director" }],
        listingsCount: 2,
      },
    });
  });

  it("loads screen data and delegates profile rendering through access model", async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ProfileContent />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "profile-main-sections" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "profile-edit-modal" }),
    ).toBeTruthy();

    expect(mockLoadProfileScreenData).toHaveBeenCalledTimes(1);
    expect(mockLoadStoredActiveContext).toHaveBeenCalledWith("user-1");
    expect(capturedMainProps).not.toBeNull();
    expect(capturedMainProps?.profileName).toBe("Айбек");
    expect(capturedMainProps?.roleLabel).toBe("Директор");
    expect(capturedMainProps?.officeRolesLabel).toBe("Директор");
    expect(
      (
        capturedMainProps?.accessModel as {
          activeContext: string;
        }
      ).activeContext,
    ).toBe("office");
    expect(
      (
        capturedMainProps?.accessModel as {
          availableContexts: string[];
        }
      ).availableContexts,
    ).toEqual(["market", "office"]);
    expect(
      capturedMainProps?.activeContextDescription,
    ).toBe("Сейчас активен Office. Доступные рабочие роли: Директор.");
    expect(capturedEditModalProps).not.toBeNull();
    expect(capturedEditModalProps?.visible).toBe(false);
    act(() => {
      (capturedMainProps?.onOpenSellerArea as (() => void) | undefined)?.();
    });
    expect(mockPush).toHaveBeenCalledWith("/seller");
  });

  it("falls back to market context when no stored context is available", async () => {
    mockLoadStoredActiveContext.mockResolvedValue(null);

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ProfileContent />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "profile-main-sections" }),
    ).toBeTruthy();
    expect(
      (
        capturedMainProps?.accessModel as {
          activeContext: string;
        }
      ).activeContext,
    ).toBe("market");
  });
});
