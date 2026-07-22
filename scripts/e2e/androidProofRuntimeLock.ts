import fs from "node:fs";
import path from "node:path";

const LOCK_PATH = path.join(".release-runtime", "android-api34-proof-runtime.lock.json");

type AndroidProofRuntimeLockRecord = {
  schema: "android-api34-proof-runtime-lock-v1";
  run_id: string;
  kind: string;
  pid: number;
  created_at: string;
  out_dir: string;
};

export type AndroidProofRuntimeLockHandle = {
  path: string;
  record: AndroidProofRuntimeLockRecord;
  release: () => void;
};

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock(): AndroidProofRuntimeLockRecord | null {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")) as AndroidProofRuntimeLockRecord;
  } catch {
    return null;
  }
}

export function acquireAndroidProofRuntimeLock(input: {
  runId: string;
  kind: string;
  outDir: string;
}): AndroidProofRuntimeLockHandle {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  const record: AndroidProofRuntimeLockRecord = {
    schema: "android-api34-proof-runtime-lock-v1",
    run_id: input.runId,
    kind: input.kind,
    pid: process.pid,
    created_at: new Date().toISOString(),
    out_dir: input.outDir,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(LOCK_PATH, "wx");
      try {
        fs.writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      } finally {
        fs.closeSync(fd);
      }
      return {
        path: LOCK_PATH,
        record,
        release: () => {
          const current = readLock();
          if (current?.pid === process.pid && current.run_id === input.runId) {
            try {
              fs.unlinkSync(LOCK_PATH);
            } catch {
              // Another process should never remove our lock, but release must stay best-effort in finally.
            }
          }
        },
      };
    } catch (error) {
      const current = readLock();
      if (current?.pid && processAlive(current.pid)) {
        throw new Error(`ANDROID_PROOF_RUNTIME_LOCK_HELD:${current.pid}:${current.run_id}:${current.kind}`);
      }
      try {
        fs.unlinkSync(LOCK_PATH);
      } catch {
        // If a stale lock disappears between read and cleanup, retry creation.
      }
      if (attempt > 0) throw error;
    }
  }
  throw new Error("ANDROID_PROOF_RUNTIME_LOCK_CREATE_FAILED");
}
