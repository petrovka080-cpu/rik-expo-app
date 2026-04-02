import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import Header from "./Header";
import { TABS } from "../types";

let mockSegments = ["(tabs)", "office", "accountant"];

jest.mock("expo-router", () => ({
  useSegments: () => mockSegments,
}));

describe("Accountant Header", () => {
  function renderHeader() {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <Header
          tab={TABS[0]}
          setTab={() => {}}
          unread={1}
          titleSize={22}
          subOpacity={1}
          rowsCount={5}
          onExcel={() => {}}
          onBell={() => {}}
          onTabPress={() => {}}
          accountantFio="Петров П.П."
          onOpenFioModal={() => {}}
        />,
      );
    });

    return renderer!;
  }

  it("uses office chrome without duplicated role title inside office stack", () => {
    const renderer = renderHeader();
    const textNodes = renderer.root.findAllByType(Text);

    expect(textNodes.some((node) => node.props.children === "Бухгалтер")).toBe(false);
    expect(textNodes.some((node) => node.props.children === "Петров П.П.")).toBe(true);
    expect(textNodes.some((node) => node.props.children === TABS[0])).toBe(true);
  });

  it("keeps role title outside office stack", () => {
    mockSegments = ["(tabs)", "accountant"];
    const renderer = renderHeader();
    const textNodes = renderer.root.findAllByType(Text);

    expect(textNodes.some((node) => node.props.children === "Бухгалтер")).toBe(true);

    mockSegments = ["(tabs)", "office", "accountant"];
  });
});
