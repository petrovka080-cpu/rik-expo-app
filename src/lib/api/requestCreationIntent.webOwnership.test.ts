/** @jest-environment jsdom */
jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
type IntentModule = typeof import("./requestCreationIntent");
const B = "22222222-2222-2222-2222-222222222222";
const lane = "foreman-subcontract:shared";
const params = { scope: "material:shared", actorId: "actor-A", companyId: B, args: { p_company_id: B, p_submit: false, p_items: [{ qty: 2 }] } };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function until(check: () => boolean) { for (let i = 0; i < 100 && !check(); i++) await Promise.resolve(); expect(check()).toBe(true); }
function moduleContext(): IntentModule {
  let module!: IntentModule;
  // Separate module registries have separate native mutex maps, just as tabs do.
  jest.isolateModules(() => { module = require("./requestCreationIntent"); });
  return module;
}

// This models only the Web Locks contract at the browser boundary. It is not a
// real two-tab/browser proof; ROOT must run that separately on a secure origin.
function webLocks() {
  const tails = new Map<string, Promise<void>>();
  let waiting = 0;
  const request = jest.fn(<T,>(name: string, options: { mode: "exclusive"; signal?: AbortSignal }, work: () => Promise<T>): Promise<T> => {
    expect(options.mode).toBe("exclusive");
    const previous = tails.get(name) ?? Promise.resolve();
    const released = deferred<void>();
    const tail = previous.then(() => released.promise);
    tails.set(name, tail);
    return new Promise<T>((resolve, reject) => {
      let cancelled = false;
      let entered = false;
      waiting++;
      const abort = () => {
        if (entered || cancelled) return;
        cancelled = true; waiting--; released.resolve();
        reject(new DOMException("Lock acquisition aborted", "AbortError"));
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) abort();
      void previous.then(async () => {
        if (cancelled) return;
        entered = true; waiting--; options.signal?.removeEventListener("abort", abort);
        try { resolve(await work()); } catch (error) { reject(error); } finally { released.resolve(); }
      });
    });
  });
  return { request, get waiting() { return waiting; } };
}
let locks: ReturnType<typeof webLocks>;
let originalLocks: PropertyDescriptor | undefined;
beforeEach(() => {
  jest.useRealTimers(); localStorage.clear(); locks = webLocks();
  originalLocks = Object.getOwnPropertyDescriptor(navigator, "locks");
  Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
});
afterEach(() => {
  if (originalLocks) Object.defineProperty(navigator, "locks", originalLocks);
  else Reflect.deleteProperty(navigator, "locks");
  jest.restoreAllMocks(); jest.useRealTimers();
});
it("isolated browser modules share first scope through Web Locks and actual localStorage", async () => {
  const firstTab = moduleContext(); const secondTab = moduleContext();
  const scopes = await Promise.all(Array.from({ length: 24 }, (_, index) => (index % 2 ? firstTab : secondTab).resolveRequestCreationScope(lane, "actor-A")));
  expect(new Set(scopes).size).toBe(1);
  expect(localStorage.length).toBe(1);
  expect(locks.request).toHaveBeenCalledWith(expect.stringContaining("office_request_creation_scope_v4:"), expect.objectContaining({ mode: "exclusive" }), expect.any(Function));
  const restartedTab = moduleContext();
  expect(await restartedTab.resolveRequestCreationScope(lane, "actor-A", (await restartedTab.loadRequestCreationScope(lane, "actor-A")) ?? false)).toBe(scopes[0]);
  await firstTab.acknowledgeRequestCreationScope(lane, "actor-A", scopes[0], "server-one");
  const completed = await firstTab.loadRequestCreationScope(lane, "actor-A");
  const rotated = await Promise.all([firstTab.resolveRequestCreationScope(lane, "actor-A", completed ?? false), secondTab.resolveRequestCreationScope(lane, "actor-A", completed ?? false)]);
  expect(rotated[0]).toBe(rotated[1]); expect(rotated[0]).not.toBe(scopes[0]);
  await expect(firstTab.acknowledgeRequestCreationScope(lane, "actor-A", scopes[0], "server-one")).rejects.toThrow("SCOPE_CONFLICT");
  expect(await restartedTab.resolveRequestCreationScope(lane, "actor-A")).toBe(rotated[0]);
});
it("competing browser payloads retain the exact durable winner across module recreation", async () => {
  const firstTab = moduleContext(); const secondTab = moduleContext();
  const results = await Promise.allSettled([firstTab.persistRequestCreationIntent(params), secondTab.persistRequestCreationIntent({ ...params, args: { ...params.args, p_submit: true } })]);
  expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
  expect((results[1] as PromiseRejectedResult).reason.message).toContain("RECONCILE_REQUIRED");
  const retained = await moduleContext().loadRequestCreationIntent(params.scope, params.actorId);
  expect(JSON.parse(retained!.payload)).toEqual(params.args);
  await expect(secondTab.loadRequestCreationIntent(params.scope, "actor-B")).rejects.toThrow("ACTOR_CONFLICT");
});
it("unsupported browser ownership is typed/recoverable and leaves stored drafts/intents untouched", async () => {
  const owner = moduleContext(); await owner.persistRequestCreationIntent(params);
  localStorage.setItem("existing-draft", "preserve"); const before = { ...localStorage };
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  await expect(owner.resolveRequestCreationScope(lane, "actor-A")).rejects.toMatchObject({ name: "RequestCreationOwnershipError", code: "REQUEST_CREATION_WEB_LOCKS_REQUIRED", recoverable: true });
  await expect(owner.persistRequestCreationIntent(params)).rejects.toMatchObject({ code: "REQUEST_CREATION_WEB_LOCKS_REQUIRED" });
  expect({ ...localStorage }).toEqual(before);
  Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
  expect(await owner.persistRequestCreationIntent(params)).toMatchObject({ payload: JSON.stringify(params.args) });
});
it("an aborted acquisition times out without running storage work and later retry can acquire", async () => {
  jest.useFakeTimers(); const owner = moduleContext();
  const name = `office-request-creation-v4:office_request_creation_scope_v4:${encodeURIComponent(`actor-A:${lane}`)}`;
  const blocked = deferred<void>(); const started = deferred<void>();
  const blocker = locks.request(name, { mode: "exclusive" }, async () => { started.resolve(); await blocked.promise; });
  await started.promise;
  const attempt = owner.resolveRequestCreationScope(lane, "actor-A");
  const rejected = expect(attempt).rejects.toMatchObject({ code: "REQUEST_CREATION_OWNERSHIP_TIMEOUT", recoverable: true });
  await until(() => locks.waiting === 1); jest.advanceTimersByTime(5000); await rejected;
  expect(localStorage.length).toBe(0);
  blocked.resolve(); await blocker;
  expect(await owner.resolveRequestCreationScope(lane, "actor-A")).toBeTruthy();
});
it("storage mutation rejection releases Web Locks and retains the previous durable intent", async () => {
  const owner = moduleContext(); await owner.persistRequestCreationIntent(params);
  const original = localStorage.getItem(`office_request_creation_intent_v4:${encodeURIComponent(params.scope)}`);
  const set = jest.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota unavailable"); });
  await expect(owner.resolveRequestCreationScope(lane, "actor-A")).rejects.toThrow("quota unavailable");
  set.mockRestore();
  expect(await moduleContext().resolveRequestCreationScope(lane, "actor-A")).toBeTruthy();
  expect(localStorage.getItem(`office_request_creation_intent_v4:${encodeURIComponent(params.scope)}`)).toBe(original);
});
it("browser lock service rejection is typed and retry does not retain a poisoned owner", async () => {
  const owner = moduleContext(); locks.request.mockRejectedValueOnce(new DOMException("disabled", "SecurityError"));
  await expect(owner.resolveRequestCreationScope(lane, "actor-A")).rejects.toMatchObject({ code: "REQUEST_CREATION_OWNERSHIP_UNAVAILABLE", recoverable: true });
  expect(localStorage.length).toBe(0);
  expect(await owner.resolveRequestCreationScope(lane, "actor-A")).toBeTruthy();
});
