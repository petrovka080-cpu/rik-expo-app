import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AppState, Platform, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAuthLifecycle } from "./useAuthLifecycle";
import { AuthAssuranceOverlay } from "../../components/auth/AuthAssuranceOverlay";
import { createPdfDocumentDescriptor } from "../documents/pdfDocument";
import { clearDocumentSessions, createInMemoryDocumentPreviewSession, getDocumentSessionSnapshot } from "../documents/pdfDocumentSessions";
import { getSessionBoundaryGeneration, observeSessionBoundaryPrincipal } from "../session/sessionBoundary";
import { withPdfActorBoundary } from "../pdf/withPdfActorBoundary";
import { getPlatformObservabilityEvents, resetPlatformObservabilityEvents } from "../observability/platformObservability";

const mockGetSession = jest.fn(); const mockHint = jest.fn(); const mockLevels = jest.fn(); const mockWarm = jest.fn();
const mockSubscribers = new Set<(event: AuthChangeEvent, session: Session | null) => void>();
const mockUnsubscribe = jest.fn(); let mockSession: Session | null;
const mockAuth = {
  getSession: async () => ({ data: { session: mockSession }, error: null }),
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    mockSubscribers.add(callback); return { data: { subscription: { unsubscribe: () => { mockSubscribers.delete(callback); mockUnsubscribe(); } } } };
  }, mfa: { getAuthenticatorAssuranceLevel: (...args: unknown[]) => mockLevels(...args) },
};
jest.mock("../supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSession(...args), hasPersistedAuthSessionHint: (...args: unknown[]) => mockHint(...args),
  get supabaseClientAvailability() { return { status: "ready", client: { auth: mockAuth } }; },
}));
jest.mock("../sessionRole", () => ({ warmCurrentSessionProfile: (...args: unknown[]) => mockWarm(...args), clearCurrentSessionRoleCache: jest.fn() }));
// External subsystem cleaners are isolated, not the lifecycle, assurance gate,
// subscription transport, generation owner or delivered document-session owner.
jest.mock("../pdf/pdfViewerWebFramePool", () => ({ clearPooledWebPdfFrames: jest.fn() }));
jest.mock("../estimatePdf/generatedPdfViewerFile", () => ({ clearGeneratedPdfViewerSessionCache: jest.fn() }));
jest.mock("../consumerRequests/consumerRequestPdfStorage", () => ({ clearConsumerRepairPdfWebObjectUrls: jest.fn() }));
jest.mock("../pdfRunner", () => ({ clearPdfRunnerSessionState: jest.fn() }));
jest.mock("../realtime/realtime.client", () => ({ clearRealtimeSessionState: jest.fn() }));
jest.mock("../offline/offlineReplayCoordinator", () => ({ resetOfflineReplayCoordinator: jest.fn() }));
jest.mock("../query/queryClient", () => ({ resetQueryCache: jest.fn() }));
jest.mock("../../screens/office/officeHubBootstrapSnapshot", () => ({ clearOfficeHubBootstrapSnapshot: jest.fn() }));
jest.mock("../api/requests", () => ({ clearCachedDraftRequestId: jest.fn() }));
jest.mock("../api/requests.read-capabilities", () => ({ invalidateRequestsReadCapabilitiesCache: jest.fn() }));
jest.mock("../catalog/catalog.request.service", () => ({ clearLocalDraftId: jest.fn() }));

