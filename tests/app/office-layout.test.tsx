import React from "react";
import fs from "fs";
import path from "path";

import {
  OFFICE_BACK_LABEL,
  OFFICE_SAFE_BACK_ROUTE,
  renderSafeOfficeForemanBackButton,
  renderSafeOfficeBackButton,
} from "../../app/(tabs)/office/_layout";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockMarkPendingOfficeRouteReturnReceipt = jest.fn();
const mockRecordOfficeBackPathFailure = jest.fn();

jest.mock("expo-router", () => {
  return {
    Stack: {
      Screen: () => null,
    },
    router: {
      back: (...args: unknown[]) => mockBack(...args),
      canGoBack: () => mockCanGoBack(),
      replace: (...args: unknown[]) => mockReplace(...args),
    },
  };
});

jest.mock("@react-navigation/elements", () => ({
  HeaderBackButton: (props: Record<string, unknown>) => props,
}));

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  markPendingOfficeRouteReturnReceipt: (...args: unknown[]) =>
    mockMarkPendingOfficeRouteReturnReceipt(...args),
  recordOfficeBackPathFailure: (...args: unknown[]) =>
    mockRecordOfficeBackPathFailure(...args),
  recordOfficeLayoutBeforeRemove: jest.fn(),
  recordOfficeRouteOwnerIdentity: jest.fn(),
  recordOfficeRouteOwnerMount: jest.fn(),
  recordOfficeRouteOwnerUnmount: jest.fn(),
}));

describe("OfficeStackLayout", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockBack.mockReset();
    mockCanGoBack.mockReset();
    mockCanGoBack.mockReturnValue(false);
    mockMarkPendingOfficeRouteReturnReceipt.mockReset();
    mockRecordOfficeBackPathFailure.mockReset();
  });

  it("uses router.back without replace fallback", () => {
    const header = renderSafeOfficeBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ label: string; onPress: () => void }>;

    expect(header.props.label).toBe(OFFICE_BACK_LABEL);
    header.props.onPress();

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockCanGoBack).not.toHaveBeenCalled();
  });

  it("does not inspect history before using router.back", () => {
    mockCanGoBack.mockReturnValue(true);

    const header = renderSafeOfficeBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockCanGoBack).not.toHaveBeenCalled();
  });

  it("marks a pending office return receipt when foreman uses router.back", () => {
    mockCanGoBack.mockReturnValue(true);

    const header = renderSafeOfficeForemanBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockMarkPendingOfficeRouteReturnReceipt).toHaveBeenCalledWith({
      sourceRoute: "/office/foreman",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "back",
      selectedMethod: "back",
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not emit warehouse-specific back markers", () => {
    mockCanGoBack.mockReturnValue(true);

    const header = renderSafeOfficeForemanBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockRecordOfficeBackPathFailure).not.toHaveBeenCalled();
  });

  it("binds warehouse to the same shared office child back contract as foreman", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );

    expect(source).toContain('name="foreman"');
    expect(source).toContain('name="warehouse"');
    expect(source).toContain("headerBackTitle: OFFICE_BACK_LABEL");
    expect(source).toContain("title: WAREHOUSE_HEADER_TITLE");
    expect(source).toContain('foreman: renderSafeOfficeForemanBackButton');
    expect(source).toContain(
      'warehouse: createSafeOfficeBackButton("/office/warehouse")',
    );
    expect(source).toContain("headerLeft: safeOfficeChildBackButtons.foreman");
    expect(source).toContain("headerLeft: safeOfficeChildBackButtons.warehouse");
    expect(source).not.toContain("renderSafeOfficeWarehouseBackButton");
    expect(source).not.toContain("isWarehouse");
    expect(source).not.toContain("replace_safety_override");
    expect(source).not.toContain("router.replace(OFFICE_SAFE_BACK_ROUTE)");
    expect(source).not.toContain("recordOfficeWarehouseBackHandlerStepAsync");
    expect(source).not.toContain("recordOfficeWarehouseBackPressStartAsync");
    expect(source).not.toContain("recordOfficeWarehouseBackPressDone");
    expect(source).not.toContain("recordWarehouseReturnToOffice");
    expect(source).not.toContain("headerBackVisible: false");
    expect(source).not.toContain("headerBackButtonMenuEnabled: false");
    expect(source).not.toContain("gestureEnabled: false");
  });
});
