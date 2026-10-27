import {
  LOGIN_NETWORK_DEGRADED_MESSAGE,
  signInSafe,
} from "./signInSafe";

const mockSignInWithPassword = jest.fn();
const mockRecordPlatformObservability = jest.fn();

jest.mock("./signIn.transport", () => ({
  signInWithEmailPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
}));

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

describe("signInSafe", () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    mockRecordPlatformObservability.mockReset();
  });

  it("keeps auth errors distinct from degraded network failures", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: {
        name: "AuthApiError",
        message: "Invalid login credentials",
      },
    });

    const result = await signInSafe({
      email: "test@example.com",
      password: "wrong",
    });

    expect(result.degraded).toBe(false);
    expect(result.error?.message).toBe("Invalid login credentials");
    expect(result.userMessage).toBe("Invalid login credentials");
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_login",
        event: "login_submit_auth_error",
      }),
    );
  });

  it("classifies timeout-like transport failures as degraded and masks raw infra text", async () => {
    mockSignInWithPassword.mockRejectedValue(
      new Error("supabase_client.token request timed out after 30000ms"),
    );

    const result = await signInSafe({
      email: "test@example.com",
      password: "secret",
    });

    expect(result.degraded).toBe(true);
    expect(result.error).toBeNull();
    expect(result.userMessage).toBe(LOGIN_NETWORK_DEGRADED_MESSAGE);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_login",
        event: "login_submit_degraded_timeout",
        fallbackUsed: true,
      }),
    );
  });

  it("passes through successful sign-in without changing auth semantics", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: "user-1" },
      },
      error: null,
    });

    const result = await signInSafe({
      email: "test@example.com",
      password: "secret",
    });

    expect(result.degraded).toBe(false);
    expect(result.error).toBeNull();
    expect(result.data?.session).toEqual({ access_token: "token" });
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "auth_login",
        event: "login_submit_success",
        result: "success",
      }),
    );
  });

  it("trims surrounding whitespace from email before submitting auth credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: "user-1" },
      },
      error: null,
    });

    await signInSafe({
      email: "  test@example.com  ",
      password: "secret",
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "secret",
    });
  });
});
