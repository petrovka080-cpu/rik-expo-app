import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { AiComposerBar } from "../../src/components/ai/runtime/AiComposerBar";
import { AiSafeKeyboardShell } from "../../src/components/ai/runtime/AiSafeKeyboardShell";

describe("AiSafeKeyboardShell contract", () => {
  it("keeps AI screen content scrollable while the composer remains targetable", () => {
    let sent = 0;
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(
          AiSafeKeyboardShell,
          {
            composer: React.createElement(AiComposerBar, {
              value: "status",
              onChangeText: () => undefined,
              onSend: () => {
                sent += 1;
              },
              loading: false,
            }),
          },
          React.createElement(Text, { testID: "ai.screen.keyboard.content" }, "content"),
        ),
      );
    });

    const root = renderer!.root;
    const scroll = root.findByProps({ testID: "ai.screen.keyboard.scroll" });
    const send = root.findByProps({ testID: "ai.screen.composer.send" });

    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    expect(root.findByProps({ testID: "ai.screen.composer.target" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.screen.composer.input" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.screen.composer.loading" })).toBeTruthy();

    act(() => {
      send.props.onPress();
    });
    expect(sent).toBe(1);
  });

  it("disables send while loading and keeps the loading target visible", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(AiComposerBar, {
          value: "status",
          onChangeText: () => undefined,
          onSend: () => undefined,
          loading: true,
        }),
      );
    });

    const root = renderer!.root;
    const send = root.findByProps({ testID: "ai.screen.composer.send" });

    expect(root.findByProps({ testID: "ai.screen.composer.loading" })).toBeTruthy();
    expect(send.props.disabled).toBe(true);
    expect(send.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });
});
