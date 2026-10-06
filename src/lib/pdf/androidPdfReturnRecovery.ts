/** A caller checkpoint restores navigation only. It never authorizes a PDF,
 * creates an artifact, or replays a viewer session after process death. */
export type AndroidPdfReturnCheckpoint = Readonly<{
  version: 1;
  nonce: string;
  ownerUserId: string;
  createdAtMs: number;
  sessionId: string;
  returnTo: string;
  phase: "prepared" | "launched" | "returned";
}>;

export const ANDROID_PDF_RETURN_TTL_MS = 60 * 60 * 1_000;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu;

export function parseEstimatePdfReturnRoute(value: unknown):
  { href: string; draftId: string | null } | null {
  if (value === "/request") return { href: "/request", draftId: null };
  if (typeof value !== "string" || value.length > 256) return null;
  // A single exact workspace identity, never PDF identity, route keys, a
  // launch payload, another screen, or arbitrary query parameters.
  const match = /^\/request\?draftId=(consumer_draft_[A-Za-z0-9_-]{1,160})$/u.exec(value);
  return match ? { href: value, draftId: match[1]! } : null;
}

export function parseAndroidPdfReturnCheckpoint(raw: unknown, nowMs: number): AndroidPdfReturnCheckpoint | null {
  if (typeof raw !== "string" || raw.length > 1_024 || !Number.isFinite(nowMs)) return null;
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.version !== 1 || typeof value.nonce !== "string" || !uuid.test(value.nonce)
    || typeof value.ownerUserId !== "string" || !uuid.test(value.ownerUserId)
    || typeof value.createdAtMs !== "number" || !Number.isSafeInteger(value.createdAtMs)
    || value.createdAtMs > nowMs || nowMs - value.createdAtMs > ANDROID_PDF_RETURN_TTL_MS
    || typeof value.sessionId !== "string" || !/^session_[A-Za-z0-9_-]{1,160}$/u.test(value.sessionId)
    || !parseEstimatePdfReturnRoute(value.returnTo)
    || !["prepared", "launched", "returned"].includes(String(value.phase))) return null;
  return value as AndroidPdfReturnCheckpoint;
}

export type PdfReturnDraft = Readonly<{ id: string; consumerUserId: string; status: string; deletedAt?: string | null }>;

export async function recoverAndroidPdfCaller(args: {
  checkpoint: AndroidPdfReturnCheckpoint;
  ownerUserId: string;
  isCurrent: () => boolean;
  hasLiveSession: (sessionId: string) => boolean;
  readExactDraft: (draftId: string) => Promise<PdfReturnDraft | null>;
  isPending: (nonce: string) => Promise<boolean>;
  navigate: (href: string) => void;
  consume: (nonce: string) => Promise<boolean>;
}): Promise<"pending" | "discarded-owner" | "preserved-live" | "awaiting-caller" | "stale"> {
  const { checkpoint } = args;
  if (!args.isCurrent()) return "stale";
  if (checkpoint.ownerUserId !== args.ownerUserId) {
    await args.consume(checkpoint.nonce);
    return "discarded-owner";
  }
  if (checkpoint.phase !== "returned") return "pending";
  if (args.hasLiveSession(checkpoint.sessionId)) {
    await args.consume(checkpoint.nonce);
    return "preserved-live";
  }
  const route = parseEstimatePdfReturnRoute(checkpoint.returnTo);
  if (!route) throw new Error("ANDROID_PDF_RETURN_ROUTE_INVALID");
  let href = "/request";
  if (route.draftId) {
    const draft = await args.readExactDraft(route.draftId);
    if (!args.isCurrent()) return "stale";
    if (draft?.id === route.draftId && draft.consumerUserId === args.ownerUserId
      && draft.status === "draft" && !draft.deletedAt) href = route.href;
  }
  if (!await args.isPending(checkpoint.nonce) || !args.isCurrent()) return "stale";
  args.navigate(href);
  // replace schedules navigation; the root consumes only after observing the
  // exact authenticated caller. A failed or intercepted navigation retains it.
  return "awaiting-caller";
}
