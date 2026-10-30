import { Platform } from "react-native";
import { prepareAndPreviewPdfDocument } from "./pdfDocumentActions";
import { createPdfDocumentDescriptor, type DocumentDescriptor } from "./pdfDocument";
import { clearDocumentSessions, getDocumentSessionSnapshot } from "./pdfDocumentSessions";
import { createModalAwarePdfOpener } from "../pdf/pdf.runner";
import { withPdfActorBoundary, type PdfDeliveryBoundary } from "../pdf/withPdfActorBoundary";
import { observeSessionBoundaryPrincipal } from "../session/sessionBoundary";
import { markPdfOpenVisible, resetPdfOpenFlowStateForTests } from "../pdf/pdfOpenFlow";
import { createPdfActionBoundaryKey } from "../pdf/pdfActionBoundary";

const mockPush = jest.fn(); let mockActor = "actor-A";
const mockSubscribers = new Set<(event: string, session: { user: { id: string } }) => void>();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("../supabaseClient", () => ({ SUPABASE_ANON_KEY: "fixture-public" }));
// External telemetry/native rendering providers are irrelevant to these remote
// Web sources. Runner/actions/key owner/viewer entry/session registry are REAL.
jest.mock("../api/pdf", () => ({ openHtmlAsPdfUniversal: jest.fn() }));
jest.mock("../observability/sentry", () => ({ traceAsync: (_name: unknown, _options: unknown, work: () => Promise<unknown>) => work() }));
const auth = {
  getSession: async () => ({ data: { session: { user: { id: mockActor } } }, error: null }),
  onAuthStateChange: (callback: (event: string, session: { user: { id: string } }) => void) => {
    mockSubscribers.add(callback); return { data: { subscription: { unsubscribe: () => mockSubscribers.delete(callback) } } };
  },
};
// Pinned to the inspected canonicalProfessionalPdf.ts source in the manifest.
const rendererVersion = "canonical-professional-pdf.r4-a13-functional-generated-resource-names-template93";
function emit(actor: string) { mockActor = actor; for (const callback of [...mockSubscribers]) callback("SIGNED_IN", { user: { id: actor } }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function until(check: () => boolean) { for (let i = 0; i < 200 && !check(); i++) await Promise.resolve(); expect(check()).toBe(true); }
function descriptor(id: string): DocumentDescriptor {
  return createPdfDocumentDescriptor({ uri: `https://fixture.invalid/${id}.pdf`, title: "Предварительный отчёт сохранённой сметы", documentType: "request", originModule: "reports", source: "generated", entityId: id,
    contentIdentity: { revisionId: `revision-${id}`, releaseId: "release-one", definitionVersionId: "definition-one", checksumSha256: "a".repeat(64), issuancePurpose: "PRELIMINARY_REVIEW", documentStatus: "PRELIMINARY_READ", rendererVersion, ownerUserId: mockActor, viewerUserId: mockActor, currency: "KGS" },
  });
}
const hrefs = () => mockPush.mock.calls.map(call => new URL(String(call[0]), "https://fixture.invalid"));
function showAll() { for (const href of hrefs()) markPdfOpenVisible(href.searchParams.get("openToken")); }
function snapshot(index: number) { return getDocumentSessionSnapshot(hrefs()[index].searchParams.get("sessionId")!); }
beforeEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  mockActor = "actor-A"; observeSessionBoundaryPrincipal(mockActor); mockPush.mockReset(); clearDocumentSessions(); resetPdfOpenFlowStateForTests();
});
afterEach(() => { showAll(); clearDocumentSessions(); resetPdfOpenFlowStateForTests(); expect(mockSubscribers.size).toBe(0); });

it("ConsumerRepair saved-report no-key contract preserves each document's own ready session", async () => {
  // Exact public call shape used at ConsumerRepairRequestScreen.tsx:2303: no
  // key/label/boundary, real descriptor with saved PRELIMINARY_REVIEW identity.
  // Its upstream revision/authority checks remain outside this entry test.
  const docs = [descriptor("saved-A"), descriptor("saved-B")]; const originals = docs.map(doc => JSON.stringify(doc));
  const tasks = docs.map(doc => prepareAndPreviewPdfDocument({ supabase: {}, descriptor: doc, router: { push: mockPush }, returnTo: "/request?draftId=" + doc.entityId, callerRouteKey: "actual-caller-key" }));
  try {
    await until(() => mockPush.mock.calls.length === 2);
    await until(() => snapshot(0).session?.status === "ready" && snapshot(1).session?.status === "ready");
    expect(snapshot(0).asset?.entityId).toBe("saved-A"); expect(snapshot(1).asset?.entityId).toBe("saved-B");
    expect(snapshot(0).asset?.contentIdentity).toEqual(docs[0].contentIdentity); expect(snapshot(1).asset?.contentIdentity).toEqual(docs[1].contentIdentity);
    expect(hrefs().map(href => href.searchParams.get("returnTo"))).toEqual(["/request?draftId=saved-A", "/request?draftId=saved-B"]);
    expect(docs.map(doc => JSON.stringify(doc))).toEqual(originals);
  } finally { showAll(); await Promise.allSettled(tasks); }
  const result = await Promise.all(tasks); expect(result.map(doc => doc.entityId)).toEqual(["saved-A", "saved-B"]);
});

