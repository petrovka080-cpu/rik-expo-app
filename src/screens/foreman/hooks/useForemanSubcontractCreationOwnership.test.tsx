import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { useForemanSubcontractSaveDraftAtomic } from "./useForemanSubcontractSaveDraftAtomic";
import { useForemanSubcontractHydration } from "./useForemanSubcontractHydration";
import { EMPTY_FORM } from "./foreman.subcontractController.model";
import { resolveRequestCreationScope } from "../../../lib/api/requestCreationIntent";
import { getRequestCompanyPrompt, registerRequestCompanyPromptHost, subscribeRequestCompanyPrompt } from "../../../lib/api/requestCompanyPrompt";
import { syncForemanAtomicDraft } from "../foreman.draftSync.repository";
import { observeSessionBoundaryPrincipal } from "../../../lib/session/sessionBoundary";
import type { ReqItemRow } from "../../../lib/catalog_api";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import type { RequestDraftSyncArgsV2 } from "../../../lib/api/requestDraftSync.transport";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";
let mockActor = A;
const mockTransport = jest.fn(); const mockLinkedDraft = jest.fn(); const mockCompanyRpc = jest.fn();
jest.mock("../../../lib/supabaseClient", () => ({ supabase: {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: mockActor } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }, rpc: (...args: unknown[]) => mockCompanyRpc(...args),
} }));
jest.mock("../foreman.requests", () => ({ findLatestDraftRequestByLink: (...args: unknown[]) => mockLinkedDraft(...args) }));
jest.mock("../../../lib/api/requestDraftSync.transport", () => ({
  invokeRequestDraftSyncRpcV2: (...args: unknown[]) => mockTransport(...args),
  createDirectorHandoffBroadcastChannel: () => ({ subscribe: (callback: (status: string) => void) => callback("CHANNEL_ERROR") }),
  setRequestDraftSyncRealtimeAuth: async () => {}, removeDirectorHandoffBroadcastChannel: async () => {}, insertDirectorRequestSubmittedNotification: async () => ({ error: null }),
}));
// Scope/intent, hydration/save hooks, repository, sync service, actor/company
// guards and response parser are real. Only auth/read/RPC boundaries are fakes.
// Receipt counting here is caller evidence, never actual SQL-effect evidence.
const template = { id: "subcontract-one", status: "approved", object_name: "Object", work_zone: "Level", work_type: "System" } as Subcontract;
const lane = `foreman-subcontract:${template.id}`;
const mockSetId = jest.fn(); const mockReset = jest.fn(); const mockOpen = jest.fn();
const mockSetRows = jest.fn(); const mockSetLabel = jest.fn(); const mockSetSaving = jest.fn(); const mockSetSending = jest.fn();
const mockSetForm = jest.fn(); const mockSetTemplate = jest.fn(); const mockLoad = jest.fn();
let api!: ReturnType<typeof useForemanSubcontractSaveDraftAtomic> & ReturnType<typeof useForemanSubcontractHydration>;
let renderer: TestRenderer.ReactTestRenderer | undefined;
type Props = { qty?: number; userId?: string; draftScopeKey?: string };
function Harness({ qty = 2, userId = A, draftScopeKey = "form:original" }: Props) {
  const save = useForemanSubcontractSaveDraftAtomic({
    templateContract: template, userId, requestId: "", draftItems: [{ id: "local:one", rik_code: "M", name_human: "Material", qty, price: 7, uom: "pcs" } as ReqItemRow],
    requestMetaFromTemplate: { comment: "draft" }, templateObjectName: "Object", objectName: "Object", levelName: "Level", templateLevelName: "Level", systemName: "System", templateSystemName: "System",
    form: EMPTY_FORM, draftScopeKey, setRequestId: mockSetId, setDisplayNo: mockSetLabel, setDraftItems: mockSetRows, setSaving: mockSetSaving, setSending: mockSetSending,
  });
  const hydration = useForemanSubcontractHydration({
    dicts: { objOptions: [], lvlOptions: [], sysOptions: [] }, form: EMPTY_FORM,
    loadDraftItems: mockLoad, openSubcontractFlow: mockOpen, resetSubcontractDraftContext: mockReset, setDisplayNo: mockSetLabel, setForm: mockSetForm, setRequestId: mockSetId, setSelectedTemplateId: mockSetTemplate,
  });
  useEffect(() => { api = { ...save, ...hydration }; });
  return null;
}
async function mount(props: Props = {}) { await act(async () => { renderer = TestRenderer.create(<Harness {...props} />); }); }
async function remount(props: Props = {}) { if (renderer) act(() => renderer!.unmount()); await mount(props); }
async function until(check: () => boolean) { for (let i = 0; i < 150 && !check(); i++) await Promise.resolve(); expect(check()).toBe(true); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
let disposeHost: () => void;
let disposeSelection: () => void;
let effects: number;
let loseAcknowledgement: boolean;
beforeEach(async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" }); await AsyncStorage.clear();
  mockActor = A; observeSessionBoundaryPrincipal(A); disposeHost = registerRequestCompanyPromptHost({ actorId: A, blocked: false });
  mockCompanyRpc.mockReset().mockResolvedValue({ data: [{ company_id: B, name: "Company B" }, { company_id: C, name: "Company C" }], error: null });
  // Explicit selection at the real prompt's UI boundary; never infer membership.
  disposeSelection = subscribeRequestCompanyPrompt(() => { getRequestCompanyPrompt()?.select(B); });
  effects = 0; loseAcknowledgement = false; mockLinkedDraft.mockReset().mockResolvedValue(null); mockTransport.mockReset();
  for (const mock of [mockSetId, mockReset, mockOpen, mockSetRows, mockSetLabel, mockSetSaving, mockSetSending, mockSetForm, mockSetTemplate, mockLoad]) mock.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const receipts = new Map<string, object>();
  mockTransport.mockImplementation(async (args: RequestDraftSyncArgsV2) => {
    const intentId = String(args.p_creation_intent_id ?? "");
    let data = args.p_request_id ? null : receipts.get(intentId);
    const replayed = !!data;
    if (!data) {
      if (!args.p_request_id) { expect(intentId).toBeTruthy(); effects++; }
      const id = args.p_request_id || `request-${effects}`;
      data = { document_type: "request_draft_sync", version: "v2", request_payload: { id, company_id: args.p_company_id, display_no: "REQ", status: args.p_submit ? "submitted" : "draft" }, items_payload: (args.p_items as Array<Record<string, unknown>>).map((item, index) => ({ ...item, id: `item-${index}`, request_id: id })), submitted: args.p_submit === true, request_created: !args.p_request_id };
      if (!args.p_request_id) receipts.set(intentId, data);
    }
    if (loseAcknowledgement) { loseAcknowledgement = false; throw new Error("lost acknowledgement after commit"); }
    return { data: { ...data, replayed }, error: null };
  });
});
afterEach(() => { if (renderer) act(() => renderer!.unmount()); renderer = undefined; disposeSelection(); disposeHost(); jest.restoreAllMocks(); });
it("mounted concurrent first saves use one durable scope/intent through the actual repository/service", async () => {
  await mount(); const save = api.saveDraftAtomic;
  const result = await Promise.all([save({ mutationKind: "catalog_add" }), save({ mutationKind: "catalog_add" })]);
  expect(result).toEqual(["request-1", "request-1"]); expect(effects).toBe(1);
  expect(mockTransport).toHaveBeenCalledTimes(2);
  expect(mockTransport.mock.calls[1][0]).toEqual(mockTransport.mock.calls[0][0]);
  const scope = await resolveRequestCreationScope(lane, A);
  expect(mockTransport.mock.calls[0][0]).toMatchObject({ p_request_id: null, p_creation_actor_id: A, p_company_id: B, p_creation_intent_id: `v4:${scope}` });
});
it("lost acknowledgement plus restart/form edit replays the original create before editing that exact request", async () => {
  await mount(); loseAcknowledgement = true;
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBeNull();
  const original = mockTransport.mock.calls[0][0]; const scope = await resolveRequestCreationScope(lane, A);
  expect(mockSetId).not.toHaveBeenCalled();
  await remount({ qty: 3, draftScopeKey: "edited-form:another-key" });
  await api.hydrateSelectedSubcontract(template);
  expect(await resolveRequestCreationScope(lane, A)).toBe(scope);
  expect(await api.saveDraftAtomic({ mutationKind: "qty_update" })).toBe("request-1");
  expect(mockTransport.mock.calls[1][0]).toEqual(original);
  expect(mockTransport.mock.calls[2][0]).toMatchObject({ p_request_id: "request-1", p_company_id: B });
  expect(mockTransport.mock.calls[2][0].p_items[0].qty).toBe(3); expect(effects).toBe(1);
  // Explicit selection may rotate only now that this operation was acknowledged.
  await api.hydrateSelectedSubcontract(template);
  expect(await resolveRequestCreationScope(lane, A)).not.toBe(scope);
  const keys = await AsyncStorage.getAllKeys();
  expect(keys).toContain(`office_request_creation_intent_v4:${encodeURIComponent(scope)}`);
});
it("a delayed linked lookup cannot rotate a first save acknowledged after selection began", async () => {
  await mount(); const linked = deferred<null>(); mockLinkedDraft.mockReturnValueOnce(linked.promise);
  const selection = api.hydrateSelectedSubcontract(template);
  await until(() => mockLinkedDraft.mock.calls.length === 1);
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBe("request-1");
  const first = await resolveRequestCreationScope(lane, A);
  linked.resolve(null); await selection;
  expect(await resolveRequestCreationScope(lane, A)).toBe(first);
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBe("request-1"); expect(effects).toBe(1);
  // A later explicit selection sees the completed predecessor before lookup.
  await api.hydrateSelectedSubcontract(template);
  expect(await resolveRequestCreationScope(lane, A)).not.toBe(first);
});
it("a lawful linked draft resumes its saved identity without rotating the completed operation", async () => {
  await mount(); await api.saveDraftAtomic({ mutationKind: "catalog_add" });
  const first = await resolveRequestCreationScope(lane, A);
  mockLinkedDraft.mockResolvedValueOnce({ id: "request-1", display_no: "REQ-1" });
  await api.hydrateSelectedSubcontract(template);
  expect(mockSetId).toHaveBeenLastCalledWith("request-1"); expect(mockLoad).toHaveBeenLastCalledWith("request-1");
  expect(await resolveRequestCreationScope(lane, A)).toBe(first); expect(effects).toBe(1);
});
it("creation-storage unavailability preserves lawful linked history and blocks a no-ID flow", async () => {
  await mount();
  mockLinkedDraft.mockResolvedValueOnce({ id: "saved-legacy", display_no: "LEGACY" });
  jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("creation storage unavailable"));
  await api.hydrateSelectedSubcontract(template);
  expect(mockSetId).toHaveBeenLastCalledWith("saved-legacy"); expect(mockLoad).toHaveBeenLastCalledWith("saved-legacy");
  expect(mockOpen).toHaveBeenCalledWith("details"); expect(mockTransport).not.toHaveBeenCalled();
  mockOpen.mockClear(); mockReset.mockClear();
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("creation storage unavailable"));
  await expect(api.hydrateSelectedSubcontract(template)).rejects.toThrow("creation storage unavailable");
  expect(mockOpen).not.toHaveBeenCalled(); expect(mockReset).not.toHaveBeenCalled(); expect(mockTransport).not.toHaveBeenCalled();
});
it("changed submitted outcome remains typed and cannot rotate into a second no-ID request", async () => {
  await mount(); loseAcknowledgement = true;
  expect(await api.saveDraftAtomic({ mutationKind: "submit", submit: true })).toBeNull();
  const scope = await resolveRequestCreationScope(lane, A);
  await remount({ qty: 3 });
  expect(await api.saveDraftAtomic({ mutationKind: "qty_update" })).toBeNull();
  expect(Alert.alert).toHaveBeenLastCalledWith("Ошибка", expect.stringContaining("REQUEST_CREATION_INTENT_ALREADY_SUBMITTED:request-1"));
  expect(mockTransport.mock.calls[1][0]).toEqual(mockTransport.mock.calls[0][0]);
  await api.hydrateSelectedSubcontract(template);
  expect(await resolveRequestCreationScope(lane, A)).toBe(scope); expect(effects).toBe(1);
});
it("a pending linked-company conflict refuses before RPC and preserves the original intent", async () => {
  await mount(); loseAcknowledgement = true; await api.saveDraftAtomic({ mutationKind: "catalog_add" });
  const original = mockTransport.mock.calls[0][0]; const scope = await resolveRequestCreationScope(lane, A);
  await expect(syncForemanAtomicDraft({ creationScopeKey: scope, creationActorId: A, companyId: C, mutationKind: "catalog_add", sourcePath: "foreman_subcontract", subcontractId: template.id, lines: [{ rik_code: "M", qty: 2 }] })).rejects.toThrow("COMPANY_CONFLICT");
  expect(mockTransport).toHaveBeenCalledTimes(1);
  await remount(); expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBe("request-1");
  expect(mockTransport.mock.calls[1][0]).toEqual(original); expect(effects).toBe(1);
});
it("stale actor props and a blocked assurance host cannot create, while a lawful retry retains its pending scope", async () => {
  await mount(); mockActor = C;
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBeNull();
  expect(Alert.alert).toHaveBeenLastCalledWith("Ошибка", expect.stringContaining("ACTOR_CONFLICT")); expect(mockTransport).not.toHaveBeenCalled();
  mockActor = A; observeSessionBoundaryPrincipal(A); disposeHost(); disposeHost = registerRequestCompanyPromptHost({ actorId: A, blocked: true });
  const scope = await resolveRequestCreationScope(lane, A);
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBeNull();
  expect(Alert.alert).toHaveBeenLastCalledWith("Ошибка", expect.stringContaining("ASSURANCE_REQUIRED")); expect(mockTransport).not.toHaveBeenCalled();
  disposeHost(); disposeHost = registerRequestCompanyPromptHost({ actorId: A, blocked: false });
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBe("request-1");
  expect(mockTransport.mock.calls[0][0].p_creation_intent_id).toBe(`v4:${scope}`);
});
it("actor replacement during hydration's storage wait cannot reset or open the replacement actor's flow", async () => {
  await mount(); const pending = deferred<void>(); const get = AsyncStorage.getItem.bind(AsyncStorage); let waiting = false;
  jest.spyOn(AsyncStorage, "getItem").mockImplementationOnce(async key => { waiting = true; await pending.promise; return get(key); });
  const task = api.hydrateSelectedSubcontract(template); const rejected = expect(task).rejects.toThrow("actor changed");
  await until(() => waiting); mockActor = C; observeSessionBoundaryPrincipal(C); pending.resolve(); await rejected;
  expect(mockReset).not.toHaveBeenCalled(); expect(mockOpen).not.toHaveBeenCalled(); expect(mockTransport).not.toHaveBeenCalled();
});
it.each(["actor-C", "A-B-A"])("save's actual outer actor fence survives the scope-storage await: %s", async replacement => {
  await mount(); const pending = deferred<void>(); const get = AsyncStorage.getItem.bind(AsyncStorage); let waiting = false;
  jest.spyOn(AsyncStorage, "getItem").mockImplementationOnce(async key => { waiting = true; await pending.promise; return get(key); });
  const task = api.saveDraftAtomic({ mutationKind: "catalog_add" });
  await until(() => waiting); mockActor = C; observeSessionBoundaryPrincipal(C);
  if (replacement === "A-B-A") { mockActor = A; observeSessionBoundaryPrincipal(A); }
  pending.resolve(); expect(await task).toBeNull();
  expect(mockTransport).not.toHaveBeenCalled(); expect(mockSetId).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenLastCalledWith("Ошибка", expect.stringContaining("actor changed"));
  const scope = await resolveRequestCreationScope(lane, A);
  mockActor = A; observeSessionBoundaryPrincipal(A);
  expect(await api.saveDraftAtomic({ mutationKind: "catalog_add" })).toBe("request-1");
  expect(mockTransport.mock.calls[0][0].p_creation_intent_id).toBe(`v4:${scope}`);
});
