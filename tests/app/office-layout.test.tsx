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
const mockPush = jest.fn();
const mockReset = jest.fn();
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
      push: (...args: unknown[]) => mockPush(...args),
      replace: (...args: unknown[]) => mockReplace(...args),
      reset: (...args: unknown[]) => mockReset(...args),
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
    mockPush.mockReset();
    mockReset.mockReset();
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
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
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
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
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
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("keeps the shared office child back handler synchronous and single-path", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );
    const handlerStart = source.indexOf("function handleOfficeChildBack");
    const handlerEnd = source.indexOf("function createSafeOfficeBackButton");
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(handlerSource).not.toMatch(/\basync\b/);
    expect(handlerSource).not.toMatch(/\bawait\b/);
    expect(handlerSource).not.toContain("safeBack(");
    expect(handlerSource).not.toContain("canGoBack");
    expect(handlerSource).not.toContain("router.replace");
    expect(handlerSource).not.toContain("router.push");
    expect(handlerSource).not.toMatch(/\.reset\(/);
    expect(handlerSource.match(/router\.back\(/g) ?? []).toHaveLength(1);
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
    expect(source).not.toContain('sourceRoute === "/office/warehouse"');
    expect(source).not.toContain('sourceRoute !== "/office/warehouse"');
    expect(source).not.toMatch(/if\s*\([^)]*warehouse/i);
    expect(source).not.toMatch(/switch\s*\([^)]*warehouse/i);
    expect(source).not.toContain("replace_safety_override");
    expect(source).not.toContain("router.replace(OFFICE_SAFE_BACK_ROUTE)");
    expect(source).not.toContain("router.push");
    expect(source).not.toMatch(/\.reset\(/);
    expect(source).not.toContain("recordOfficeWarehouseBackHandlerStepAsync");
    expect(source).not.toContain("recordOfficeWarehouseBackPressStartAsync");
    expect(source).not.toContain("recordOfficeWarehouseBackPressDone");
    expect(source).not.toContain("recordWarehouseReturnToOffice");
    expect(source).not.toContain("headerBackVisible: false");
    expect(source).not.toContain("headerBackButtonMenuEnabled: false");
    expect(source).not.toContain("gestureEnabled: false");
  });

  it("keeps warehouse back logs free of replace navigation markers", () => {
    const layoutSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );
    const breadcrumbsSource = fs.readFileSync(
      path.join(
        __dirname,
        "../../src/lib/navigation/officeReentryBreadcrumbs.ts",
      ),
      "utf8",
    );
    const warehouseBackMarkerStart = breadcrumbsSource.indexOf(
      'office_warehouse_back_press_start',
    );
    const warehouseBackMarkerEnd = breadcrumbsSource.indexOf(
      'office_warehouse_cleanup_start',
    );
    const logs = [
      layoutSource,
      breadcrumbsSource.slice(warehouseBackMarkerStart, warehouseBackMarkerEnd),
    ].join("\n");

    expect(logs).not.toContain("replace");
    expect(logs).not.toContain("router_replace");
    expect(logs).not.toContain(
      "office_warehouse_back_router_replace_call_start",
    );
    expect(logs).not.toContain(
      "office_warehouse_back_router_replace_call_done",
    );
  });
});
