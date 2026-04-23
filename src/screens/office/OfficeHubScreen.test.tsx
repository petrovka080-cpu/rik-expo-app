import React from "react";
import { InteractionManager, Keyboard, Linking } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import OfficeHubScreen, {
  __resetOfficeHubBootstrapSnapshotForTests,
} from "./OfficeHubScreen";

const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockLoadOfficeAccessScreenData = jest.fn();
const mockLoadOfficeMembersPage = jest.fn();
const mockCreateOfficeInvite = jest.fn();
const mockShareOfficeInviteCode = jest.fn();
const mockCopyOfficeInviteText = jest.fn();
const mockOpenURL = jest.spyOn(Linking, "openURL");
const mockRecordOfficeBootstrapInitialDone = jest.fn();
const mockRecordOfficeBootstrapInitialStart = jest.fn();
const mockRecordOfficeFocusRefreshDone = jest.fn();
const mockRecordOfficeFocusRefreshReason = jest.fn();
const mockRecordOfficeFocusRefreshSkipped = jest.fn();
const mockRecordOfficeFocusRefreshStart = jest.fn();
const mockRecordOfficeLoadingShellEnter = jest.fn();
const mockRecordOfficeLoadingShellSkippedOnFocusReturn = jest.fn();
const mockRecordOfficeReentryComponentMount = jest.fn();
const mockRecordOfficeReentryEffectDone = jest.fn();
const mockRecordOfficeReentryEffectStart = jest.fn();
const mockRecordOfficeReentryFailure = jest.fn();
const mockRecordOfficeReentryRenderSuccess = jest.fn();
const mockRecordOfficePostReturnChildMountDone = jest.fn();
const mockRecordOfficePostReturnChildMountStart = jest.fn();
const mockRecordOfficePostReturnFailure = jest.fn();
const mockRecordOfficePostReturnFocus = jest.fn();
const mockRecordOfficePostReturnIdleDone = jest.fn();
const mockRecordOfficePostReturnIdleStart = jest.fn();
const mockRecordOfficePostReturnLayoutCommit = jest.fn();
const mockRecordOfficePostReturnSectionRenderDone = jest.fn();
const mockRecordOfficePostReturnSectionRenderStart = jest.fn();
const mockRecordOfficePostReturnSubtreeDone = jest.fn();
const mockRecordOfficePostReturnSubtreeFailure = jest.fn();
const mockRecordOfficePostReturnSubtreeStart = jest.fn();
const mockRecordOfficeNativeAnimationFrameDone = jest.fn();
const mockRecordOfficeNativeAnimationFrameStart = jest.fn();
const mockRecordOfficeNativeCallbackFailure = jest.fn();
const mockRecordOfficeNativeContentSizeDone = jest.fn();
const mockRecordOfficeNativeContentSizeStart = jest.fn();
const mockRecordOfficeNativeFocusCallbackDone = jest.fn();
const mockRecordOfficeNativeFocusCallbackStart = jest.fn();
const mockRecordOfficeNativeInteractionDone = jest.fn();
const mockRecordOfficeNativeInteractionStart = jest.fn();
const mockRecordOfficeNativeKeyboardEvent = jest.fn();
const mockRecordOfficeNativeLayoutDone = jest.fn();
const mockRecordOfficeNativeLayoutStart = jest.fn();
const mockPeekPendingOfficeRouteReturnReceipt = jest.fn();
let mockOfficePostReturnProbe = ["all"];
const mockFocusEffectCallbacks = new Set<() => void | (() => void)>();

async function triggerFocusEffect() {
  await act(async () => {
    mockFocusEffectCallbacks.forEach((callback) => {
      callback();
    });
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

jest.mock("expo-router", () => {
  const ReactRuntime = require("react");
  return {
    useRouter: () => ({
      push: mockPush,
    }),
    useLocalSearchParams: (...args: unknown[]) =>
      mockUseLocalSearchParams(...args),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => {
        mockFocusEffectCallbacks.add(callback);
        const cleanup = callback();
        return () => {
          mockFocusEffectCallbacks.delete(callback);
          if (typeof cleanup === "function") {
            cleanup();
          }
        };
      }, [callback]);
    },
  };
});

jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactRuntime = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: function MockModal(props: {
      visible?: boolean;
      children?: React.ReactNode;
    }) {
      return ReactRuntime.createElement(
        View,
        { testID: props.visible ? "mock-modal-visible" : "mock-modal-hidden" },
        props.visible ? props.children : null,
      );
    },
  };
});

