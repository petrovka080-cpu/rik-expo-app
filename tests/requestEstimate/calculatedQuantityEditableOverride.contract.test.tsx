import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairItemRow } from "../../src/features/consumerRepair/ConsumerRepairItemRow";
import { buildRequestEstimateProfessionalRowEvidence } from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairRequestItem } from "../../src/lib/consumerRequests";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

function calculatedItem(input: Partial<ConsumerRepairRequestItem> = {}): ConsumerRepairRequestItem {
  return {
    id: "row-calculated",
    requestDraftId: "draft-1",
    itemType: "material",
    titleRu: "Песок для основания",
    quantity: 14.25,
    unit: "m3",
    unitLabel: "м³",
    unitPrice: null,
    totalPrice: null,
    currency: "KGS",
    source: "ai_suggested",
    formulaId: "sand_quantity_v1",
    quantityFormula: "route_length * trench_width * bedding_depth",
    sourceParameters: {
      smartEstimateProjectionV2: {
        parameterDependencies: ["route_length", "trench_width", "bedding_depth"],
      },
    },
    editableByConsumer: true,
    createdAt: "2026-10-02T00:00:00.000Z",
    ...input,
  };
}

function row(input: {
  item: ConsumerRepairRequestItem;
  onQuantityChange: jest.Mock;
}): React.ReactElement {
  return (
    <ConsumerRepairItemRow
      item={input.item}
      onDecrease={jest.fn()}
      onIncrease={jest.fn()}
      onQuantityChange={input.onQuantityChange}
      onUnitPriceChange={jest.fn()}
      onRemove={jest.fn()}
    />
  );
}

describe("calculated estimate quantity editable override", () => {
  it("renders a persisted shortage beside the editable order and removes the warning after sufficient supply is reopened", () => {
    const item = calculatedItem({ quantity: 80, unit: "kg", unitLabel: "кг", sourceParameters: {
      canonicalPurchaseBalance: { unitId: "kg", consumed: "105", effectiveOrder: "80",
        consumptionShortage: "20", reserveDeficit: "0", procurementReady: false },
    } });
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(row({ item, onQuantityChange: jest.fn() })); });
    const notice = renderer.root.findByProps({ testID: "consumer-repair-item-purchase-shortage-row-calculated" });
    expect(JSON.stringify(notice.props.children.props.children)).toContain("Закупка не готова");
    expect(JSON.stringify(notice.props.children.props.children)).toContain("20 kg");
    expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-row-calculated" }).props.editable).not.toBe(false);
    act(() => { renderer.update(row({ item: { ...item, quantity: 120, sourceParameters: {
      canonicalPurchaseBalance: { unitId: "kg", consumed: "105", effectiveOrder: "120",
        consumptionShortage: "0", reserveDeficit: "0", procurementReady: true },
    } }, onQuantityChange: jest.fn() })); });
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-item-purchase-shortage-row-calculated" })).toHaveLength(0);
    act(() => renderer.unmount());
  });
  it("prefills the formula result in an editable input and labels that it can be changed", () => {
    const onQuantityChange = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(row({ item: calculatedItem(), onQuantityChange }));
    });

    expect(renderer.root.findByProps({
      testID: "consumer-repair-item-quantity-input-row-calculated",
    }).props.value).toBe("14.25");
    if (renderer.root.findAllByProps({ testID: "consumer-repair-item-quantity-mode-row-calculated" }).length === 0) {
      act(() => renderer.root.findByProps({ testID: "consumer-repair-item-professional-proof-row-calculated" }).props.onPress());
    }
    expect(renderer.root.findByProps({
      testID: "consumer-repair-item-quantity-mode-row-calculated",
    }).props.children).toBe("Рассчитано автоматически: 14.25 м³. Поле можно изменить.");

    act(() => {
      const input = renderer.root.findByProps({
        testID: "consumer-repair-item-quantity-input-row-calculated",
      });
      input.props.onFocus();
      input.props.onChangeText("16");
    });
    act(() => {
      renderer.root.findByProps({
        testID: "consumer-repair-item-quantity-input-row-calculated",
      }).props.onBlur();
    });
    expect(onQuantityChange.mock.calls[0]?.[1]).toBe("16");
  });

  it("shows the formula baseline for a manual override and restores it without blanking the field", () => {
    const onQuantityChange = jest.fn();
    const manualItem = calculatedItem({
      quantity: 18,
      sourceParameters: {
        manualQuantityOverride: true,
        calculatedQuantityBeforeOverride: "14.25",
        smartEstimateProjectionV2: {
          parameterDependencies: ["route_length", "trench_width", "bedding_depth"],
        },
      },
    });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(row({ item: manualItem, onQuantityChange }));
    });

    if (renderer.root.findAllByProps({ testID: "consumer-repair-item-quantity-mode-row-calculated" }).length === 0) {
      act(() => renderer.root.findByProps({ testID: "consumer-repair-item-professional-proof-row-calculated" }).props.onPress());
    }
    expect(renderer.root.findByProps({
      testID: "consumer-repair-item-quantity-mode-row-calculated",
    }).props.children).toBe("Введено вручную. По формуле: 14.25 м³.");

    act(() => {
      renderer.root.findByProps({
        testID: "consumer-repair-item-restore-calculated-row-calculated",
      }).props.onPress();
    });
    expect(onQuantityChange).toHaveBeenCalledWith("row-calculated", "");
    expect(renderer.root.findByProps({
      testID: "consumer-repair-item-quantity-input-row-calculated",
    }).props.value).toBe("14.25");

    act(() => {
      renderer.update(row({
        item: { ...manualItem, quantity: null },
        onQuantityChange,
      }));
    });
    expect(renderer.root.findByProps({
      testID: "consumer-repair-item-quantity-input-row-calculated",
    }).props.value).toBe("14.25");
  });

  it("keeps formula and manual values distinct in the calculation explanation", () => {
    const evidence = buildRequestEstimateProfessionalRowEvidence(calculatedItem({
      quantity: 18,
      sourceParameters: {
        manualQuantityOverride: true,
        calculatedQuantityBeforeOverride: 14.25,
        smartEstimateProjectionV2: {
          parameterDependencies: ["route_length", "trench_width", "bedding_depth"],
        },
      },
    }));

    expect(evidence?.formulaLabel).toContain("Результат формулы: 14,25 м³");
    expect(evidence?.formulaLabel).toContain("Ручное значение: 18 м³");
  });
});
