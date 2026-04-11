import React from "react";
import fs from "fs";
import path from "path";

import {
  OFFICE_BACK_LABEL,
  OFFICE_SAFE_BACK_ROUTE,
  renderSafeOfficeForemanBackButton,
  renderSafeOfficeWarehouseBackButton,
  renderSafeOfficeBackButton,
} from "../../app/(tabs)/office/_layout";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockMarkPendingOfficeRouteReplaceReceipt = jest.fn();
const mockMarkPendingOfficeRouteReturnReceipt = jest.fn();
const mockRecordOfficeWarehouseBackPressStart = jest.fn();
const mockRecordOfficeWarehouseBackPressDone = jest.fn();
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
  markPendingOfficeRouteReplaceReceipt: (...args: unknown[]) =>
    mockMarkPendingOfficeRouteReplaceReceipt(...args),
  markPendingOfficeRouteReturnReceipt: (...args: unknown[]) =>
    mockMarkPendingOfficeRouteReturnReceipt(...args),
  recordOfficeBackPathFailure: (...args: unknown[]) =>
    mockRecordOfficeBackPathFailure(...args),
  recordOfficeLayoutBeforeRemove: jest.fn(),
  recordOfficeRouteOwnerIdentity: jest.fn(),
  recordOfficeRouteOwnerMount: jest.fn(),
  recordOfficeRouteOwnerUnmount: jest.fn(),
  recordOfficeWarehouseBackPressDone: (...args: unknown[]) =>
    mockRecordOfficeWarehouseBackPressDone(...args),
  recordOfficeWarehouseBackPressStart: (...args: unknown[]) =>
    mockRecordOfficeWarehouseBackPressStart(...args),
}));

describe("OfficeStackLayout", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockBack.mockReset();
    mockCanGoBack.mockReset();
    mockCanGoBack.mockReturnValue(false);
    mockMarkPendingOfficeRouteReplaceReceipt.mockReset();
    mockMarkPendingOfficeRouteReturnReceipt.mockReset();
    mockRecordOfficeWarehouseBackPressStart.mockReset();
    mockRecordOfficeWarehouseBackPressDone.mockReset();
    mockRecordOfficeBackPathFailure.mockReset();
  });

  it("uses office fallback when history is missing", () => {
    const header = renderSafeOfficeBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ label: string; onPress: () => void }>;

    expect(header.props.label).toBe(OFFICE_BACK_LABEL);
    header.props.onPress();

    expect(mockReplace).toHaveBeenCalledWith(OFFICE_SAFE_BACK_ROUTE);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("uses router.back when office history exists", () => {
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

  it("marks a pending office replace receipt when warehouse falls back to replace", () => {
    mockCanGoBack.mockReturnValue(false);

    const header = renderSafeOfficeWarehouseBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockMarkPendingOfficeRouteReplaceReceipt).toHaveBeenCalledWith({
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
      selectedMethod: "replace_fallback",
    });
    expect(mockRecordOfficeWarehouseBackPressStart).toHaveBeenCalledWith({
      owner: "office_stack_layout",
      route: "/office/warehouse",
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
      selectedMethod: "replace_fallback",
      handler: "safe_back_header",
    });
    expect(mockRecordOfficeWarehouseBackPressDone).toHaveBeenCalledWith({
      owner: "office_stack_layout",
      route: "/office/warehouse",
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
      selectedMethod: "replace_fallback",
      handler: "safe_back_header",
    });
    expect(mockReplace).toHaveBeenCalledWith(OFFICE_SAFE_BACK_ROUTE);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("does not emit warehouse-specific back markers for foreman", () => {
    mockCanGoBack.mockReturnValue(true);

    const header = renderSafeOfficeForemanBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockRecordOfficeWarehouseBackPressStart).not.toHaveBeenCalled();
    expect(mockRecordOfficeWarehouseBackPressDone).not.toHaveBeenCalled();
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
    expect(source).toContain("headerLeft: renderSafeOfficeForemanBackButton");
    expect(source).toContain("headerLeft: renderSafeOfficeWarehouseBackButton");
    expect(source).toContain("recordOfficeWarehouseBackPressStart");
    expect(source).toContain("recordOfficeWarehouseBackPressDone");
    expect(source).not.toContain("recordWarehouseReturnToOffice");
    expect(source).not.toContain("headerBackVisible: false");
    expect(source).not.toContain("headerBackButtonMenuEnabled: false");
    expect(source).not.toContain("gestureEnabled: false");
  });
});
