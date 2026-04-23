import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import OfficeIndexRoute from "../../app/(tabs)/office/index";
import * as officeBreadcrumbs from "../../src/lib/navigation/officeReentryBreadcrumbs";

const mockUsePathname = jest.fn();
const mockUseSegments = jest.fn();

jest.mock("expo-router", () => {
  const ReactRuntime = require("react");
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
    usePathname: () => mockUsePathname(),
    useSegments: () => mockUseSegments(),
  };
});

jest.mock("../../src/shared/ui/ScreenErrorBoundary", () => ({
  withScreenErrorBoundary: (Component: React.ComponentType<object>) => Component,
}));

jest.mock("../../src/screens/office/OfficeHubScreen", () => {
  const ReactRuntime = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: function MockOfficeHubScreen(props: {
      officeReturnReceipt?: Record<string, unknown> | null;
      routeScopeActive?: boolean;
    }) {
      return ReactRuntime.createElement(View, {
        officeReturnSourceRoute:
          props.officeReturnReceipt?.sourceRoute ?? "none",
        testID: props.routeScopeActive
          ? "office-hub-screen-active"
          : "office-hub-screen-inactive",
      });
    },
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  clearPendingOfficeRouteReturnReceipt: jest.fn(),
  consumePendingOfficeRouteReturnReceipt: jest.fn(() => null),
  recordOfficeIndexAfterReturnFocus: jest.fn(),
  recordOfficeIndexAfterReturnMount: jest.fn(),
  recordOfficeReentryFailure: jest.fn(),
  recordOfficeReentryStart: jest.fn(),
  recordOfficeRouteOwnerIdentity: jest.fn(),
  recordOfficeRouteOwnerBlur: jest.fn(),
  recordOfficeRouteOwnerFocus: jest.fn(),
  recordOfficeRouteOwnerMount: jest.fn(),
  recordOfficeRouteOwnerUnmount: jest.fn(),
  recordOfficeRouteScopeActive: jest.fn(),
  recordOfficeRouteScopeInactive: jest.fn(),
  recordOfficeRouteScopeSkipReason: jest.fn(),
}));

function renderOfficeIndexRoute() {
  const rendererRef: { current: TestRenderer.ReactTestRenderer | null } = { current: null };
  act(() => {
    rendererRef.current = TestRenderer.create(<OfficeIndexRoute />);
  });
  const renderer = rendererRef.current;
  if (!renderer) throw new Error("office index route renderer was not created");
  return renderer;
}

describe("office index route scope", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSegments.mockReset();
    Object.values(officeBreadcrumbs).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });
  });

  it("keeps office owner passive outside exact /office", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    const renderer = renderOfficeIndexRoute();

    expect(
      renderer?.root.findAllByProps({ testID: "office-hub-screen-inactive" })
        .length,
    ).toBeGreaterThan(0);
    expect(officeBreadcrumbs.recordOfficeRouteScopeSkipReason).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeRouteScopeInactive).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeRouteOwnerIdentity).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeRouteOwnerFocus).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeReentryStart).not.toHaveBeenCalled();
  });

  it("activates office owner only on exact /office", () => {
    mockUsePathname.mockReturnValue("/office");
    mockUseSegments.mockReturnValue(["(tabs)", "office"]);

    const renderer = renderOfficeIndexRoute();

    expect(
      renderer?.root.findAllByProps({ testID: "office-hub-screen-active" })
        .length,
    ).toBeGreaterThan(0);
    expect(officeBreadcrumbs.recordOfficeRouteScopeActive).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeRouteOwnerIdentity).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeReentryStart).toHaveBeenCalled();
  });

  it("passes a consumed warehouse return receipt into OfficeHubScreen", () => {
    mockUsePathname.mockReturnValue("/office");
    mockUseSegments.mockReturnValue(["(tabs)", "office"]);
    (
      officeBreadcrumbs.consumePendingOfficeRouteReturnReceipt as jest.Mock
    ).mockReturnValueOnce({
      sourceRoute: "/office/warehouse",
      target: "/office",
      method: "back",
    });

    const renderer = renderOfficeIndexRoute();

    expect(
      renderer?.root.findAllByProps({
        officeReturnSourceRoute: "/office/warehouse",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      officeBreadcrumbs.clearPendingOfficeRouteReturnReceipt,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceRoute: "/office/warehouse",
        target: "/office",
      }),
    );
  });
});
