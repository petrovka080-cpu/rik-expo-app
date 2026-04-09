import React from "react";
import fs from "fs";
import path from "path";

import {
  OFFICE_BACK_LABEL,
  OFFICE_SAFE_BACK_ROUTE,
  performWarehouseBackNavigation,
  renderSafeOfficeBackButton,
  renderWarehouseOfficeBackButton,
} from "../../app/(tabs)/office/_layout";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockPersistWarehouseBackBreadcrumbs = jest.fn(() => Promise.resolve());

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

describe("OfficeStackLayout", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockBack.mockReset();
    mockCanGoBack.mockReset();
    mockPersistWarehouseBackBreadcrumbs.mockReset();
    mockPersistWarehouseBackBreadcrumbs.mockResolvedValue(undefined);
    mockCanGoBack.mockReturnValue(false);
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

  it("binds warehouse to its own explicit back handler and disables native auto-back", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );

    expect(source).toContain('name="foreman"');
    expect(source).toContain('name="warehouse"');
    expect(source).toContain("headerBackTitle: OFFICE_BACK_LABEL");
    expect(source).toContain('title: "Склад"');
    expect(source.match(/headerLeft: renderSafeOfficeBackButton/g)).toHaveLength(1);
    expect(source.match(/headerLeft: renderWarehouseOfficeBackButton/g)).toHaveLength(1);
    expect(source).toContain("headerBackVisible: false");
    expect(source).toContain("headerBackButtonMenuEnabled: false");
    expect(source).toContain('headerBackTitle: ""');
    expect(source).toContain("gestureEnabled: false");
  });

  it("renders the warehouse header button as an explicit pressable override", () => {
    const header = renderWarehouseOfficeBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ testID: string; onPress: () => void; children: React.ReactNode }>;

    expect(header.props.testID).toBe("warehouse-office-safe-back");
    expect(typeof header.props.onPress).toBe("function");
    expect(JSON.stringify(header.props.children)).toContain(OFFICE_BACK_LABEL);
  });

  it("records warehouse back breadcrumbs and forces office fallback", async () => {
    const recordEvent = jest.fn();

    await performWarehouseBackNavigation(
      {
        back: mockBack,
        canGoBack: () => true,
        replace: mockReplace,
      },
      recordEvent,
      mockPersistWarehouseBackBreadcrumbs,
    );

    expect(mockReplace).toHaveBeenCalledWith(OFFICE_SAFE_BACK_ROUTE);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPersistWarehouseBackBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(recordEvent.mock.calls.map(([event]) => event.event)).toEqual([
      "warehouse_back_tap",
      "warehouse_back_handler_enter",
      "warehouse_back_handler_selected",
      "warehouse_back_native_auto_back_blocked",
      "warehouse_back_can_go_back_true",
      "warehouse_back_use_router_back",
      "warehouse_back_use_office_push",
      "warehouse_back_use_office_replace",
      "warehouse_back_navigation_call",
      "warehouse_back_fallback_selected",
      "warehouse_back_navigation_done",
    ]);
  });

  it("records warehouse back navigation failure", () => {
    const recordEvent = jest.fn();
    const failure = new Error("warehouse nav failed");

    expect(() =>
      performWarehouseBackNavigation(
        {
          back: mockBack,
          canGoBack: () => false,
          replace: () => {
            throw failure;
          },
        },
        recordEvent,
        mockPersistWarehouseBackBreadcrumbs,
      ),
    ).toThrow("warehouse nav failed");

    expect(recordEvent.mock.calls.map(([event]) => event.event)).toContain(
      "warehouse_back_navigation_failed",
    );
  });
});
