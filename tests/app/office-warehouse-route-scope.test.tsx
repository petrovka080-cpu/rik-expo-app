import React from "react";
import fs from "fs";
import path from "path";
import TestRenderer, { act } from "react-test-renderer";

import OfficeWarehouseRoute from "../../app/(tabs)/office/warehouse";
import * as officeBreadcrumbs from "../../src/lib/navigation/officeReentryBreadcrumbs";

const mockUsePathname = jest.fn();
const mockUseSegments = jest.fn();
const mockAddListener: jest.Mock = jest.fn(() => jest.fn());
const mockWarehouseScreen = jest.fn((_props?: Record<string, unknown>) => null);

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
  withScreenErrorBoundary: (Component: React.ComponentType<object>) =>
    Component,
}));

jest.mock("../../src/screens/warehouse/WarehouseScreenContent", () => {
  const ReactRuntime = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return function MockWarehouseScreenContent(props: Record<string, unknown>) {
    mockWarehouseScreen(props);
    return ReactRuntime.createElement(View, {
      testID: "warehouse-screen",
    });
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  recordOfficeChildBeforeRemove: jest.fn(),
  recordOfficeChildEntryFocus: jest.fn(),
  recordOfficeChildEntryMount: jest.fn(),
  recordOfficeChildUnmount: jest.fn(),
  recordOfficeRouteOwnerUnmount: jest.fn(),
  recordOfficeTabOwnerUnmount: jest.fn(),
}));

function renderOfficeWarehouseRoute() {
  const rendererRef: { current: TestRenderer.ReactTestRenderer | null } = { current: null };
  act(() => {
    rendererRef.current = TestRenderer.create(<OfficeWarehouseRoute />);
  });
  const renderer = rendererRef.current;
  if (!renderer) throw new Error("office warehouse route renderer was not created");
  return renderer;
}

describe("office warehouse child route entry", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSegments.mockReset();
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
    mockWarehouseScreen.mockReset();
    Object.values(officeBreadcrumbs).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });
  });

  it("uses the shared office child wrapper contract for /office/warehouse", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    const renderer = renderOfficeWarehouseRoute();

    expect(
      renderer?.root.findAllByProps({ testID: "warehouse-screen" }).length,
    ).toBeGreaterThan(0);
    expect(officeBreadcrumbs.recordOfficeChildEntryMount).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildEntryFocus).toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalledWith(
      "beforeRemove",
      expect.any(Function),
    );
    expect(mockWarehouseScreen).toHaveBeenCalled();
    const warehouseScreenProps = mockWarehouseScreen.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(warehouseScreenProps ?? {}).toEqual({});

    const beforeRemoveListener = mockAddListener.mock.calls[0]?.[1];
    expect(typeof beforeRemoveListener).toBe("function");
    act(() => {
      beforeRemoveListener({
        data: {
          action: {
            type: "GO_BACK",
          },
        },
      });
    });
    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).toHaveBeenCalled();

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
    mockWarehouseScreen.mockClear();

    act(() => {
      renderer?.update(<OfficeWarehouseRoute />);
    });

    expect(
      officeBreadcrumbs.recordOfficeChildEntryMount,
    ).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).not.toHaveBeenCalled();
    expect(
      officeBreadcrumbs.recordOfficeChildEntryFocus,
    ).not.toHaveBeenCalled();
    expect(mockWarehouseScreen).toHaveBeenCalledTimes(1);

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

    mockUseSegments.mockReturnValue([
      "(tabs)",
      "office",
      "_layout",
      "warehouse",
    ]);

    act(() => {
      renderer?.update(<OfficeWarehouseRoute />);
    });

    expect(
      officeBreadcrumbs.recordOfficeChildEntryMount,
    ).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).not.toHaveBeenCalled();
    expect(
      officeBreadcrumbs.recordOfficeChildEntryFocus,
    ).not.toHaveBeenCalled();

    act(() => {
      renderer?.unmount();
    });
  });

  it("does not tear down office owners during a warehouse GO_BACK cycle", () => {
    mockUsePathname.mockReturnValue("/office/warehouse");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(<OfficeWarehouseRoute />);
    });

    const beforeRemoveListener = mockAddListener.mock.calls[0]?.[1];
    expect(typeof beforeRemoveListener).toBe("function");

    act(() => {
      beforeRemoveListener({
        data: {
          action: {
            type: "GO_BACK",
          },
        },
      });
    });

    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).toHaveBeenCalled();
    expect(
      officeBreadcrumbs.recordOfficeTabOwnerUnmount,
    ).not.toHaveBeenCalled();
    expect(
      officeBreadcrumbs.recordOfficeRouteOwnerUnmount,
    ).not.toHaveBeenCalled();

    act(() => {
      renderer?.unmount();
    });

    expect(officeBreadcrumbs.recordOfficeChildUnmount).toHaveBeenCalled();
    expect(
      officeBreadcrumbs.recordOfficeTabOwnerUnmount,
    ).not.toHaveBeenCalled();
    expect(
      officeBreadcrumbs.recordOfficeRouteOwnerUnmount,
    ).not.toHaveBeenCalled();
  });

  it("matches the same reexport contract used by working office child routes", () => {
    const warehouseSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/warehouse.tsx"),
      "utf8",
    );
    const foremanSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/foreman.tsx"),
      "utf8",
    );

    expect(warehouseSource).toContain(
      'import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";',
    );
    expect(foremanSource).toContain(
      'import { ForemanScreen } from "../../../src/screens/foreman/ForemanScreen";',
    );
    expect(warehouseSource).toContain("useOfficeChildRouteAudit({");
    expect(warehouseSource).toContain("return <WarehouseScreenContent />;");
    expect(warehouseSource).not.toContain('from "../warehouse"');
    expect(warehouseSource).not.toContain("diagnostics:");
    expect(warehouseSource).not.toContain("entryKind");
    expect(warehouseSource).not.toContain("entryExtra");
    expect(warehouseSource).not.toContain("useWarehouseUiStore");
    expect(warehouseSource).not.toContain("recordOfficeWarehouseCleanup");
    expect(warehouseSource).not.toContain("recordOfficeWarehouseBeforeRemove");
    expect(warehouseSource).not.toContain("recordOfficeWarehouseUnmount");
    expect(warehouseSource).not.toContain(
      "performWarehouseDeterministicOfficeReturn",
    );
  });
});
