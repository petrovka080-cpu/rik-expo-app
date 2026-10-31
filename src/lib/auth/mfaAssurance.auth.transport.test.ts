import { classifyMfaAssuranceLevels, readMfaAssuranceForSessionToken } from "./mfaAssurance.auth.transport";

const mockReadAssurance = jest.fn();
let mockAvailability = "ready";
jest.mock("../supabaseClient", () => ({
  supabaseClientAvailability: {
    get status() { return mockAvailability; },
    client: { auth: { mfa: { getAuthenticatorAssuranceLevel: (jwt: string) => mockReadAssurance(jwt) } } },
  },
}));

describe("provider-checked MFA session assurance", () => {
  beforeEach(() => { mockAvailability = "ready"; mockReadAssurance.mockReset(); });

  it.each<[
    "aal1" | "aal2" | null,
    "aal1" | "aal2" | null,
    "not_required" | "challenge_required" | "satisfied",
  ]>([
    ["aal1", "aal1", "not_required"],
    [null, null, "not_required"],
    ["aal1", "aal2", "challenge_required"],
    [null, "aal2", "challenge_required"],
    ["aal2", "aal2", "satisfied"],
  ])("classifies %s -> %s as %s", (currentLevel, nextLevel, status) => {
    expect(classifyMfaAssuranceLevels({ currentLevel, nextLevel })).toEqual({ status, currentLevel, nextLevel });
  });

  it.each<[{ currentLevel: unknown; nextLevel: unknown }]>([
    [{ currentLevel: undefined, nextLevel: undefined }],
    [{ currentLevel: "aal99", nextLevel: "aal2" }],
    [{ currentLevel: "aal2", nextLevel: "aal1" }],
    [{ currentLevel: "aal1", nextLevel: null }],
    [{ currentLevel: "aal2", nextLevel: null }],
  ])("rejects inconsistent or unknown assurance responses %j", (levels) => {
    expect(() => classifyMfaAssuranceLevels(levels)).toThrow("MFA_ASSURANCE_RESPONSE_INVALID");
  });

  it("passes the exact JWT and rechecks server factors on every call, including unchanged-token enrollment", async () => {
    const jwt = "owned-test-session-token";
    mockReadAssurance
      .mockResolvedValueOnce({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null })
      .mockResolvedValueOnce({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    await expect(readMfaAssuranceForSessionToken(jwt)).resolves.toMatchObject({ status: "not_required" });
    await expect(readMfaAssuranceForSessionToken(jwt)).resolves.toMatchObject({ status: "challenge_required" });
    expect(mockReadAssurance.mock.calls).toEqual([[jwt], [jwt]]);
  });

  it.each(["", "   ", " token", "token "])("rejects an absent or noncanonical session token before SDK access", async (token) => {
    await expect(readMfaAssuranceForSessionToken(token)).rejects.toThrow("MFA_SESSION_TOKEN_REQUIRED");
    expect(mockReadAssurance).not.toHaveBeenCalled();
  });

  it("keeps missing configuration distinct from a non-enrolled user", async () => {
    mockAvailability = "unavailable";
    await expect(readMfaAssuranceForSessionToken("token")).rejects.toThrow("MFA_ASSURANCE_UNAVAILABLE");
    expect(mockReadAssurance).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: new Error("provider-message-with-private-token") },
    { data: null, error: null },
  ])("never converts failed provider validation into an allowed session or leaks its message", async (result) => {
    mockReadAssurance.mockResolvedValue(result);
    await expect(readMfaAssuranceForSessionToken("token")).rejects.toThrow(/^MFA_ASSURANCE_UNAVAILABLE$/);
  });

  it("handles transport rejection without exposing the provider error or treating it as no factor", async () => {
    mockReadAssurance.mockRejectedValue(new Error("private-provider-error"));
    await expect(readMfaAssuranceForSessionToken("token")).rejects.toThrow(/^MFA_ASSURANCE_UNAVAILABLE$/);
  });
});
