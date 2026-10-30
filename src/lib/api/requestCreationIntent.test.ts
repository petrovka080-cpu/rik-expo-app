import { createMemoryOfflineStorage } from "../offline/offlineStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { acknowledgeRequestCreationScope, loadRequestCreationIntent, loadRequestCreationScope, persistRequestCreationIntent, resolveRequestCreationScope } from "./requestCreationIntent";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";
const params = { scope: "material:independently-created-owner", actorId: "actor-A", companyId: B, args: { p_company_id: B, p_submit: true, p_items: [{ rik_code: "M", qty: 2, price: 7 }] } };
beforeEach(async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
  await AsyncStorage.clear();
});
it("durably retains the same exact no-ID intent after adapter/process recreation", async () => {
  const disk = createMemoryOfflineStorage();
  const first = await persistRequestCreationIntent(params, disk);
  const restartedDisk = createMemoryOfflineStorage(disk.dump());
  expect(await loadRequestCreationIntent(params.scope, "actor-A", restartedDisk)).toEqual(first);
  expect(await persistRequestCreationIntent(params, restartedDisk)).toEqual(first);
  expect(await persistRequestCreationIntent({ ...params, scope: "material:new-deliberate-owner" }, restartedDisk)).not.toEqual(first);
});
it("retains actor/company/payload bindings and never weakens an unknown result", async () => {
  const disk = createMemoryOfflineStorage(); await persistRequestCreationIntent(params, disk);
  await expect(loadRequestCreationIntent(params.scope, "actor-B", disk)).rejects.toThrow("ACTOR_CONFLICT");
  await expect(persistRequestCreationIntent({ ...params, companyId: C }, disk)).rejects.toThrow("RECONCILE_REQUIRED");
  await expect(persistRequestCreationIntent({ ...params, args: { ...params.args, p_submit: false } }, disk)).rejects.toThrow("RECONCILE_REQUIRED");
  const retained = JSON.parse(Object.values(disk.dump())[0]);
  expect(retained).toMatchObject({ scope: params.scope, actorId: params.actorId, companyId: params.companyId });
  expect(JSON.parse(retained.payload)).toEqual(params.args);
});
it("requires actual durable readback before permitting an effect", async () => {
  await expect(persistRequestCreationIntent(params, { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} })).rejects.toThrow("NOT_DURABLE");
});
it("subcontract scope survives edits/restart and a pending outcome cannot rotate on new-flow selection", async () => {
  const disk = createMemoryOfflineStorage(); const lane = "subcontract:known-link";
  const first = await resolveRequestCreationScope(lane, "actor-A", false, disk);
  const pending = await loadRequestCreationScope(lane, "actor-A", disk);
  expect(await resolveRequestCreationScope(lane, "actor-A", pending ?? false, createMemoryOfflineStorage(disk.dump()))).toBe(first);
  await acknowledgeRequestCreationScope(lane, "actor-A", first, "server-id", disk);
  expect(await resolveRequestCreationScope(lane, "actor-A", false, disk)).toBe(first);
  expect(await resolveRequestCreationScope(lane, "actor-A", (await loadRequestCreationScope(lane, "actor-A", disk)) ?? false, disk)).not.toBe(first);
});
it("concurrent first strict AsyncStorage resolves share one durable operation", async () => {
  const scopes = await Promise.all(Array.from({ length: 24 }, () => resolveRequestCreationScope("foreman-subcontract:first", "actor-A")));
  expect(new Set(scopes).size).toBe(1);
  expect(await resolveRequestCreationScope("foreman-subcontract:first", "actor-A", (await loadRequestCreationScope("foreman-subcontract:first", "actor-A")) ?? false)).toBe(scopes[0]);
});
it("competing native payloads cannot both succeed or overwrite the durable winner", async () => {
  const disk = createMemoryOfflineStorage();
  const changed = { ...params, args: { ...params.args, p_submit: false } };
  const results = await Promise.allSettled([persistRequestCreationIntent(params, disk), persistRequestCreationIntent(changed, disk)]);
  expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
  expect((results[1] as PromiseRejectedResult).reason.message).toContain("RECONCILE_REQUIRED");
  expect(JSON.parse((await loadRequestCreationIntent(params.scope, params.actorId, disk))!.payload)).toEqual(params.args);
});
it("a rejected native owner releases the queue for a later retry without deleting the slot", async () => {
  const disk = createMemoryOfflineStorage();
  const broken = { ...disk, setItem: jest.fn().mockRejectedValueOnce(new Error("disk unavailable")).mockImplementation(disk.setItem) };
  await expect(resolveRequestCreationScope("retry", "actor-A", false, broken)).rejects.toThrow("disk unavailable");
  const scope = await resolveRequestCreationScope("retry", "actor-A", false, broken);
  expect(await resolveRequestCreationScope("retry", "actor-A", false, broken)).toBe(scope);
});
it("one acknowledged scope rotates once under concurrent explicit selection; late acknowledgements cannot replace it", async () => {
  const disk = createMemoryOfflineStorage(); const lane = "foreman-subcontract:rotate";
  const original = await resolveRequestCreationScope(lane, "actor-A", false, disk);
  await acknowledgeRequestCreationScope(lane, "actor-A", original, "server-first", disk);
  await expect(acknowledgeRequestCreationScope(lane, "actor-A", original, "server-other", disk)).rejects.toThrow("SCOPE_CONFLICT");
  const completed = await loadRequestCreationScope(lane, "actor-A", disk);
  const next = await Promise.all(Array.from({ length: 12 }, () => resolveRequestCreationScope(lane, "actor-A", completed ?? false, disk)));
  expect(new Set(next).size).toBe(1); expect(next[0]).not.toBe(original);
  await expect(acknowledgeRequestCreationScope(lane, "actor-A", original, "server-first", disk)).rejects.toThrow("SCOPE_CONFLICT");
  expect(await resolveRequestCreationScope(lane, "actor-A", false, disk)).toBe(next[0]);
});
it("malformed existing scope is retained and never silently replaced", async () => {
  const key = `office_request_creation_scope_v4:${encodeURIComponent("actor-A:lane")}`;
  const disk = createMemoryOfflineStorage({ [key]: "{broken" });
  await expect(resolveRequestCreationScope("lane", "actor-A", false, disk)).rejects.toThrow("SCOPE_CONFLICT");
  expect(disk.dump()[key]).toBe("{broken");
});
it("a pending snapshot cannot rotate a later acknowledgement, and an old completed snapshot cannot rotate a newer completion", async () => {
  const disk = createMemoryOfflineStorage(); const lane = "foreman-subcontract:delayed";
  const first = await resolveRequestCreationScope(lane, "actor-A", false, disk);
  const pending = await loadRequestCreationScope(lane, "actor-A", disk);
  await acknowledgeRequestCreationScope(lane, "actor-A", first, "server-first", disk);
  expect(await resolveRequestCreationScope(lane, "actor-A", pending ?? false, disk)).toBe(first);
  const completed = await loadRequestCreationScope(lane, "actor-A", disk);
  const next = await resolveRequestCreationScope(lane, "actor-A", completed ?? false, disk);
  await acknowledgeRequestCreationScope(lane, "actor-A", next, "server-next", disk);
  expect(await resolveRequestCreationScope(lane, "actor-A", completed ?? false, disk)).toBe(next);
});
