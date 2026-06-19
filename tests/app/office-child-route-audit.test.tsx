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
    router: {
      replace: jest.fn(),
    },
  };
});

jest.mock("../../src/lib/supabaseClient", () => ({
  getSessionSafe: jest.fn(async () => ({
    degraded: false,
    session: {
      user: {
        id: "office-route-audit-foreman",
        app_metadata: {},
        user_metadata: {},
      },
    },
  })),
}));

jest.mock("../../src/lib/sessionRole", () => ({
  resolveCurrentSessionRole: jest.fn(async () => ({
    role: "foreman",
    source: "office-route-audit-test",
  })),
}));

jest.mock("../../src/lib/developerOverride", () => ({
  loadDeveloperOverrideContext: jest.fn(async () => null),
}));

jest.mock("../../src/lib/officeRuntime/officeRuntimeContext", () => {
  const ReactRuntime = jest.requireActual("react");
  return {
    OfficeRoleAuthContextGate: ({ children }: { children: unknown }) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
  };
});

jest.mock("../../src/screens/foreman/ForemanScreen", () => {
  const ReactRuntime = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    ForemanScreen: function MockForemanScreen() {
      return ReactRuntime.createElement(View, { testID: "foreman-route" });
    },
  };
});

jest.mock("../../src/lib/navigation/officeReentryBreadcrumbs", () => ({
  recordOfficeChildBeforeRemove: jest.fn(),
  recordOfficeChildEntryFocus: jest.fn(),
  recordOfficeChildEntryMount: jest.fn(),
  recordOfficeChildUnmount: jest.fn(),
}));

async function renderOfficeForemanRoute() {
  const rendererRef: { current: TestRenderer.ReactTestRenderer | null } = { current: null };
  await act(async () => {
    rendererRef.current = TestRenderer.create(<OfficeForemanRoute />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  const renderer = rendererRef.current;
  if (!renderer) throw new Error("office foreman route renderer was not created");
  return renderer;
}

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

  it("records mount, focus, beforeRemove and unmount for office child screen routes", async () => {
    mockUsePathname.mockReturnValue("/office/foreman");
    mockUseSegments.mockReturnValue(["(tabs)", "office", "foreman"]);

    const renderer = await renderOfficeForemanRoute();

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
    await act(async () => {
      beforeRemoveListener?.({ data: { action: { type: "GO_BACK" } } });
      renderer?.unmount();
    });

    expect(officeBreadcrumbs.recordOfficeChildBeforeRemove).toHaveBeenCalled();
    expect(officeBreadcrumbs.recordOfficeChildUnmount).toHaveBeenCalled();
  });
});
