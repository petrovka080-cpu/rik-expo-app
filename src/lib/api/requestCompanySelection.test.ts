import { withRequestCompanySelection } from "./requestCompanySelection";
import { getRequestCompanyPrompt, registerRequestCompanyPromptHost } from "./requestCompanyPrompt";
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const mockRpc = jest.fn();
let mockActor = "actor-A";
let mockNotify: (event: string, session: { user: { id: string } } | null) => void = () => {};
const mockUnsubscribe = jest.fn();
jest.mock("../supabaseClient", () => ({ supabase: {
  rpc: (...args: unknown[]) => mockRpc(...args),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: mockActor } } }, error: null }),
    onAuthStateChange: (callback: typeof mockNotify) => { mockNotify = callback; return { data: { subscription: { unsubscribe: mockUnsubscribe } } }; },
  },
} }));
const waitForPrompt = async () => {
  for (let index = 0; index < 30 && !getRequestCompanyPrompt(); index++) await Promise.resolve();
  expect(getRequestCompanyPrompt()).not.toBeNull();
};
describe("actual create company choice", () => {
  let unmount: () => void;
  beforeEach(() => { mockActor = "actor-A"; mockRpc.mockReset(); mockUnsubscribe.mockClear(); unmount = registerRequestCompanyPromptHost({ actorId: "actor-A", blocked: false }); });
  afterEach(() => { getRequestCompanyPrompt()?.cancel(); unmount(); });
  it("requires an explicit click even with a sole allowed company", async () => {
    mockRpc.mockResolvedValue({ data: [{ company_id: A, name: "Компания А" }], error: null });
    const operation = jest.fn(async (id: string) => id);
    const task = withRequestCompanySelection(null, operation);
    await waitForPrompt(); expect(operation).not.toHaveBeenCalled();
    getRequestCompanyPrompt()?.select(A);
    await expect(task).resolves.toBe(A);
    expect(operation).toHaveBeenCalledWith(A, "actor-A");
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });
  it("passes the selected company B rather than first membership A", async () => {
    mockRpc.mockResolvedValue({ data: [{ company_id: A, name: "A" }, { company_id: B, name: "B" }], error: null });
    const task = withRequestCompanySelection(null, async id => id);
    await waitForPrompt(); getRequestCompanyPrompt()?.select(B);
    await expect(task).resolves.toBe(B);
  });
  it("cancels without creating a request", async () => {
    mockRpc.mockResolvedValue({ data: [{ company_id: A, name: "A" }], error: null });
    const operation = jest.fn(async () => "created");
    const task = withRequestCompanySelection(null, operation);
    await waitForPrompt(); getRequestCompanyPrompt()?.cancel();
    await expect(task).rejects.toThrow("отменено"); expect(operation).not.toHaveBeenCalled();
  });
  it("blocks actor replacement before the selected operation", async () => {
    mockRpc.mockResolvedValue({ data: [{ company_id: A, name: "A" }], error: null });
    const operation = jest.fn(async () => "created");
    const task = withRequestCompanySelection(null, operation);
    await waitForPrompt(); mockActor = "actor-B"; mockNotify("SIGNED_IN", { user: { id: mockActor } });
    expect(getRequestCompanyPrompt()).toBeNull();
    await expect(task).rejects.toThrow("отменено"); expect(operation).not.toHaveBeenCalled();
  });
  it("does not fall back after MFA or company RPC failure", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const operation = jest.fn(async () => "created");
    await expect(withRequestCompanySelection(null, operation)).rejects.toThrow();
    expect(operation).not.toHaveBeenCalled(); expect(getRequestCompanyPrompt()).toBeNull();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
  it("does not publish old choices when actor changes while the real choices RPC is pending", async () => {
    let resolve!: (value: unknown) => void;
    mockRpc.mockReturnValue(new Promise(done => { resolve = done; }));
    const operation = jest.fn(async () => "created");
    const task = withRequestCompanySelection(null, operation); void task.catch(() => {});
    for (let i = 0; i < 30 && !mockRpc.mock.calls.length; i++) await Promise.resolve();
    mockActor = "actor-B"; mockNotify("SIGNED_IN", { user: { id: mockActor } });
    resolve({ data: [{ company_id: A, name: "Old private company" }], error: null });
    await expect(task).rejects.toThrow("actor changed");
    expect(getRequestCompanyPrompt()).toBeNull(); expect(operation).not.toHaveBeenCalled();
  });

});
