import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text, TextInput } from "react-native";

import { LOGIN_NETWORK_DEGRADED_MESSAGE } from "../auth/signInSafe";
import { RequestTimeoutError } from "../requestTimeoutPolicy";
import LoginScreen from "../../../app/auth/login";

const mockReplace = jest.fn();
const mockSignInWithPassword = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, children);
  },
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock("../supabaseClient", () => ({
  getSessionSafe: jest.fn(),
  isSupabaseEnvValid: true,
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
  },
}));

describe("LoginScreen recovery", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSignInWithPassword.mockReset();
  });

  it("shows a user-facing timeout message instead of the raw token timeout", async () => {
    mockSignInWithPassword.mockRejectedValue(
      new RequestTimeoutError({
        requestClass: "mutation_request",
        timeoutMs: 30000,
        owner: "supabase_client",
        operation: "token",
        elapsedMs: 30000,
        urlPath: "/auth/v1/token",
      }),
    );

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const inputs = renderer!.root.findAllByType(TextInput);
    const button = renderer!.root.find(
      (node) => typeof node.props?.onPress === "function",
    );

    await act(async () => {
      inputs[0]?.props.onChangeText("petrovka080@gmail.com");
      inputs[1]?.props.onChangeText("secret");
    });

    await act(async () => {
      await button.props.onPress();
    });

    const texts = renderer!.root
      .findAllByType(Text)
      .map((node) => String(node.props.children ?? ""));

    expect(texts.join(" ")).toContain(LOGIN_NETWORK_DEGRADED_MESSAGE);
    expect(texts.join(" ")).not.toContain("supabase_client.token request timed out");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
