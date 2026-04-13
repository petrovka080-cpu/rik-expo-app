import React from "react";
import { Text, View } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import DirectorFinanceSpendModal from "./DirectorFinanceSpendModal";
import type { FinSpendSummary } from "./director.finance";

const flashListRenderCalls: Array<{ dataLength: number }> = [];

jest.mock("@/src/ui/FlashList", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReactNative = require("react-native");
  return {
    FlashList: function MockFlashList(props: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
    }) {
      const data = Array.isArray(props.data) ? props.data : [];
      flashListRenderCalls.push({ dataLength: data.length });
      return mockReact.createElement(
        mockReactNative.View,
        { testID: "director-finance-spend-flash-list" },
        props.ListHeaderComponent ?? null,
        data.length
          ? data.map((item, index) =>
              mockReact.createElement(
                mockReactNative.View,
                { key: String(index) },
                props.renderItem ? props.renderItem({ item, index }) : null,
              ),
            )
          : (props.ListEmptyComponent ?? null),
      );
    },
  };
});

const spendBreakdown: FinSpendSummary = {
  header: {
    approved: 300,
    paid: 120,
    toPay: 180,
    overpay: 0,
  },
  kindRows: [
    {
      kind: "Materials",
      approved: 200,
      paid: 80,
      toPay: 120,
      overpay: 0,
      suppliers: [{ supplier: "Supplier A", approved: 200, paid: 80, overpay: 0, count: 2 }],
    },
    {
      kind: "Services",
      approved: 100,
      paid: 40,
      toPay: 60,
      overpay: 0,
      suppliers: [{ supplier: "Supplier B", approved: 100, paid: 40, overpay: 0, count: 1 }],
    },
  ],
  overpaySuppliers: [],
};

const collectText = (value: unknown): string => {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(collectText).join("");
  if (React.isValidElement(value)) return collectText((value.props as { children?: unknown }).children);
  return "";
};

describe("DirectorFinanceSpendModal WAVE 6 list boundary", () => {
  beforeEach(() => {
    flashListRenderCalls.length = 0;
  });

  it("keeps spend kind rows behind a FlashList boundary and opens the same rows on demand", () => {
    const onOpenKind = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <DirectorFinanceSpendModal
          loading={false}
          spendBreakdown={spendBreakdown}
          money={(value) => `${value} KGS`}
          onOpenKind={onOpenKind}
        />,
      );
    });

    expect(renderer!.root.findAllByProps({ testID: "director-finance-spend-flash-list" }).length).toBeGreaterThan(0);
    expect(flashListRenderCalls[flashListRenderCalls.length - 1]).toEqual({ dataLength: 0 });
    expect(renderer!.root.findAllByType(Text).map((node) => collectText(node.props.children))).not.toContain("Materials");

    const toggle = renderer!.root.findAll((node) =>
      typeof node.props.onPress === "function"
      && node.findAllByType(Text).some((textNode) => collectText(textNode.props.children) === "Расходы по видам"),
    )[0];
    expect(toggle).toBeTruthy();
    act(() => {
      toggle?.props.onPress();
    });

    expect(flashListRenderCalls[flashListRenderCalls.length - 1]).toEqual({ dataLength: 2 });
    expect(renderer!.root.findAllByType(Text).map((node) => collectText(node.props.children))).toContain("Materials");

    const materialCard = renderer!.root.findAll((node) => typeof node.props.onPress === "function").find((node) =>
      node.findAllByType(Text).some((textNode) => collectText(textNode.props.children) === "Materials"),
    );
    act(() => {
      materialCard?.props.onPress();
    });

    expect(onOpenKind).toHaveBeenCalledWith("Materials", spendBreakdown.kindRows[0].suppliers);
  });
});
