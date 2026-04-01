import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import OfficeHubScreen from "./OfficeHubScreen";

const mockPush = jest.fn();
const mockLoadOfficeAccessScreenData = jest.fn();

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

jest.mock("./officeAccess.services", () => ({
  loadOfficeAccessScreenData: (...args: unknown[]) =>
    mockLoadOfficeAccessScreenData(...args),
  createOfficeCompany: jest.fn(),
  createOfficeInvite: jest.fn(),
  updateOfficeMemberRole: jest.fn(),
}));

describe("OfficeHubScreen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLoadOfficeAccessScreenData.mockReset();
  });

  it("shows bootstrap setup for market-only users without false office role cards", async () => {
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

    expect(
      renderer!.root.findByProps({ testID: "office-create-company" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findAllByProps({ testID: "office-card-director" }),
    ).toEqual([]);
    expect(
      renderer!.root.findAllByProps({ testID: "office-card-buyer" }),
    ).toEqual([]);
  });

  it("shows only explicitly assigned office entries for director access", async () => {
    mockLoadOfficeAccessScreenData.mockResolvedValue({
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
        industry: "Строительство",
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
    });

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<OfficeHubScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    renderer!.root.findByProps({ testID: "office-card-director" }).props.onPress();
    renderer!.root.findByProps({ testID: "office-card-reports" }).props.onPress();

    expect(mockPush).toHaveBeenNthCalledWith(1, "/office/director");
    expect(mockPush).toHaveBeenNthCalledWith(2, "/office/reports");
    expect(
      renderer!.root.findAllByProps({ testID: "office-card-buyer" }),
    ).toEqual([]);
  });
});
