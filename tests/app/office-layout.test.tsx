import React from "react";
import fs from "fs";
import path from "path";

import {
  OFFICE_BACK_LABEL,
  OFFICE_SAFE_BACK_ROUTE,
  renderSafeOfficeBackButton,
  renderWarehouseExplicitBackButton,
} from "../../app/(tabs)/office/_layout";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);

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

  it("always uses replace for the warehouse explicit back button", () => {
    mockCanGoBack.mockReturnValue(true);

    const header = renderWarehouseExplicitBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: OFFICE_BACK_LABEL,
      href: undefined,
    }) as React.ReactElement<{ onPress: () => void }>;

    header.props.onPress();

    expect(mockReplace).toHaveBeenCalledWith(OFFICE_SAFE_BACK_ROUTE);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("binds warehouse to a warehouse-only explicit replace contract", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );

    expect(source).toContain('name="foreman"');
    expect(source).toContain('name="warehouse"');
    expect(source).toContain("headerBackTitle: OFFICE_BACK_LABEL");
    expect(source).toContain("title: WAREHOUSE_HEADER_TITLE");
    expect(source.match(/headerLeft: renderSafeOfficeBackButton/g)).toHaveLength(1);
    expect(source).toContain("headerLeft: renderWarehouseExplicitBackButton");
    expect(source).toContain("headerBackVisible: false");
    expect(source).toContain("headerBackButtonMenuEnabled: false");
    expect(source).toContain("gestureEnabled: false");
  });
});
