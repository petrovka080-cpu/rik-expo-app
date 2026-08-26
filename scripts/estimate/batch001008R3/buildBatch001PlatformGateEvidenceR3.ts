import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const OUTPUT_DIR = resolve(".release-runtime/real-professional-estimates-r3/evidence/04-repair/batch001");
const WEB_DIR = resolve(OUTPUT_DIR, "platform-web-export");
const ANDROID_DIR = resolve(OUTPUT_DIR, "platform-android-export");
const ROUTER = resolve(".expo/types/router.d.ts");
const APK = resolve("android/app/build/outputs/apk/debug/app-debug.apk");
const OUTPUT = resolve(OUTPUT_DIR, "BATCH001_PLATFORM_GATES_R3.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }).sort();
}

function treeHash(root: string): { files: number; bytes: number; sha256: string } {
  const entries = files(root);
  const digest = createHash("sha256");
  let bytes = 0;
  for (const path of entries) {
    const body = readFileSync(path);
    bytes += body.byteLength;
    digest.update(path.slice(root.length).replaceAll("\\", "/"));
    digest.update("\0");
    digest.update(body);
    digest.update("\0");
  }
  return { files: entries.length, bytes, sha256: digest.digest("hex") };
}

function findAapt(): string {
  const buildTools = resolve("C:/Users/User/AppData/Local/Android/Sdk/build-tools");
  const versions = readdirSync(buildTools, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  const found = versions.map((version) => resolve(buildTools, version, "aapt.exe")).find(existsSync);
  invariant(found, "BATCH001_AAPT_MISSING");
  return found;
}

function quotedNumber(source: string, key: string): number {
  const match = new RegExp(`${key}[:=]'(\\d+)'`).exec(source);
  invariant(match, `BATCH001_AAPT_${key.toUpperCase()}_MISSING`);
  return Number(match[1]);
}

function main(): void {
  invariant(existsSync(ROUTER) && statSync(ROUTER).size > 1_000, "BATCH001_TYPED_ROUTES_MISSING");
  invariant(existsSync(resolve(WEB_DIR, "index.html")), "BATCH001_WEB_INDEX_MISSING");
  invariant(files(resolve(WEB_DIR, "_expo/static/js/web")).some((path) => /index-.*\.js$/u.test(path)),
    "BATCH001_WEB_BUNDLE_MISSING");
  const androidMetadata = JSON.parse(readFileSync(resolve(ANDROID_DIR, "metadata.json"), "utf8"));
  const androidBundle = resolve(ANDROID_DIR, String(androidMetadata.fileMetadata?.android?.bundle ?? ""));
  invariant(existsSync(androidBundle) && statSync(androidBundle).size > 1_000_000, "BATCH001_ANDROID_BUNDLE_MISSING");
  invariant(existsSync(APK) && statSync(APK).size > 1_000_000, "BATCH001_ANDROID_DEBUG_APK_MISSING");

  const aapt = findAapt();
  const badging = execFileSync(aapt, ["dump", "badging", APK], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const minSdk = quotedNumber(badging, "sdkVersion");
  const targetSdk = quotedNumber(badging, "targetSdkVersion");
  const compileSdk = quotedNumber(badging, "compileSdkVersion");
  invariant(minSdk <= 34, `BATCH001_ANDROID_API34_MIN_SDK_BLOCKED:${minSdk}`);

  const evidence = {
    contract: "real-professional-estimates-r3.batch001-platform-gates.v1",
    generatedAt: new Date().toISOString(),
    status: "GREEN_R3_BATCH001_EXPO_WEB_ANDROID_BUILD_GATES",
    gates: {
      typedRoutes: { status: "GREEN", path: ROUTER.replaceAll("\\", "/"), bytes: statSync(ROUTER).size, sha256: hashFile(ROUTER) },
      webExpoExport: { status: "GREEN", ...treeHash(WEB_DIR) },
      androidExpoExport: { status: "GREEN", bundle: androidBundle.replaceAll("\\", "/"), ...treeHash(ANDROID_DIR) },
      androidDebugApk: {
        status: "GREEN",
        path: APK.replaceAll("\\", "/"),
        bytes: statSync(APK).size,
        sha256: hashFile(APK),
        minSdk,
        targetSdk,
        compileSdk,
        api34InstallCompatibilityByMinSdk: minSdk <= 34,
      },
      androidApi34RuntimeMatrix: "NOT_RUN_IN_THIS_BUILD_GATE",
      fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
    },
    noReleaseDeployOtaMerge: true,
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const temporary = `${OUTPUT}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify({ ...evidence, payloadSha256: sha256(JSON.stringify(evidence)) }, null, 2)}\n`, "utf8");
  renameSync(temporary, OUTPUT);
  process.stdout.write(`${JSON.stringify({ status: evidence.status, output: OUTPUT, apk: evidence.gates.androidDebugApk }, null, 2)}\n`);
}

main();