const ready = { data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null };
const required = { data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null };
function session(id: string, token = `token-${id}`): Session { return { access_token: token, refresh_token: "fixture", expires_in: 3600, token_type: "bearer", user: { id, app_metadata: { role: "consumer" }, user_metadata: {}, aud: "authenticated", created_at: "2026-10-30T00:00:00Z" } }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
let auth!: ReturnType<typeof useAuthLifecycle>; let renderer: TestRenderer.ReactTestRenderer | null;
let mounts: number; let unmounts: number; let edit!: React.Dispatch<React.SetStateAction<string>>;
function Draft() { const [value, setValue] = React.useState("private unsaved form"); edit = setValue; React.useEffect(() => { mounts++; return () => { unmounts++; }; }, []); return <Text testID="retained-private-form">{value}</Text>; }
function Harness({ path = "/office" }: { path?: string }) {
  auth = useAuthLifecycle({ pathname: path, segments: path.startsWith("/auth") ? ["auth"] : ["office"], isPdfViewerRoute: false });
  return <AuthAssuranceOverlay blocked={auth.assuranceStatus !== "idle" || auth.authSessionState.status !== "authenticated"} unavailable={auth.assuranceStatus === "unavailable"} onRetry={auth.retryAuthAssurance} onSignOut={async () => false}><Draft /></AuthAssuranceOverlay>;
}
async function flush() { await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); jest.runOnlyPendingTimers(); for (let i = 0; i < 20; i++) await Promise.resolve(); }); }
async function mount(path = "/office") { await act(async () => { renderer = TestRenderer.create(<Harness path={path} />); }); await flush(); }
function emit(value: Session | null, event: AuthChangeEvent = "SIGNED_IN") { mockSession = value; act(() => { for (const callback of [...mockSubscribers]) callback(event, value); }); }
async function delivered() {
  return withPdfActorBoundary(mockAuth, async (_assert, _actor, deliveryBoundary) => {
    const doc = { ...createPdfDocumentDescriptor({ uri: "https://fixture.invalid/saved-A.pdf", title: "Saved history", documentType: "request", originModule: "reports", source: "generated", entityId: "saved-A" }), deliveryBoundary };
    return { ...createInMemoryDocumentPreviewSession(doc), deliveryBoundary };
  });
}
const form = () => renderer!.root.findByProps({ testID: "retained-private-form" }).props.children;
beforeEach(async () => {
  jest.useFakeTimers(); renderer = null; mounts = 0; unmounts = 0; mockSubscribers.clear(); mockUnsubscribe.mockReset();
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove: jest.fn() });
  mockSession = session("actor-A"); mockGetSession.mockReset().mockImplementation(async () => ({ session: mockSession, degraded: false }));
  mockHint.mockReset().mockResolvedValue({ hasStoredSession: false, degraded: false }); mockLevels.mockReset().mockResolvedValue(ready); mockWarm.mockReset().mockResolvedValue(undefined);
  clearDocumentSessions(); observeSessionBoundaryPrincipal(null); resetPlatformObservabilityEvents(); await AsyncStorage.clear();
  await AsyncStorage.setItem("foreman_durable_draft_store_v2", "private-draft-preserve");
});
afterEach(async () => { if (renderer) act(() => renderer!.unmount()); await Promise.resolve(); expect(mockSubscribers.size).toBe(0); jest.restoreAllMocks(); jest.useRealTimers(); });

it("actual no-session native-style bootstrap never reads a nonexistent callback event or falls through bootstrap_error", async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
  mockSession = null;
  await mount("/auth/login");
  expect(auth.authSessionState).toEqual({ status: "unauthenticated", reason: "bootstrap_no_session" });
  expect(auth.sessionLoaded).toBe(true); expect(mockHint).not.toHaveBeenCalled(); expect(mockLevels).not.toHaveBeenCalled();
  expect(getPlatformObservabilityEvents().some(event => event.event === "auth_restore_result" && event.result === "error")).toBe(false);
  expect(await AsyncStorage.getItem("foreman_durable_draft_store_v2")).toBe("private-draft-preserve");
});

it("real subscriber A→B clears already-delivered sessions and fences in-flight work before delayed assurance", async () => {
  await mount(); const old = await delivered(); const before = getSessionBoundaryGeneration(); act(() => edit("locally edited"));
  const pending = deferred<typeof ready>(); mockLevels.mockReturnValueOnce(pending.promise);
  emit(session("actor-B"));
  expect(getSessionBoundaryGeneration()).toBeGreaterThan(before);
  expect(getDocumentSessionSnapshot(old.session.sessionId)).toEqual({ session: null, asset: null });
  expect(() => old.deliveryBoundary.assertActive()).toThrow("actor changed");
  expect(auth.authenticatedUserId).toBeNull(); expect(auth.assuranceStatus).toBe("checking"); expect(mockWarm).toHaveBeenCalledTimes(1);
  await flush(); await act(async () => pending.resolve(ready)); await flush();
  expect(auth.authenticatedUserId).toBe("actor-B"); expect(auth.authSessionState.status).toBe("authenticated");
  expect(mockWarm).toHaveBeenLastCalledWith("root_layout", expect.objectContaining({ id: "actor-B" }));
  expect(form()).toBe("locally edited"); expect(mounts).toBe(1); expect(unmounts).toBe(0);
  expect(await AsyncStorage.getItem("foreman_durable_draft_store_v2")).toBe("private-draft-preserve");
});

