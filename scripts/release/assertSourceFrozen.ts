import { computeReleaseFingerprints } from "./computeReleaseFingerprints";
import { loadReleaseCandidate, listSourceWorktreeChanges } from "./releaseCandidateState";

export function assertSourceFrozen(): void {
  const candidate = loadReleaseCandidate();
  if (candidate.state === "DEVELOPING" || candidate.state === "CANCELLED_SOURCE_CHANGED_AFTER_FREEZE") {
    throw new Error(`BLOCKED_SOURCE_NOT_FROZEN:${candidate.state}`);
  }
  const current = computeReleaseFingerprints();
  if (current.sourceTreeHash !== candidate.sourceTreeHash) {
    throw new Error("BLOCKED_SOURCE_CHANGED_AFTER_FREEZE");
  }
  const sourceChanges = listSourceWorktreeChanges();
  if (sourceChanges.length > 0) {
    throw new Error(`BLOCKED_SOURCE_DIRTY_AFTER_FREEZE:${sourceChanges.join(",")}`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/release/assertSourceFrozen.ts")) {
  assertSourceFrozen();
  console.log(JSON.stringify({ source_frozen: true, fake_green_claimed: false }, null, 2));
}
