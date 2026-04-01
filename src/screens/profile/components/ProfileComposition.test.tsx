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
  onOpenEditProfile: jest.fn(),
  onSelectActiveContext: jest.fn(),
  onOpenActiveContext: jest.fn(),
  onSignOut: jest.fn(),
});

describe("Profile composition boundaries", () => {
  it("renders identity/access sections and forwards context actions", () => {
    const props = baseMainProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileMainSections {...props} />);
    });

    renderer!.root.findByProps({ testID: "profile-edit-open" }).props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-context-office" })
      .props.onPress();
    renderer!.root
      .findByProps({ testID: "profile-open-active-context" })
      .props.onPress();

    expect(props.onOpenEditProfile).toHaveBeenCalledTimes(1);
    expect(props.onSelectActiveContext).toHaveBeenCalledWith("office");
    expect(props.onOpenActiveContext).toHaveBeenCalledTimes(1);
  });

  it("hides the false context switch when only one context is available", () => {
    const props = {
      ...baseMainProps(),
      accessModel: {
        ...baseAccessModel,
        hasOfficeAccess: false,
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
  });
});