jest.mock("../../lib/navigation/officeReentryBreadcrumbs", () => ({
  formatOfficePostReturnProbe: (value: string[] | null | undefined) =>
    Array.isArray(value) && value.length ? value.join(",") : "all",
  getOfficePostReturnProbe: () => mockOfficePostReturnProbe,
  normalizeOfficePostReturnProbe: (
    value: string | string[] | undefined | null,
  ) => {
    if (value == null) return null;
    const parts = Array.isArray(value)
      ? value
      : String(value)
          .split(",")
          .map((item) => item.trim());
    const normalized = Array.from(
      new Set(parts.flatMap((item) => String(item).split(",")).filter(Boolean)),
    );
    return normalized.length ? normalized : ["all"];
  },
  peekPendingOfficeRouteReturnReceipt: (...args: unknown[]) =>
    mockPeekPendingOfficeRouteReturnReceipt(...args),
  recordOfficeReentryComponentMount: (...args: unknown[]) =>
    mockRecordOfficeReentryComponentMount(...args),
  recordOfficeBootstrapInitialDone: (...args: unknown[]) =>
    mockRecordOfficeBootstrapInitialDone(...args),
  recordOfficeBootstrapInitialStart: (...args: unknown[]) =>
    mockRecordOfficeBootstrapInitialStart(...args),
  recordOfficeFocusRefreshDone: (...args: unknown[]) =>
    mockRecordOfficeFocusRefreshDone(...args),
  recordOfficeFocusRefreshReason: (...args: unknown[]) =>
    mockRecordOfficeFocusRefreshReason(...args),
  recordOfficeFocusRefreshSkipped: (...args: unknown[]) =>
    mockRecordOfficeFocusRefreshSkipped(...args),
  recordOfficeFocusRefreshStart: (...args: unknown[]) =>
    mockRecordOfficeFocusRefreshStart(...args),
  recordOfficeLoadingShellEnter: (...args: unknown[]) =>
    mockRecordOfficeLoadingShellEnter(...args),
  recordOfficeLoadingShellSkippedOnFocusReturn: (...args: unknown[]) =>
    mockRecordOfficeLoadingShellSkippedOnFocusReturn(...args),
  recordOfficeReentryEffectDone: (...args: unknown[]) =>
    mockRecordOfficeReentryEffectDone(...args),
  recordOfficeReentryEffectStart: (...args: unknown[]) =>
    mockRecordOfficeReentryEffectStart(...args),
  recordOfficeReentryFailure: (...args: unknown[]) =>
    mockRecordOfficeReentryFailure(...args),
  recordOfficeReentryRenderSuccess: (...args: unknown[]) =>
    mockRecordOfficeReentryRenderSuccess(...args),
  recordOfficePostReturnChildMountDone: (...args: unknown[]) =>
    mockRecordOfficePostReturnChildMountDone(...args),
  recordOfficePostReturnChildMountStart: (...args: unknown[]) =>
    mockRecordOfficePostReturnChildMountStart(...args),
  recordOfficePostReturnFailure: (...args: unknown[]) =>
    mockRecordOfficePostReturnFailure(...args),
  recordOfficePostReturnFocus: (...args: unknown[]) =>
    mockRecordOfficePostReturnFocus(...args),
  recordOfficePostReturnIdleDone: (...args: unknown[]) =>
    mockRecordOfficePostReturnIdleDone(...args),
  recordOfficePostReturnIdleStart: (...args: unknown[]) =>
    mockRecordOfficePostReturnIdleStart(...args),
  recordOfficePostReturnLayoutCommit: (...args: unknown[]) =>
    mockRecordOfficePostReturnLayoutCommit(...args),
  recordOfficePostReturnSectionRenderDone: (...args: unknown[]) =>
    mockRecordOfficePostReturnSectionRenderDone(...args),
  recordOfficePostReturnSectionRenderStart: (...args: unknown[]) =>
    mockRecordOfficePostReturnSectionRenderStart(...args),
  recordOfficePostReturnSubtreeDone: (...args: unknown[]) =>
    mockRecordOfficePostReturnSubtreeDone(...args),
  recordOfficePostReturnSubtreeFailure: (...args: unknown[]) =>
    mockRecordOfficePostReturnSubtreeFailure(...args),
  recordOfficePostReturnSubtreeStart: (...args: unknown[]) =>
    mockRecordOfficePostReturnSubtreeStart(...args),
  recordOfficeNativeAnimationFrameDone: (...args: unknown[]) =>
    mockRecordOfficeNativeAnimationFrameDone(...args),
  recordOfficeNativeAnimationFrameStart: (...args: unknown[]) =>
    mockRecordOfficeNativeAnimationFrameStart(...args),
  recordOfficeNativeCallbackFailure: (...args: unknown[]) =>
    mockRecordOfficeNativeCallbackFailure(...args),
  recordOfficeNativeContentSizeDone: (...args: unknown[]) =>
    mockRecordOfficeNativeContentSizeDone(...args),
  recordOfficeNativeContentSizeStart: (...args: unknown[]) =>
    mockRecordOfficeNativeContentSizeStart(...args),
  recordOfficeNativeFocusCallbackDone: (...args: unknown[]) =>
    mockRecordOfficeNativeFocusCallbackDone(...args),
  recordOfficeNativeFocusCallbackStart: (...args: unknown[]) =>
    mockRecordOfficeNativeFocusCallbackStart(...args),
  recordOfficeNativeInteractionDone: (...args: unknown[]) =>
    mockRecordOfficeNativeInteractionDone(...args),
  recordOfficeNativeInteractionStart: (...args: unknown[]) =>
    mockRecordOfficeNativeInteractionStart(...args),
  recordOfficeNativeKeyboardEvent: (...args: unknown[]) =>
    mockRecordOfficeNativeKeyboardEvent(...args),
  recordOfficeNativeLayoutDone: (...args: unknown[]) =>
    mockRecordOfficeNativeLayoutDone(...args),
  recordOfficeNativeLayoutStart: (...args: unknown[]) =>
    mockRecordOfficeNativeLayoutStart(...args),
  setOfficePostReturnProbe: (value: string | string[] | undefined | null) => {
    if (value == null) {
      mockOfficePostReturnProbe = ["all"];
      return mockOfficePostReturnProbe;
    }
    const parts = Array.isArray(value)
      ? value
      : String(value)
          .split(",")
          .map((item) => item.trim());
    mockOfficePostReturnProbe = Array.from(
      new Set(parts.flatMap((item) => String(item).split(",")).filter(Boolean)),
    );
    if (!mockOfficePostReturnProbe.length) {
      mockOfficePostReturnProbe = ["all"];
    }
    return mockOfficePostReturnProbe;
  },
}));

jest.mock("./officeAccess.services", () => ({
  loadOfficeAccessScreenData: (...args: unknown[]) =>
    mockLoadOfficeAccessScreenData(...args),
  loadOfficeMembersPage: (...args: unknown[]) =>
    mockLoadOfficeMembersPage(...args),
  createOfficeCompany: jest.fn(),
  createOfficeInvite: (...args: unknown[]) => mockCreateOfficeInvite(...args),
  updateOfficeMemberRole: jest.fn(),
}));

