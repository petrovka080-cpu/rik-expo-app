import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AsyncKeyValueStorage } from "../../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import { auditAndroidLogicalBundlesReadOnly } from "./androidArchiveReadOnlyDecoder";

const device = "emulator-5554";
const packageName = "com.azisbek_dzhantaev.rikexpoapp";
const adb = resolve(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const prefix = "rik.estimate_revision_durable.v1:";
function query(sql: string, maxBuffer = 1024 * 1024) {
  return execFileSync(adb, ["-s", device, "shell", "run-as", packageName,
    "sqlite3", "-readonly", "databases/RKStorage"], {
    input: `.bail on\nPRAGMA query_only=ON;\n${sql}\n`,
    encoding: "utf8", timeout: 30_000, windowsHide: true, maxBuffer,
  });
}
function literal(key: string) {
  if (!key.startsWith(prefix) || key.length > 4096) throw new Error("S2728_ARCHIVE_NAMESPACE_VIOLATION");
  return `'${key.replace(/'/gu, "''")}'`;
}
function rows(keys: readonly string[]): readonly (readonly [string, string | null])[] {
  if (!keys.length) return [];
  const output = query(`SELECT hex(key),hex(value) FROM catalystLocalStorage WHERE key IN (${keys.map(literal).join(",")});`, 72 * 1024 * 1024);
  const found = new Map(output.trim().split(/\r?\n/u).filter(Boolean).map(line => {
    const [key, value] = line.split("|");
    if (!key || value == null || !/^[0-9A-F]*$/u.test(key + value)) throw new Error("S2728_ARCHIVE_INVALID_HEX_READBACK");
    return [Buffer.from(key, "hex").toString("utf8"), Buffer.from(value, "hex").toString("utf8")] as const;
  }));
  return keys.map(key => [key, found.get(key) ?? null] as const);
}
const denyWrite = async (): Promise<never> => { throw new Error("S2728_ARCHIVE_AUDIT_WRITE_FORBIDDEN"); };
const storage: AsyncKeyValueStorage = {
  getItem: async key => rows([key])[0]?.[1] ?? null,
  multiGet: async keys => rows(keys),
  setItem: denyWrite, removeItem: denyWrite, multiSet: denyWrite, multiRemove: denyWrite,
};
function fingerprint() {
  const aggregate = query(`SELECT count(*),sum(length(cast(value as blob))) FROM catalystLocalStorage WHERE key GLOB '${prefix}*';`).trim().split("|").map(Number);
  const metadata = query(`SELECT hex(key),hex(value) FROM catalystLocalStorage WHERE key GLOB '${prefix}@pointer:*' OR key GLOB '${prefix}__*index*' ORDER BY key;`);
  return { recordCount: aggregate[0], utf8Bytes: aggregate[1], pointerIndexSha256: createHash("sha256").update(metadata).digest("hex") };
}
async function main() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  if (root.replace(/\\/gu, "/").toLowerCase() !== "c:/dev/rik-expo-app-r4a5-dc4f0ce7") throw new Error("S2728_ARCHIVE_NON_CANONICAL_ROOT");
  const sourceFiles = ["scripts/estimate/r4a13/androidArchiveReadOnlyDecoder.ts", "scripts/estimate/r4a13/auditS2728AndroidArchiveRecovery.ts", "src/lib/platform/estimateRevisionDurableStore.asyncStorage.ts", "src/lib/platform/estimateRevisionDurableStore.contract.ts", "src/lib/platform/compactConsumerRepairDurableState.ts"];
  const decoderSourceSha256 = createHash("sha256").update(JSON.stringify(sourceFiles.map(path => [path, createHash("sha256").update(readFileSync(path)).digest("hex")]))).digest("hex");
  const before = fingerprint();
  const decoded = await auditAndroidLogicalBundlesReadOnly(storage);
  const after = fingerprint();
  const stable = JSON.stringify(before) === JSON.stringify(after);
  const output = resolve(`.release-runtime/r568/s27-28/android-archive-integrity/recovery-${Date.now()}.json`);
  const receipt = {
    contract: "rik-expo-app.s27-28.android-archive-read-only-decoder.v1",
    status: "READ_ONLY_CHECKSUM_AND_DECODE_NOT_FULL_UI_RECOVERY_ACCEPTANCE",
    capturedAt: new Date().toISOString(), device, packageName,
    commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    decoderSourceSha256,
    before, after, pointerIndexAndAggregateStable: stable, ...decoded,
    allIndexedHeadsDecode: decoded.logicalKeyCount > 0 && decoded.invalidHeadCount === 0
      && decoded.headShapeIssueCount === 0 && decoded.headWithMissingCurrentRevisionCount === 0,
    allDeclaredPreviousDecode: decoded.invalidDeclaredPreviousCount === 0,
    databaseMutated: false, authRead: false, bodiesPersistedOrPrinted: false,
    limitations: ["SQL readback does not prove AsyncStorage/native CursorWindow latency", "Decoded history does not prove UI reopen of each revision or unsynced reconciliation", "Not a cold/warm performance or peak-memory gate", "No pointer repair, orphan cleanup or corruption injection on the real archive"],
    masterAccepted: false,
  };
  mkdirSync(resolve(".release-runtime/r568/s27-28/android-archive-integrity"), { recursive: true });
  writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ output, status: receipt.status, logicalKeys: decoded.logicalKeyCount, validHeads: decoded.validHeadCount, invalidHeads: decoded.invalidHeadCount, validPrevious: decoded.validPreviousCount, invalidDeclaredPrevious: decoded.invalidDeclaredPreviousCount, headDecodedRevisions: decoded.headDecodedRevisionCount, mutationAttempts: decoded.mutationAttempts, stable })}\n`);
  if (!stable || decoded.mutationAttempts || !decoded.logicalKeyCount) process.exitCode = 1;
}
void main().catch(() => { process.stderr.write("S2728_ARCHIVE_READ_ONLY_AUDIT_FAILED; no bodies or auth printed\n"); process.exitCode = 1; });
