import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import OfficeWarehouseRoute from "../../app/(tabs)/office/warehouse";
import * as officeBreadcrumbs from "../../src/lib/navigation/officeReentryBreadcrumbs";

const mockUsePathname = jest.fn();
const mockUseSegments = jest.fn();
const mockAddListener: jest.Mock = jest.fn(() => jest.fn());
const mockWarehouseScreenContent = jest.fn((_props?: Record<string, unknown>) => null);

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
    default: function MockWarehouseScreenContent(
      props: Record<string, unknown>,
    ) {
      mockWarehouseScreenContent(props);
      return ReactRuntime.createElement(View, {
        testID: "warehouse-screen-content",
      });
    },
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  recordOfficeChildBeforeRemove: jest.fn(),
  recordOfficeChildEntryFocus: jest.fn(),
  recordOfficeChildEntryMount: jest.fn(),
  recordOfficeChildUnmount: jest.fn(),
}));

describe("office warehouse child route entry", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSegments.mockReset();
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
    mockWarehouseScreenContent.mockReset();
    Object.values(officeBreadcrumbs).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });
  });

  it("uses the shared office child wrapper contract for /office/warehouse", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeWarehouseRoute />);
    });

    expect(
      renderer?.root.findAllByProps({ testID: "warehouse-screen-content" }).length,
    ).toBeGreaterThan(0);
    expect(officeBreadcrumbs.recordOfficeChildEntryMount).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildEntryFocus).toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockWarehouseScreenContent).toHaveBeenCalledWith(
      expect.objectContaining({
        entryKind: "office",
        entryExtra: expect.objectContaining({
          owner: "office_warehouse_route",
          route: "/office/warehouse",
          wrappedRoute: "/warehouse",
          routeWrapper: "office_child_screen_entry",
        }),
      }),
    );
    expect(mockWarehouseScreenContent).toHaveBeenCalledWith(
      expect.not.objectContaining({
        entryExtra: expect.objectContaining({
          contentOwner: expect.anything(),
        }),
      }),
    );
    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).not.toHaveBeenCalled();

    act(() => {
      renderer?.unmount();
    });
    expect(officeBreadcrumbs.recordOfficeChildUnmount).toHaveBeenCalled();
  });

  it("does not emit a fake unmount-remount cycle on a plain rerender", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeWarehouseRoute />);
    });

    Object.values(officeBreadcrumbs).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });
    mockWarehouseScreenContent.mockClear();

    act(() => {
      renderer?.update(<OfficeWarehouseRoute />);
    });

    expect(officeBreadcrumbs.recordOfficeChildEntryMount).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildEntryFocus).not.toHaveBeenCalled();
    expect(mockWarehouseScreenContent).toHaveBeenCalledTimes(1);

    act(() => {
      renderer?.unmount();
    });
  });

  it("does not emit a fake unmount-remount cycle when entry segments settle", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeWarehouseRoute />);
    });

    Object.values(officeBreadcrumbs).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });

    mockUseSegments.mockReturnValue(["(tabs)", "office", "_layout", "warehouse"]);

    act(() => {
      renderer?.update(<OfficeWarehouseRoute />);
    });

    expect(officeBreadcrumbs.recordOfficeChildEntryMount).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildEntryFocus).not.toHaveBeenCalled();

    act(() => {
      renderer?.unmount();
    });
  });
});
