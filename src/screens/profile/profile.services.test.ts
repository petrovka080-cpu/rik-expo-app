import { RequestTimeoutError } from "../../lib/requestTimeoutPolicy";
import { loadCurrentAuthUser } from "./profile.services";

const mockGetUser = jest.fn();
const mockGetSession = jest.fn();

jest.mock("../../lib/api/profile", () => ({
  getMyRole: jest.fn(),
}));

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

describe("profile.services loadCurrentAuthUser", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetSession.mockReset();
  });

  it("falls back to the persisted session when getUser times out", async () => {
    mockGetUser.mockRejectedValue(
      new RequestTimeoutError({
        requestClass: "lightweight_lookup",
        timeoutMs: 8000,
        owner: "supabase_client",
        operation: "user",
        elapsedMs: 8000,
        urlPath: "/auth/v1/user",
      }),
    );
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "aybek@example.com",
            user_metadata: {},
            app_metadata: {},
          },
        },
      },
      error: null,
    });

    await expect(loadCurrentAuthUser()).resolves.toMatchObject({
      id: "user-1",
      email: "aybek@example.com",
    });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-timeout auth errors", async () => {
    mockGetUser.mockRejectedValue(new Error("auth failed"));

    await expect(loadCurrentAuthUser()).rejects.toThrow("auth failed");
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});
