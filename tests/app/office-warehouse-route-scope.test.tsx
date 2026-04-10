import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import OfficeWarehouseRoute from "../../app/(tabs)/office/warehouse";
import * as officeBreadcrumbs from "../../src/lib/navigation/officeReentryBreadcrumbs";

const mockUsePathname = jest.fn();
const mockUseSegments = jest.fn();
const mockAddListener: jest.Mock = jest.fn(() => jest.fn());

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

jest.mock("../../src/shared/ui/ScreenErrorBoundary", () => ({
  withScreenErrorBoundary: (Component: React.ComponentType<object>) => Component,
}));

jest.mock("../../src/screens/warehouse/WarehouseScreenContent", () => {
  const ReactRuntime = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: function MockWarehouseScreenContent() {
      return ReactRuntime.createElement(View, {
        testID: "warehouse-screen-content",
      });
    },
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  recordOfficeWarehouseBeforeRemove: jest.fn(),
  recordOfficeWarehouseEntryFailure: jest.fn(),
  recordOfficeWarehouseEntryFocusDone: jest.fn(),
  recordOfficeWarehouseEntryFocusStart: jest.fn(),
  recordOfficeWarehouseEntryMountDone: jest.fn(),
  recordOfficeWarehouseEntryMountStart: jest.fn(),
  recordOfficeWarehouseScopeActive: jest.fn(),
  recordOfficeWarehouseScopeInactive: jest.fn(),
  recordOfficeWarehouseScopeSkipReason: jest.fn(),
  recordOfficeWarehouseUnmount: jest.fn(),
  recordOfficeRouteOwnerIdentity: jest.fn(),
  recordOfficeRouteOwnerBlur: jest.fn(),
  recordOfficeRouteOwnerFocus: jest.fn(),
  recordOfficeRouteOwnerMount: jest.fn(),
  recordOfficeRouteOwnerUnmount: jest.fn(),
}));

describe("office warehouse route scope", () => {
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

  it("keeps office warehouse entry active only on exact /office/warehouse", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeWarehouseRoute />);
    });

    expect(
      renderer?.root.findAllByProps({ testID: "warehouse-screen-content" }).length,
    ).toBeGreaterThan(0);
    expect(officeBreadcrumbs.recordOfficeWarehouseScopeActive).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryMountStart).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryMountDone).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryFocusStart).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryFocusDone).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeRouteOwnerIdentity).toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalledWith(
      "beforeRemove",
      expect.any(Function),
    );
  });

  it("keeps office warehouse entry passive on foreign paths", () => {
    mockUsePathname.mockReturnValue("/profile");
    mockUseSegments.mockReturnValue(["(tabs)", "profile"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeWarehouseRoute />);
    });

    expect(
      renderer?.root.findAllByProps({ testID: "warehouse-screen-content" }).length,
    ).toBe(0);
    expect(officeBreadcrumbs.recordOfficeWarehouseScopeSkipReason).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseScopeInactive).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryMountStart).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryMountDone).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryFocusStart).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeWarehouseEntryFocusDone).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeRouteOwnerIdentity).not.toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
  });
});
