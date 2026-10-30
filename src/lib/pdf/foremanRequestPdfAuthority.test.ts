import { assertForemanRequestPdfSnapshotCurrent, loadForemanRequestPdfAuthoritySnapshot } from "./foremanRequestPdfAuthority";

const snapshot = () => ({
  authority: { contract: "foreman_request_read_v1", actorId: "actor", requestId: "request", companyId: "B", mode: "company" },
  request: { id: "request", display_no: "17" }, items: [{ id: "item", qty: 3 }],
  refs: { object: { name: "Object" }, level: null, system: null, zone: null },
});
const invoke = (data: unknown, error: unknown = null) => {
  const rpc = jest.fn(async () => ({ data, error }));
  return { rpc, result: loadForemanRequestPdfAuthoritySnapshot({ requester: { rpc }, actorId: "actor", requestId: "request" }) };
};
describe("foreman PDF authorized snapshot transport", () => {
  it("uses only target id and caller JWT transport; preserves exact children", async () => {
    const call = invoke(snapshot());
    expect(await call.result).toMatchObject({ items: [{ id: "item", qty: 3 }], authority: { companyId: "B" } });
    expect(call.rpc).toHaveBeenCalledTimes(1);
    expect(call.rpc).toHaveBeenCalledWith("foreman_request_pdf_snapshot_v1", { p_request_id: "request" });
  });
  it("accepts legacy creator receipt without inventing company", async () => {
    const data = snapshot();
    const call = invoke({ ...data, authority: { ...data.authority, companyId: null, mode: "legacy_creator" } });
    expect((await call.result).authority).toMatchObject({ companyId: null, mode: "legacy_creator" });
  });
  it.each(["42501", "PGRST202", "57014", "MFA_SECOND_FACTOR_REQUIRED"])("stops on %s without compatibility retry", async code => {
    const call = invoke(snapshot(), { code });
    await expect(call.result).rejects.toThrow("PDF authority denied");
    expect(call.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([
    { actorId: "other" }, { requestId: "other" }, { contract: "old" },
    { mode: "company", companyId: null }, { mode: "legacy_creator", companyId: "A" }, { mode: "guess" },
  ])("rejects stale or malformed receipt %j", async replacement => {
    const data = snapshot();
    await expect(invoke({ ...data, authority: { ...data.authority, ...replacement } }).result).rejects.toThrow();
  });
  it("rejects a response for a different document even with matching receipt", async () => {
    await expect(invoke({ ...snapshot(), request: { id: "other" } }).result).rejects.toThrow();
  });
  it("rejects missing/incomplete or over-ceiling child arrays", async () => {
    for (const items of [null, [null], Array.from({ length: 5001 }, () => ({ id: "x" }))]) {
      await expect(invoke({ ...snapshot(), items }).result).rejects.toThrow();
    }
  });
});

describe("authority during rendering", () => {
  it("allows unchanged fresh authority and source", async () => {
    const previous = await invoke(snapshot()).result;
    const rpc = jest.fn(async () => ({ data: snapshot(), error: null }));
    await expect(assertForemanRequestPdfSnapshotCurrent({ requester: { rpc }, snapshot: previous })).resolves.toBeUndefined();
  });
  it.each(["membership_removed", "factor_enrolled"])("blocks after %s", async reason => {
    const previous = await invoke(snapshot()).result;
    const rpc = jest.fn(async () => ({ data: null, error: { message: reason } }));
    await expect(assertForemanRequestPdfSnapshotCurrent({ requester: { rpc }, snapshot: previous })).rejects.toThrow();
  });
  it("blocks bytes rendered from changed children", async () => {
    const previous = await invoke(snapshot()).result;
    const rpc = jest.fn(async () => ({ data: { ...snapshot(), items: [{ id: "item", qty: 4 }] }, error: null }));
    await expect(assertForemanRequestPdfSnapshotCurrent({ requester: { rpc }, snapshot: previous })).rejects.toThrow("changed");
  });
});
