import fs from "node:fs";
import path from "node:path";

export type RuntimeLockName =
  | "web-8081"
  | "android-metro-8100"
  | "android-api34"
  | "full-jest"
  | "release-verify";

export type RuntimeLock = {
  pid: number;
  port?: number;
  candidate_id: string;
  source_tree_hash: string;
  started_at: string;
  fake_green_claimed: false;
};

const LOCK_DIR = path.join(process.cwd(), ".tmp", "runtime-locks");

function lockPath(name: RuntimeLockName): string {
  return path.join(LOCK_DIR, `${name}.json`);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readRuntimeLock(name: RuntimeLockName): RuntimeLock | null {
  const filePath = lockPath(name);
  if (!fs.existsSync(filePath)) return null;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as RuntimeLock;
  return parsed;
}

export function acquireRuntimeLock(name: RuntimeLockName, lock: Omit<RuntimeLock, "fake_green_claimed">): RuntimeLock {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const current = readRuntimeLock(name);
  if (current && pidAlive(current.pid)) {
    return current;
  }
  if (current && !pidAlive(current.pid)) {
    fs.rmSync(lockPath(name), { force: true });
  }
  const next: RuntimeLock = { ...lock, fake_green_claimed: false };
  fs.writeFileSync(lockPath(name), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function releaseRuntimeLock(name: RuntimeLockName): void {
  fs.rmSync(lockPath(name), { force: true });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/release/runtimeLock.ts")) {
  const name = process.argv[2] as RuntimeLockName | undefined;
  if (!name) throw new Error("Usage: tsx scripts/release/runtimeLock.ts <lock-name>");
  console.log(JSON.stringify(readRuntimeLock(name), null, 2));
}
