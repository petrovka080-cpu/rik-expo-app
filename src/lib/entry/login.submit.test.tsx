import React from "react";
import { Text, TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import LoginScreen from "../../../app/auth/login";
import RegisterScreen from "../../../app/auth/register";
import ResetScreen from "../../../app/auth/reset";
import { POST_AUTH_ENTRY_ROUTE } from "../authRouting";

const mockReplace = jest.fn();
const mockSignInSafe = jest.fn();
const mockGetSessionSafe = jest.fn();
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, props, children);
  },
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock("../auth/signInSafe", () => ({
  LOGIN_FALLBACK_ERROR_MESSAGE: "Не удалось войти.",
  signInSafe: (...args: unknown[]) => mockSignInSafe(...args),
}));

jest.mock("../supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  isSupabaseEnvValid: true,
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: unknown[]) =>
        mockResetPasswordForEmail(...args),
    },
  },
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
    mockGetSessionSafe.mockReset();
    mockSignUp.mockReset();
    mockResetPasswordForEmail.mockReset();
    mockGetSessionSafe.mockResolvedValue({
      session: { user: { id: "user-1" }, access_token: "token" },
      degraded: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it("waits for a readable session before routing after sign-in", async () => {
    jest.useFakeTimers();
    mockSignInSafe.mockResolvedValue({
      data: {
        session: { access_token: "token", user: { id: "user-1" } },
      },
      error: null,
      degraded: false,
      userMessage: null,
    });
    mockGetSessionSafe
      .mockResolvedValueOnce({ session: null, degraded: false })
      .mockResolvedValueOnce({
        session: { user: { id: "user-1" }, access_token: "token" },
        degraded: false,
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

    let submitPromise: Promise<void> | undefined;

    await act(async () => {
      submitPromise = button.props.onPress();
      await Promise.resolve();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockGetSessionSafe).toHaveBeenNthCalledWith(1, {
      caller: "login_post_signin",
    });

    await act(async () => {
      jest.advanceTimersByTime(POST_AUTH_SESSION_POLL_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await submitPromise;
    });

    expect(mockReplace).toHaveBeenCalledWith(POST_AUTH_ENTRY_ROUTE);
    expect(findSubmitButton(renderer!).props.disabled).toBe(false);
  });

  it("shows a controlled message when session persistence does not settle after sign-in", async () => {
    jest.useFakeTimers();
    mockSignInSafe.mockResolvedValue({
      data: {
        session: { access_token: "token", user: { id: "user-1" } },
      },
      error: null,
      degraded: false,
      userMessage: null,
    });
    mockGetSessionSafe.mockResolvedValue({ session: null, degraded: false });

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

    let submitPromise: Promise<void> | undefined;

    await act(async () => {
      submitPromise = button.props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(3_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await submitPromise;
    });

    const textContent = renderer!.root
      .findAllByType(Text)
      .map((node) => String(node.props.children ?? ""))
      .join(" ");

    expect(textContent).toContain("Сессия ещё закрепляется. Попробуйте ещё раз.");
    expect(mockReplace).not.toHaveBeenCalled();
  });
  it("exposes explicit button and link semantics on auth entry routes", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<LoginScreen />);
    });

    const submit = renderer!.root.findByProps({ testID: "auth.login.submit" });
    const registerLink = renderer!.root.find(
      (node) => node.props.href === "/auth/register",
    );
    const resetLink = renderer!.root.find(
      (node) => node.props.href === "/auth/reset",
    );

    expect(submit.props.accessibilityRole).toBe("button");
    expect(registerLink.props.accessibilityRole).toBe("link");
    expect(resetLink.props.accessibilityRole).toBe("link");
  });

  it("keeps register and reset public CTAs accessible without changing auth behavior", () => {
    let registerRenderer: TestRenderer.ReactTestRenderer;
    let resetRenderer: TestRenderer.ReactTestRenderer;

    act(() => {
      registerRenderer = TestRenderer.create(<RegisterScreen />);
      resetRenderer = TestRenderer.create(<ResetScreen />);
    });

    const registerSubmit = registerRenderer!.root.find(
      (node) =>
        node.props.accessibilityRole === "button"
        && typeof node.props.onPress === "function"
        && typeof node.props.disabled === "boolean",
    );
    const registerLoginLink = registerRenderer!.root.find(
      (node) => node.props.href === "/auth/login",
    );
    const resetSubmit = resetRenderer!.root.find(
      (node) =>
        node.props.accessibilityRole === "button"
        && typeof node.props.onPress === "function"
        && typeof node.props.disabled === "boolean",
    );
    const resetLoginLink = resetRenderer!.root.find(
      (node) => node.props.href === "/auth/login",
    );
    const resetRegisterLink = resetRenderer!.root.find(
      (node) => node.props.href === "/auth/register",
    );

    expect(registerSubmit.props.accessibilityRole).toBe("button");
    expect(registerLoginLink.props.accessibilityRole).toBe("link");
    expect(resetSubmit.props.accessibilityRole).toBe("button");
    expect(resetLoginLink.props.accessibilityRole).toBe("link");
    expect(resetRegisterLink.props.accessibilityRole).toBe("link");
  });
});

const POST_AUTH_SESSION_POLL_INTERVAL_MS = 200;
