import React from "react";
import { Modal, Platform, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import React19SafeModal from "./React19SafeModal";

const originalPlatformOs = Platform.OS;
const mockLegacyNativeModal = jest.fn();

jest.mock("react-native-modal", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const { View } = jest.requireActual("react-native") as typeof import("react-native");
  return function MockRNModal(props: Record<string, unknown>) {
    mockLegacyNativeModal(props);
    return React.createElement(
      View,
      { testID: "legacy-rn-modal" } as any,
      (props as { children?: React.ReactNode }).children ?? null,
    );
  };
});

describe("React19SafeModal native android fallback", () => {
  beforeEach(() => {
    mockLegacyNativeModal.mockReset();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("uses core Modal on android and keeps backdrop/back handlers wired", async () => {
    const onBackdropPress = jest.fn();
    const onBackButtonPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <React19SafeModal
          isVisible
          onBackdropPress={onBackdropPress}
          onBackButtonPress={onBackButtonPress}
          backdropOpacity={0.4}
          style={{ justifyContent: "flex-end" }}
        >
          <Text>Sheet</Text>
        </React19SafeModal>,
      );
    });

    expect(mockLegacyNativeModal).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ testID: "react19-safe-modal-native-root" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "react19-safe-modal-native-content" })).toBeTruthy();

    const backdrop = renderer.root.findByProps({ testID: "react19-safe-modal-native-backdrop" });
    act(() => {
      backdrop.props.onPress();
    });

    expect(onBackdropPress).toHaveBeenCalledTimes(1);

    const modal = renderer.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    expect(onBackButtonPress).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.unmount();
    });
  });

  it("falls back to backdrop close when android back handler is not provided", async () => {
    const onBackdropPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <React19SafeModal isVisible onBackdropPress={onBackdropPress}>
          <Text>Sheet</Text>
        </React19SafeModal>,
      );
    });

    const modal = renderer.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    expect(onBackdropPress).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.unmount();
    });
  });
});
