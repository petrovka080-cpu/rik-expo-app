import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert, InteractionManager, Linking, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import { useForemanPdf } from "./hooks/useForemanPdf";
import { openPdfShare, clearPdfRunnerSessionState } from "../../lib/pdfRunner";
import { observeSessionBoundaryPrincipal } from "../../lib/session/sessionBoundary";

const mockBackend = jest.fn(); const mockDownload = jest.fn(); const mockNativeAvailable = jest.fn(); const mockNativeShare = jest.fn();
const mockFiles = new Set<string>(); let mockActor = "actor-A";
const mockSubscribers = new Set<(event: string, session: { user: { id: string } }) => void>();
jest.mock("../../lib/supabaseClient", () => ({ SUPABASE_URL: "https://fixture.invalid", SUPABASE_ANON_KEY: "fixture-public", supabase: { auth: {
  getSession: async () => ({ data: { session: { user: { id: mockActor } } }, error: null }),
  onAuthStateChange: (callback: (event: string, session: { user: { id: string } }) => void) => { mockSubscribers.add(callback); return { data: { subscription: { unsubscribe: () => mockSubscribers.delete(callback) } } }; },
} } }));
jest.mock("../../lib/api/canonicalPdfBackendInvoker", () => ({ invokeCanonicalPdfBackend: (...args: unknown[]) => mockBackend(...args) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-file-system/legacy", () => ({ cacheDirectory: "file:///cache/", documentDirectory: "file:///documents/",
  downloadAsync: (...args: unknown[]) => mockDownload(...args),
  getInfoAsync: async (uri: string) => ({ exists: mockFiles.has(uri), size: 1024 }),
  copyAsync: async ({ to }: { to: string }) => { mockFiles.add(to); },
  readAsStringAsync: async () => "JVBERi0xLjcK", // %PDF-1.7; real local validator runs.
}));
// Keep expo-sharing's public JS isAvailableAsync/shareAsync implementations.
// Only the native ExpoSharing module is a controllable effect boundary.
jest.unmock("expo-sharing");
jest.mock("expo-sharing/build/ExpoSharing", () => ({ __esModule: true, default: {
  isAvailableAsync: (...args: unknown[]) => mockNativeAvailable(...args),
  shareAsync: (...args: unknown[]) => mockNativeShare(...args),
} }));
jest.mock("../../lib/api/pdf", () => ({ openHtmlAsPdfUniversal: jest.fn() }));
jest.mock("../../lib/documents/attachmentOpener", () => ({ openAndroidRemotePdfUrl: jest.fn(), openAndroidViewIntent: jest.fn() }));
jest.mock("../../lib/observability/sentry", () => ({ traceAsync: (_name: unknown, _options: unknown, work: () => Promise<unknown>) => work() }));

// The separate mounted lifecycle suite proves that the real subscriber makes
// this central observation synchronously, before delayed assurance settles.
function emit(actor: string) { mockActor = actor; observeSessionBoundaryPrincipal(actor); for (const callback of [...mockSubscribers]) callback("SIGNED_IN", { user: { id: actor } }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function until(check: () => boolean) { for (let i = 0; i < 300 && !check(); i++) await Promise.resolve(); expect(check()).toBe(true); }
let api!: ReturnType<typeof useForemanPdf>; let renderer: TestRenderer.ReactTestRenderer;
function Harness() { api = useForemanPdf({} as never); return null; }
async function share() { return api.runRequestPdf("share", "saved-request", { id: "saved-request", company_id: null }, jest.fn()); }
beforeEach(async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" }); mockActor = "actor-A"; observeSessionBoundaryPrincipal(mockActor); clearPdfRunnerSessionState(); mockFiles.clear();
  mockBackend.mockReset().mockResolvedValue({ source: { kind: "remote-url", uri: "https://fixture.invalid/saved-request.pdf" }, bucketId: "fixture", storagePath: "saved-request", signedUrl: "https://fixture.invalid/saved-request.pdf", fileName: "saved-request.pdf", mimeType: "application/pdf", version: "v1", generatedAt: "2026-10-30T00:00:00Z", renderer: "artifact_cache", sourceKind: "remote-url", telemetry: null });
  mockDownload.mockReset().mockImplementation(async (_uri: string, target: string) => { mockFiles.add(target); return { uri: target, status: 200 }; });
  mockNativeAvailable.mockReset().mockResolvedValue(true); mockNativeShare.mockReset().mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => {}); jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  jest.spyOn(InteractionManager, "runAfterInteractions").mockImplementation(callback => { if (typeof callback === "function") callback(); return { cancel: jest.fn() } as never; });
  await act(async () => { renderer = TestRenderer.create(<Harness />); });
});
afterEach(() => { act(() => renderer.unmount()); jest.restoreAllMocks(); expect(mockSubscribers.size).toBe(0); });

