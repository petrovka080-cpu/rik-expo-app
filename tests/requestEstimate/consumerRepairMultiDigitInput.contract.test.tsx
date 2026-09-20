import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Platform } from "react-native";

import { ConsumerRepairItemRow } from "../../src/features/consumerRepair/ConsumerRepairItemRow";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

describe("consumer estimate multi-digit input", () => {
  it("keeps the local quantity draft until editing finishes", () => {
    const onQuantityChange = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairItemRow
          item={{
            id: "row-1",
            requestDraftId: "draft-1",
            itemType: "material",
            titleRu: "Асфальтобетонная смесь",
            quantity: 10,
            unit: "t",
            unitPrice: null,
            totalPrice: null,
            currency: "KGS",
            source: "ai_suggested",
            editableByConsumer: true,
            createdAt: "2026-09-11T00:00:00.000Z",
          }}
          onDecrease={jest.fn()}
          onIncrease={jest.fn()}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={jest.fn()}
          onRemove={jest.fn()}
        />,
      );
    });

    const input = renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-row-1" });
    expect(input.props.selectTextOnFocus).toBe(Platform.OS !== "web");
    act(() => {
      input.props.onFocus();
      input.props.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 2 } } });
      input.props.onChangeText("1");
      input.props.onChangeText("15");
      input.props.onChangeText("150");
    });
    expect(onQuantityChange).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-row-1" }).props.value)
      .toBe("150");
    expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-row-1" }).props.selection)
      .toEqual({ start: 0, end: 2 });

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-row-1" }).props.onBlur();
    });
    expect(onQuantityChange).toHaveBeenCalledTimes(1);
    expect(onQuantityChange.mock.calls[0]?.[1]).toBe("150");
  });

  it("keeps the local price draft and commits it only once", () => {
    const onUnitPriceChange = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairItemRow
          item={{
            id: "row-2",
            requestDraftId: "draft-1",
            itemType: "material",
            titleRu: "Асфальтобетонная смесь",
            quantity: 10,
            unit: "t",
            unitPrice: 10,
            totalPrice: 100,
            currency: "KGS",
            source: "ai_suggested",
            editableByConsumer: true,
            createdAt: "2026-09-11T00:00:00.000Z",
          }}
          onDecrease={jest.fn()}
          onIncrease={jest.fn()}
          onQuantityChange={jest.fn()}
          onUnitPriceChange={onUnitPriceChange}
          onRemove={jest.fn()}
        />,
      );
    });

    const input = renderer.root.findByProps({ testID: "consumer-repair-item-unit-price-input-row-2" });
    expect(input.props.selectTextOnFocus).toBe(Platform.OS !== "web");
    act(() => {
      input.props.onFocus();
      input.props.onChangeText("1");
      input.props.onChangeText("15");
      input.props.onChangeText("150");
    });
    expect(onUnitPriceChange).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ testID: "consumer-repair-item-unit-price-input-row-2" }).props.value)
      .toBe("150");

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-item-unit-price-input-row-2" }).props.onSubmitEditing();
      renderer.root.findByProps({ testID: "consumer-repair-item-unit-price-input-row-2" }).props.onBlur();
    });
    expect(onUnitPriceChange).toHaveBeenCalledTimes(1);
    expect(onUnitPriceChange).toHaveBeenCalledWith("row-2", "150");
  });

  it("preserves selection and one raw price commit across replace, clear, comma, cursor and paste-shaped changes", () => {
    const onUnitPriceChange = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairItemRow
          item={{
            id: "row-selection",
            requestDraftId: "draft-1",
            itemType: "material",
            titleRu: "Asphalt mix",
            quantity: 1,
            unit: "t",
            unitPrice: 50,
            totalPrice: 50,
            currency: "KGS",
            source: "ai_suggested",
            editableByConsumer: true,
            createdAt: "2026-09-11T00:00:00.000Z",
          }}
          onDecrease={jest.fn()}
          onIncrease={jest.fn()}
          onQuantityChange={jest.fn()}
          onUnitPriceChange={onUnitPriceChange}
          onRemove={jest.fn()}
        />,
      );
    });

    const getInput = () => renderer.root.findByProps({
      testID: "consumer-repair-item-unit-price-input-row-selection",
    });
    const inputHost = getInput();
    act(() => {
      inputHost.props.onFocus();
      inputHost.props.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 2 } } });
      inputHost.props.onChangeText("4");
      inputHost.props.onChangeText("40");
    });
    expect(getInput()).toBe(inputHost);
    expect(getInput().props.value).toBe("40");

    act(() => {
      getInput().props.onSelectionChange({ nativeEvent: { selection: { start: 1, end: 1 } } });
      getInput().props.onChangeText("4,0");
      getInput().props.onChangeText("");
      getInput().props.onChangeText("5");
      getInput().props.onChangeText("55");
      getInput().props.onChangeText("55,25");
    });
    expect(getInput().props.selection).toEqual({ start: 1, end: 1 });
    expect(getInput().props.value).toBe("55,25");
    expect(onUnitPriceChange).not.toHaveBeenCalled();

    act(() => {
      getInput().props.onSubmitEditing();
      getInput().props.onBlur();
    });
    expect(onUnitPriceChange).toHaveBeenCalledTimes(1);
    expect(onUnitPriceChange).toHaveBeenCalledWith("row-selection", "55,25");
  });

  it("does not let an older quantity response overwrite a newer committed raw buffer", () => {
    const onQuantityChange = jest.fn();
    const item = {
      id: "row-late",
      requestDraftId: "draft-1",
      itemType: "material" as const,
      titleRu: "Asphalt mix",
      quantity: 10,
      unit: "t",
      unitPrice: null,
      totalPrice: null,
      currency: "KGS",
      source: "ai_suggested" as const,
      editableByConsumer: true,
      createdAt: "2026-09-11T00:00:00.000Z",
    };
    const renderRow = (quantity: number) => (
      <ConsumerRepairItemRow
        item={{ ...item, quantity }}
        onDecrease={jest.fn()}
        onIncrease={jest.fn()}
        onQuantityChange={onQuantityChange}
        onUnitPriceChange={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(renderRow(10)); });
    const getInput = () => renderer.root.findByProps({
      testID: "consumer-repair-item-quantity-input-row-late",
    });

    act(() => {
      getInput().props.onFocus();
      getInput().props.onChangeText("5");
      getInput().props.onChangeText("55");
    });
    act(() => {
      getInput().props.onBlur();
    });
    expect(onQuantityChange).toHaveBeenCalledTimes(1);

    act(() => renderer.update(renderRow(15)));
    expect(getInput().props.value).toBe("55");

    act(() => renderer.update(renderRow(55)));
    expect(getInput().props.value).toBe("55");
    act(() => renderer.update(renderRow(60)));
    expect(getInput().props.value).toBe("60");
  });
});
