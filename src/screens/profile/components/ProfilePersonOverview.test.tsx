import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";

import { ProfilePersonOverview } from "./ProfilePersonOverview";

describe("ProfilePersonOverview", () => {
  const baseProps = {
    profileCompletionItems: [
      { key: "name", label: "Имя", done: true },
      { key: "phone", label: "Телефон", done: false },
    ],
    profileCompletionDone: 1,
    profileCompletionPercent: 50,
    profileName: "Айбек",
    profilePhone: "Не указан",
    profileEmail: "user@example.com",
    profileCity: "Бишкек",
    companyName: "Не подключена",
    listingsSummary: "2 активных объявления в профиле",
    companyCardTitle: "Подключить компанию",
    companyCardSubtitle: "Откройте кабинет компании.",
    lastInviteCode: "INV-2026",
    requisitesVisible: true,
    requisitesCompanyName: "ОсОО GOX",
    requisitesInn: "123456789",
    requisitesAddress: "ул. Токтогула, 1",
    requisitesBankDetails: "DemirBank",
    requisitesContact: "+996700000000",
    onOpenEditProfile: jest.fn(),
    onOpenCompanyCard: jest.fn(),
  };

  const hasText = (renderer: ReactTestRenderer, expected: string) =>
    renderer.root.findAllByType(Text).some((node) => {
      const value = Array.isArray(node.props.children)
        ? node.props.children.join("")
        : String(node.props.children ?? "");
      return value === expected;
    });

  beforeEach(() => {
    baseProps.onOpenEditProfile.mockClear();
    baseProps.onOpenCompanyCard.mockClear();
  });

  it("renders company card and forwards action handlers", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ProfilePersonOverview {...baseProps} />);
    });

    const completionAction = renderer!.root.findByProps({
      testID: "profile-person-completion-action",
    });
    completionAction.props.onPress();
    expect(baseProps.onOpenEditProfile).toHaveBeenCalledTimes(1);

    const companyCard = renderer!.root.findByProps({ testID: "profile-company-card" });
    companyCard.props.onPress();
    expect(baseProps.onOpenCompanyCard).toHaveBeenCalledTimes(1);
  });

  it("hides optional panels when requisites and invite code are absent", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ProfilePersonOverview
          {...baseProps}
          lastInviteCode={null}
          requisitesVisible={false}
          profileCompletionDone={baseProps.profileCompletionItems.length}
          profileCompletionPercent={100}
        />,
      );
    });

    expect(
      renderer!.root.findAll((node) => node.props?.testID === "profile-person-completion-action"),
    ).toHaveLength(0);
    expect(hasText(renderer!, "Последний код приглашения")).toBe(false);
    expect(hasText(renderer!, "Реквизиты")).toBe(false);
  });
});