it.each(["", "  "])("actual modal caller/factory runner and lower action owner keep different unkeyed %p documents separate", async key => {
  const opener = createModalAwarePdfOpener(undefined); const factories = [jest.fn(async () => descriptor("factory-A")), jest.fn(async () => descriptor("factory-B"))];
  const tasks = factories.map(createDescriptor => withPdfActorBoundary(auth, async (_assert, _actor, deliveryBoundary) => opener.prepareAndPreviewFromDescriptorFactory({ supabase: {}, key, label: "Open", createDescriptor, deliveryBoundary, router: { push: mockPush } })));
  try {
    await until(() => mockPush.mock.calls.length === 2);
    expect(factories.map(factory => factory.mock.calls.length)).toEqual([1, 1]);
    await until(() => snapshot(0).session?.status === "ready" && snapshot(1).session?.status === "ready");
    expect([snapshot(0).asset?.entityId, snapshot(1).asset?.entityId]).toEqual(["factory-A", "factory-B"]);
  } finally { showAll(); await Promise.allSettled(tasks); }
  expect((await Promise.all(tasks)).map(doc => doc.entityId)).toEqual(["factory-A", "factory-B"]);
});

it("legal explicit same-actor key joins at the REAL lower actions owner", async () => {
  const opener = createModalAwarePdfOpener(undefined);
  const tasks = [0, 1].map(() => withPdfActorBoundary(auth, async (_assert, _actor, deliveryBoundary) => opener.prepareAndPreview({ supabase: {}, key: "saved:exact-request", label: "Open", descriptor: { ...descriptor("same-saved"), deliveryBoundary }, router: { push: mockPush } })));
  try {
    await until(() => mockPush.mock.calls.length === 1 && snapshot(0).session?.status === "ready");
    for (let i = 0; i < 30; i++) await Promise.resolve();
    expect(mockPush).toHaveBeenCalledTimes(1);
  } finally { showAll(); await Promise.allSettled(tasks); }
  const result = await Promise.all(tasks); expect(result[0]).toBe(result[1]); expect(result[0].entityId).toBe("same-saved");
});

it.each(["actor-B", "A-B-A"])("a captured lower action cannot deliver after modal await %s and the replacement opens its own same-key result", async replacement => {
  const dismiss = deferred<void>(); const entered = deferred<void>();
  let oldBoundary!: PdfDeliveryBoundary;
  const old = withPdfActorBoundary(auth, async (_assert, _actor, deliveryBoundary) => {
    oldBoundary = deliveryBoundary;
    return createModalAwarePdfOpener(async () => { entered.resolve(); await dismiss.promise; }).prepareAndPreview({ supabase: {}, key: "same-request", label: "Open", descriptor: { ...descriptor("old-A"), deliveryBoundary }, router: { push: mockPush } });
  });
  const oldOutcome = old.then(() => null, error => error);
  await entered.promise; emit("actor-B"); if (replacement === "A-B-A") emit("actor-A");
  expect(() => oldBoundary.assertActive()).toThrow("actor changed");
  const fresh = withPdfActorBoundary(auth, async (_assert, actor, deliveryBoundary) => createModalAwarePdfOpener(undefined).prepareAndPreview({ supabase: {}, key: "same-request", label: "Open", descriptor: { ...descriptor("fresh-" + actor), deliveryBoundary }, router: { push: mockPush } }));
  try { await until(() => mockPush.mock.calls.length === 1 && snapshot(0).session?.status === "ready"); }
  finally { dismiss.resolve(); showAll(); await Promise.allSettled([old, fresh]); }
  expect((await oldOutcome)?.message).toContain("actor changed");
  expect((await fresh).entityId).toBe("fresh-" + mockActor); expect(mockPush).toHaveBeenCalledTimes(1);
});

it("the existing key owner still supplies descriptor identity when a caller omits key", () => {
  const a = descriptor("saved-A"); const b = descriptor("saved-B");
  const key = (doc: DocumentDescriptor) => createPdfActionBoundaryKey({ documentType: doc.documentType, originModule: doc.originModule, entityId: doc.entityId, fileName: doc.fileName, uri: doc.uri });
  expect(key(a)).not.toBe(key(b));
});
