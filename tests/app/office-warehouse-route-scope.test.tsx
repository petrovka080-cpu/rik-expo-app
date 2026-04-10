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
const mockWarehouseUiStoreState = {
  incomingDetailsId: "incoming-1",
  isFioConfirmVisible: true,
  isRecipientModalVisible: true,
  issueDetailsId: 42,
  itemsModal: {
    incomingId: "incoming-1",
    poNo: "PO-1",
    purchaseId: "purchase-1",
    status: "open",
  },
  pickModal: { what: "recipient" as const },
  repPeriodOpen: true,
  setIncomingDetailsId: jest.fn(),
  setIsFioConfirmVisible: jest.fn(),
  setIsRecipientModalVisible: jest.fn(),
  setIssueDetailsId: jest.fn(),
  setItemsModal: jest.fn(),
  setPickModal: jest.fn(),
  setRepPeriodOpen: jest.fn(),
};

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

jest.mock("../../src/screens/warehouse/warehouseUi.store", () => ({
  useWarehouseUiStore: {
    getState: () => mockWarehouseUiStoreState,
  },
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
  recordOfficeChildBeforeRemove: jest.fn(),
  recordOfficeChildEntryFocus: jest.fn(),
  recordOfficeChildEntryMount: jest.fn(),
  recordOfficeChildUnmount: jest.fn(),
  recordOfficeWarehouseBeforeRemove: jest.fn(),
  recordOfficeWarehouseUnmount: jest.fn(),
}));

describe("office warehouse child route entry", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSegments.mockReset();
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
    mockWarehouseScreen.mockReset();
    Object.values(mockWarehouseUiStoreState).forEach((value) => {
      if (jest.isMockFunction(value)) {
        value.mockClear();
      }
    });
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
    expect(warehouseScreenProps).toMatchObject({
      entryKind: "office",
      entryExtra: expect.objectContaining({
        contentOwner: "office_warehouse_route",
        owner: "office_warehouse_route",
        route: "/office/warehouse",
        wrappedRoute: "/warehouse",
      }),
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
    expect(officeBreadcrumbs.recordOfficeWarehouseBeforeRemove).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).toHaveBeenCalled();
    expect(mockWarehouseUiStoreState.setIsFioConfirmVisible).toHaveBeenCalledWith(false);
    expect(mockWarehouseUiStoreState.setIsRecipientModalVisible).toHaveBeenCalledWith(false);
    expect(mockWarehouseUiStoreState.setPickModal).toHaveBeenCalledWith({ what: null });
    expect(mockWarehouseUiStoreState.setItemsModal).toHaveBeenCalledWith(null);
    expect(mockWarehouseUiStoreState.setIssueDetailsId).toHaveBeenCalledWith(null);
    expect(mockWarehouseUiStoreState.setIncomingDetailsId).toHaveBeenCalledWith(null);
    expect(mockWarehouseUiStoreState.setRepPeriodOpen).toHaveBeenCalledWith(false);

    act(() => {
      renderer?.unmount();
    });
    expect(officeBreadcrumbs.recordOfficeWarehouseUnmount).toHaveBeenCalled();
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

  it("matches the same reexport contract used by working office child routes", () => {
    const warehouseSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/warehouse.tsx"),
      "utf8",
    );
    const foremanSource = fs.readFileSync(
      path.join(__dirname, "../../app/(tabs)/office/foreman.tsx"),
      "utf8",
    );

    expect(warehouseSource).toContain('import { WarehouseScreen } from "../warehouse";');
    expect(warehouseSource).toContain('entryKind="office"');
    expect(warehouseSource).toContain('contentOwner: "office_warehouse_route"');
    expect(foremanSource).toContain('import { ForemanScreen } from "../foreman";');
    expect(warehouseSource).toContain("useOfficeChildRouteAudit({");
    expect(warehouseSource).toContain("<WarehouseScreen");
    expect(warehouseSource).not.toContain("performWarehouseDeterministicOfficeReturn");
  });
});
