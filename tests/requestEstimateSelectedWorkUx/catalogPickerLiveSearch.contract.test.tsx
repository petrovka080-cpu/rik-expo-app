import React from "react";
import TestRenderer, { act } from "react-test-renderer";

const mockSearchCatalogItemsForPicker = jest.fn();

jest.mock("../../src/lib/catalog/catalog.facade", () => ({
  searchCatalogItemsForPicker: (...args: unknown[]) => mockSearchCatalogItemsForPicker(...args),
}));

import { CatalogItemPicker } from "../../src/features/catalog/CatalogItemPicker";

describe("catalog picker live smart search", () => {
  beforeEach(() => {
    jest.useFakeTimers();
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

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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

    await act(async () => {
      jest.advanceTimersByTime(250);
      await Promise.resolve();
      await Promise.resolve();
    });

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
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });
    await act(async () => {
      renderer.root.findByProps({ testID: "request-catalog-picker-search" }).props.onChangeText("арм");
      jest.advanceTimersByTime(250);
      await Promise.resolve();
      await Promise.resolve();
    });
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
});