it.each(["android", "ios"])("lawful same-actor %s share traverses real hook/descriptor/runner/actions/Expo wrapper", async platform => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
  await share(); expect(mockDownload).toHaveBeenCalledTimes(1); expect(mockNativeAvailable).toHaveBeenCalledTimes(1);
  expect(mockNativeShare).toHaveBeenCalledWith(expect.stringMatching(/^file:\/\/.+\.pdf$/), expect.objectContaining({ mimeType: "application/pdf", UTI: "com.adobe.pdf" }));
  expect(Alert.alert).not.toHaveBeenCalled();
});

it.each(["android", "ios"])("actual native handoff await rejects %s A→B and A→B→A before share", async platform => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
  for (const returnToA of [false, true]) {
    mockActor = "actor-A"; observeSessionBoundaryPrincipal(mockActor); mockNativeShare.mockClear(); mockNativeAvailable.mockClear(); mockDownload.mockClear();
    const download = deferred<void>();
    mockDownload.mockImplementationOnce(async (_uri: string, target: string) => { await download.promise; mockFiles.add(target); return { uri: target, status: 200 }; });
    const task = share(); await until(() => mockDownload.mock.calls.length === 1);
    emit("actor-B"); if (returnToA) emit("actor-A"); download.resolve(); await task;
    expect(mockNativeShare).not.toHaveBeenCalled(); expect(mockNativeAvailable).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenLastCalledWith("PDF", expect.stringContaining("actor changed"));
  }
});

it.each(["android", "ios"])("actual Expo availability await rejects %s A→B and A→B→A before native effect", async platform => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
  for (const returnToA of [false, true]) {
    mockActor = "actor-A"; observeSessionBoundaryPrincipal(mockActor); mockNativeShare.mockClear(); mockNativeAvailable.mockClear();
    const availability = deferred<boolean>(); mockNativeAvailable.mockReturnValueOnce(availability.promise);
    const task = share(); await until(() => mockNativeAvailable.mock.calls.length === 1);
    emit("actor-B"); if (returnToA) emit("actor-A"); availability.resolve(true); await task;
    expect(mockNativeShare).not.toHaveBeenCalled(); expect(Alert.alert).toHaveBeenLastCalledWith("PDF", expect.stringContaining("actor changed"));
  }
});

it("iOS final interaction wait cannot launch a share after actor replacement", async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  let finish!: () => void;
  (InteractionManager.runAfterInteractions as jest.Mock).mockImplementationOnce((callback: () => void) => { finish = callback; return { cancel: jest.fn() }; });
  const task = share(); await until(() => !!finish); emit("actor-B"); emit("actor-A"); finish(); await task;
  expect(mockNativeShare).not.toHaveBeenCalled(); expect(Alert.alert).toHaveBeenLastCalledWith("PDF", expect.stringContaining("actor changed"));
});

it("legacy already-authorized callers without a descriptor boundary retain the same native share API", async () => {
  mockFiles.add("file:///cache/legacy.pdf"); await openPdfShare("file:///cache/legacy.pdf", "legacy.pdf");
  expect(mockNativeShare).toHaveBeenCalledTimes(1); expect(mockNativeAvailable).toHaveBeenCalledTimes(1);
  // Actual Expo JS wrapper is imported, not replaced with a stub owner.
  expect(typeof Sharing.shareAsync).toBe("function");
  expect(jest.isMockFunction(Sharing.shareAsync)).toBe(false);
});
