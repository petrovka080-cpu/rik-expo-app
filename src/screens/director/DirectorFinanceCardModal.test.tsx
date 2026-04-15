import React from "react";
import { InteractionManager, Keyboard, Platform, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import DirectorFinanceCardModal from "./DirectorFinanceCardModal";

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
          testID: "director-finance-modal",
          modalProps: props,
        },
        props.children,
      );
    },
  };
});

jest.mock("../../components/DismissKeyboardView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockDismissKeyboardView(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "director-dismiss-keyboard", ...props }, props.children);
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 12, bottom: 8, left: 0, right: 0 }),
}));

jest.mock("../../ui/TopRightActionBar", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return function MockTopRightActionBar({
    actions,
  }: {
    actions: { key: string; onPress: () => void; ariaLabel?: string }[];
  }) {
    return React.createElement(
      View,
      { testID: "director-top-right-action-bar" },
      actions.map((action) =>
        React.createElement(Pressable, {
          key: action.key,
          testID: `action:${action.key}`,
          accessibilityLabel: action.ariaLabel,
          onPress: action.onPress,
        }),
      ),
    );
  };
});

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  title: "Finance modal",
  periodShort: "01.03 - 30.03",
  loading: false,
  loadingMessage: "Loading PDF",
  showBlockingLoader: true,
  onOpenPeriod: jest.fn(),
  onRefresh: jest.fn(),
  onPdf: jest.fn(),
  onPdfSecondary: jest.fn(),
  pdfPrimaryLabel: "PDF",
  pdfSecondaryLabel: "PDF 2",
  children: <></>,
  overlay: <Text testID="director-overlay">overlay</Text>,
} as const;

describe("DirectorFinanceCardModal", () => {
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
    jest.restoreAllMocks();
  });

  it("keeps close, overlay and backdrop discipline stable", async () => {
    const onClose = jest.fn();
    const dismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
    const task = { cancel: jest.fn() };
    jest.spyOn(InteractionManager, "runAfterInteractions").mockImplementation((callback: () => void) => {
      callback();
      return task as never;
    });

    let now = 1_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<DirectorFinanceCardModal {...baseProps} onClose={onClose} />);
    });

    const modal = renderer.root.findByProps({ testID: "director-finance-modal" });
    expect(modal.props.modalProps.visible).toBe(true);
    expect(modal.props.modalProps.transparent).toBe(true);
    expect(modal.props.modalProps.animationType).toBe("slide");

    expect(renderer.root.findByProps({ testID: "director-overlay" })).toBeTruthy();

    now = 1_800;
    act(() => {
      modal.props.modalProps.onShow();
    });

    const backdrop = renderer.root.findAll(
      (node) => typeof node.props?.onPress === "function" && node.props?.style?.position === "absolute",
    )[0];
    expect(backdrop).toBeTruthy();

    act(() => {
      backdrop.props.onPress();
      renderer.root.findByProps({ testID: "action:close" }).props.onPress();
      modal.props.modalProps.onRequestClose();
    });

    expect(dismissSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(3);

    act(() => {
      renderer.unmount();
    });
    expect(task.cancel).toHaveBeenCalled();
  });
});
