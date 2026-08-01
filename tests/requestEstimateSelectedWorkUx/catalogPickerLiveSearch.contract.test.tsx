import React from "react";
import TestRenderer, { act } from "react-test-renderer";

const mockSearchCatalogItemsForPicker = jest.fn();
type MockScheduledTimer = {
  owner: string;
  callback: () => void;
  delayMs: number;
  active: boolean;
  dispose: jest.Mock;
};
const mockScheduledTimers: MockScheduledTimer[] = [];
const mockRegisterTimeout = jest.fn(
  (owner: string, callback: () => void, delayMs: number) => {
    const timer: MockScheduledTimer = {
      owner,
      callback,
      delayMs,
      active: true,
      dispose: jest.fn(),
    };
    timer.dispose.mockImplementation(() => {
      timer.active = false;
    });
    mockScheduledTimers.push(timer);
    return {
      id: mockScheduledTimers.length,
      owner,
      kind: "timeout",
      dispose: timer.dispose,
    };
  },
);

jest.mock("../../src/lib/catalog/catalog.facade", () => ({
  searchCatalogItemsForPicker: (...args: unknown[]) => mockSearchCatalogItemsForPicker(...args),
}));
jest.mock("../../src/lib/lifecycle/timerRegistry", () => ({
  registerTimeout: (...args: [string, () => void, number]) => mockRegisterTimeout(...args),
}));

import { CatalogItemPicker } from "../../src/features/catalog/CatalogItemPicker";

function latestScheduledTimer(): MockScheduledTimer {
  const timer = mockScheduledTimers[mockScheduledTimers.length - 1];
  if (!timer) throw new Error("Expected a scheduled catalog debounce timer");
  return timer;
}

async function fireScheduledTimer(timer: MockScheduledTimer): Promise<void> {
  await act(async () => {
    expect(timer.active).toBe(true);
    timer.active = false;
    timer.callback();
    await Promise.resolve();
    await Promise.resolve();
  });
}

let rendererWarmup!: TestRenderer.ReactTestRenderer;
act(() => {
  rendererWarmup = TestRenderer.create(
    <CatalogItemPicker
      visible={false}
      onClose={() => undefined}
      onSelect={() => undefined}
      initialQuery=""
    />,
  );
});
act(() => {
  rendererWarmup.unmount();
});

