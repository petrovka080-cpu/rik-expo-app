import React from "react";
import { Text, TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import LoginScreen from "../../../app/auth/login";
import { POST_AUTH_ENTRY_ROUTE } from "../authRouting";

const mockReplace = jest.fn();
const mockSignInSafe = jest.fn();
const mockGetSessionSafe = jest.fn();

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
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
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
    mockGetSessionSafe.mockReset();
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
});

const POST_AUTH_SESSION_POLL_INTERVAL_MS = 200;