jest.mock("./officeInviteShare", () => ({
  shareOfficeInviteCode: (...args: unknown[]) =>
    mockShareOfficeInviteCode(...args),
  copyOfficeInviteText: (...args: unknown[]) =>
    mockCopyOfficeInviteText(...args),
}));

const directorData = {
  currentUserId: "user-1",
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Айбек",
    phone: "+996700000000",
    city: "Бишкек",
    usage_market: true,
    usage_build: true,
  },
  profileEmail: "aybek@example.com",
  profileRole: "director",
  company: {
    id: "company-1",
    owner_user_id: "user-1",
    name: "ACME Build",
    city: "Бишкек",
    address: "г. Бишкек, ул. Токтогула 1",
    industry: "Строительство",
    phone_main: "+996700000000",
    phone_whatsapp: "+996555000111",
    email: "office@acme.test",
    site: "https://acme.test",
    inn: "1234567890",
    about_short: "ЖК Авангард",
    about_full: "г. Бишкек, мкр. Асанбай",
  },
  companyAccessRole: "director",
  accessSourceSnapshot: {
    userId: "user-1",
    authRole: "director",
    resolvedRole: "director",
    usageMarket: true,
    usageBuild: true,
    ownedCompanyId: "company-1",
    companyMemberships: [{ companyId: "company-1", role: "director" }],
    listingsCount: 0,
  },
  members: [
    {
      userId: "user-1",
      role: "director",
      fullName: "Айбек",
      phone: "+996700000000",
      createdAt: "2026-04-01T00:00:00.000Z",
      isOwner: true,
    },
  ],
  membersPagination: {
    limit: 25,
    nextOffset: 1,
    total: 1,
    hasMore: false,
  },
  invites: [],
};

const pendingInvite = {
  id: "invite-1",
  inviteCode: "GOX-FOREMAN",
  name: "Нурбек",
  phone: "+996555000111",
  email: null,
  role: "foreman",
  status: "pending",
  createdAt: "2026-04-02T00:00:00.000Z",
  expiresAt: null,
  comment: null,
};

const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

