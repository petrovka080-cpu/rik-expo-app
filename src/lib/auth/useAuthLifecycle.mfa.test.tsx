import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AppState, Platform, Text, type AppStateStatus } from "react-native";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAuthLifecycle, resolveRouteFromAuth } from "./useAuthLifecycle";
import { buildAuthMfaHref } from "../authRouting";
import { AuthAssuranceOverlay } from "../../components/auth/AuthAssuranceOverlay";

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
    act(() => resume("background")); await act(async () => resume("active"));
    expect(auth.assuranceStatus).toBe("unavailable"); expect(auth.authenticatedUserId).toBe("actor-a"); expect(mockReset).not.toHaveBeenCalled();
    let result!: Promise<boolean>; act(() => { result = auth.retryAuthAssurance(); }); await flush(); await expect(result).resolves.toBe(true);
    expect(auth.assuranceStatus).toBe("idle"); expect(auth.authSessionState.status).toBe("authenticated");
  });
  it("fresh resume detects enrollment without an auth event or changed JWT", async () => {
    await mount(); await flush(); mockRead.mockResolvedValue(required);
    act(() => resume("background")); await act(async () => resume("active")); await flush();
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

describe("document activation facts in the existing auth lifecycle", () => {
  let auth: ReturnType<typeof useAuthLifecycle>;
  let renderer: TestRenderer.ReactTestRenderer | null;
  let resume: (state: AppStateStatus) => void;
  let visible: string;
  let focusWithin: boolean;
  let focusThrows: boolean;
  let draftMounts: number;
  let draftUnmounts: number;
  let editDraft: React.Dispatch<React.SetStateAction<string>>;
  let windowEvents: ReturnType<typeof eventTarget>;
  let documentEvents: ReturnType<typeof eventTarget>;
  let oldWindow: PropertyDescriptor | undefined;
  let oldDocument: PropertyDescriptor | undefined;
  let oldPlatform: PropertyDescriptor | undefined;
  let oldAppState: PropertyDescriptor | undefined;
  const removeResume = jest.fn();
  function eventTarget() {
    const listeners = new Map<string, Set<() => void>>();
    return {
      addEventListener: jest.fn((name: string, callback: () => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(callback);
      }),
      removeEventListener: jest.fn((name: string, callback: () => void) => listeners.get(name)?.delete(callback)),
      emit: (name: string) => act(() => listeners.get(name)?.forEach((callback) => callback())),
      count: (name: string) => listeners.get(name)?.size ?? 0,
    };
  }
  function restoreProperty(target: object, name: string, descriptor: PropertyDescriptor | undefined) {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else Reflect.deleteProperty(target, name);
  }
  const Draft = () => {
    const [value, setValue] = React.useState("unsaved fixture"); editDraft = setValue;
    React.useEffect(() => { draftMounts += 1; return () => { draftUnmounts += 1; }; }, []);
    return <Text testID="activation-retained-draft">{value}</Text>;
  };
  const Harness = ({ path = "/pdf-viewer" }: { path?: string }) => {
    auth = useAuthLifecycle({ pathname: path, segments: ["office"], isPdfViewerRoute: path === "/pdf-viewer" });
    return <AuthAssuranceOverlay blocked={auth.assuranceStatus !== "idle" || auth.authSessionState.status !== "authenticated"}
      unavailable={auth.assuranceStatus === "unavailable"} onRetry={auth.retryAuthAssurance} onSignOut={async () => false}>
      <Draft />
    </AuthAssuranceOverlay>;
  };
  const flush = async () => { await act(async () => { await Promise.resolve(); jest.runOnlyPendingTimers(); await Promise.resolve(); }); };
  const mount = async () => { await act(async () => { renderer = TestRenderer.create(<Harness />); }); await flush(); };
  const blur = (within: boolean) => { focusWithin = within; windowEvents.emit("blur"); };
  const focus = () => { focusWithin = true; windowEvents.emit("focus"); };
  const visibility = (value: string) => { visible = value; documentEvents.emit("visibilitychange"); };
  const app = (state: AppStateStatus) => act(() => resume(state));
  const overlayVisible = () => renderer!.root.findAllByProps({ testID: "auth-assurance-overlay" }).length > 0;
  const retainedDisplay = () => {
    const style = renderer!.root.findAllByProps({ testID: "auth-assurance-retained-content" })[0].props.style;
    return style.display;
  };
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks(); renderer = null;
    mockRead.mockReset().mockResolvedValue(ready);
    mockGetSession.mockReset().mockResolvedValue({ session: session(), degraded: false });
    mockHint.mockReset().mockResolvedValue({ hasStoredSession: false, degraded: false });
    mockReset.mockResolvedValue(undefined); mockWarm.mockResolvedValue(undefined);
    visible = "visible"; focusWithin = true; focusThrows = false; draftMounts = 0; draftUnmounts = 0;
    windowEvents = eventTarget(); documentEvents = eventTarget();
    oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    oldPlatform = Object.getOwnPropertyDescriptor(Platform, "OS");
    oldAppState = Object.getOwnPropertyDescriptor(AppState, "currentState");
    Object.defineProperty(globalThis, "window", { configurable: true, value: windowEvents });
    Object.defineProperty(globalThis, "document", { configurable: true, value: {
      get visibilityState() { return visible; },
      hasFocus: () => { if (focusThrows) throw new Error("focus state unavailable"); return focusWithin; },
      addEventListener: documentEvents.addEventListener, removeEventListener: documentEvents.removeEventListener,
    } });
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_name, callback) => { resume = callback; return { remove: removeResume }; });
  });
  afterEach(() => {
    if (renderer) act(() => renderer!.unmount());
    jest.restoreAllMocks();
    restoreProperty(globalThis, "window", oldWindow); restoreProperty(globalThis, "document", oldDocument);
    restoreProperty(Platform, "OS", oldPlatform); restoreProperty(AppState, "currentState", oldAppState);
    jest.useRealTimers();
  });

  it.each(["/pdf-viewer", "/office"])("keeps a confirmed iframe/parent focus transfer internal on %s", async (path) => {
    await mount(); act(() => renderer!.update(<Harness path={path} />));
    act(() => editDraft("locally edited"));
    // Browser event facts: iframe and parent share one still-focused document.
    blur(true); focus(); blur(true); focus(); await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(1); expect(mockRead).toHaveBeenCalledTimes(1);
    expect(auth.assuranceStatus).toBe("idle"); expect(overlayVisible()).toBe(false); expect(retainedDisplay()).toBe("flex");
    expect(renderer!.root.findAllByProps({ testID: "activation-retained-draft" })[0].props.children).toBe("locally edited");
    expect(draftMounts).toBe(1); expect(draftUnmounts).toBe(0); expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });
  it("blocks a real window return immediately and detects new enrollment with the same JWT", async () => {
    await mount(); mockRead.mockResolvedValue(required); act(() => editDraft("durable local edit"));
    blur(false); focus();
    expect(auth.assuranceStatus).toBe("checking"); expect(overlayVisible()).toBe(true); expect(retainedDisplay()).toBe("none");
    await flush(); expect(mockRead).toHaveBeenCalledTimes(2); expect(mockRead).toHaveBeenLastCalledWith("token-a");
    expect(auth.authSessionState.status).toBe("mfa_required"); expect(retainedDisplay()).toBe("none");
    expect(draftMounts).toBe(1); expect(draftUnmounts).toBe(0); expect(mockReset).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ testID: "activation-retained-draft" })[0].props.children).toBe("durable local edit");
  });
  it.each(["app-first", "focus-first"])("coalesces visibility/AppState/window return signals once (%s)", async (order) => {
    await mount(); focusWithin = false; visibility("hidden"); app("background");
    visible = "visible"; focusWithin = true;
    if (order === "app-first") { app("active"); visibility("visible"); focus(); }
    else { focus(); app("active"); visibility("visible"); }
    await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(2); expect(mockRead).toHaveBeenCalledTimes(2);
    expect(auth.authSessionState.status).toBe("authenticated");
  });
  it("rechecks an unpaired focus after the AppState-first activation has completed", async () => {
    await mount(); focusWithin = false; visibility("hidden"); app("background");
    visible = "visible"; focusWithin = true; app("active"); await flush();
    expect(mockRead).toHaveBeenCalledTimes(2); expect(auth.assuranceStatus).toBe("idle");
    // No corresponding focus was delivered during that completed activation.
    mockRead.mockResolvedValue(required); focus(); await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(3); expect(mockRead).toHaveBeenCalledTimes(3);
    expect(auth.authSessionState.status).toBe("mfa_required");
  });
  it("an older completed resume cannot clear the duplicate flag of a newer in-flight activation", async () => {
    await mount(); const old = deferred<{ session: Session; degraded: boolean }>();
    mockGetSession.mockReturnValueOnce(old.promise);
    focusWithin = false; visibility("hidden"); app("background");
    visible = "visible"; focusWithin = true; app("active");
    const current = deferred<typeof ready>(); mockRead.mockReturnValueOnce(current.promise);
    focusWithin = false; visibility("hidden"); app("background");
    visible = "visible"; focusWithin = true; app("active"); await flush();
    await act(async () => old.resolve({ session: session(), degraded: false }));
    focus(); await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(3); expect(mockRead).toHaveBeenCalledTimes(2);
    expect(auth.assuranceStatus).toBe("checking");
    await act(async () => current.resolve(ready)); expect(auth.assuranceStatus).toBe("idle");
  });
  it("a hidden document revokes a previously observed internal-focus pair", async () => {
    await mount(); blur(true); focusWithin = false; visibility("hidden"); app("background");
    mockRead.mockResolvedValue(required); visible = "visible"; focus(); app("active"); await flush();
    expect(mockRead).toHaveBeenCalledTimes(2); expect(auth.authSessionState.status).toBe("mfa_required");
  });
  it("waits for document focus when visibility and AppState return before the window", async () => {
    await mount(); focusWithin = false; visibility("hidden"); app("background");
    visibility("visible"); app("active");
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    focus(); await flush(); expect(mockGetSession).toHaveBeenCalledTimes(2); expect(mockRead).toHaveBeenCalledTimes(2);
  });
  it("coalesces an internal pair while an actual return's provider check is still in flight", async () => {
    await mount(); const pending = deferred<typeof ready>(); mockRead.mockReturnValue(pending.promise);
    blur(false); focus(); await flush(); expect(auth.assuranceStatus).toBe("checking");
    blur(true); focus(); await flush(); expect(mockGetSession).toHaveBeenCalledTimes(2); expect(mockRead).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(ready)); expect(auth.assuranceStatus).toBe("idle");
  });
  it("rechecks an unpaired focus rather than assuming that a departure event was observed", async () => {
    await mount(); mockRead.mockResolvedValue(required); focus(); await flush();
    expect(mockRead).toHaveBeenCalledTimes(2); expect(auth.authSessionState.status).toBe("mfa_required");
  });
  it.each(["unknown visibility", "unavailable focus", "contradictory focus"])("fails closed on %s facts", async (kind) => {
    await mount(); mockGetSession.mockResolvedValue({ session: null, degraded: true });
    if (kind === "unknown visibility") visible = "unknown";
    if (kind === "unavailable focus") focusThrows = true;
    if (kind === "contradictory focus") focusWithin = false;
    windowEvents.emit("focus"); await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(2); expect(auth.assuranceStatus).toBe("unavailable");
    expect(retainedDisplay()).toBe("none"); expect(draftMounts).toBe(1); expect(draftUnmounts).toBe(0);
    expect(mockReset).not.toHaveBeenCalled();
  });
  it("rechecks a later genuine return after degraded or MFA-required results", async () => {
    await mount(); mockGetSession.mockResolvedValueOnce({ session: null, degraded: true });
    blur(false); focus(); await flush(); expect(auth.assuranceStatus).toBe("unavailable");
    mockRead.mockResolvedValue(required); blur(false); focus(); await flush();
    expect(auth.authSessionState.status).toBe("mfa_required"); expect(retainedDisplay()).toBe("none");
    mockRead.mockResolvedValue(satisfied); blur(false); focus(); await flush();
    expect(auth.authSessionState.status).toBe("authenticated"); expect(retainedDisplay()).toBe("flex");
    expect(mockGetSession).toHaveBeenCalledTimes(4); expect(draftMounts).toBe(1); expect(mockReset).not.toHaveBeenCalled();
  });
  it("keeps token changes authoritative even during an internal document focus transfer", async () => {
    await mount(); mockRead.mockResolvedValue(required); blur(true);
    act(() => mockAuthEvent("TOKEN_REFRESHED", session("actor-a", "token-b"))); focus(); await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(1); expect(mockRead).toHaveBeenCalledTimes(2);
    expect(mockRead).toHaveBeenLastCalledWith("token-b"); expect(auth.authSessionState.status).toBe("mfa_required");
  });
  it("cannot settle an older resume read over a newer principal", async () => {
    await mount(); const old = deferred<{ session: Session; degraded: boolean }>(); mockGetSession.mockReturnValueOnce(old.promise);
    blur(false); focus(); act(() => mockAuthEvent("SIGNED_IN", session("actor-b", "token-b"))); await flush();
    await act(async () => old.resolve({ session: session(), degraded: false })); await flush();
    expect(auth.authenticatedUserId).toBe("actor-b"); expect(mockRead).toHaveBeenLastCalledWith("token-b");
    expect(mockRead).toHaveBeenCalledTimes(2);
  });
  it("does not let a stale provider reply reopen access after terminal sign-out", async () => {
    await mount(); const old = deferred<typeof ready>(); mockRead.mockReturnValueOnce(old.promise);
    blur(false); focus(); await flush(); act(() => mockAuthEvent("SIGNED_OUT", null));
    await act(async () => old.resolve(ready));
    expect(auth.authSessionState.status).toBe("unauthenticated"); expect(auth.authenticatedUserId).toBeNull();
    expect(retainedDisplay()).toBe("none"); expect(mockReset).toHaveBeenCalledWith("terminal_sign_out");
  });
  it("a second actual departure owns a newer check instead of reusing an in-flight activation", async () => {
    await mount(); const old = deferred<{ session: Session; degraded: boolean }>(); mockGetSession.mockReturnValueOnce(old.promise);
    blur(false); focus(); mockRead.mockResolvedValue(required); blur(false); focus(); await flush();
    await act(async () => old.resolve({ session: session(), degraded: false })); await flush();
    expect(mockGetSession).toHaveBeenCalledTimes(3); expect(mockRead).toHaveBeenCalledTimes(2);
    expect(auth.authSessionState.status).toBe("mfa_required");
  });
  it("keeps one resume effect across route changes and removes every listener on unmount", async () => {
    await mount(); act(() => renderer!.update(<Harness path="/office" />));
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1); expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(windowEvents.count("blur")).toBe(1); expect(windowEvents.count("focus")).toBe(1); expect(documentEvents.count("visibilitychange")).toBe(1);
    act(() => renderer!.unmount()); renderer = null;
    expect(windowEvents.count("blur")).toBe(0); expect(windowEvents.count("focus")).toBe(0); expect(documentEvents.count("visibilitychange")).toBe(0);
    expect(removeResume).toHaveBeenCalledTimes(1); expect(mockUnsubscribe).toHaveBeenCalledTimes(1); expect(draftUnmounts).toBe(1);
  });
  it("native background/active is one activation even with duplicate active notifications", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    await mount(); mockRead.mockResolvedValue(required); app("background"); app("active"); app("active"); await flush();
    expect(mockRead).toHaveBeenCalledTimes(2); expect(auth.authSessionState.status).toBe("mfa_required");
    expect(windowEvents.count("focus")).toBe(0); expect(documentEvents.count("visibilitychange")).toBe(0);
  });
  it.each(["web", "android"])("rechecks a first unpaired active notification on %s, then coalesces duplicates", async (platform) => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
    await mount(); mockRead.mockResolvedValue(required); app("active"); app("active"); await flush();
    expect(mockRead).toHaveBeenCalledTimes(2); expect(auth.authSessionState.status).toBe("mfa_required");
  });
  it("an unknown native initial AppState is rechecked on the first active notification", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    Object.defineProperty(AppState, "currentState", { configurable: true, value: null });
    await mount(); mockRead.mockResolvedValue(required); app("active"); await flush();
    expect(mockRead).toHaveBeenCalledTimes(2); expect(auth.authSessionState.status).toBe("mfa_required");
  });
});