import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AppState, type AppStateStatus } from "react-native";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAuthLifecycle, resolveRouteFromAuth } from "./useAuthLifecycle";
import { buildAuthMfaHref } from "../authRouting";

const mockRead = jest.fn();
const mockGetSession = jest.fn();
const mockHint = jest.fn();
const mockWarm = jest.fn();
const mockReset = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn();
let mockAuthEvent: (event: AuthChangeEvent, value: Session | null) => void;
jest.mock("../supabaseClient", () => ({ getSessionSafe: (...args: unknown[]) => mockGetSession(...args), hasPersistedAuthSessionHint: (...args: unknown[]) => mockHint(...args) }));
jest.mock("../sessionRole", () => ({ warmCurrentSessionProfile: (...args: unknown[]) => mockWarm(...args) }));
jest.mock("../session/sessionBoundary", () => ({ resetSessionBoundary: (...args: unknown[]) => mockReset(...args) }));
jest.mock("../observability/platformObservability", () => ({ recordPlatformObservability: jest.fn() }));
jest.mock("./mfaAssurance.auth.transport", () => ({ readMfaAssuranceForSessionToken: (...args: unknown[]) => mockRead(...args) }));
jest.mock("./useAuthLifecycle.auth.transport", () => ({
  hasAuthLifecycleClient: () => true,
  subscribeAuthLifecycleStateChange: (callback: typeof mockAuthEvent) => { mockAuthEvent = callback; mockSubscribe(); return { data: { subscription: { unsubscribe: mockUnsubscribe } } }; },
}));
const ready = { status: "not_required", currentLevel: "aal1", nextLevel: "aal1" };
const required = { status: "challenge_required", currentLevel: "aal1", nextLevel: "aal2" };
const satisfied = { status: "satisfied", currentLevel: "aal2", nextLevel: "aal2" };
const session = (id = "actor-a", token = "token-a"): Session => ({ access_token: token, refresh_token: "fixture", expires_in: 3600, token_type: "bearer", user: { id, app_metadata: { role: "consumer" }, user_metadata: {}, aud: "authenticated", created_at: "2026-10-29T00:00:00Z" } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { resolve, promise }; }

describe("MFA integrated into the existing single auth lifecycle", () => {
  let auth: ReturnType<typeof useAuthLifecycle>;
  let renderer: TestRenderer.ReactTestRenderer;
  let resume: (state: AppStateStatus) => void;
  const removeResume = jest.fn();
  const Harness = ({ path = "/office" }: { path?: string }) => { auth = useAuthLifecycle({ pathname: path, segments: ["office"], isPdfViewerRoute: false }); return null; };
  const flush = async () => { await act(async () => { await Promise.resolve(); jest.runOnlyPendingTimers(); await Promise.resolve(); }); };
  const mount = async () => { await act(async () => { renderer = TestRenderer.create(<Harness />); }); };
  const emit = (event: AuthChangeEvent, value: Session | null) => { act(() => mockAuthEvent(event, value)); };
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks();
    mockRead.mockReset().mockResolvedValue(ready);
    mockGetSession.mockReset().mockResolvedValue({ session: session(), degraded: false });
    mockHint.mockReset().mockResolvedValue({ hasStoredSession: false, degraded: false });
    mockReset.mockResolvedValue(undefined); mockWarm.mockResolvedValue(undefined);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_name, callback) => { resume = callback; return { remove: removeResume }; });
  });
  afterEach(() => { if (renderer!) act(() => renderer.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

  it("does not authenticate or warm private profile before provider-fresh bootstrap assurance", async () => {
    const remote = deferred<typeof ready>(); mockRead.mockReturnValue(remote.promise);
    await mount(); await flush();
    expect(auth.authSessionState.status).toBe("unknown"); expect(auth.assuranceStatus).toBe("checking"); expect(mockWarm).not.toHaveBeenCalled();
    await act(async () => remote.resolve(required));
    expect(auth.authSessionState.status).toBe("mfa_required"); expect(auth.hasSession).toBe(true); expect(auth.authenticatedRole).toBeNull(); expect(mockWarm).not.toHaveBeenCalled();
  });
  it("accepts non-enrolled bootstrap through the same gate", async () => {
    await mount(); await flush(); expect(auth.authSessionState.status).toBe("authenticated"); expect(mockRead).toHaveBeenCalledWith("token-a"); expect(mockWarm).toHaveBeenCalledTimes(1);
  });
  it("checks rotated same-principal tokens again without repeating profile warming", async () => {
    await mount(); await flush(); mockRead.mockResolvedValue(required);
    emit("TOKEN_REFRESHED", session("actor-a", "token-b")); expect(mockRead).toHaveBeenCalledTimes(1);
    await flush(); expect(mockRead).toHaveBeenLastCalledWith("token-b"); expect(auth.authSessionState.status).toBe("mfa_required"); expect(mockWarm).toHaveBeenCalledTimes(1);
  });
  it("allows a verified AAL2 event to complete MFA and warm the profile once", async () => {
    mockRead.mockResolvedValue(required); await mount(); await flush(); mockRead.mockResolvedValue(satisfied);
    emit("MFA_CHALLENGE_VERIFIED", session("actor-a", "aal2-token")); await flush();
    expect(auth.authSessionState.status).toBe("authenticated"); expect(mockWarm).toHaveBeenCalledTimes(1); expect(mockReset).not.toHaveBeenCalled();
  });
  it("cannot restore a stale bootstrap actor over a newer signed-in principal", async () => {
    const old = deferred<{ session: Session; degraded: boolean }>(); mockGetSession.mockReturnValue(old.promise);
    await mount(); emit("SIGNED_IN", session("actor-b", "token-b")); await flush();
    await act(async () => old.resolve({ session: session(), degraded: false })); await flush();
    expect(auth.authenticatedUserId).toBe("actor-b"); expect(mockRead).toHaveBeenCalledTimes(1); expect(mockRead).toHaveBeenCalledWith("token-b");
  });
  it("does not let a null INITIAL_SESSION discard the definitive bootstrap read", async () => {
    const old = deferred<{ session: null; degraded: boolean }>(); mockGetSession.mockReturnValue(old.promise);
    await mount(); emit("INITIAL_SESSION", null); await act(async () => old.resolve({ session: null, degraded: false }));
    expect(auth.authSessionState.status).toBe("unauthenticated"); expect(auth.assuranceStatus).toBe("idle");
  });
  it("terminal sign-out cancels an in-flight assurance result", async () => {
    const remote = deferred<typeof ready>(); mockRead.mockReturnValue(remote.promise);
    await mount(); await flush(); emit("SIGNED_OUT", null); await act(async () => remote.resolve(ready));
    expect(auth.authSessionState.status).toBe("unauthenticated"); expect(auth.authenticatedUserId).toBeNull(); expect(mockWarm).not.toHaveBeenCalled(); expect(mockReset).toHaveBeenCalledWith("terminal_sign_out");
  });
  it("retains the known session and durable state on resume network failure, then recovers", async () => {
    await mount(); await flush(); mockGetSession.mockResolvedValueOnce({ session: null, degraded: true });
    await act(async () => resume("active"));
    expect(auth.assuranceStatus).toBe("unavailable"); expect(auth.authenticatedUserId).toBe("actor-a"); expect(mockReset).not.toHaveBeenCalled();
    let result!: Promise<boolean>; act(() => { result = auth.retryAuthAssurance(); }); await flush(); await expect(result).resolves.toBe(true);
    expect(auth.assuranceStatus).toBe("idle"); expect(auth.authSessionState.status).toBe("authenticated");
  });
  it("fresh resume detects enrollment without an auth event or changed JWT", async () => {
    await mount(); await flush(); mockRead.mockResolvedValue(required);
    await act(async () => resume("active")); await flush();
    expect(auth.authSessionState.status).toBe("mfa_required"); expect(mockRead).toHaveBeenLastCalledWith("token-a");
  });
  it("ignores a retry read that arrives after terminal sign-out", async () => {
    await mount(); await flush(); const remote = deferred<{ session: Session; degraded: boolean }>(); mockGetSession.mockReturnValue(remote.promise);
    let result!: Promise<boolean>; act(() => { result = auth.retryAuthAssurance(); }); emit("SIGNED_OUT", null);
    await act(async () => remote.resolve({ session: session(), degraded: false })); await expect(result).resolves.toBe(false);
    expect(auth.authSessionState.status).toBe("unauthenticated"); expect(mockRead).toHaveBeenCalledTimes(1);
  });
  it("newest retry owns the state even when two session reads finish out of order", async () => {
    await mount(); await flush(); const old = deferred<{ session: Session; degraded: boolean }>(); mockGetSession.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ session: session("actor-b", "token-b"), degraded: false });
    let first!: Promise<boolean>, second!: Promise<boolean>;
    act(() => { first = auth.retryAuthAssurance(); second = auth.retryAuthAssurance(); }); await flush();
    await expect(second).resolves.toBe(true); await act(async () => old.resolve({ session: session(), degraded: false })); await expect(first).resolves.toBe(false); expect(auth.authenticatedUserId).toBe("actor-b");
  });
  it("keeps one auth subscription during route changes and cleans up listeners", async () => {
    await mount(); await flush(); act(() => renderer.update(<Harness path="/request" />));
    expect(mockSubscribe).toHaveBeenCalledTimes(1); act(() => renderer.unmount()); expect(mockUnsubscribe).toHaveBeenCalledTimes(1); expect(removeResume).toHaveBeenCalledTimes(1);
  });
  it("gates all private destinations including PDF but leaves the MFA route mounted", () => {
    const base = { sessionLoaded: true, sessionState: { status: "mfa_required", reason: "mfa_verification_required" } as const, inAuthStack: false, isPdfViewerRoute: true, hasRecentAuthExit: false };
    expect(resolveRouteFromAuth(base)).toEqual({ type: "redirect_mfa", target: "/auth/mfa", reason: "mfa_verification_required" });
    expect(resolveRouteFromAuth({ ...base, inAuthStack: true, isMfaRoute: true }).type).toBe("none");
    expect(buildAuthMfaHref("/office/director?tab=payments")).toEqual({ pathname: "/auth/mfa", params: { returnTo: "/office/director?tab=payments" } });
    for (const target of ["https://evil.invalid", "//evil.invalid", "/auth/mfa", "/%2fauth/mfa"]) expect(buildAuthMfaHref(target)).toBe("/auth/mfa");
  });
});
