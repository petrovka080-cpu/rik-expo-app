import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Exact test device/application, read-only SQL. No authentication records or
// revision bodies leave the device; only aggregate integrity counts do.
const device = "emulator-5554";
const packageName = "com.azisbek_dzhantaev.rikexpoapp";
const adb = resolve(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const sql = `.bail on
PRAGMA query_only=ON;
ATTACH DATABASE 'file:files/RKStorage-s27-26-pre-hydration-cleanup.sqlite?mode=ro' AS saved;
SELECT 'current_durable',count(*),sum(length(cast(value as blob))) FROM catalystLocalStorage WHERE key GLOB 'rik.estimate_revision_durable.v1:*';
SELECT 'saved_durable',count(*),sum(length(cast(value as blob))) FROM saved.catalystLocalStorage WHERE key GLOB 'rik.estimate_revision_durable.v1:*';
SELECT 'saved_characters',sum(length(value)) FROM saved.catalystLocalStorage WHERE key GLOB 'rik.estimate_revision_durable.v1:*';
SELECT 'missing_saved_keys',count(*) FROM saved.catalystLocalStorage s LEFT JOIN main.catalystLocalStorage c ON c.key=s.key WHERE s.key GLOB 'rik.estimate_revision_durable.v1:*' AND c.key IS NULL;
SELECT 'different_saved_values',count(*) FROM saved.catalystLocalStorage s JOIN main.catalystLocalStorage c ON c.key=s.key WHERE s.key GLOB 'rik.estimate_revision_durable.v1:*' AND c.value<>s.value;
SELECT 'changed_logical_indexes',count(*) FROM saved.catalystLocalStorage s JOIN main.catalystLocalStorage c ON c.key=s.key WHERE s.key='rik.estimate_revision_durable.v1:__logical_key_index__' AND c.value<>s.value;
SELECT 'changed_revision_indexes',count(*) FROM saved.catalystLocalStorage s JOIN main.catalystLocalStorage c ON c.key=s.key WHERE s.key GLOB 'rik.estimate_revision_durable.v1:__revision_index__:*' AND c.value<>s.value;
SELECT 'changed_pointers',count(*) FROM saved.catalystLocalStorage s JOIN main.catalystLocalStorage c ON c.key=s.key WHERE s.key GLOB 'rik.estimate_revision_durable.v1:@pointer:*' AND c.value<>s.value;
SELECT 'changed_immutable_records',count(*) FROM saved.catalystLocalStorage s JOIN main.catalystLocalStorage c ON c.key=s.key WHERE s.key GLOB 'rik.estimate_revision_durable.v1:@revision:*' AND c.value<>s.value;
`;

const raw = execFileSync(adb, ["-s", device, "shell", "run-as", packageName,
  "sqlite3", "-readonly", "databases/RKStorage"], {
  input: sql, encoding: "utf8", timeout: 30_000, windowsHide: true, maxBuffer: 8192,
});
const counts = Object.fromEntries(raw.trim().split(/\r?\n/u).map((line) => {
  const [label, ...numbers] = line.split("|");
  if (!/^(?:current_durable|saved_durable|saved_characters|missing_saved_keys|different_saved_values|changed_logical_indexes|changed_revision_indexes|changed_pointers|changed_immutable_records)$/u.test(label!)
    || numbers.some((number) => !/^\d+$/u.test(number))) {
    throw new Error("S2728_ARCHIVE_NON_AGGREGATE_RESULT");
  }
  return [label, numbers.map(Number)];
}));
const receipt = {
  contract: "rik-expo-app.s27-28.android-archive-integrity.v1",
  capturedAt: new Date().toISOString(), device, packageName, counts,
  countUnits: { current_durable: ["records", "utf8_bytes"], saved_durable: ["records", "utf8_bytes"], saved_characters: ["sqlite_unicode_characters"] },
  status: "READBACK_ONLY_NOT_FULL_REVISION_RECOVERY_ACCEPTANCE",
  comparedAgainst: "files/RKStorage-s27-26-pre-hydration-cleanup.sqlite",
  bodiesAndAuthCaptured: false, databaseMutated: false,
  limitation: "Changed mutable heads/manifests require revision-level investigation; counts alone do not prove every revision can reopen.",
};
const output = resolve(".release-runtime/r568/s27-28/android-archive-integrity/readback.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(receipt)}\n`);
