import React from "react";
import { Keyboard, Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import CardModal from "./CardModal";

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
          testID: "accountant-card-modal",
          modalProps: props,
        },
        props.children,
      );
    },
  };
});

jest.mock("../../../components/DismissKeyboardView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockDismissKeyboardView(props: Record<string, unknown>) {
    return React.createElement(
      View,
      {
        testID: "dismiss-keyboard-view",
        ...props,
      },
      props.children,
    );
  };
});

jest.mock("./BottomBar", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockBottomBar(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "accountant-bottom-bar", bottomBarProps: props });
  };
});

jest.mock("../../../ui/TopRightActionBar", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return function MockTopRightActionBar({
    actions,
  }: {
    actions: Array<{ key: string; onPress: () => void; ariaLabel?: string }>;
  }) {
    return React.createElement(
      View,
      { testID: "top-right-action-bar" },
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
  insetsTop: 0,
  insetsBottom: 8,
  kbOpen: false,
  kbdH: 220,
  ui: {
    bg: "#000",
    cardBg: "#111",
    border: "#222",
    text: "#fff",
    sub: "#999",
    btnNeutral: "#333",
  },
  busyKey: null,
  isReadOnlyTab: false,
  canPayUi: true,
  headerSubtitle: "Proposal 1",
  onReturnToBuyer: async () => {},
  onOpenPdf: async () => {},
  onExcel: () => {},
  onPay: async () => {},
  runAction: async (_key: string, fn: () => Promise<void>) => {
    await fn();
  },
  scrollRef: { current: null } as React.RefObject<never>,
  onScroll: () => {},
  scrollEventThrottle: 16,
  contentContainerStyle: {},
  children: <></>,
} as const;

describe("CardModal", () => {
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

  it("keeps close, backdrop and keyboard discipline stable", async () => {
    const onClose = jest.fn();
    const dismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<CardModal {...baseProps} onClose={onClose} />);
    });

    const modal = renderer.root.findByProps({ testID: "accountant-card-modal" });
    expect(modal.props.modalProps.visible).toBe(true);
    expect(modal.props.modalProps.transparent).toBe(true);
    expect(modal.props.modalProps.animationType).toBe("slide");

    const scrollView = renderer.root.findAll((node) => node.props?.keyboardShouldPersistTaps === "handled")[0];
    expect(scrollView.props.keyboardDismissMode).toBe("interactive");

    const bottomBar = renderer.root.findByProps({ testID: "accountant-bottom-bar" });
    expect(bottomBar.props.bottomBarProps.visible).toBe(true);

    const backdrop = renderer.root.findAll((node) => typeof node.props?.onTouchEnd === "function")[0];
    expect(backdrop).toBeTruthy();

    act(() => {
      backdrop.props.onTouchEnd();
      modal.props.modalProps.onRequestClose();
      renderer.root.findByProps({ testID: "action:close" }).props.onPress();
    });

    expect(dismissSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(3);

    act(() => {
      renderer.update(<CardModal {...baseProps} onClose={onClose} kbOpen />);
    });

    const bottomBarWhenKeyboardOpen = renderer.root.findByProps({ testID: "accountant-bottom-bar" });
    expect(bottomBarWhenKeyboardOpen.props.bottomBarProps.visible).toBe(false);

    act(() => {
      renderer.unmount();
    });
  });
});
