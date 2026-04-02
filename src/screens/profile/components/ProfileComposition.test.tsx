import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import type { AppAccessModel } from "../../../lib/appAccessModel";
import { ProfileMainSections } from "./ProfileMainSections";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, props.name);
  },
}));

jest.mock("@/src/features/profile/ProfileOtaDiagnosticsCard", () => ({
  ProfileOtaDiagnosticsCard: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(
      Text,
      { testID: "profile-ota-diagnostics-card" },
      "ota-diagnostics-card",
    );
  },
}));

const baseProfile = {
  id: "profile-1",
  user_id: "user-1",
  full_name: "Айбек",
  phone: "+996700000000",
  city: "Бишкек",
  usage_market: true,
  usage_build: true,
};

const baseCompany = {
  id: "company-1",
  owner_user_id: "user-1",
  name: "ACME Build",
  city: "Бишкек",
  industry: "Строительство",
  phone_main: "+996555000000",
  site: "https://acme.kg",
  inn: "123456789",
  address: "Токтогула 1",
  bank_details: "DemirBank",
};

const baseAccessModel: AppAccessModel = {
  userId: "user-1",
  hasMarketAccess: true,
  hasOfficeAccess: true,
  hasCompanyContext: true,
  hasSellerCapability: true,
  availableContexts: ["market", "office"],
  activeContext: "market",
  availableOfficeRoles: ["director", "buyer"],
  activeOfficeRole: "director",
};

const baseMainProps = () => ({
  profileAvatarUrl: null,
  avatarLetter: "А",
  profileName: "Айбек",
  roleLabel: "Директор",
  roleColor: "#22c55e",
  accountSubtitle: "Личный кабинет",
  profile: baseProfile,
  company: baseCompany,
  profileEmail: "aybek@example.com",
  accessModel: baseAccessModel,
  officeRolesLabel: "Директор, Снабженец",
  activeContextDescription:
    "Сейчас активен Market. Office-доступ сохранён, но не выбран как текущий контекст.",
  hasSellerAreaEntry: true,
  onOpenEditProfile: jest.fn(),
  onOpenMarket: jest.fn(),
  onOpenAddListing: jest.fn(),
  onOpenSellerArea: jest.fn(),
  onOpenOfficeAccess: jest.fn(),
  onSelectActiveContext: jest.fn(),
  onOpenActiveContext: jest.fn(),
  onSignOut: jest.fn(),
});

describe("Profile composition boundaries", () => {
  it("renders entry CTAs and forwards context actions", () => {
    const props = baseMainProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileMainSections {...props} />);
    });

    renderer!.root.findByProps({ testID: "profile-edit-open" }).props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-open-market-entry" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-open-add-listing" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-context-office" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-open-active-context" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-open-office-access" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-open-seller-area" })
      .props.onPress();

    expect(props.onOpenEditProfile).toHaveBeenCalledTimes(1);
    expect(props.onOpenMarket).toHaveBeenCalledTimes(1);
    expect(props.onOpenAddListing).toHaveBeenCalledTimes(1);
    expect(props.onSelectActiveContext).toHaveBeenCalledWith("office");
    expect(props.onOpenActiveContext).toHaveBeenCalledTimes(1);
    expect(props.onOpenOfficeAccess).toHaveBeenCalledTimes(1);
    expect(props.onOpenSellerArea).toHaveBeenCalledTimes(1);
    expect(
      renderer!.root.findByProps({ testID: "profile-ota-diagnostics-section" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({ testID: "profile-ota-diagnostics-card" }),
    ).toBeTruthy();
    expect(
      renderer!.root.findAll(
        (node) =>
          typeof node.props?.children === "string"
          && node.props.children === "Открыть Office и компанию",
      ),
    ).not.toEqual([]);
  });

  it("hides seller entry when there are no seller-owned listings yet", () => {
    const props = {
      ...baseMainProps(),
      hasSellerAreaEntry: false,
    };
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileMainSections {...props} />);
    });

    expect(
      renderer!.root.findAllByProps({ testID: "profile-open-seller-area" }),
    ).toEqual([]);
  });

  it("hides the false context switch when only one context is available", () => {
    const props = {
      ...baseMainProps(),
      accessModel: {
        ...baseAccessModel,
        hasOfficeAccess: false,
        hasCompanyContext: false,
        availableContexts: ["market"],
        activeOfficeRole: null,
        availableOfficeRoles: [],
      } satisfies AppAccessModel,
    };
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileMainSections {...props} />);
    });

    expect(
      renderer!.root.findAllByProps({ testID: "profile-context-office" }),
    ).toEqual([]);
    expect(
      renderer!.root.findAll(
        (node) =>
          typeof node.props?.children === "string"
          && node.props.children === "Создать компанию",
      ),
    ).not.toEqual([]);
  });
});
