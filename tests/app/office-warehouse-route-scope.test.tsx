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
const mockReplace = jest.fn();

jest.mock("expo-router", () => {
  const ReactRuntime = jest.requireActual("react");
  return {
    router: {
      replace: (...args: unknown[]) => mockReplace(...args),
    },
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

jest.mock("../../app/(tabs)/warehouse", () => {
  const ReactRuntime = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    WarehouseScreen: function MockWarehouseScreen(
      props: Record<string, unknown>,
    ) {
      mockWarehouseScreen(props);
      return ReactRuntime.createElement(View, {
        testID: "warehouse-screen",
      });
    },
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  markPendingOfficeRouteReturnReceipt: jest.fn(),
  recordOfficeBackPathFailure: jest.fn(),
  recordOfficeChildBeforeRemove: jest.fn(),
  recordOfficeChildEntryFocus: jest.fn(),
  recordOfficeChildEntryMount: jest.fn(),
  recordOfficeChildUnmount: jest.fn(),
  recordOfficeWarehouseBackHandlerDone: jest.fn(),
  recordOfficeWarehouseBackHandlerStart: jest.fn(),
  recordOfficeWarehouseBackMethodSelected: jest.fn(),
  recordOfficeWarehouseBackPressDone: jest.fn(),
  recordOfficeWarehouseBackPressStart: jest.fn(),
  recordOfficeWarehouseBackReplaceDone: jest.fn(),
  recordOfficeWarehouseBackReplaceStart: jest.fn(),
  recordOfficeWarehouseBackUseReplaceFallback: jest.fn(),
  recordOfficeWarehouseBeforeRemove: jest.fn(),
  recordWarehouseBackSourceCustomHeader: jest.fn(),
  recordWarehouseBackSourceGoBackGuard: jest.fn(),
  recordWarehouseReturnToOfficeDone: jest.fn(),
  recordWarehouseReturnToOfficeStart: jest.fn(),
}));

describe("office warehouse child route entry", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSegments.mockReset();
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
    mockWarehouseScreen.mockReset();
    mockReplace.mockReset();
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
    expect(warehouseScreenProps).toBeDefined();
    expect(warehouseScreenProps).not.toHaveProperty("entryKind");
    expect(warehouseScreenProps).not.toHaveProperty("entryExtra");

    const beforeRemoveListener = mockAddListener.mock.calls[0]?.[1];
    expect(typeof beforeRemoveListener).toBe("function");
    act(() => {
      beforeRemoveListener({
        preventDefault: jest.fn(),
        data: {
          action: {
            type: "GO_BACK",
          },
        },
      });
    });
    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REPLACE",
        reason: "go_back_intercepted",
        trigger: "go_back_guard",
      }),
    );
    expect(officeBreadcrumbs.recordOfficeWarehouseBeforeRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REPLACE",
        reason: "go_back_intercepted",
        trigger: "go_back_guard",
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/office");

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

    expect(officeBreadcrumbs.recordOfficeChildEntryMount).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).not.toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildEntryFocus).not.toHaveBeenCalled();
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

  it("keeps the same route wrapper but hard-blocks GO_BACK via deterministic replace", () => {
    const warehouseSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/warehouse.tsx"),
      "utf8",
    );
    const foremanSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/foreman.tsx"),
      "utf8",
    );

    expect(warehouseSource).toContain('import { WarehouseScreen } from "../warehouse";');
    expect(warehouseSource).not.toContain("WarehouseScreenContent");
    expect(foremanSource).toContain('import { ForemanScreen } from "../foreman";');
    expect(warehouseSource).toContain("useOfficeChildRouteAudit({");
    expect(warehouseSource).toContain("return <WarehouseScreen />;");
    expect(warehouseSource).toContain("performWarehouseDeterministicOfficeReturn");
  });
});
