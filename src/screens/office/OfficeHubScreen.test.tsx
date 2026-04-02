import React from "react";
import { Linking } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import OfficeHubScreen from "./OfficeHubScreen";

const mockPush = jest.fn();
const mockLoadOfficeAccessScreenData = jest.fn();
const mockCreateOfficeInvite = jest.fn();
const mockShareOfficeInviteCode = jest.fn();
const mockCopyOfficeInviteText = jest.fn();
const mockOpenURL = jest.spyOn(Linking, "openURL");

jest.mock("expo-router", () => {
  const ReactRuntime = require("react");
  return {
    useRouter: () => ({
      push: mockPush,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => callback(), [callback]);
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
      if (!props.visible) return null;
      return ReactRuntime.createElement(View, { testID: "mock-modal" }, props.children);
    },
  };
});

jest.mock("./officeAccess.services", () => ({
  loadOfficeAccessScreenData: (...args: unknown[]) =>
    mockLoadOfficeAccessScreenData(...args),
  createOfficeCompany: jest.fn(),
  createOfficeInvite: (...args: unknown[]) => mockCreateOfficeInvite(...args),
  updateOfficeMemberRole: jest.fn(),
}));

jest.mock("./officeInviteShare", () => ({
  shareOfficeInviteCode: (...args: unknown[]) => mockShareOfficeInviteCode(...args),
  copyOfficeInviteText: (...args: unknown[]) => mockCopyOfficeInviteText(...args),
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

describe("OfficeHubScreen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLoadOfficeAccessScreenData.mockReset();
    mockCreateOfficeInvite.mockReset();
    mockShareOfficeInviteCode.mockReset();
    mockCopyOfficeInviteText.mockReset();
    mockOpenURL.mockReset();
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
      invites: [],
    });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "office-create-company" })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "office-company-name" })).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-company-legal-address" }),
    ).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "office-company-inn" })).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "office-add-company-phone" }),
    ).toBeTruthy();
    expect(renderer!.root.findAllByProps({ testID: "office-card-director" })).toEqual(
      [],
    );
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
      expect(renderer!.root.findByProps({ testID: `office-card-${key}` })).toBeTruthy();
    });

    expect(
      renderer!.root.findAllByProps({ testID: "office-direction-add-reports" }),
    ).toEqual([]);
    expect(
      renderer!.root.findByProps({ testID: "office-direction-add-foreman" }),
    ).toBeTruthy();

    renderer!.root.findByProps({ testID: "office-direction-open-director" }).props.onPress();
    renderer!.root.findByProps({ testID: "office-direction-open-reports" }).props.onPress();

    expect(mockPush).toHaveBeenNthCalledWith(1, "/office/director");
    expect(mockPush).toHaveBeenNthCalledWith(2, "/office/reports");
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
      renderer!.root.findByProps({ testID: "office-direction-add-foreman" }).props.onPress();
    });

    expect(renderer!.root.findByProps({ testID: "office-role-invite-modal" })).toBeTruthy();
    expect(
      String(renderer!.root.findByProps({ testID: "office-role-invite-role" }).props.children),
    ).toContain("Прораб");
    expect(renderer!.root.findAllByProps({ testID: "office-invite-role-buyer" })).toEqual(
      [],
    );

    await act(async () => {
      renderer!.root.findByProps({ testID: "office-invite-name" }).props.onChangeText("Нурбек");
      renderer!.root.findByProps({ testID: "office-invite-phone" }).props.onChangeText("+996555000111");
    });

    await act(async () => {
      renderer!.root.findByProps({ testID: "office-create-invite" }).props.onPress();
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
      String(renderer!.root.findByProps({ testID: "office-invite-feedback" }).props.children),
    ).toContain("Код");
    expect(renderer!.root.findAllByProps({ testID: "office-invite-handoff" })).toEqual(
      [],
    );
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
        instruction: "Установите приложение GOX Build и активируйте код: GOX-FOREMAN",
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
      renderer!.root.findByProps({ testID: "office-direction-add-foreman" }).props.onPress();
    });
    await act(async () => {
      renderer!.root.findByProps({ testID: "office-invite-name" }).props.onChangeText("Нурбек");
      renderer!.root.findByProps({ testID: "office-invite-phone" }).props.onChangeText("+996555000111");
    });

    await act(async () => {
      renderer!.root.findByProps({ testID: "office-create-invite" }).props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "office-invite-handoff" })).toBeTruthy();
    expect(
      String(renderer!.root.findByProps({ testID: "office-invite-handoff-company" }).props.children),
    ).toContain("ACME Build");
    expect(
      String(renderer!.root.findByProps({ testID: "office-invite-handoff-role" }).props.children),
    ).toContain("Прораб");
    expect(
      String(renderer!.root.findByProps({ testID: "office-invite-handoff-code" }).props.children),
    ).toContain("GOX-FOREMAN");

    expect(renderer!.root.findByProps({ testID: "office-invite-copy-code" })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "office-invite-copy-message" })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "office-invite-open-whatsapp" })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "office-invite-open-telegram" })).toBeTruthy();
    expect(renderer!.root.findByProps({ testID: "office-invite-open-email" })).toBeTruthy();

    await act(async () => {
      renderer!.root.findByProps({ testID: "office-invite-copy-code" }).props.onPress();
    });

    expect(mockCopyOfficeInviteText).toHaveBeenCalledWith("GOX-FOREMAN");
    expect(
      String(
        renderer!.root.findByProps({ testID: "office-invite-handoff-feedback" }).props.children,
      ),
    ).toContain("Код скопирован");

    await act(async () => {
      renderer!.root.findByProps({ testID: "office-invite-open-whatsapp" }).props.onPress();
    });

    expect(mockOpenURL).toHaveBeenCalledWith("https://wa.me/?text=GOX-FOREMAN");
    expect(renderer!.root.findAllByProps({ testID: "office-invite-feedback" })).toEqual([]);
  });
});
