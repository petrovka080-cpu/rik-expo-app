import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { HistoryHeader } from "./HistorySection";

jest.mock("../../../ui/TopRightActionBar", () => {
  const ReactMock = require("react");
  const { Text: MockText, View: MockView } = require("react-native");

  return function MockTopRightActionBar(props: { titleLeft?: string }) {
    return ReactMock.createElement(
      MockView,
      { testID: "top-right-action-bar" },
      ReactMock.createElement(MockText, null, props.titleLeft ?? ""),
    );
  };
});

const collectSerializedText = (node: TestRenderer.ReactTestRenderer): string =>
  JSON.stringify(node.toJSON());

describe("HistoryHeader", () => {
  it("renders server-owned history totals without deriving totals from visible rows", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <HistoryHeader
          totalCount={0}
          totalAmount={0}
          totalCurrency="KGS"
          dateFrom=""
          dateTo=""
          searchValue=""
          setSearchValue={jest.fn()}
          onOpenPeriod={jest.fn()}
          onRefresh={jest.fn()}
          ui={{ text: "#fff", sub: "#aaa", cardBg: "#111" }}
        />,
      );
    });

    const renderedText = collectSerializedText(tree!);

    expect(renderedText).toContain("0.00");
    expect(renderedText).toContain("KGS");
    expect(renderedText).not.toContain("999.00");
  });
});
