import React from "react";
import { Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { buyerStyles } from "../buyer.styles";
import { BuyerSheetShell } from "./BuyerSheetShell";

const originalPlatformOs = Platform.OS;

jest.mock("react-native/Libraries/Modal/Modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: function MockModal(props: Record<string, unknown>) {
      return React.createElement(
        View,
        {
          testID: "buyer-shell-modal",
          modalProps: props,
        },
        props.children,
      );
    },
  };
});

describe("BuyerSheetShell", () => {
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

  it("keeps native modal open/close and backdrop contract stable", async () => {
    const onClose = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <BuyerSheetShell isOpen title="Buyer Sheet" onClose={onClose} s={buyerStyles}>
          <>body</>
        </BuyerSheetShell>,
      );
    });

    const modal = renderer.root.findByProps({ testID: "buyer-shell-modal" });
    expect(modal.props.modalProps.visible).toBe(true);
    expect(modal.props.modalProps.transparent).toBe(true);
    expect(modal.props.modalProps.presentationStyle).toBe("overFullScreen");
    expect(modal.props.modalProps.animationType).toBe("slide");

    const backdrop = renderer.root.findAll(
      (node) => typeof node.props?.onPress === "function" && node.props?.style?.position === "absolute",
    )[0];
    expect(backdrop).toBeTruthy();

    act(() => {
      backdrop.props.onPress();
      modal.props.modalProps.onRequestClose();
    });

    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      renderer.unmount();
    });
  });
});
