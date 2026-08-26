import { getCanonicalEstimateRevision } from "./canonicalEstimateClient";

const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();

jest.mock("../../supabaseClient", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
  },
}));

jest.mock("../../requestTimeoutPolicy", () => ({
  fetchWithRequestTimeout: (...args: unknown[]) => mockFetchWithRequestTimeout(...args),
}));

const revisionId = "11111111-1111-4111-8111-111111111111";
const successfulResponse = () => new Response(
  JSON.stringify({ revisionId }),
  { status: 200, headers: { "Content-Type": "application/json" } },
);

describe("canonicalEstimateClient access-token refresh", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockFetchWithRequestTimeout.mockReset();
  });

  it("refreshes a session that is inside the expiry skew before transport", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "near-expiry-token",
          expires_at: Math.floor(Date.now() / 1_000) + 2,
        },
      },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "fresh-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    mockFetchWithRequestTimeout.mockResolvedValue(successfulResponse());

    await expect(getCanonicalEstimateRevision(revisionId)).resolves.toMatchObject({ revisionId });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer fresh-token" }),
    });
  });

  it("refreshes and retries exactly once after the backend returns 401", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "initial-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "refreshed-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    mockFetchWithRequestTimeout
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "expired" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ))
      .mockResolvedValueOnce(successfulResponse());

    await expect(getCanonicalEstimateRevision(revisionId)).resolves.toMatchObject({ revisionId });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer initial-token" }),
    });
    expect(mockFetchWithRequestTimeout.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer refreshed-token" }),
    });
    expect(mockFetchWithRequestTimeout.mock.calls[1]?.[0]).toBe(
      mockFetchWithRequestTimeout.mock.calls[0]?.[0],
    );
  });

  it("shares one refresh among concurrent near-expiry requests", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "near-expiry-token",
          expires_at: Math.floor(Date.now() / 1_000) + 2,
        },
      },
      error: null,
    });
    let resolveRefresh: ((value: unknown) => void) | null = null;
    mockRefreshSession.mockImplementation(() => new Promise((resolve) => {
      resolveRefresh = resolve;
    }));
    mockFetchWithRequestTimeout.mockImplementation(async () => successfulResponse());

    const first = getCanonicalEstimateRevision(revisionId);
    const second = getCanonicalEstimateRevision(revisionId);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);

    const completeRefresh = resolveRefresh as ((value: unknown) => void) | null;
    if (!completeRefresh) throw new Error("refresh resolver was not installed");
    completeRefresh({
      data: {
        session: {
          access_token: "shared-fresh-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);

    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    for (const call of mockFetchWithRequestTimeout.mock.calls) {
      expect(call[1]).toMatchObject({
        headers: expect.objectContaining({ Authorization: "Bearer shared-fresh-token" }),
      });
    }
  });
});
