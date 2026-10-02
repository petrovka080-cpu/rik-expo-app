import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { chromium } from "playwright";

const DEVICE_ID = "emulator-5554";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const PROFILE = resolve(".release-runtime/r568/s27-14/tmp-chrome-session-probe");

function runAdb(args: string[], input?: string): string {
  const result = spawnSync("adb", ["-s", DEVICE_ID, ...args], {
    input,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("ANDROID_SESSION_ADB_RED");
  return result.stdout.trim();
}

async function main(): Promise<void> {
  const context = await chromium.launchPersistentContext(PROFILE, { headless: true });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto("http://localhost:8101/request", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  const entries = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => /^sb-[a-z0-9]+-auth-token$/iu.test(key) && key !== "sb-127-auth-token"));
  await context.close();
  if (entries.length !== 1) throw new Error(`STAGING_SESSION_KEY_COUNT_${entries.length}`);
  const [key, value] = entries[0];
  if (!value || value.length < 500) throw new Error("STAGING_SESSION_VALUE_INVALID");

  runAdb(["shell", "am", "force-stop", PACKAGE_NAME]);
  const sqlKey = key.replace(/'/gu, "''");
  const valueHex = Buffer.from(value, "utf8").toString("hex");
  const changed = runAdb(
    ["shell", "run-as", PACKAGE_NAME, "sqlite3", "databases/RKStorage"],
    `insert or replace into catalystLocalStorage(key,value) values('${sqlKey}',CAST(X'${valueHex}' AS TEXT));select changes();`,
  ).split(/\r?\n/u).at(-1);
  if (changed !== "1") throw new Error("ANDROID_SESSION_WRITE_RED");
  const storedLength = Number(runAdb(
    ["shell", "run-as", PACKAGE_NAME, "sqlite3", "databases/RKStorage"],
    `select length(value) from catalystLocalStorage where key='${sqlKey}';`,
  ));
  if (storedLength !== value.length) throw new Error("ANDROID_SESSION_VERIFY_RED");

  process.stdout.write(`${JSON.stringify({
    status: "ANDROID_DEVELOPER_SESSION_SEEDED",
    keyFingerprint: createHash("sha256").update(key).digest("hex").slice(0, 12),
    storedLength,
    secretsPrinted: false,
    credentialsPersistedOutsideProviderStorage: false,
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
