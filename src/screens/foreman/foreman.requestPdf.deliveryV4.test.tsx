import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Platform } from "react-native";
import { useForemanPdf } from "./hooks/useForemanPdf";
import { createGeneratedPdfDescriptor } from "../../lib/pdf/pdf.runner";
import { getDocumentSessionSnapshot, clearDocumentSessions } from "../../lib/documents/pdfDocumentSessions";
import { markPdfOpenVisible, resetPdfOpenFlowStateForTests } from "../../lib/pdf/pdfOpenFlow";
import { observeSessionBoundaryPrincipal } from "../../lib/session/sessionBoundary";
const mockBackend = jest.fn(); const mockDescriptor = jest.fn(); const mockPrepare = jest.fn(); const mockPush = jest.fn();
let mockActor = "actor-A";
const mockSubscribers = new Set<(event: string, session: { user: { id: string } } | null) => void>();
jest.mock("../../lib/supabaseClient", () => ({ SUPABASE_URL: "https://fixture.invalid", SUPABASE_ANON_KEY: "fixture-anon", supabase: { auth: {
  getSession: async () => ({ data: { session: { user: { id: mockActor } } }, error: null }),
  onAuthStateChange: (callback: typeof mockSubscribers extends Set<infer T> ? T : never) => { mockSubscribers.add(callback); return { data: { subscription: { unsubscribe: () => mockSubscribers.delete(callback) } } }; },
} } }));
jest.mock("../../lib/api/canonicalPdfBackendInvoker", () => ({ invokeCanonicalPdfBackend: (...args: unknown[]) => mockBackend(...args) }));
jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({ createGeneratedPdfDocument: (...args: unknown[]) => mockDescriptor(...args) }));
jest.mock("../../lib/api/pdf", () => ({ openHtmlAsPdfUniversal: jest.fn() }));
jest.mock("../../lib/pdfRunner", () => ({ preparePdfExecutionSource: (...args: unknown[]) => mockPrepare(...args), openPdfPreview: jest.fn(), openPdfShare: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) }, useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }) }));
jest.mock("../../lib/observability/sentry", () => ({ traceAsync: (_name: unknown, _options: unknown, work: () => Promise<unknown>) => work() }));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { resolve, promise }; }
async function until(check: () => boolean) { for (let i = 0; i < 200 && !check(); i++) await Promise.resolve(); expect(check()).toBe(true); }
function emit(actor: string, event = "SIGNED_IN") { mockActor = actor; observeSessionBoundaryPrincipal(actor); for (const callback of [...mockSubscribers]) callback(event, { user: { id: actor } }); }
let api!: ReturnType<typeof useForemanPdf>; let renderer!: TestRenderer.ReactTestRenderer;
function Harness() { const hook = useForemanPdf({} as never); useEffect(() => { api = hook; }, [hook]); return null; }
const backend = (actor: string) => ({ source: { kind: "remote-url", uri: `https://fixture.invalid/${actor}.pdf` }, bucketId: "fixture", storagePath: actor, signedUrl: `https://fixture.invalid/${actor}.pdf`, fileName: `${actor}.pdf`, mimeType: "application/pdf", version: "v1", generatedAt: "2026-10-30T00:00:00Z", renderer: "artifact_cache", sourceKind: "remote-url", telemetry: null });
beforeEach(async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  mockActor = "actor-A"; observeSessionBoundaryPrincipal(mockActor); clearDocumentSessions(); resetPdfOpenFlowStateForTests();
  mockBackend.mockReset().mockImplementation(async () => backend(mockActor));
  mockDescriptor.mockReset().mockImplementation(async args => createGeneratedPdfDescriptor(args));
  mockPrepare.mockReset().mockImplementation(async args => args.source);
  mockPush.mockReset().mockImplementation(href => { const url = new URL(String(href), "https://fixture.invalid"); markPdfOpenVisible(url.searchParams.get("openToken")); });
  await act(async () => { renderer = TestRenderer.create(<Harness />); });
});
afterEach(() => { act(() => renderer.unmount()); clearDocumentSessions(); });
it.each(["actor-B", "A-B-A"]) ("mounted actual caller+runner rejects %s after backend return during descriptor await", async replacement => {
  const pending = deferred<ReturnType<typeof createGeneratedPdfDescriptor>>();
  mockDescriptor.mockImplementation(args => pending.promise.then(() => createGeneratedPdfDescriptor(args)));
  const syncMeta = jest.fn(); const task = api.runRequestPdf("preview", "saved-legacy", { id: "saved-legacy", company_id: null }, syncMeta);
  await until(() => mockDescriptor.mock.calls.length === 1);
  emit("actor-B"); if (replacement === "A-B-A") emit("actor-A"); pending.resolve(undefined as never);
  await task;
  expect(mockPush).not.toHaveBeenCalled(); expect(syncMeta).not.toHaveBeenCalled();
});
it("cancels actual session delivery after modal-dismiss await", async () => {
  const dismiss = deferred<void>(); const close = jest.fn(() => dismiss.promise);
  const task = api.runRequestPdf("preview", "saved", { id: "saved" }, jest.fn(), close);
  await until(() => close.mock.calls.length === 1); emit("actor-B"); dismiss.resolve(); await task;
  expect(mockPush).not.toHaveBeenCalled();
});
it("late materialization cannot re-register the A session after cleanup", async () => {
  const pending = deferred<{ kind: "remote-url"; uri: string }>(); mockPrepare.mockReturnValue(pending.promise);
  const task = api.runRequestPdf("preview", "saved", { id: "saved" }, jest.fn());
  await until(() => mockPrepare.mock.calls.length === 1);
  const href = new URL(String(mockPush.mock.calls[0][0]), "https://fixture.invalid"); const id = href.searchParams.get("sessionId")!;
  emit("actor-B"); clearDocumentSessions(); pending.resolve({ kind: "remote-url", uri: "https://fixture.invalid/A.pdf" }); await task;
  expect(getDocumentSessionSnapshot(id)).toEqual({ session: null, asset: null });
});
it("B cannot join A's same-request factory; B obtains its own fresh backend response", async () => {
  const pending = deferred<void>(); mockDescriptor.mockImplementationOnce(args => pending.promise.then(() => createGeneratedPdfDescriptor(args)));
  const a = api.runRequestPdf("preview", "same-request", { id: "same-request" }, jest.fn());
  await until(() => mockDescriptor.mock.calls.length === 1); emit("actor-B");
  const b = api.runRequestPdf("preview", "same-request", { id: "same-request" }, jest.fn());
  await b; pending.resolve(); await a;
  expect(mockBackend).toHaveBeenCalledTimes(2); expect(mockPush).toHaveBeenCalledTimes(1);
  const href = new URL(String(mockPush.mock.calls[0][0]), "https://fixture.invalid");
  expect(getDocumentSessionSnapshot(href.searchParams.get("sessionId")!).asset?.uri).toContain("actor-B");
});
it("same-actor token refresh preserves a lawful read-only preliminary/history open", async () => {
  const pending = deferred<void>(); mockDescriptor.mockImplementationOnce(args => pending.promise.then(() => createGeneratedPdfDescriptor(args)));
  const syncMeta = jest.fn(); const task = api.runRequestPdf("preview", "legacy-missing-qty-prices", { id: "legacy-missing-qty-prices", company_id: null }, syncMeta);
  await until(() => mockDescriptor.mock.calls.length === 1); emit("actor-A", "TOKEN_REFRESHED"); pending.resolve(); await task;
  expect(mockPush).toHaveBeenCalledTimes(1); expect(syncMeta).not.toHaveBeenCalled();
});
