import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { syncForemanLocalDraftSnapshot, type ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import { buildCompactForemanLocalDraftSnapshotPayload, restoreForemanLocalDraftSnapshotFromPayload } from "./foreman.localDraft.compactPayload";
import { mapRequestRow } from "../../lib/api/requests.parsers";
import { registerRequestCompanyPromptHost } from "../../lib/api/requestCompanyPrompt";
const B = "22222222-2222-2222-2222-222222222222";
const A = "11111111-1111-1111-1111-111111111111";
const mockRpc = jest.fn(); let mockActor = A;
jest.mock("../../lib/supabaseClient", () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mockActor } } }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  rpc: (...args: unknown[]) => mockRpc(...args),
} }));
jest.mock("../../lib/catalog_api", () => ({ clearLocalDraftId: jest.fn(), setLocalDraftId: jest.fn() }));
jest.mock("../../lib/api/requestDraftSync.transport", () => ({
  invokeRequestDraftSyncRpcV2: (...args: unknown[]) => mockRpc("request_sync_draft_v2", ...args),
  createDirectorHandoffBroadcastChannel: () => ({ subscribe: (callback: (status: string) => void) => callback("CHANNEL_ERROR") }),
  setRequestDraftSyncRealtimeAuth: async () => {}, removeDirectorHandoffBroadcastChannel: async () => {}, insertDirectorRequestSubmittedNotification: async () => ({ error: null }),
}));
function local(ownerId: string, submit = false): ForemanLocalDraftSnapshot { return { version: 1, ownerId, requestId: "", companyId: B, displayNo: null, status: "draft", header: { foreman: "F", comment: "", objectType: "", level: "", system: "", zone: "" }, items: [{ local_id: "line", remote_item_id: null, rik_code: "fixture-material", name_human: "Material", qty: 2, price: 17, uom: "pcs", status: "draft", note: null, app_code: null, kind: "material", line_no: 1 }], qtyDrafts: { line: "2" }, pendingDeletes: [], submitRequested: submit, lastError: null, updatedAt: "2026-10-30T00:00:00Z" }; }
let disposeHost: () => void;
beforeEach(async () => { Object.defineProperty(Platform, "OS", { configurable: true, value: "android" }); await AsyncStorage.clear(); mockActor = A; mockRpc.mockReset(); disposeHost = registerRequestCompanyPromptHost({ actorId: A, blocked: false }); });
afterEach(() => disposeHost());
it.each([false, true])("lost first no-ID acknowledgement (submit=%s) replays the exact persisted intent after codec/restart", async submit => {
  const receipts = new Map<string, unknown>(); let effects = 0; let discard = true;
  mockRpc.mockImplementation(async (_name, args) => {
    expect(args.p_creation_intent_id).toBeTruthy();
    let receipt = receipts.get(args.p_creation_intent_id);
    if (!receipt) { effects++; const id = `request-${effects}`; receipt = { document_type: "request_draft_sync", version: "v2", request_payload: { id, company_id: B, status: submit ? "submitted" : "draft" }, items_payload: [{ id: `item-${effects}`, request_id: id, name_human: "Material", rik_code: "fixture-material", qty: 2, price: 17, uom: "pcs" }], submitted: submit, request_created: true }; receipts.set(args.p_creation_intent_id, receipt); }
    if (discard) { discard = false; throw new Error("transport lost after commit"); }
    return { data: { ...(receipt as object), replayed: true }, error: null };
  });
  const original = local("durable-owner", submit);
  await expect(syncForemanLocalDraftSnapshot({ snapshot: original, headerMeta: {} })).rejects.toThrow("transport lost");
  const restarted = restoreForemanLocalDraftSnapshotFromPayload(JSON.parse(JSON.stringify(buildCompactForemanLocalDraftSnapshotPayload(original))))!;
  expect(restarted.companyId).toBe(B); expect(restarted.items[0].price).toBe(17);
  const result = await syncForemanLocalDraftSnapshot({ snapshot: restarted, headerMeta: {} });
  expect(effects).toBe(1); expect(mockRpc.mock.calls[0][1].p_request_id).toBeNull();
  expect(mockRpc.mock.calls[1][1]).toEqual(mockRpc.mock.calls[0][1]);
  if (submit) expect(result.submitted).toMatchObject({ id: "request-1", company_id: B });
  else expect(result.snapshot).toMatchObject({ requestId: "request-1", companyId: B });
  expect(mapRequestRow((receipts.values().next().value as { request_payload: unknown }).request_payload)?.company_id).toBe(B);
  // This unit checks actual caller/codec/transport receipt plumbing. The real
  // SQL fixture separately proves ledger/helper/trigger atomic effects.
});
it("actor replacement cannot resume another actor's persisted no-ID intent", async () => {
  mockRpc.mockRejectedValue(new Error("unknown outcome"));
  await expect(syncForemanLocalDraftSnapshot({ snapshot: local("same-owner"), headerMeta: {} })).rejects.toThrow();
  mockRpc.mockClear(); mockActor = "33333333-3333-3333-3333-333333333333";
  await expect(syncForemanLocalDraftSnapshot({ snapshot: local("same-owner"), headerMeta: {} })).rejects.toThrow("ACTOR_CONFLICT");
  expect(mockRpc).not.toHaveBeenCalled();
});
