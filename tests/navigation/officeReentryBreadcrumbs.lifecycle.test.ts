import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

import {
  clearOfficeReentryBreadcrumbs,
  flushOfficeReentryBreadcrumbWrites,
  recordOfficeReentryBreadcrumbs,
} from "../../src/lib/navigation/officeReentryBreadcrumbs";

describe("office reentry breadcrumb lifecycle", () => {
  const asyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(async () => {
    await clearOfficeReentryBreadcrumbs();
    await flushOfficeReentryBreadcrumbWrites();
    asyncStorage.getItem.mockClear();
    asyncStorage.setItem.mockClear();
    asyncStorage.removeItem.mockClear();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await flushOfficeReentryBreadcrumbWrites();
    await clearOfficeReentryBreadcrumbs();
  });

  it("registers one final-flush listener per pending batch lifecycle without duplicates", async () => {
    const handlers: Array<(state: string) => void> = [];
    const removals: jest.Mock[] = [];
    const addListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, handler) => {
        handlers.push(handler as (state: string) => void);
        const remove = jest.fn();
        removals.push(remove);
        return { remove };
      });

    recordOfficeReentryBreadcrumbs([
      { marker: "office_reentry_start", result: "success" },
    ]);
    recordOfficeReentryBreadcrumbs([
      { marker: "office_reentry_route_match", result: "success" },
    ]);

    await Promise.resolve();

    expect(addListenerSpy).toHaveBeenCalledTimes(1);
    expect(handlers).toHaveLength(1);

    handlers[0]?.("background");
    await flushOfficeReentryBreadcrumbWrites();

    expect(removals[0]).toHaveBeenCalledTimes(1);

    recordOfficeReentryBreadcrumbs([
      { marker: "office_reentry_component_enter", result: "success" },
    ]);
    await Promise.resolve();

    expect(addListenerSpy).toHaveBeenCalledTimes(2);
    expect(handlers).toHaveLength(2);
  });
});
