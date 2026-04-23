import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Alert, Platform } from "react-native";

import { ProfileContent } from "./ProfileContent";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLoadProfileScreenData = jest.fn();
const mockLoadStoredActiveContext = jest.fn();
const mockSignOutProfileSession = jest.fn();

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

jest.mock("@/src/features/profile/ProfileOtaDiagnosticsCard", () => ({
  ProfileOtaDiagnosticsCard: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(
      Text,
      { testID: "profile-ota-diagnostics-card" },
      "ota-diagnostics",
    );
  },
}));

jest.mock("./profile.services", () => ({
  loadProfileScreenData: (...args: unknown[]) =>
    mockLoadProfileScreenData(...args),
  saveProfileDetails: jest.fn(),
  signOutProfileSession: (...args: unknown[]) =>
    mockSignOutProfileSession(...args),
}));

describe("ProfileContent composition shell", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedMainProps = null;
    capturedEditModalProps = null;
    mockPush.mockReset();
    mockReplace.mockReset();
    mockLoadProfileScreenData.mockReset();
    mockLoadStoredActiveContext.mockReset();
    mockSignOutProfileSession.mockReset();

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

    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("loads screen data and exposes unified entry callbacks", async () => {
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
    expect(capturedMainProps?.hasSellerAreaEntry).toBe(true);
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
    expect(capturedMainProps?.activeContextDescription).toBe(
      "Сейчас активен Office. Доступные рабочие роли: Директор.",
    );
    expect(capturedEditModalProps).not.toBeNull();
    expect(capturedEditModalProps?.visible).toBe(false);

    act(() => {
      (capturedMainProps?.onOpenMarket as (() => void) | undefined)?.();
    });
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/market");

    act(() => {
      (capturedMainProps?.onOpenAddListing as (() => void) | undefined)?.();
    });
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/add");

    act(() => {
      (capturedMainProps?.onOpenSellerArea as (() => void) | undefined)?.();
    });
    expect(mockPush).toHaveBeenCalledWith("/seller");

    act(() => {
      (capturedMainProps?.onOpenOfficeAccess as (() => void) | undefined)?.();
    });
    expect(mockPush).toHaveBeenCalledWith("/office/index");
  });

  it("keeps seller entry hidden when there are no own listings", async () => {
    mockLoadStoredActiveContext.mockResolvedValue(null);
    mockLoadProfileScreenData.mockResolvedValue({
      profile: {
        id: "profile-1",
        user_id: "user-1",
        full_name: "Айбек",
        phone: "+996700000000",
        city: "Бишкек",
        usage_market: true,
        usage_build: false,
      },
      company: null,
      profileRole: null,
      profileEmail: "aybek@example.com",
      profileAvatarUrl: null,
      accessSourceSnapshot: {
        userId: "user-1",
        authRole: null,
        resolvedRole: null,
        usageMarket: true,
        usageBuild: false,
        ownedCompanyId: null,
        companyMemberships: [],
        listingsCount: 0,
      },
    });

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
    expect(capturedMainProps?.hasSellerAreaEntry).toBe(false);
    expect(
      (
        capturedMainProps?.accessModel as {
          activeContext: string;
        }
      ).activeContext,
    ).toBe("market");
  });

  it("shows retry shell with diagnostics when profile load fails", async () => {
    mockLoadProfileScreenData.mockRejectedValueOnce(
      new Error("supabase_client.user request timed out after 8000ms"),
    );

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<ProfileContent />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "profile-load-error-shell" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "profile-ota-diagnostics-fallback" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "profile-ota-diagnostics-card" }),
    ).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();

    mockLoadProfileScreenData.mockResolvedValueOnce({
      profile: {
        id: "profile-1",
        user_id: "user-1",
        full_name: "РђР№Р±РµРє",
        phone: "+996700000000",
        city: "Р‘РёС€РєРµРє",
        usage_market: true,
        usage_build: true,
      },
      company: null,
      profileRole: "director",
      profileEmail: "aybek@example.com",
      profileAvatarUrl: null,
      accessSourceSnapshot: {
        userId: "user-1",
        authRole: "director",
        resolvedRole: "director",
        usageMarket: true,
        usageBuild: true,
        ownedCompanyId: null,
        companyMemberships: [],
        listingsCount: 0,
      },
    });

    await act(async () => {
      renderer!.root.findByProps({ testID: "profile-load-retry" }).props.onPress();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockLoadProfileScreenData).toHaveBeenCalledTimes(2);
    expect(
      renderer!.root.findByProps({ testID: "profile-main-sections" }),
    ).toBeTruthy();
  });

  it("signs out through a web confirm fallback without relying on native Alert callbacks", async () => {
    const originalPlatformOS = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    const originalWindow = (globalThis as typeof globalThis & {
      window?: unknown;
    }).window;
    const confirm = jest.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { confirm },
    });
    mockSignOutProfileSession.mockResolvedValue(undefined);

    try {
      await act(async () => {
        TestRenderer.create(<ProfileContent />);
      });

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await (capturedMainProps?.onSignOut as (() => void) | undefined)?.();
        await Promise.resolve();
      });

      expect(confirm).toHaveBeenCalledWith("Завершить текущую сессию GOX?");
      expect(mockSignOutProfileSession).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/auth/login");
      expect(alertSpy).not.toHaveBeenCalledWith(
        "Выйти из аккаунта",
        expect.anything(),
        expect.anything(),
      );
    } finally {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: originalPlatformOS,
      });
      if (typeof originalWindow === "undefined") {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: originalWindow,
        });
      }
    }
  });
});
