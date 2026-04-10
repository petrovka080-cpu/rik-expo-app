import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import OfficeForemanRoute from "../../app/(tabs)/office/foreman";
import * as officeBreadcrumbs from "../../src/lib/navigation/officeReentryBreadcrumbs";

const mockUsePathname = jest.fn();
const mockUseSegments = jest.fn();
const mockAddListener = jest.fn();

jest.mock("expo-router", () => {
  const ReactRuntime = jest.requireActual("react");
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
    useNavigation: () => ({
      addListener: (eventName: unknown, listener: unknown) =>
        mockAddListener(eventName, listener),
    }),
    usePathname: () => mockUsePathname(),
    useSegments: () => mockUseSegments(),
  };
});

jest.mock("../../app/(tabs)/foreman", () => {
  const ReactRuntime = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    ForemanScreen: function MockForemanScreen() {
      return ReactRuntime.createElement(View, { testID: "foreman-route" });
    },
    default: function UnexpectedDefaultForemanRoute() {
      throw new Error("office child route should not render top-level route default export");
    },
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  recordOfficeChildBeforeRemove: jest.fn(),
  recordOfficeChildEntryFocus: jest.fn(),
  recordOfficeChildEntryMount: jest.fn(),
  recordOfficeChildUnmount: jest.fn(),
}));

describe("office child route audit", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSegments.mockReset();
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
    Object.values(officeBreadcrumbs).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });
  });

  it("records mount, focus, beforeRemove and unmount for office child screen routes", () => {
    mockUsePathname.mockReturnValue("/office/foreman");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "foreman"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeForemanRoute />);
    });

    expect(
      renderer?.root.findAllByProps({ testID: "foreman-route" }).length,
    ).toBeGreaterThan(0);
    expect(officeBreadcrumbs.recordOfficeChildEntryMount).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildEntryFocus).toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalledWith(
      "beforeRemove",
      expect.any(Function),
    );

    const beforeRemoveListener = mockAddListener.mock.calls[0]?.[1] as
      | ((event: { data?: { action?: { type?: string } } }) => void)
      | undefined;
    act(() => {
      beforeRemoveListener?.({ data: { action: { type: "GO_BACK" } } });
      renderer?.unmount();
    });

    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).toHaveBeenCalled();
  });
});
