import React from "react";
import { Text, TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import LoginScreen from "../../../app/auth/login";
import { POST_AUTH_ENTRY_ROUTE } from "../authRouting";

const mockReplace = jest.fn();
const mockSignInSafe = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock("../auth/signInSafe", () => ({
  LOGIN_FALLBACK_ERROR_MESSAGE: "Не удалось войти.",
  signInSafe: (...args: unknown[]) => mockSignInSafe(...args),
}));

jest.mock("../supabaseClient", () => ({
  isSupabaseEnvValid: true,
}));

const findSubmitButton = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root.find(
    (node) =>
      typeof node.props?.onPress === "function" &&
      typeof node.props?.disabled === "boolean",
  );

describe("LoginScreen submit handling", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSignInSafe.mockReset();
  });

  it("shows a controlled network message instead of the raw transport timeout", async () => {
    mockSignInSafe.mockResolvedValue({
      data: null,
      error: null,
      degraded: true,
      userMessage: "Плохое соединение. Попробуйте ещё раз.",
    });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const inputs = renderer!.root.findAllByType(TextInput);
    const button = findSubmitButton(renderer!);

    act(() => {
      inputs[0]?.props.onChangeText("petrovka080@gmail.com");
      inputs[1]?.props.onChangeText("secret");
    });

    await act(async () => {
      await button.props.onPress();
    });

    const textContent = renderer!.root
      .findAllByType(Text)
      .map((node) => String(node.props.children ?? ""))
      .join(" ");

    expect(textContent).toContain("Плохое соединение. Попробуйте ещё раз.");
    expect(textContent).not.toContain(
      "supabase_client.token request timed out after 30000ms",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps normal auth errors visible and distinct from degraded transport failures", async () => {
    mockSignInSafe.mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials" },
      degraded: false,
      userMessage: "Invalid login credentials",
    });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const inputs = renderer!.root.findAllByType(TextInput);
    const button = findSubmitButton(renderer!);

    act(() => {
      inputs[0]?.props.onChangeText("petrovka080@gmail.com");
      inputs[1]?.props.onChangeText("wrong");
    });

    await act(async () => {
      await button.props.onPress();
    });

    const textContent = renderer!.root
      .findAllByType(Text)
      .map((node) => String(node.props.children ?? ""))
      .join(" ");

    expect(textContent).toContain("Invalid login credentials");
    expect(textContent).not.toContain("Плохое соединение. Попробуйте ещё раз.");
  });

  it("blocks double-submit while the current login request is still in flight", async () => {
    let resolveSignIn: ((value: unknown) => void) | null = null;
    mockSignInSafe.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const inputs = renderer!.root.findAllByType(TextInput);

    act(() => {
      inputs[0]?.props.onChangeText("petrovka080@gmail.com");
      inputs[1]?.props.onChangeText("secret");
    });

    await act(async () => {
      void findSubmitButton(renderer!).props.onPress();
      await Promise.resolve();
    });

    expect(findSubmitButton(renderer!).props.disabled).toBe(true);

    await act(async () => {
      await findSubmitButton(renderer!).props.onPress();
    });

    expect(mockSignInSafe).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignIn?.({
        data: {
          session: { access_token: "token" },
        },
        error: null,
        degraded: false,
        userMessage: null,
      });
      await Promise.resolve();
    });

    expect(findSubmitButton(renderer!).props.disabled).toBe(false);
  });

  it("routes on success and clears the loading state in the normal path", async () => {
    mockSignInSafe.mockResolvedValue({
      data: {
        session: { access_token: "token" },
      },
      error: null,
      degraded: false,
      userMessage: null,
    });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const inputs = renderer!.root.findAllByType(TextInput);
    const button = findSubmitButton(renderer!);

    act(() => {
      inputs[0]?.props.onChangeText("petrovka080@gmail.com");
      inputs[1]?.props.onChangeText("secret");
    });

    await act(async () => {
      await button.props.onPress();
    });

    expect(mockReplace).toHaveBeenCalledWith(POST_AUTH_ENTRY_ROUTE);
    expect(findSubmitButton(renderer!).props.disabled).toBe(false);
  });
});