describe("catalog picker live smart search", () => {
  beforeEach(() => {
    mockScheduledTimers.length = 0;
    mockRegisterTimeout.mockClear();
    mockSearchCatalogItemsForPicker.mockReset();
    mockSearchCatalogItemsForPicker.mockResolvedValue([
      {
        catalogItemId: "rebar-a500",
        rikCode: "RIK-REBAR",
        name: "Арматура А500",
        unit: "kg",
        unitLabel: "кг",
        sourceLabel: "catalog_items",
      },
    ]);
  });

  it("searches automatically after two typed characters and no longer requires a submit button", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <CatalogItemPicker
          visible
          onClose={() => undefined}
          onSelect={() => undefined}
          initialQuery=""
        />,
      );
    });

    expect(renderer.root.findAllByProps({ testID: "request-catalog-picker-submit" })).toHaveLength(0);

    await act(async () => {
      renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.onChangeText("а");
    });
    expect(mockSearchCatalogItemsForPicker).not.toHaveBeenCalled();

    await act(async () => {
      renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.onChangeText("ар");
    });
    expect(mockSearchCatalogItemsForPicker).not.toHaveBeenCalled();

    const debounce = latestScheduledTimer();
    expect(debounce).toMatchObject({
      owner: "catalog-item-picker:live-search",
      delayMs: 250,
    });
    expect(mockRegisterTimeout).toHaveBeenCalledTimes(1);
    await fireScheduledTimer(debounce);

    expect(mockSearchCatalogItemsForPicker).toHaveBeenCalledWith("ар", 40);
    expect(renderer.root.findByProps({ testID: "request-catalog-picker-results-title" }).props.children).toContain("ар");
    expect(JSON.stringify(renderer.toJSON())).toContain("Арматура А500");

    act(() => {
      renderer.unmount();
    });
  });

  it("cancels the prior debounce and ignores a stale in-flight response", async () => {
    let resolveOld!: (rows: unknown[]) => void;
    const oldRows = new Promise<unknown[]>((resolve) => {
      resolveOld = resolve;
    });
    mockSearchCatalogItemsForPicker
      .mockImplementationOnce(() => oldRows)
      .mockResolvedValueOnce([{
        catalogItemId: "new-result",
        rikCode: "RIK-NEW",
        name: "Новый результат",
        unit: "kg",
        sourceLabel: "catalog_items",
      }]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <CatalogItemPicker
          visible
          onClose={() => undefined}
          onSelect={() => undefined}
          initialQuery=""
        />,
      );
    });
    await act(async () => {
      renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.onChangeText("ар");
    });
    await fireScheduledTimer(latestScheduledTimer());
    await act(async () => {
      renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.onChangeText("арм");
    });
    const cancelledDebounce = latestScheduledTimer();
    await act(async () => {
      renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.onChangeText(
        `${renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.value}a`,
      );
    });
    expect(cancelledDebounce.dispose).toHaveBeenCalledTimes(1);
    await fireScheduledTimer(latestScheduledTimer());
    expect(JSON.stringify(renderer.toJSON())).toContain("Новый результат");

    await act(async () => {
      resolveOld([{
        catalogItemId: "old-result",
        rikCode: "RIK-OLD",
        name: "Устаревший результат",
        unit: "kg",
        sourceLabel: "catalog_items",
      }]);
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Устаревший результат");

    act(() => {
      renderer.unmount();
    });
  });

  it("disposes pending debounce and suppresses in-flight completion after unmount", async () => {
    let pendingRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      pendingRenderer = TestRenderer.create(
        <CatalogItemPicker
          visible
          onClose={() => undefined}
          onSelect={() => undefined}
          initialQuery=""
        />,
      );
    });
    await act(async () => {
      pendingRenderer.root
        .findByProps({ testID: "request-catalog-picker-search" })
        .props.onChangeText("ab");
    });
    const pendingDebounce = latestScheduledTimer();
    act(() => {
      pendingRenderer.unmount();
    });
    expect(pendingDebounce.dispose).toHaveBeenCalledTimes(1);
    expect(pendingDebounce.active).toBe(false);
    expect(mockSearchCatalogItemsForPicker).not.toHaveBeenCalled();

    let resolveInFlight!: (rows: unknown[]) => void;
    mockSearchCatalogItemsForPicker.mockImplementationOnce(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveInFlight = resolve;
        }),
    );
    let inFlightRenderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      inFlightRenderer = TestRenderer.create(
        <CatalogItemPicker
          visible
          onClose={() => undefined}
          onSelect={() => undefined}
          initialQuery=""
        />,
      );
    });
    await act(async () => {
      inFlightRenderer.root
        .findByProps({ testID: "request-catalog-picker-search" })
        .props.onChangeText("cd");
    });
    await fireScheduledTimer(latestScheduledTimer());
    expect(mockSearchCatalogItemsForPicker).toHaveBeenCalledWith("cd", 40);

    const pickerInstance =
      inFlightRenderer.root.findByType(CatalogItemPicker).instance;
    const setStateAfterUnmount = jest.spyOn(pickerInstance, "setState");
    act(() => {
      inFlightRenderer.unmount();
    });
    setStateAfterUnmount.mockClear();
    await act(async () => {
      resolveInFlight([]);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(setStateAfterUnmount).not.toHaveBeenCalled();
    expect(mockScheduledTimers.every((timer) => !timer.active)).toBe(true);
    setStateAfterUnmount.mockRestore();
  });
});
