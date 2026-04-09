import React from "react";
import fs from "fs";
import path from "path";

import { OFFICE_SAFE_BACK_ROUTE, renderSafeOfficeBackButton } from "../../app/(tabs)/office/_layout";

const mockReplace = jest.fn();

jest.mock("expo-router", () => {
  return {
    Stack: {
      Screen: () => null,
    },
    router: {
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
  });

  it("forces the custom office back button to return to office", () => {
    const header = renderSafeOfficeBackButton({
      canGoBack: true,
      tintColor: "#000000",
      label: "Офис",
      href: undefined,
    }) as React.ReactElement<{ label: string; onPress: () => void }>;

    expect(header.props.label).toBe("Офис");
    header.props.onPress();

    expect(mockReplace).toHaveBeenCalledWith(OFFICE_SAFE_BACK_ROUTE);
  });

  it("binds foreman and warehouse screens to the explicit office back handler", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/_layout.tsx"),
      "utf8",
    );

    expect(source).toContain('name="foreman"');
    expect(source).toContain('name="warehouse"');
    expect(source.match(/headerLeft: renderSafeOfficeBackButton/g)).toHaveLength(2);
  });
});