it("real A→B→A subscriber events cannot revive old A while assurance completions arrive out of order", async () => {
  await mount(); const old = await delivered();
  const b = deferred<typeof ready>(); const a2 = deferred<typeof ready>();
  mockLevels.mockImplementation((token: string) => token === "token-B-pending" ? b.promise : token === "token-A-new" ? a2.promise : Promise.resolve(ready));
  emit(session("actor-B", "token-B-pending")); await flush();
  emit(session("actor-A", "token-A-new")); await flush();
  expect(() => old.deliveryBoundary.assertActive()).toThrow("actor changed");
  await act(async () => b.resolve(ready)); await flush();
  expect(auth.authenticatedUserId).not.toBe("actor-B"); expect(mockWarm.mock.calls.some(call => call[1]?.id === "actor-B")).toBe(false);
  await act(async () => a2.resolve(ready)); await flush();
  expect(auth.authenticatedUserId).toBe("actor-A"); expect(auth.authSessionState.status).toBe("authenticated");
  expect(getDocumentSessionSnapshot(old.session.sessionId)).toEqual({ session: null, asset: null }); expect(() => old.deliveryBoundary.assertActive()).toThrow("actor changed");
});

it("same-principal token refresh preserves delivered sessions/form, rechecks MFA and avoids duplicate role warming", async () => {
  await mount(); const old = await delivered(); const before = getSessionBoundaryGeneration(); act(() => edit("same-actor local edit"));
  emit(session("actor-A", "rotated-token"), "TOKEN_REFRESHED"); await flush();
  expect(getSessionBoundaryGeneration()).toBe(before); expect(getDocumentSessionSnapshot(old.session.sessionId).session?.status).toBe("ready");
  expect(() => old.deliveryBoundary.assertActive()).not.toThrow(); expect(mockLevels).toHaveBeenLastCalledWith("rotated-token"); expect(mockWarm).toHaveBeenCalledTimes(1);
  mockLevels.mockResolvedValueOnce(required); emit(session("actor-A", "requires-aal2"), "TOKEN_REFRESHED"); await flush();
  expect(auth.authSessionState.status).toBe("mfa_required"); expect(auth.authenticatedRole).toBeNull(); expect(form()).toBe("same-actor local edit"); expect(unmounts).toBe(0);
  expect(await AsyncStorage.getItem("foreman_durable_draft_store_v2")).toBe("private-draft-preserve");
});

it("a late bootstrap cannot replace a subscriber principal; terminal sign-out fences pending assurance", async () => {
  const bootstrap = deferred<{ session: Session; degraded: boolean }>(); mockGetSession.mockReturnValueOnce(bootstrap.promise);
  await mount(); emit(session("actor-B")); await flush(); await act(async () => bootstrap.resolve({ session: session("actor-A"), degraded: false })); await flush();
  expect(auth.authenticatedUserId).toBe("actor-B");
  const old = await delivered(); const pending = deferred<typeof ready>(); mockLevels.mockReturnValueOnce(pending.promise);
  emit(session("actor-B", "fresh-B"), "TOKEN_REFRESHED"); await flush(); emit(null, "SIGNED_OUT");
  expect(() => old.deliveryBoundary.assertActive()).toThrow("actor changed"); expect(getDocumentSessionSnapshot(old.session.sessionId).session).toBeNull();
  await act(async () => pending.resolve(ready)); await flush();
  expect(auth.authSessionState.status).toBe("unauthenticated"); expect(auth.authenticatedUserId).toBeNull();
});
