import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { buyerStyles } from "../buyer.styles";
import { BuyerScreenHeader } from "./BuyerScreenHeader";

let mockSegments = ["(tabs)", "office", "buyer"];

jest.mock("expo-router", () => ({
  useSegments: () => mockSegments,
}));

describe("BuyerScreenHeader", () => {
  function renderHeader() {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <BuyerScreenHeader
          s={buyerStyles}
          tab="inbox"
          setTab={() => {}}
          buyerFio="Иванов И.И."
          onOpenFioModal={() => {}}
          titleSize={22}
          subOpacity={1}
          inboxCount={4}
          pendingCount={2}
          approvedCount={1}
          rejectedCount={0}
          subcontractCount={3}
          scrollTabsToStart={() => {}}
        />,
      );
    });

    return renderer!;
  }

  it("hides duplicated role title inside office stack and keeps scenario tabs", () => {
    const renderer = renderHeader();
    const textNodes = renderer.root.findAllByType(Text);

    expect(textNodes.some((node) => node.props.children === "Снабженец")).toBe(false);
    expect(textNodes.some((node) => node.props.children === "Иванов И.И.")).toBe(true);
    expect(textNodes.some((node) => node.props.children === "Вход")).toBe(true);
    expect(textNodes.some((node) => node.props.children === "Подряды")).toBe(true);
  });

  it("keeps role title on non-office route", () => {
    mockSegments = ["(tabs)", "buyer"];
    const renderer = renderHeader();
    const textNodes = renderer.root.findAllByType(Text);

    expect(textNodes.some((node) => node.props.children === "Снабженец")).toBe(true);

    mockSegments = ["(tabs)", "office", "buyer"];
  });
});
