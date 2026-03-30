import React from "react";
import { Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import PickOptionSheet from "./PickOptionSheet";

const originalPlatformOs = Platform.OS;

jest.mock("react-native-modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockRNModal(props: Record<string, unknown>) {
    return React.createElement(
      View,
      {
        testID: "warehouse-pick-native-modal",
        modalProps: props,
      },
      props.children,
    );
  };
});

jest.mock("../../../ui/FlashList", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({
      data,
      renderItem,
    }: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
    }) =>
      React.createElement(
        View,
        { testID: "warehouse-pick-list" },
        Array.isArray(data)
          ? data.map((item, index) =>
              React.createElement(
                View,
                { key: `row:${index}`, testID: `warehouse-pick-row:${index}` },
                renderItem ? renderItem({ item, index }) : null,
              ),
            )
          : null,
      ),
  };
});

describe("PickOptionSheet", () => {
  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("keeps web modal free from react-native-modal ref warnings and preserves close/pick behavior", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });

    const onClose = jest.fn();
    const onPick = jest.fn();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <PickOptionSheet
          visible
          title="Выбор"
          items={[{ id: "opt-1", label: "Option A" }]}
          filter=""
          onFilterChange={() => {}}
          onPick={onPick}
          onClose={onClose}
        />,
      );
    });

    const backdrop = renderer.root.findByProps({ testID: "react19-safe-modal-backdrop" });
    const row = renderer.root.findByProps({ testID: "warehouse-pick-row:0" });
    const pickButton = row.find((node) => typeof node.props?.onPress === "function");

    act(() => {
      pickButton.props.onPress();
      backdrop.props.onPress();
    });

    expect(onPick).toHaveBeenCalledWith({ id: "opt-1", label: "Option A" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls.flat().join(" ")).not.toContain("TouchableWithoutFeedback");
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("Accessing element.ref");

    warnSpy.mockRestore();
    errorSpy.mockRestore();

    act(() => {
      renderer.unmount();
    });
  });
});