describe("OfficeHubScreen", () => {
  let interactionSpy: jest.SpyInstance;
  let keyboardSpy: jest.SpyInstance;

  beforeEach(() => {
    __resetOfficeHubBootstrapSnapshotForTests();
    mockUseLocalSearchParams.mockReset();
    mockUseLocalSearchParams.mockReturnValue({});
    mockOfficePostReturnProbe = ["all"];
    mockFocusEffectCallbacks.clear();
    mockPush.mockReset();
    mockLoadOfficeAccessScreenData.mockReset();
    mockLoadOfficeMembersPage.mockReset();
    mockCreateOfficeInvite.mockReset();
    mockShareOfficeInviteCode.mockReset();
    mockCopyOfficeInviteText.mockReset();
    mockOpenURL.mockReset();
    mockRecordOfficeBootstrapInitialDone.mockReset();
    mockRecordOfficeBootstrapInitialStart.mockReset();
    mockRecordOfficeFocusRefreshDone.mockReset();
    mockRecordOfficeFocusRefreshReason.mockReset();
    mockRecordOfficeFocusRefreshSkipped.mockReset();
    mockRecordOfficeFocusRefreshStart.mockReset();
    mockRecordOfficeLoadingShellEnter.mockReset();
    mockRecordOfficeLoadingShellSkippedOnFocusReturn.mockReset();
    mockRecordOfficeReentryComponentMount.mockReset();
    mockRecordOfficeReentryEffectDone.mockReset();
    mockRecordOfficeReentryEffectStart.mockReset();
    mockRecordOfficeReentryFailure.mockReset();
    mockRecordOfficeReentryRenderSuccess.mockReset();
    mockRecordOfficePostReturnChildMountDone.mockReset();
    mockRecordOfficePostReturnChildMountStart.mockReset();
    mockRecordOfficePostReturnFailure.mockReset();
    mockRecordOfficePostReturnFocus.mockReset();
    mockRecordOfficePostReturnIdleDone.mockReset();
    mockRecordOfficePostReturnIdleStart.mockReset();
    mockRecordOfficePostReturnLayoutCommit.mockReset();
    mockRecordOfficePostReturnSectionRenderDone.mockReset();
    mockRecordOfficePostReturnSectionRenderStart.mockReset();
    mockRecordOfficePostReturnSubtreeDone.mockReset();
    mockRecordOfficePostReturnSubtreeFailure.mockReset();
    mockRecordOfficePostReturnSubtreeStart.mockReset();
    mockRecordOfficeNativeAnimationFrameDone.mockReset();
    mockRecordOfficeNativeAnimationFrameStart.mockReset();
    mockRecordOfficeNativeCallbackFailure.mockReset();
    mockRecordOfficeNativeContentSizeDone.mockReset();
    mockRecordOfficeNativeContentSizeStart.mockReset();
    mockRecordOfficeNativeFocusCallbackDone.mockReset();
    mockRecordOfficeNativeFocusCallbackStart.mockReset();
    mockRecordOfficeNativeInteractionDone.mockReset();
    mockRecordOfficeNativeInteractionStart.mockReset();
    mockRecordOfficeNativeKeyboardEvent.mockReset();
    mockRecordOfficeNativeLayoutDone.mockReset();
    mockRecordOfficeNativeLayoutStart.mockReset();
    mockPeekPendingOfficeRouteReturnReceipt.mockReset();
    mockPeekPendingOfficeRouteReturnReceipt.mockReturnValue(null);

    interactionSpy = jest
      .spyOn(InteractionManager, "runAfterInteractions")
      .mockImplementation((callback: () => void) => {
        callback();
        return {
          cancel: jest.fn(),
        } as unknown as ReturnType<
          typeof InteractionManager.runAfterInteractions
        >;
      });
    keyboardSpy = jest.spyOn(Keyboard, "addListener").mockImplementation(
      () =>
        ({
          remove: jest.fn(),
        }) as unknown as ReturnType<typeof Keyboard.addListener>,
    );

    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = jest.fn() as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    interactionSpy.mockRestore();
    keyboardSpy.mockRestore();
    if (originalRequestAnimationFrame) {
      global.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (global as Partial<typeof globalThis>).requestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      delete (global as Partial<typeof globalThis>).cancelAnimationFrame;
    }
  });

  afterAll(() => {
    mockOpenURL.mockRestore();
  });

  it("shows the business company form for bootstrap users and no office directions", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue({
      currentUserId: "user-1",
      profile: {
        id: "profile-1",
        user_id: "user-1",
        full_name: "Айбек",
        phone: "+996700000000",
        city: "Бишкек",
        usage_market: true,
        usage_build: false,
      },
      profileEmail: "aybek@example.com",
      profileRole: null,
      company: null,
      companyAccessRole: null,
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
      members: [],
      membersPagination: {
        limit: 25,
        nextOffset: 0,
        total: 0,
        hasMore: false,
      },
      invites: [],
    });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-create-company" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-company-name" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-company-legal-address" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-company-inn" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-add-company-phone" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findAllByProps({ testID: "office-card-director" }),
    ).toEqual([]);
  });

  it("shows director-owned directions and keeps reports navigation separate from contextual plus", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    [
      "director",
      "foreman",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "security",
      "engineer",
      "reports",
    ].forEach((key) => {
      expect(
        renderer!.root.findByProps({ testID: `office-card-${key}` }),
      ).toBeTruthy();
    });

    expect(
      renderer!.root.findAllByProps({ testID: "office-direction-add-reports" }),
    ).toEqual([]);
    expect(
      renderer!.root.findByProps({ testID: "office-direction-add-foreman" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-direction-open-director" })
        .props.accessibilityRole,
    ).toBe("button");
    expect(
      renderer!.root.findByProps({ testID: "office-direction-add-foreman" })
        .props.accessibilityRole,
    ).toBe("button");

    renderer!.root
      .findByProps({ testID: "office-direction-open-director" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "office-direction-open-reports" })
      .props.onPress();

    expect(mockPush).toHaveBeenNthCalledWith(1, "/office/director");
    expect(mockPush).toHaveBeenNthCalledWith(2, "/office/reports");
  });

  it("keeps company summary on top, routes edit to profile company section, and moves employees to the bottom", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue({
      ...directorData,
      invites: [pendingInvite],
      members: [
        ...directorData.members,
        {
          userId: "user-2",
          role: "foreman",
          fullName: "Нурбек",
          phone: "+996555000111",
          createdAt: "2026-04-02T00:00:00.000Z",
          isOwner: false,
        },
      ],
      membersPagination: {
        limit: 25,
        nextOffset: 2,
        total: 2,
        hasMore: false,
      },
    });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-summary" }),
    ).toBeTruthy();

    const orderedSectionIds = Array.from(
      new Set(
        renderer!.root
          .findAll(
            (node) =>
              typeof node.props.testID === "string" &&
              node.props.testID.startsWith("office-section-"),
          )
          .map((node) => node.props.testID),
      ),
    );

    expect(orderedSectionIds).toEqual([
      "office-section-directions",
      "office-section-company-details",
      "office-section-invites",
      "office-section-members",
    ]);

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-company-edit" })
        .props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/profile?section=company");
  });

  it("keeps members pagination scoped to the members section load-more flow", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue({
      ...directorData,
      membersPagination: {
        limit: 1,
        nextOffset: 1,
        total: 2,
        hasMore: true,
      },
    });
    mockLoadOfficeMembersPage.mockResolvedValue({
      members: [
        {
          userId: "user-2",
          role: "foreman",
          fullName: "Nurbek",
          phone: "+996555000111",
          createdAt: "2026-04-02T00:00:00.000Z",
          isOwner: false,
        },
      ],
      membersPagination: {
        limit: 1,
        nextOffset: 2,
        total: 2,
        hasMore: false,
      },
    });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-members-load-more" }),
    ).toBeTruthy();

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-members-load-more" })
        .props.onPress();
      await Promise.resolve();
    });

    expect(mockLoadOfficeMembersPage).toHaveBeenCalledWith({
      company: directorData.company,
      limit: 1,
      offset: 1,
    });
    expect(
      renderer!.root.findByProps({ testID: "office-member-role-user-2-buyer" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findAllByProps({ testID: "office-members-load-more" }),
    ).toEqual([]);
  });

  it("records post-return markers and keeps the invite modal unmounted until the flow is opened", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findAllByProps({ testID: "mock-modal-hidden" }),
    ).toEqual([]);

    await act(async () => {
      renderer!.root
        .find((node) => typeof node.props.onContentSizeChange === "function")
        .props.onContentSizeChange(320, 860);
      renderer!.root
        .findAll((node) => typeof node.props.onLayout === "function")
        .forEach((node, index) => {
          node.props.onLayout({
            nativeEvent: { layout: { y: (index + 1) * 20 } },
          });
        });

      [
        "office-summary",
        "office-section-directions",
        "office-section-company-details",
        "office-section-invites",
        "office-section-members",
      ].forEach((testID, index) => {
        renderer!.root.findByProps({ testID }).props.onLayout({
          nativeEvent: { layout: { y: (index + 1) * 20 } },
        });
      });
    });

    expect(mockRecordOfficeReentryComponentMount).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
      }),
    );
    expect(mockRecordOfficeReentryRenderSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
      }),
    );
    expect(mockRecordOfficeBootstrapInitialStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        mode: "initial",
        reason: "mount_bootstrap",
      }),
    );
    expect(mockRecordOfficeReentryEffectStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        mode: "initial",
        reason: "mount_bootstrap",
      }),
    );
    expect(mockRecordOfficeLoadingShellEnter).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        mode: "initial",
        reason: "mount_bootstrap",
      }),
    );
    expect(mockRecordOfficeReentryEffectDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        mode: "initial",
        reason: "mount_bootstrap",
        companyId: "company-1",
      }),
    );
    expect(mockRecordOfficeBootstrapInitialDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        mode: "initial",
        reason: "mount_bootstrap",
        companyId: "company-1",
      }),
    );
    expect(mockRecordOfficePostReturnFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
      }),
    );
    expect(mockRecordOfficeFocusRefreshReason).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        reason: "bootstrap_inflight",
      }),
    );
    expect(mockRecordOfficeFocusRefreshSkipped).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        reason: "bootstrap_inflight",
      }),
    );
    expect(mockRecordOfficeFocusRefreshStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeFocusRefreshDone).not.toHaveBeenCalled();
    expect(mockRecordOfficeLoadingShellSkippedOnFocusReturn).not.toHaveBeenCalled();
    expect(mockRecordOfficePostReturnChildMountStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        sections: "summary,directions,company_details,invites,members",
      }),
    );
    expect(mockRecordOfficePostReturnIdleStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        sections: "summary,directions,company_details,invites,members",
      }),
    );
    expect(mockRecordOfficePostReturnIdleDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        sections: "summary,directions,company_details,invites,members",
      }),
    );
    expect(mockRecordOfficePostReturnSectionRenderStart.mock.calls).toEqual([
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "summary",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "directions",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "company_details",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "invites",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "members",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
    ]);
    expect(mockRecordOfficePostReturnLayoutCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        section: "summary",
        sections: "summary,directions,company_details,invites,members",
      }),
    );
    expect(mockRecordOfficePostReturnSectionRenderDone.mock.calls).toEqual([
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "summary",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "directions",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "company_details",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "invites",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "members",
          sections: "summary,directions,company_details,invites,members",
        }),
      ],
    ]);
    expect(mockRecordOfficePostReturnChildMountDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        sections: "summary,directions,company_details,invites,members",
      }),
    );
    expect(mockRecordOfficeNativeFocusCallbackStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "useFocusEffect",
      }),
    );
    expect(mockRecordOfficeNativeFocusCallbackDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "useFocusEffect",
      }),
    );
    expect(mockRecordOfficeNativeAnimationFrameStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "requestAnimationFrame",
      }),
    );
    expect(mockRecordOfficeNativeAnimationFrameDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "requestAnimationFrame",
      }),
    );
    expect(mockRecordOfficeNativeInteractionStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "InteractionManager.runAfterInteractions",
      }),
    );
    expect(mockRecordOfficeNativeInteractionDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "InteractionManager.runAfterInteractions",
      }),
    );
    expect(mockRecordOfficeNativeContentSizeStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "scroll_view:onContentSizeChange",
      }),
    );
    expect(mockRecordOfficeNativeContentSizeDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        callback: "scroll_view:onContentSizeChange",
      }),
    );
    expect(
      new Set(
        mockRecordOfficeNativeLayoutStart.mock.calls.map(
          ([payload]) => payload.callback,
        ),
      ),
    ).toEqual(
      new Set([
        "scroll_view:onLayout",
        "section_layout:summary",
        "section_layout:directions",
        "section_layout:company_details",
        "section_layout:invites",
        "section_layout:members",
        "subtree_layout:summary_header",
        "subtree_layout:summary_meta",
        "subtree_layout:summary_badges",
        "subtree_layout:directions_cards",
        "subtree_layout:company_details_rows",
        "subtree_layout:invites_list",
        "subtree_layout:members_list",
      ]),
    );
    expect(
      new Set(
        mockRecordOfficeNativeLayoutDone.mock.calls.map(
          ([payload]) => payload.callback,
        ),
      ),
    ).toEqual(
      new Set([
        "scroll_view:onLayout",
        "section_layout:summary",
        "section_layout:directions",
        "section_layout:company_details",
        "section_layout:invites",
        "section_layout:members",
        "subtree_layout:summary_header",
        "subtree_layout:summary_meta",
        "subtree_layout:summary_badges",
        "subtree_layout:directions_cards",
        "subtree_layout:company_details_rows",
        "subtree_layout:invites_list",
        "subtree_layout:members_list",
      ]),
    );
    expect(
      new Set(
        mockRecordOfficePostReturnSubtreeStart.mock.calls.map(
          ([payload]) => payload.subtree,
        ),
      ),
    ).toEqual(
      new Set([
        "layout_effect_mount",
        "render_effect_mount",
        "focus_effect_callback",
        "idle_callback",
        "scroll_view_layout",
        "scroll_view_content",
        "summary_header",
        "summary_meta",
        "summary_badges",
        "directions_cards",
        "company_details_rows",
        "invites_list",
        "members_list",
      ]),
    );
    expect(
      new Set(
        mockRecordOfficePostReturnSubtreeDone.mock.calls.map(
          ([payload]) => payload.subtree,
        ),
      ),
    ).toEqual(
      new Set([
        "layout_effect_mount",
        "render_effect_mount",
        "focus_effect_callback",
        "idle_callback",
        "scroll_view_layout",
        "scroll_view_content",
        "summary_header",
        "summary_meta",
        "summary_badges",
        "directions_cards",
        "company_details_rows",
        "invites_list",
        "members_list",
      ]),
    );
    expect(mockRecordOfficeNativeCallbackFailure).not.toHaveBeenCalled();
    expect(mockRecordOfficePostReturnSubtreeFailure).not.toHaveBeenCalled();
    expect(mockRecordOfficePostReturnFailure).not.toHaveBeenCalled();
  });

  it("skips full focus bootstrap on an ordinary return while the office snapshot is still fresh", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    await act(async () => {
      TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);

    mockRecordOfficeFocusRefreshReason.mockClear();
    mockRecordOfficeFocusRefreshSkipped.mockClear();
    mockRecordOfficeLoadingShellSkippedOnFocusReturn.mockClear();

    await triggerFocusEffect();

    expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);
    expect(mockRecordOfficeFocusRefreshReason).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 1,
        reason: "ttl_fresh",
        ttlMs: 60000,
      }),
    );
    expect(mockRecordOfficeFocusRefreshSkipped).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 1,
        reason: "ttl_fresh",
        ttlMs: 60000,
      }),
    );
    expect(mockRecordOfficeLoadingShellSkippedOnFocusReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 1,
        reason: "ttl_fresh",
        ttlMs: 60000,
      }),
    );
    expect(mockRecordOfficeFocusRefreshStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeFocusRefreshDone).not.toHaveBeenCalled();
    expect(mockRecordOfficeLoadingShellEnter).toHaveBeenCalledTimes(1);
  });

  it("reuses a fresh office snapshot on remount and skips mount bootstrap", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);

    mockRecordOfficeBootstrapInitialStart.mockClear();
    mockRecordOfficeBootstrapInitialDone.mockClear();
    mockRecordOfficeReentryEffectStart.mockClear();
    mockRecordOfficeReentryEffectDone.mockClear();
    mockRecordOfficeLoadingShellEnter.mockClear();
    mockRecordOfficeLoadingShellSkippedOnFocusReturn.mockClear();
    mockRecordOfficeFocusRefreshReason.mockClear();
    mockRecordOfficeFocusRefreshSkipped.mockClear();
    mockRecordOfficeFocusRefreshStart.mockClear();
    mockRecordOfficeFocusRefreshDone.mockClear();

    await act(async () => {
      renderer!.unmount();
    });

    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);
    expect(mockRecordOfficeBootstrapInitialStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeBootstrapInitialDone).not.toHaveBeenCalled();
    expect(mockRecordOfficeReentryEffectStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeReentryEffectDone).not.toHaveBeenCalled();
    expect(mockRecordOfficeLoadingShellEnter).not.toHaveBeenCalled();
    expect(mockRecordOfficeLoadingShellSkippedOnFocusReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 1,
        reason: "ttl_fresh",
        ttlMs: 60000,
      }),
    );
    expect(mockRecordOfficeFocusRefreshReason).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 1,
        reason: "ttl_fresh",
        ttlMs: 60000,
      }),
    );
    expect(mockRecordOfficeFocusRefreshSkipped).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 1,
        reason: "ttl_fresh",
        ttlMs: 60000,
      }),
    );
    expect(mockRecordOfficeFocusRefreshStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeFocusRefreshDone).not.toHaveBeenCalled();
  });

  it("keeps office hub passive when route scope is inactive", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    await act(async () => {
      TestRenderer.create(<OfficeHubScreen routeScopeActive={false} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLoadOfficeAccessScreenData).not.toHaveBeenCalled();
    expect(mockRecordOfficeBootstrapInitialStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeReentryEffectStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeReentryComponentMount).not.toHaveBeenCalled();
    expect(mockRecordOfficeReentryRenderSuccess).not.toHaveBeenCalled();
    expect(mockRecordOfficePostReturnFocus).not.toHaveBeenCalled();
  });

  it("does not commit a pending bootstrap after route scope becomes inactive", async () => {
    let resolveLoad: (value: typeof directorData) => void = () => undefined;
    mockLoadOfficeAccessScreenData.mockImplementation(
      () =>
        new Promise<typeof directorData>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });

    expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer!.update(<OfficeHubScreen routeScopeActive={false} />);
    });
    await act(async () => {
      resolveLoad(directorData);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRecordOfficeBootstrapInitialDone).not.toHaveBeenCalled();
    expect(mockRecordOfficeReentryEffectDone).not.toHaveBeenCalled();
    expect(
      renderer!.root.findAllByProps({ testID: "office-summary" }),
    ).toEqual([]);
  });

  it("runs a silent focus refresh after ttl expiry without re-entering the loading shell", async () => {
    const dateNowSpy = jest.spyOn(Date, "now");
    let now = 1_000_000;
    dateNowSpy.mockImplementation(() => now);
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    try {
      await act(async () => {
        TestRenderer.create(<OfficeHubScreen />);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);

      mockRecordOfficeFocusRefreshReason.mockClear();
      mockRecordOfficeFocusRefreshSkipped.mockClear();
      mockRecordOfficeFocusRefreshStart.mockClear();
      mockRecordOfficeFocusRefreshDone.mockClear();
      mockRecordOfficeLoadingShellSkippedOnFocusReturn.mockClear();

      now += 61_000;

      await triggerFocusEffect();

      expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(2);
      expect(mockRecordOfficeFocusRefreshReason).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          mode: "focus_refresh",
          reason: "stale_ttl",
        }),
      );
      expect(mockRecordOfficeFocusRefreshSkipped).not.toHaveBeenCalled();
      expect(mockRecordOfficeFocusRefreshStart).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          mode: "focus_refresh",
          reason: "stale_ttl",
        }),
      );
      expect(mockRecordOfficeFocusRefreshDone).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          mode: "focus_refresh",
          reason: "stale_ttl",
          companyId: "company-1",
        }),
      );
      expect(
        mockRecordOfficeLoadingShellSkippedOnFocusReturn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          mode: "focus_refresh",
          reason: "stale_ttl",
        }),
      );
      expect(mockRecordOfficeLoadingShellEnter).toHaveBeenCalledTimes(1);
      expect(mockRecordOfficeBootstrapInitialStart).toHaveBeenCalledTimes(1);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("keeps warehouse child return warm even when the office ttl age has expired", async () => {
    const dateNowSpy = jest.spyOn(Date, "now");
    let now = 1_000_000;
    dateNowSpy.mockImplementation(() => now);
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    try {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(<OfficeHubScreen />);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);

      mockRecordOfficeFocusRefreshReason.mockClear();
      mockRecordOfficeFocusRefreshSkipped.mockClear();
      mockRecordOfficeFocusRefreshStart.mockClear();
      mockRecordOfficeFocusRefreshDone.mockClear();
      mockRecordOfficeLoadingShellSkippedOnFocusReturn.mockClear();

      now += 61_000;

      await act(async () => {
        renderer!.update(
          <OfficeHubScreen
            officeReturnReceipt={{
              sourceRoute: "/office/warehouse",
              target: "/office",
              method: "back",
            }}
          />,
        );
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);
      expect(
        mockRecordOfficeLoadingShellSkippedOnFocusReturn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          reason: "ttl_fresh",
          ttlMs: 60000,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: "/office/warehouse",
        }),
      );
      expect(mockRecordOfficeFocusRefreshReason).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          reason: "ttl_fresh",
          ttlMs: 60000,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: "/office/warehouse",
        }),
      );
      expect(mockRecordOfficeFocusRefreshSkipped).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          reason: "ttl_fresh",
          ttlMs: 60000,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: "/office/warehouse",
        }),
      );
      expect(mockRecordOfficeFocusRefreshStart).not.toHaveBeenCalled();
      expect(mockRecordOfficeFocusRefreshDone).not.toHaveBeenCalled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("uses a pending warehouse return receipt before route state props settle", async () => {
    const dateNowSpy = jest.spyOn(Date, "now");
    let now = 1_000_000;
    dateNowSpy.mockImplementation(() => now);
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    try {
      await act(async () => {
        TestRenderer.create(<OfficeHubScreen />);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);

      mockRecordOfficeFocusRefreshReason.mockClear();
      mockRecordOfficeFocusRefreshSkipped.mockClear();
      mockRecordOfficeFocusRefreshStart.mockClear();
      mockRecordOfficeFocusRefreshDone.mockClear();
      mockRecordOfficeLoadingShellSkippedOnFocusReturn.mockClear();

      now += 61_000;
      mockPeekPendingOfficeRouteReturnReceipt.mockReturnValue({
        sourceRoute: "/office/warehouse",
        target: "/office",
        method: "back",
      });

      await triggerFocusEffect();

      expect(mockLoadOfficeAccessScreenData).toHaveBeenCalledTimes(1);
      expect(
        mockRecordOfficeLoadingShellSkippedOnFocusReturn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          reason: "ttl_fresh",
          ttlMs: 60000,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: "/office/warehouse",
        }),
      );
      expect(mockRecordOfficeFocusRefreshReason).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          reason: "ttl_fresh",
          ttlMs: 60000,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: "/office/warehouse",
        }),
      );
      expect(mockRecordOfficeFocusRefreshSkipped).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 1,
          reason: "ttl_fresh",
          ttlMs: 60000,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: "/office/warehouse",
        }),
      );
      expect(mockRecordOfficeFocusRefreshStart).not.toHaveBeenCalled();
      expect(mockRecordOfficeFocusRefreshDone).not.toHaveBeenCalled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("mounts only the requested post-return probe subtree when a debug probe is supplied", async () => {
    mockUseLocalSearchParams.mockReturnValue({ postReturnProbe: "members" });
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(renderer!.root.findAllByProps({ testID: "office-summary" })).toEqual(
      [],
    );
    expect(
      renderer!.root.findAllByProps({ testID: "office-section-directions" }),
    ).toEqual([]);
    expect(
      renderer!.root.findAllByProps({
        testID: "office-section-company-details",
      }),
    ).toEqual([]);
    expect(
      renderer!.root.findAllByProps({ testID: "office-section-invites" }),
    ).toEqual([]);
    expect(
      renderer!.root.findByProps({ testID: "office-section-members" }),
    ).toBeTruthy();

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-section-members" })
        .props.onLayout({
          nativeEvent: { layout: { y: 40 } },
        });
    });

    expect(mockRecordOfficePostReturnChildMountStart).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        sections: "members",
        probe: "members",
      }),
    );
    expect(mockRecordOfficePostReturnSectionRenderStart.mock.calls).toEqual([
      [
        expect.objectContaining({
          owner: "office_hub",
          focusCycle: 0,
          section: "members",
          sections: "members",
          probe: "members",
        }),
      ],
    ]);
    expect(mockRecordOfficePostReturnChildMountDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        sections: "members",
        probe: "members",
      }),
    );
  });

  it("skips InteractionManager scheduling when the native isolation probe disables it", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      postReturnProbe: "no_interaction_manager",
    });
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-summary" }),
    ).toBeTruthy();
    expect(InteractionManager.runAfterInteractions).not.toHaveBeenCalled();
    expect(mockRecordOfficeNativeInteractionStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeNativeInteractionDone).not.toHaveBeenCalled();
    expect(mockRecordOfficePostReturnIdleDone).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "office_hub",
        focusCycle: 0,
        probe: "no_interaction_manager",
      }),
    );
  });

  it("records and swallows focus callback failures during office reentry", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);
    mockRecordOfficePostReturnFocus.mockImplementationOnce(() => {
      throw new Error("focus callback crash");
    });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-summary" }),
    ).toBeTruthy();
    expect(mockRecordOfficeNativeCallbackFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        errorStage: "focus",
        extra: expect.objectContaining({
          owner: "office_hub",
          callback: "useFocusEffect",
          focusCycle: 0,
        }),
      }),
    );
    expect(mockRecordOfficeBootstrapInitialDone).toHaveBeenCalled();
  });

  it("removes ScrollView content size callback when the native isolation probe disables it", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      postReturnProbe: "no_content_size_callbacks",
    });
    mockLoadOfficeAccessScreenData.mockResolvedValue(directorData);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const scrollNode = renderer!.root.find(
      (node) =>
        typeof node.props.showsVerticalScrollIndicator === "boolean" &&
        Object.prototype.hasOwnProperty.call(node.props, "onContentSizeChange"),
    );

    expect(scrollNode.props.onContentSizeChange).toBeUndefined();
    expect(mockRecordOfficeNativeContentSizeStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeNativeContentSizeDone).not.toHaveBeenCalled();
  });

  it("opens a role-specific modal from contextual plus and hands invite code straight to native share", async () => {
    mockCreateOfficeInvite.mockResolvedValue({
      id: "invite-1",
      companyId: "company-1",
      inviteCode: "GOX-FOREMAN",
      name: "Нурбек",
      phone: "+996555000111",
      email: null,
      role: "foreman",
      status: "pending",
      createdAt: "2026-04-02T00:00:00.000Z",
      comment: null,
    });
    mockShareOfficeInviteCode.mockResolvedValue({
      kind: "native-share",
      message: "invite",
    });
    mockLoadOfficeAccessScreenData
      .mockResolvedValueOnce(directorData)
      .mockResolvedValueOnce({
        ...directorData,
        invites: [pendingInvite],
      });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-direction-add-foreman" })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-role-invite-modal" }),
    ).toBeTruthy();
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-role-invite-role" }).props
          .children,
      ),
    ).toContain("Прораб");
    expect(
      renderer!.root.findAllByProps({ testID: "office-invite-role-buyer" }),
    ).toEqual([]);

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-invite-name" })
        .props.onChangeText("Нурбек");
      renderer!.root
        .findByProps({ testID: "office-invite-phone" })
        .props.onChangeText("+996555000111");
    });

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-create-invite" })
        .props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCreateOfficeInvite).toHaveBeenCalledWith({
      companyId: "company-1",
      draft: expect.objectContaining({
        name: "Нурбек",
        phone: "+996555000111",
        role: "foreman",
      }),
    });
    expect(mockShareOfficeInviteCode).toHaveBeenCalledWith({
      companyName: "ACME Build",
      role: "foreman",
      inviteCode: "GOX-FOREMAN",
    });
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-invite-feedback" }).props
          .children,
      ),
    ).toContain("Код");
    expect(
      renderer!.root.findAllByProps({ testID: "office-invite-handoff" }),
    ).toEqual([]);
  });

  it("shows an explicit desktop handoff block with copy-first actions on web flow", async () => {
    mockOpenURL.mockResolvedValue(undefined);
    mockCopyOfficeInviteText.mockResolvedValue(undefined);
    mockCreateOfficeInvite.mockResolvedValue({
      id: "invite-1",
      companyId: "company-1",
      inviteCode: "GOX-FOREMAN",
      name: "Нурбек",
      phone: "+996555000111",
      email: null,
      role: "foreman",
      status: "pending",
      createdAt: "2026-04-02T00:00:00.000Z",
      comment: null,
    });
    mockShareOfficeInviteCode.mockResolvedValue({
      kind: "web-handoff",
      handoff: {
        companyName: "ACME Build",
        roleLabel: "Прораб",
        inviteCode: "GOX-FOREMAN",
        instruction:
          "Установите приложение GOX Build и активируйте код: GOX-FOREMAN",
        message:
          "Вас пригласили в компанию ACME Build на роль Прораб.\nКод активации: GOX-FOREMAN",
        whatsappUrl: "https://wa.me/?text=GOX-FOREMAN",
        telegramUrl: "https://t.me/share/url?url=&text=GOX-FOREMAN",
        emailUrl: "mailto:?subject=invite&body=GOX-FOREMAN",
      },
    });
    mockLoadOfficeAccessScreenData
      .mockResolvedValueOnce(directorData)
      .mockResolvedValueOnce({
        ...directorData,
        invites: [pendingInvite],
      });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-direction-add-foreman" })
        .props.onPress();
    });
    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-invite-name" })
        .props.onChangeText("Нурбек");
      renderer!.root
        .findByProps({ testID: "office-invite-phone" })
        .props.onChangeText("+996555000111");
    });

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-create-invite" })
        .props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ testID: "office-invite-handoff" }),
    ).toBeTruthy();
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-invite-handoff-company" })
          .props.children,
      ),
    ).toContain("ACME Build");
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-invite-handoff-role" })
          .props.children,
      ),
    ).toContain("Прораб");
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-invite-handoff-code" })
          .props.children,
      ),
    ).toContain("GOX-FOREMAN");

    expect(
      renderer!.root.findByProps({ testID: "office-invite-copy-code" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-invite-copy-message" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-invite-open-whatsapp" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-invite-open-telegram" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-invite-open-email" }),
    ).toBeTruthy();

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-invite-copy-code" })
        .props.onPress();
    });

    expect(mockCopyOfficeInviteText).toHaveBeenCalledWith("GOX-FOREMAN");
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-invite-handoff-feedback" })
          .props.children,
      ),
    ).toContain("Код скопирован");

    await act(async () => {
      renderer!.root
        .findByProps({ testID: "office-invite-open-whatsapp" })
        .props.onPress();
    });

    expect(mockOpenURL).toHaveBeenCalledWith("https://wa.me/?text=GOX-FOREMAN");
    expect(
      renderer!.root.findAllByProps({ testID: "office-invite-feedback" }),
    ).toEqual([]);
  });
});
