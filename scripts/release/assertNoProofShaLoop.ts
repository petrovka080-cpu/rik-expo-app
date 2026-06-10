import fs from "node:fs";
import path from "node:path";

type ProofShaLoopFailure = {
  wave?: string;
  reason?: string;
  final_status?: string;
  timestamp?: string;
};

type ProofShaLoopResult = {
  final_status: "GREEN_NO_PROOF_SHA_LOOP" | "BLOCKED_PROOF_SHA_LOOP_DETECTED";
  checked_files: string[];
  stale_failures_for_wave: Record<string, number>;
  message: string;
  fake_green_claimed: false;
};

const STALE_PROOF_PATTERN = /stale proof|SOURCE_CODE_CHANGED_AFTER_PROOF|PROOF_SHA_LOOP|stale artifact/i;

function collectJsonFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const files: string[] = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(absolutePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(absolutePath);
    }
  }
  return files;
}

function readFailure(filePath: string): ProofShaLoopFailure | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ProofShaLoopFailure;
  } catch {
    return null;
  }
}

export function assertNoProofShaLoop(artifactRoot = path.join(process.cwd(), "artifacts")): ProofShaLoopResult {
  const files = collectJsonFiles(artifactRoot);
  const staleFailuresByWave = new Map<string, number>();

  for (const filePath of files) {
    const failure = readFailure(filePath);
    if (!failure) continue;
    const serialized = JSON.stringify(failure);
    if (!STALE_PROOF_PATTERN.test(serialized)) continue;
    const wave = failure.wave || path.basename(path.dirname(filePath));
    staleFailuresByWave.set(wave, (staleFailuresByWave.get(wave) ?? 0) + 1);
  }

  const staleFailuresForWave = Object.fromEntries([...staleFailuresByWave.entries()].sort());
  const loopDetected = Object.values(staleFailuresForWave).some((count) => count > 2);

  return {
    final_status: loopDetected ? "BLOCKED_PROOF_SHA_LOOP_DETECTED" : "GREEN_NO_PROOF_SHA_LOOP",
    checked_files: files.map((filePath) => path.relative(process.cwd(), filePath).replace(/\\/g, "/")),
    stale_failures_for_wave: staleFailuresForWave,
    message: loopDetected
      ? "Stop. Do not rerun full release blindly. Fix proof lineage / artifact-only supersession."
      : "No repeated stale proof loop detected.",
    fake_green_claimed: false,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("assertNoProofShaLoop.ts")) {
  const result = assertNoProofShaLoop();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== "GREEN_NO_PROOF_SHA_LOOP") {
    process.exitCode = 1;
  }
}
