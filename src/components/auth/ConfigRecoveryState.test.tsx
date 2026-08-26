import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";

import { ConfigRecoveryState } from "./ConfigRecoveryState";

const mockClipboardSetStringAsync = jest.fn();

jest.mock("expo-clipboard", () => ({
  setStringAsync: (...args: unknown[]) => mockClipboardSetStringAsync(...args),
}));

describe("ConfigRecoveryState", () => {
  beforeEach(() => {
    mockClipboardSetStringAsync.mockReset().mockResolvedValue(undefined);
  });

  it("renders bounded Russian recovery copy and never renders an error object", () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConfigRecoveryState
          diagnostic='{"status":"unavailable","reason":"missing_public_url"}'
          onBack={jest.fn()}
          onRetry={jest.fn()}
        />,
      );
    });
    const text = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");

    expect(text).toContain("Сервис авторизации не настроен");
    expect(text).toContain("scripts/dev/startLocalDeveloperReview.ps1");
    expect(text).not.toContain("[object Object]");
    expect(text).not.toMatch(/access_token|refresh_token|service_role/i);
  });

  it("wires retry, back and secret-free diagnostic copy", async () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();
    const diagnostic =
      '{"status":"unavailable","reason":"missing_anon_key","secretsIncluded":false}';
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConfigRecoveryState
          diagnostic={diagnostic}
          onBack={onBack}
          onRetry={onRetry}
        />,
      );
    });

    const byId = (testID: string) => renderer!.root.findByProps({ testID });
    act(() => byId("config-recovery-retry").props.onPress());
    act(() => byId("config-recovery-back").props.onPress());
    await act(async () => {
      byId("config-recovery-copy").props.onPress();
      await Promise.resolve();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockClipboardSetStringAsync).toHaveBeenCalledWith(diagnostic);
  });
});
