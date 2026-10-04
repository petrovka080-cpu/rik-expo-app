import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CanonicalEstimatePreliminaryNeedEvidence, CanonicalEstimatePreliminaryNeedEvidenceReference } from "./contracts";
import { canonicalPreliminaryNeedEvidenceIdentityMatches, isCanonicalPreliminaryNeedEvidence } from "./canonicalEstimatePreliminaryNeedTransport";

const CACHE_KEY = "@estimate-platform/preliminary-evidence/v1";
const MAX_BYTES = 1024 * 1024;
type Entry = { ownerUserId: string; evidence: CanonicalEstimatePreliminaryNeedEvidence };
type Envelope = { version: 1; entries: Entry[] };
let writeQueue: Promise<void> = Promise.resolve();

async function readEnvelope(): Promise<Envelope> {
  try {
    const parsed = JSON.parse(await AsyncStorage.getItem(CACHE_KEY) ?? "null") as Envelope | null;
    return parsed?.version === 1 && Array.isArray(parsed.entries)
      ? { version: 1, entries: parsed.entries.filter(entry => entry != null && typeof entry.ownerUserId === "string"
        && isCanonicalPreliminaryNeedEvidence(entry.evidence)) } : { version: 1, entries: [] };
  } catch { return { version: 1, entries: [] }; }
}

export async function readCachedCanonicalPreliminaryNeedEvidence(
  ownerUserId: string, reference: CanonicalEstimatePreliminaryNeedEvidenceReference,
): Promise<CanonicalEstimatePreliminaryNeedEvidence | null> {
  const envelope = await readEnvelope();
  return envelope.entries.find(entry => entry.ownerUserId === ownerUserId
    && canonicalPreliminaryNeedEvidenceIdentityMatches(reference, entry.evidence.reference))?.evidence ?? null;
}

/** One separate bounded copy; never insert fetched traces into durable BOQ/history items. */
export function cacheCanonicalPreliminaryNeedEvidence(ownerUserId: string, evidence: CanonicalEstimatePreliminaryNeedEvidence): Promise<void> {
  if (!ownerUserId || !isCanonicalPreliminaryNeedEvidence(evidence)) return Promise.reject(new Error("PRELIMINARY_NEED_EVIDENCE_INTEGRITY_FAILED"));
  const operation = writeQueue.then(async () => {
    const envelope = await readEnvelope();
    const entries = [{ ownerUserId, evidence }, ...envelope.entries.filter(entry => entry.ownerUserId === ownerUserId
      && !canonicalPreliminaryNeedEvidenceIdentityMatches(evidence.reference, entry.evidence.reference))].slice(0, 20);
    while (entries.length && new TextEncoder().encode(JSON.stringify({ version: 1, entries })).byteLength > MAX_BYTES) entries.pop();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, entries }));
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}
