import React from "react";
import { Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import WarehouseSheet from "./WarehouseSheet";

const originalPlatformOs = Platform.OS;

jest.mock("react-native-modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockRNModal(props: Record<string, unknown>) {
    return React.createElement(
      View,
      {
        testID: "warehouse-rn-modal",
        modalProps: props,
      },
      props.children,
    );
  };
});

describe("WarehouseSheet", () => {
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "ios",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("keeps native modal compatibility props stable", async () => {
    const onClose = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <WarehouseSheet visible onClose={onClose} heightPct={0.55}>
          <></>
        </WarehouseSheet>,
      );
    });

    const modal = renderer.root.findByProps({ testID: "warehouse-rn-modal" });
    expect(modal.props.modalProps.isVisible).toBe(true);
    expect(modal.props.modalProps.propagateSwipe).toBe(true);
    expect(modal.props.modalProps.avoidKeyboard).toBe(false);
    expect(modal.props.modalProps.hideModalContentWhileAnimating).toBe(true);

    act(() => {
      modal.props.modalProps.onBackdropPress();
      modal.props.modalProps.onBackButtonPress();
    });

    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      renderer.unmount();
    });
  });
});
