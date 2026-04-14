import React from "react";
import fs from "fs";
import path from "path";

import {
  OFFICE_BACK_LABEL,
  OFFICE_SAFE_BACK_ROUTE,
  renderSafeOfficeChildBackButton,
  renderSafeOfficeForemanBackButton,
  renderSafeOfficeBackButton,
  unstable_settings,
} from "../../app/(tabs)/office/_layout";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockBack = jest.fn();
const mockNativeBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockMarkPendingOfficeRouteReturnReceipt = jest.fn();
const mockRecordOfficeBackPathFailure = jest.fn();
const officeChildBackRoutes = ["/office/foreman", "/office/warehouse"] as const;

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
      navigate: (...args: unknown[]) => mockNavigate(...args),
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
    mockNavigate.mockReset();
    mockReset.mockReset();
    mockBack.mockReset();
    mockNativeBack.mockReset();
    mockCanGoBack.mockReset();
    mockCanGoBack.mockReturnValue(false);
    mockMarkPendingOfficeRouteReturnReceipt.mockReset();
    mockRecordOfficeBackPathFailure.mockReset();
  });

  it("uses explicit navigation to /office (NAV-P0)", () => {
    const header = renderSafeOfficeBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
      onPress: mockNativeBack,
    }) as React.ReactElement<{ label: string; onPress: () => void }>;

    expect(header.props.label).toBe(OFFICE_BACK_LABEL);
    header.props.onPress();

    // NAV-P0: nativeOnPress is no longer called — we use router.navigate
    expect(mockNavigate).toHaveBeenCalledWith("/office");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNativeBack).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("anchors office child routes on the warm office index screen", () => {
    expect(unstable_settings).toEqual({
      initialRouteName: "index",
    });
  });

  it("marks a pending office return receipt for foreman", () => {
    const header = renderSafeOfficeForemanBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
      onPress: mockNativeBack,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockMarkPendingOfficeRouteReturnReceipt).toHaveBeenCalledWith({
      sourceRoute: "/office/foreman",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "explicit_navigate",
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.invocationCallOrder[0]).toBeLessThan(
      mockMarkPendingOfficeRouteReturnReceipt.mock.invocationCallOrder[0],
    );
  });

  it("keeps the shared office child back handler synchronous with explicit navigation", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );
    const handlerStart = source.indexOf("function handleOfficeChildBack");
    const handlerEnd = source.indexOf(
      "export function renderSafeOfficeChildBackButton",
    );
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(handlerSource).not.toMatch(/\basync\b/);
    expect(handlerSource).not.toMatch(/\bawait\b/);
    expect(handlerSource).not.toContain("safeBack(");
    expect(handlerSource).not.toContain("canGoBack");
    expect(handlerSource).not.toMatch(/selected\s*Method/);
    // NAV-P0: router.navigate("/office") is the primary navigation method
    expect(handlerSource).toContain('router.navigate("/office")');
    // router.replace is the crash-safe fallback only
    expect(handlerSource).toContain('router.replace("/office")');
    expect(handlerSource).not.toContain("router.push");
    expect(handlerSource).not.toMatch(/\.reset\(/);
  });

  it.each(officeChildBackRoutes)(
    "%s uses the shared explicit navigate office child contract",
    (sourceRoute) => {
      const header = renderSafeOfficeChildBackButton(sourceRoute, {
        canGoBack: false,
        tintColor: "#000000",
        label: OFFICE_BACK_LABEL,
        href: undefined,
        onPress: mockNativeBack,
      }) as React.ReactElement<{ onPress: () => void }>;

      header.props.onPress();

      // NAV-P0: always uses explicit navigate, never nativeOnPress
      expect(mockNavigate).toHaveBeenCalledWith("/office");
      expect(mockNativeBack).not.toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockMarkPendingOfficeRouteReturnReceipt).toHaveBeenCalledWith({
        sourceRoute,
        target: OFFICE_SAFE_BACK_ROUTE,
        method: "explicit_navigate",
      });
      expect(mockNavigate.mock.invocationCallOrder[0]).toBeLessThan(
        mockMarkPendingOfficeRouteReturnReceipt.mock.invocationCallOrder[0],
      );
    },
  );

  it("falls back to router.replace when router.navigate throws", () => {
    const navigateError = new Error("navigate unavailable");
    mockNavigate.mockImplementationOnce(() => {
      throw navigateError;
    });

    const header = renderSafeOfficeChildBackButton("/office/warehouse", {
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
      onPress: mockNativeBack,
    }) as React.ReactElement<{ onPress: () => void }>;

    expect(() => header.props.onPress()).not.toThrow();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/office");
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockRecordOfficeBackPathFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        error: navigateError,
        errorStage: "safe_back_navigate",
        extra: expect.objectContaining({
          sourceRoute: "/office/warehouse",
          target: OFFICE_SAFE_BACK_ROUTE,
          method: "explicit_navigate",
          handler: "safe_back_header",
        }),
      }),
    );
    expect(mockMarkPendingOfficeRouteReturnReceipt).toHaveBeenCalledWith({
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "router_replace_fallback",
    });
  });

  it("does not emit warehouse-specific back markers", () => {
    const header = renderSafeOfficeForemanBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
      onPress: mockNativeBack,
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
    expect(source).toContain("foreman: renderSafeOfficeForemanBackButton");
    expect(source).toContain(
      'renderSafeOfficeChildBackButton("/office/warehouse", props)',
    );
    expect(source).toContain("headerLeft: safeOfficeChildBackButtons.foreman");
    expect(source).toContain(
      "headerLeft: safeOfficeChildBackButtons.warehouse",
    );
    expect(source).not.toContain(
      ["renderSafeOffice", "Warehouse", "BackButton"].join(""),
    );
    expect(source).not.toContain("isWarehouse");
    expect(source).not.toMatch(/selected\s*Method/);
    expect(source).not.toContain('sourceRoute === "/office/warehouse"');
    expect(source).not.toContain('sourceRoute !== "/office/warehouse"');
    expect(source).not.toMatch(/if\s*\([^)]*warehouse/i);
    expect(source).not.toMatch(/switch\s*\([^)]*warehouse/i);
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

  it("keeps accountant on the native stack back path like the other default office children", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );
    const accountantSource =
      source
        .split(/\r?\n/)
        .find((line) => line.includes('name="accountant"')) ?? "";

    expect(accountantSource).toContain('name="accountant"');
    expect(accountantSource).not.toContain("headerLeft");
    expect(accountantSource).not.toContain("router.back");
    expect(accountantSource).not.toContain("router.replace");
  });

  it("warehouse is navigated back with the same explicit method as foreman (NAV-P0)", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );

    // NAV-P0: The handler uses router.navigate as primary, router.replace as fallback
    const handlerStart = source.indexOf("function handleOfficeChildBack");
    const handlerEnd = source.indexOf(
      "export function renderSafeOfficeChildBackButton",
    );
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(handlerSource).toContain('router.navigate("/office")');
    // No warehouse-specific branching
    expect(handlerSource).not.toContain("warehouse");
  });

  describe("rapid back regression (N2)", () => {
    const allChildRoutes: Array<"/office/foreman" | "/office/warehouse"> = [
      "/office/foreman",
      "/office/warehouse",
    ];

    it.each(allChildRoutes)(
      "5× rapid back from %s always uses explicit navigate",
      (sourceRoute) => {
        const header = renderSafeOfficeChildBackButton(sourceRoute, {
          canGoBack: true,
          tintColor: "#000000",
          label: OFFICE_BACK_LABEL,
          href: undefined,
          onPress: mockNativeBack,
        }) as React.ReactElement<{ onPress: () => void }>;

        // Press back 5 times rapidly
        for (let i = 0; i < 5; i++) {
          header.props.onPress();
        }

        // All 5 calls should use navigate, no leakage
        expect(mockNavigate).toHaveBeenCalledTimes(5);
        for (let i = 0; i < 5; i++) {
          expect(mockNavigate).toHaveBeenNthCalledWith(i + 1, "/office");
        }
        expect(mockBack).not.toHaveBeenCalled();
        expect(mockNativeBack).not.toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockReset).not.toHaveBeenCalled();
      },
    );

    it("5× rapid back never calls router.back even with canGoBack=true", () => {
      mockCanGoBack.mockReturnValue(true);

      const header = renderSafeOfficeChildBackButton("/office/foreman", {
        canGoBack: true,
        tintColor: "#000000",
        label: OFFICE_BACK_LABEL,
        href: undefined,
        onPress: mockNativeBack,
      }) as React.ReactElement<{ onPress: () => void }>;

      for (let i = 0; i < 5; i++) {
        header.props.onPress();
      }

      expect(mockNavigate).toHaveBeenCalledTimes(5);
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNativeBack).not.toHaveBeenCalled();
    });

    it("rapid back with intermittent navigate failure falls back to replace", () => {
      let callCount = 0;
      mockNavigate.mockImplementation(() => {
        callCount++;
        if (callCount === 3) throw new Error("transient failure");
      });

      const header = renderSafeOfficeChildBackButton("/office/warehouse", {
        canGoBack: true,
        tintColor: "#000000",
        label: OFFICE_BACK_LABEL,
        href: undefined,
        onPress: mockNativeBack,
      }) as React.ReactElement<{ onPress: () => void }>;

      for (let i = 0; i < 5; i++) {
        expect(() => header.props.onPress()).not.toThrow();
      }

      // 5 navigate calls, but 3rd failed → 1 replace fallback
      expect(mockNavigate).toHaveBeenCalledTimes(5);
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/office");
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockNativeBack).not.toHaveBeenCalled();
    });
  });
});
