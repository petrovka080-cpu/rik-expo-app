import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import ReportsHubScreen from "./ReportsHubScreen";
import { REPORTS_MODULE_ROUTES } from "../../lib/navigation/coreRoutes";

const mockPush = jest.fn();
let mockSegments = ["(tabs)", "office", "reports"];

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useSegments: () => mockSegments,
}));

describe("ReportsHubScreen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSegments = ["(tabs)", "office", "reports"];
  });

  it("removes donor hero chrome inside office stack and keeps module routes", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ReportsHubScreen />);
    });

    const textNodes = renderer!.root.findAllByType(Text);
    expect(textNodes.some((node) => node.props.children === "Reports Hub")).toBe(false);
    expect(textNodes.some((node) => node.props.children === "Как это встроено")).toBe(false);

    const pressables = renderer!.root.findAll((node) => typeof node.props.onPress === "function");
    pressables[0].props.onPress();
    pressables[1].props.onPress();

    expect(mockPush.mock.calls).toEqual([
      [REPORTS_MODULE_ROUTES.dashboard],
      [REPORTS_MODULE_ROUTES["ai-assistant"]],
    ]);
  });

  it("keeps a simple title block outside office stack", () => {
    mockSegments = ["(tabs)", "reports"];
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ReportsHubScreen />);
    });

    const textNodes = renderer!.root.findAllByType(Text);
    expect(textNodes.some((node) => node.props.children === "Отчеты")).toBe(true);
  });
});
