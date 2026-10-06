import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useAndroidPdfReturnRecovery } from "./useAndroidPdfReturnRecovery";
import { publishMountedAndroidPdfCaller } from "./androidPdfCallerReadiness";

const mockReadPending = jest.fn();
const mockClearPending = jest.fn();
const mockHydrate = jest.fn();
const mockFindBundle = jest.fn();
const mockGetSession = jest.fn();
const mockReplace = jest.fn();
let mockOnState: ((state: string) => void) | null = null;
jest.mock("react-native", () => ({ Platform: { OS: "android" }, AppState: {
  addEventListener: (_name: string, callback: (state: string) => void) => {
    mockOnState = callback; return { remove: () => { mockOnState = null; } };
  },
} }));
jest.mock("expo-router", () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));
jest.mock("./androidPdfHandoff", () => ({
  readPendingAndroidPdfReturn: () => mockReadPending(),
  clearPendingAndroidPdfReturn: (nonce: string) => mockClearPending(nonce),
}));
jest.mock("../documents/pdfDocumentSessions", () => ({ getDocumentSession: (id: string) => mockGetSession(id) }));
jest.mock("../consumerRequests/consumerRequestRepository", () => ({
  hydrateTransactionalConsumerRepairRequestStore: (...args: unknown[]) => mockHydrate(...args),
  findConsumerRepairBundle: (id: string) => mockFindBundle(id),
}));
jest.mock("../observability/platformObservability", () => ({ recordPlatformObservability: jest.fn() }));

const owner = "9adc5ab1-31fa-41be-8a00-17eadbb37c39";
const nonce = "12345678-1234-1234-1234-123456789012";
const draftId = "consumer_draft_cold_return";
const pending = () => JSON.stringify({ version: 1, ownerUserId: owner, nonce, createdAtMs: Date.now() - 100,
  sessionId: "session_cold_return", returnTo: `/request?draftId=${draftId}`, phase: "returned" });
type Props = Parameters<typeof useAndroidPdfReturnRecovery>[0];
function Harness(props: Props) { useAndroidPdfReturnRecovery(props); return null; }
const initial: Props = { ready: true, ownerUserId: owner, terminalSignOut: false, pathname: "/profile", draftId: null };
const flush = async () => {
  // Dynamic repository import and React passive effects cross task boundaries.
  for (let i = 0; i < 4; i += 1) await new Promise<void>(resolve => setImmediate(resolve));
};

describe("Android PDF return authenticated root", () => {
  let renderer: TestRenderer.ReactTestRenderer;
  let unpublish: (() => void) | undefined;
  beforeEach(() => {
    jest.clearAllMocks(); mockOnState = null;
    mockReadPending.mockImplementation(async () => pending());
    mockClearPending.mockResolvedValue(true); mockHydrate.mockResolvedValue(undefined);
    mockGetSession.mockReturnValue(null);
    mockFindBundle.mockReturnValue({ draft: { id: draftId, consumerUserId: owner, status: "draft", deletedAt: null } });
  });
  afterEach(() => { unpublish?.(); unpublish = undefined; if (renderer) act(() => renderer.unmount()); });
  const mount = async (props: Props = initial) => {
    await act(async () => { renderer = TestRenderer.create(<Harness {...props} />); await flush(); });
  };

  it("waits for auth and consumes only after exact route AND mounted caller are observed", async () => {
    await mount({ ...initial, ready: false }); expect(mockReadPending).not.toHaveBeenCalled();
    await act(async () => { renderer.update(<Harness {...initial} />); await flush(); });
    expect(mockHydrate).toHaveBeenCalledWith(draftId, { retryUnrecoveredExact: true });
    expect(mockReplace).toHaveBeenCalledWith(`/request?draftId=${draftId}`);
    expect(mockClearPending).not.toHaveBeenCalled();
    await act(async () => { renderer.update(<Harness {...initial} pathname="/request" draftId={draftId} />); await flush(); });
    expect(mockClearPending).not.toHaveBeenCalled();
    await act(async () => { unpublish = publishMountedAndroidPdfCaller(owner, draftId); await flush(); });
    expect(mockClearPending).toHaveBeenCalledWith(nonce);
  });
  it("keeps the marker when exact durable hydration cannot recover a payload", async () => {
    mockFindBundle.mockReturnValue(null); await mount();
    expect(mockReplace).not.toHaveBeenCalled(); expect(mockClearPending).not.toHaveBeenCalled();
  });
  it("invalidates an old A recovery across A→B→A while hydration is deferred", async () => {
    let finish!: () => void;
    mockHydrate.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    await mount();
    await act(async () => { renderer.update(<Harness {...initial} ready={false} ownerUserId={nonce} />); await flush(); });
    await act(async () => { renderer.update(<Harness {...initial} />); await flush(); });
    // A new recovery may legitimately succeed; the old continuation is invalid.
    mockReadPending.mockResolvedValue(null);
    await act(async () => { finish(); await flush(); });
    expect(mockReplace).not.toHaveBeenCalled(); expect(mockClearPending).not.toHaveBeenCalled();
  });
  it("preserves a live session even if the user has already moved to another workspace", async () => {
    mockGetSession.mockReturnValue({ sessionId: "session_cold_return" });
    await mount({ ...initial, pathname: "/request", draftId: "consumer_draft_newer" });
    expect(mockReplace).not.toHaveBeenCalled(); expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockClearPending).toHaveBeenCalledWith(nonce);
  });
  it("refuses stale navigation if the user moves while exact hydration awaits", async () => {
    let finish!: () => void;
    mockHydrate.mockReturnValue(new Promise<void>(resolve => { finish = resolve; })); await mount();
    await act(async () => { renderer.update(<Harness {...initial} pathname="/request" draftId="consumer_draft_newer" />); await flush(); });
    await act(async () => { finish(); await flush(); });
    expect(mockReplace).not.toHaveBeenCalled(); expect(mockClearPending).not.toHaveBeenCalled();
  });
  it("retries after a foreground event without requiring auth props to change", async () => {
    mockFindBundle.mockReturnValueOnce(null); await mount(); expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { mockOnState?.("active"); await flush(); });
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
  it("terminal sign-out clears only the observed nonce, while unknown auth preserves it", async () => {
    await mount({ ...initial, ready: false }); expect(mockClearPending).not.toHaveBeenCalled();
    await act(async () => { renderer.update(<Harness {...initial} ready={false} terminalSignOut />); await flush(); });
    expect(mockClearPending).toHaveBeenCalledWith(nonce); expect(mockReplace).not.toHaveBeenCalled();
  });
  it("does not let a deferred sign-out read clear the next login's PDF marker", async () => {
    let finish!: (raw: string) => void;
    mockReadPending.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
    await mount({ ...initial, ready: false, ownerUserId: null, terminalSignOut: true });
    mockReadPending.mockResolvedValue(null);
    await act(async () => { renderer.update(<Harness {...initial} />); await flush(); });
    const newNonce = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await act(async () => { finish(pending().replace(nonce, newNonce)); await flush(); });
    expect(mockClearPending).not.toHaveBeenCalled(); expect(mockReplace).not.toHaveBeenCalled();
  });
});
