import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import { AiComposerBar } from "../../src/components/ai/runtime/AiComposerBar";
import { AiScreenRuntimePanel } from "../../src/components/ai/runtime/AiScreenRuntimePanel";
import { AiScreenScrollShell } from "../../src/components/ai/runtime/AiScreenScrollShell";

describe("AI runtime layout safety contract", () => {
  it("renders stable runtime panel IDs with redacted evidence chips", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(
          AiScreenRuntimePanel,
          {
            title: "Screen assistant",
            subtitle: "role scoped",
            status: "ready",
            evidenceRefs: ["screen:buyer.requests", "role:buyer", "policy:safe_read", "extra:hidden"],
          },
          React.createElement(Text, { testID: "ai.screen.runtime.panel.child" }, "body"),
        ),
      );
    });

    const root = renderer!.root;

    expect(root.findByProps({ testID: "ai.screen.runtime.panel" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.screen.runtime.panel.title" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.screen.runtime.status" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.screen.runtime.evidence" })).toBeTruthy();
    expect(root.findAllByType(Text).filter((node) => String(node.props.children).includes("extra:hidden"))).toHaveLength(0);
  });

  it("keeps scroll shell keyboard taps handled and footer/composer stable", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(
          AiScreenScrollShell,
          {
            footer: React.createElement(AiComposerBar, {
              value: "",
              onChangeText: () => undefined,
              onSend: () => undefined,
              loading: false,
            }),
          },
          React.createElement(Text, { testID: "ai.screen.scroll.child" }, "content"),
        ),
      );
    });

    const root = renderer!.root;
    const scroll = root.findByProps({ testID: "ai.screen.scroll" });
    const send = root.findByProps({ testID: "ai.screen.composer.send" });

    expect(root.findByProps({ testID: "ai.screen.scroll.shell" })).toBeTruthy();
    expect(root.findByProps({ testID: "ai.screen.scroll.footer" })).toBeTruthy();
    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    expect(send.props.disabled).toBe(true);
  });
});
