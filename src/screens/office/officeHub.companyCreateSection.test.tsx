import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import type { CreateCompanyDraft } from "./officeAccess.types";
import { OfficeCompanyCreateSection } from "./officeHub.companyCreateSection";
import { EMPTY_COMPANY_DRAFT } from "./officeHub.helpers";

describe("OfficeCompanyCreateSection", () => {
  const renderSection = (
    draft: CreateCompanyDraft = {
      ...EMPTY_COMPANY_DRAFT,
      additionalPhones: ["+996700000001"],
    },
    options?: {
      onCompanyCreateLayout?: jest.Mock | undefined;
      onRulesLayout?: jest.Mock | undefined;
    },
  ) => {
    const onChangeCompanyDraft = jest.fn();
    const onCreateCompany = jest.fn();
    const onCompanyCreateLayout = options?.onCompanyCreateLayout ?? jest.fn();
    const onRulesLayout = options?.onRulesLayout ?? jest.fn();

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <OfficeCompanyCreateSection
          companyDraft={draft}
          savingCompany={false}
          onChangeCompanyDraft={onChangeCompanyDraft}
          onCreateCompany={onCreateCompany}
          onCompanyCreateLayout={onCompanyCreateLayout}
          onRulesLayout={onRulesLayout}
        />,
      );
    });

    return {
      renderer,
      draft,
      onChangeCompanyDraft,
      onCreateCompany,
      onCompanyCreateLayout,
      onRulesLayout,
    };
  };

  it("keeps the OfficeHub company form test-id contract", () => {
    const { renderer } = renderSection();

    expect(
      renderer.root.findByProps({ testID: "office-create-company" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-company-name" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-company-legal-address" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-company-inn" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-add-company-phone" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-company-phone-0" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-create-company" }).props
        .accessibilityRole,
    ).toBe("button");
    expect(
      renderer.root.findByProps({ testID: "office-add-company-phone" }).props
        .accessibilityRole,
    ).toBe("button");
  });

  it("delegates draft field, phone list, layout, and create actions to the owner", () => {
    const {
      renderer,
      draft,
      onChangeCompanyDraft,
      onCompanyCreateLayout,
      onCreateCompany,
      onRulesLayout,
    } = renderSection();

    const companyLayout = { nativeEvent: { layout: { y: 12 } } };
    const rulesLayout = { nativeEvent: { layout: { y: 24 } } };

    act(() => {
      renderer.root
        .findAll((node) => node.props.onLayout === onCompanyCreateLayout)[0]
        .props.onLayout(companyLayout);
      renderer.root
        .findAll((node) => node.props.onLayout === onRulesLayout)[0]
        .props.onLayout(rulesLayout);
      renderer.root
        .findByProps({ testID: "office-company-name" })
        .props.onChangeText("GOX Build");
      renderer.root
        .findByProps({ testID: "office-add-company-phone" })
        .props.onPress();
      renderer.root
        .findByProps({ testID: "office-company-phone-0" })
        .props.onChangeText("+996700000002");
      renderer.root
        .findByProps({ testID: "office-create-company" })
        .props.onPress();
    });

    expect(onCompanyCreateLayout).toHaveBeenCalledWith(companyLayout);
    expect(onRulesLayout).toHaveBeenCalledWith(rulesLayout);
    expect(onCreateCompany).toHaveBeenCalledTimes(1);

    const [nameUpdater, addPhoneUpdater, updatePhoneUpdater] =
      onChangeCompanyDraft.mock.calls.map(([updater]) => updater);

    expect(nameUpdater(draft)).toEqual({
      ...draft,
      name: "GOX Build",
    });
    expect(addPhoneUpdater(draft)).toEqual({
      ...draft,
      additionalPhones: [...draft.additionalPhones, ""],
    });
    expect(updatePhoneUpdater(draft)).toEqual({
      ...draft,
      additionalPhones: ["+996700000002"],
    });
  });

  it("keeps the form renderable when post-return tracing omits layout handlers", () => {
    const { renderer } = renderSection(undefined, {
      onCompanyCreateLayout: undefined,
      onRulesLayout: undefined,
    });

    expect(
      renderer.root.findByProps({ testID: "office-create-company" }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: "office-company-name" }),
    ).toBeTruthy();
  });
});
