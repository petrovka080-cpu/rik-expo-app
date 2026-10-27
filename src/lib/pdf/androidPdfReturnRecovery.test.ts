import { ANDROID_PDF_RETURN_TTL_MS, parseAndroidPdfReturnCheckpoint, parseEstimatePdfReturnRoute,
  recoverAndroidPdfCaller, type AndroidPdfReturnCheckpoint, type PdfReturnDraft } from "./androidPdfReturnRecovery";

const owner = "9adc5ab1-31fa-41be-8a00-17eadbb37c39";
const nonce = "12345678-1234-1234-1234-123456789012";
const draftId = "consumer_draft_test_caller";
const now = 1_800_000_000_000;
const checkpoint: AndroidPdfReturnCheckpoint = { version: 1, nonce, ownerUserId: owner,
  createdAtMs: now - 100, sessionId: "session_test_123", returnTo: `/request?draftId=${draftId}`, phase: "returned" };
const dependencies = () => ({ checkpoint, ownerUserId: owner, isCurrent: jest.fn(() => true),
  hasLiveSession: jest.fn(() => false), isPending: jest.fn(async () => true),
  readExactDraft: jest.fn(async (): Promise<PdfReturnDraft> => ({ id: draftId, consumerUserId: owner, status: "draft", deletedAt: null })),
  navigate: jest.fn(), consume: jest.fn(async () => true) });

describe("durable Android PDF caller recovery", () => {
  it("restores the independent caller draft and waits for actual screen acknowledgement", async () => {
    const deps = dependencies();
    expect(await recoverAndroidPdfCaller(deps)).toBe("awaiting-caller");
    expect(deps.readExactDraft).toHaveBeenCalledWith(draftId);
    expect(deps.navigate).toHaveBeenCalledWith(`/request?draftId=${draftId}`);
    expect(deps.consume).not.toHaveBeenCalled();
  });
  it("history PDF from blank request does not load its archived PDF entity", async () => {
    const deps = dependencies();
    expect(await recoverAndroidPdfCaller({ ...deps, checkpoint: { ...checkpoint, returnTo: "/request" } })).toBe("awaiting-caller");
    expect(deps.readExactDraft).not.toHaveBeenCalled();
    expect(deps.navigate).toHaveBeenCalledWith("/request");
    expect(deps.consume).not.toHaveBeenCalled();
  });
  it.each(["approved", "archived", "deleted_by_user"])("never restores %s as an editable draft", async status => {
    const deps = dependencies();
    deps.readExactDraft.mockResolvedValue({ id: draftId, consumerUserId: owner, status, deletedAt: null });
    await recoverAndroidPdfCaller(deps);
    expect(deps.navigate).toHaveBeenCalledWith("/request");
  });
  it("rejects a mismatching/deleted caller even when its old marker still exists", async () => {
    const deps = dependencies();
    deps.readExactDraft.mockResolvedValue({ id: draftId, consumerUserId: owner, status: "draft", deletedAt: "2026-10-06" });
    await recoverAndroidPdfCaller(deps);
    expect(deps.navigate).toHaveBeenCalledWith("/request");
  });
  it("discards a previous owner without reading its draft or navigating", async () => {
    const deps = dependencies();
    expect(await recoverAndroidPdfCaller({ ...deps, ownerUserId: nonce })).toBe("discarded-owner");
    expect(deps.consume).toHaveBeenCalledWith(nonce);
    expect(deps.readExactDraft).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });
  it("preserves a warm session and the user's current navigation", async () => {
    const deps = dependencies(); deps.hasLiveSession.mockReturnValue(true);
    expect(await recoverAndroidPdfCaller(deps)).toBe("preserved-live");
    expect(deps.consume).toHaveBeenCalledWith(nonce);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
  it.each(["prepared", "launched"] as const)("does not treat %s as a viewer return", async phase => {
    const deps = dependencies();
    expect(await recoverAndroidPdfCaller({ ...deps, checkpoint: { ...checkpoint, phase } })).toBe("pending");
    expect(deps.navigate).not.toHaveBeenCalled(); expect(deps.consume).not.toHaveBeenCalled();
  });
  it("retains metadata when recovery or navigation fails", async () => {
    const deps = dependencies(); deps.readExactDraft.mockRejectedValue(new Error("durable unavailable"));
    await expect(recoverAndroidPdfCaller(deps)).rejects.toThrow("durable unavailable");
    expect(deps.consume).not.toHaveBeenCalled();
    const second = dependencies(); second.navigate.mockImplementation(() => { throw new Error("router unavailable"); });
    await expect(recoverAndroidPdfCaller(second)).rejects.toThrow("router unavailable");
    expect(second.consume).not.toHaveBeenCalled();
  });
  it("does not navigate after an auth generation or user navigation changes during recovery", async () => {
    const deps = dependencies(); let current = true;
    deps.isCurrent.mockImplementation(() => current);
    deps.readExactDraft.mockImplementation(async () => {
      current = false;
      return { id: draftId, consumerUserId: owner, status: "draft", deletedAt: null };
    });
    expect(await recoverAndroidPdfCaller(deps)).toBe("stale");
    expect(deps.navigate).not.toHaveBeenCalled(); expect(deps.consume).not.toHaveBeenCalled();
  });
  it("does not let an old callback override a newer native nonce", async () => {
    const deps = dependencies(); deps.isPending.mockResolvedValue(false);
    expect(await recoverAndroidPdfCaller(deps)).toBe("stale");
    expect(deps.navigate).not.toHaveBeenCalled(); expect(deps.consume).not.toHaveBeenCalled();
  });
  it("accepts bounded navigation metadata but no asset URL or arbitrary route", () => {
    expect(parseAndroidPdfReturnCheckpoint(JSON.stringify(checkpoint), now)).toEqual(checkpoint);
    expect(parseEstimatePdfReturnRoute("/request")).toEqual({ href: "/request", draftId: null });
  });
  it.each([
    { ownerUserId: "" }, { nonce: "bad" }, { sessionId: "../file" }, { version: 2 }, { phase: "other" },
    { createdAtMs: now + 1 }, { createdAtMs: now - ANDROID_PDF_RETURN_TTL_MS - 1 },
    { returnTo: "https://example.com/pdf?token=secret" }, { returnTo: "//example.com" },
    { returnTo: "/request?canonicalRevisionId=archived" }, { returnTo: "/request?draftId=foreign" },
    { returnTo: `/request?draftId=${draftId}&launchPayloadV1=other` },
  ])("rejects unsafe, expired or foreign-shaped metadata: %p", patch => {
    expect(parseAndroidPdfReturnCheckpoint(JSON.stringify({ ...checkpoint, ...patch }), now)).toBeNull();
  });
});
