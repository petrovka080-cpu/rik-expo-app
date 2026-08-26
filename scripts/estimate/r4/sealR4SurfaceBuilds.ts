import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { argument, invariant, type Json } from "./r4WorkGroupSurfaceShared";

const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const SOURCE_SHA_RE = /^[0-9a-f]{64}$/u;
const ROOT = resolve(".");
const EVIDENCE = resolve(".release-runtime/real-useful-estimates-r4/evidence/current-green");

type FileRow = { path: string; bytes: number; sha256: string };

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value: string): string {
  return value.replaceAll("\\", "/");
}

function files(root: string, directory = root): FileRow[] {
  const rows: FileRow[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) rows.push(...files(root, absolute));
    else if (entry.isFile()) {
      const bytes = readFileSync(absolute);
      rows.push({ path: normalize(relative(root, absolute)), bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}

function aggregate(rows: FileRow[]): Json {
  const serialized = `${rows.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n")}\n`;
  return {
    algorithm: "sorted relative path NUL bytes NUL sha256 LF aggregate",
    files: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    sha256: sha256(serialized),
  };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function buildTool(name: "aapt2.exe"): string {
  const sdk = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME
    ?? resolve(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  const roots = readdirSync(resolve(sdk, "build-tools"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  const path = resolve(sdk, "build-tools", roots[0] ?? "", name);
  invariant(existsSync(path), `R4_ANDROID_BUILD_TOOL_MISSING:${name}`);
  return path;
}

function apkSignerJar(): string {
  const path = resolve(dirname(buildTool("aapt2.exe")), "lib", "apksigner.jar");
  invariant(existsSync(path), "R4_ANDROID_APKSIGNER_JAR_MISSING");
  return path;
}

function command(commandPath: string, args: string[], buffer = false): string | Buffer {
  return execFileSync(commandPath, args, {
    cwd: ROOT,
    encoding: buffer ? "buffer" : "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  }) as string | Buffer;
}

function main(): void {
  const sourceSha = argument("source-sha");
  invariant(SOURCE_SHA_RE.test(sourceSha), "R4_SURFACE_SEAL_SOURCE_SHA_REQUIRED");
  const identityPath = resolve(EVIDENCE, "13_CURRENT_SOURCE_IDENTITY_R4.json");
  const identity = JSON.parse(readFileSync(identityPath, "utf8")) as Json;
  invariant(identity.status === "R4_CURRENT_SOURCE_IDENTITY_GREEN"
    && identity.exact_product_source_sha256 === sourceSha, "R4_SURFACE_SEAL_SOURCE_IDENTITY_RED");

  const webRoot = resolve(argument("web-root",
    ".release-runtime/real-useful-estimates-r4/runtime/web-build-current"));
  const webRows = files(webRoot);
  const webAggregate = aggregate(webRows);
  const primary = webRows.filter((row) => /^_expo\/static\/js\/web\/index-[^.]+\.js$/u.test(row.path))
    .sort((left, right) => right.bytes - left.bytes)[0];
  invariant(primary, "R4_WEB_PRIMARY_BUNDLE_MISSING");
  const primaryBytes = readFileSync(resolve(webRoot, primary.path));
  const webEmbedded = {
    exact_product_source_sha256: primaryBytes.includes(Buffer.from(sourceSha)),
    local_canonical_backend: primaryBytes.includes(Buffer.from("http://127.0.0.1:8765/canonical-estimate")),
    local_supabase_stub: primaryBytes.includes(Buffer.from("http://127.0.0.1:8199")),
  };
  invariant(Object.values(webEmbedded).every(Boolean), "R4_WEB_EMBEDDED_IDENTITY_RED");
  const web = {
    contract: "rik-expo-app-r4.web-production-build.v1",
    status: "GREEN_WEB_PRODUCTION_STATIC_BUILD",
    master_sha256: MASTER_SHA256,
    exact_product_source_sha256: sourceSha,
    build_profile: "expo-export-web-production",
    backend_origin: "http://127.0.0.1:8765/canonical-estimate",
    production_backend_accessed: false,
    output_root: normalize(relative(ROOT, webRoot)),
    aggregate: webAggregate,
    primary_bundle: primary,
    embedded_identity: webEmbedded,
    dev_server_or_metro_required: false,
    deploy_performed: false,
    release_performed: false,
  };

  const apkPath = resolve(argument("apk", "android/app/build/outputs/apk/release/app-release.apk"));
  const apkBytes = readFileSync(apkPath);
  const bundle = command("tar", ["-xOf", apkPath, "assets/index.android.bundle"], true) as Buffer;
  const signature = command("java", ["-jar", apkSignerJar(), "verify", "--verbose", "--print-certs", apkPath]) as string;
  const manifest = command(buildTool("aapt2.exe"), ["dump", "xmltree", apkPath, "--file", "AndroidManifest.xml"]) as string;
  const apkEmbedded = {
    exact_product_source_sha256: bundle.includes(Buffer.from(sourceSha)),
    local_canonical_backend: bundle.includes(Buffer.from("http://10.0.2.2:8765/canonical-estimate")),
    local_supabase_stub: bundle.includes(Buffer.from("http://10.0.2.2:8199")),
  };
  const manifestProof = {
    package_name: manifest.includes('package="com.azisbek_dzhantaev.rikexpoapp"'),
    normal_release_not_debuggable: !/android:debuggable[^\n]*=true/iu.test(manifest),
    not_test_only: !/android:testOnly[^\n]*=true/iu.test(manifest),
    scoped_network_security_config: manifest.includes("android:networkSecurityConfig"),
  };
  invariant(Object.values(apkEmbedded).every(Boolean), "R4_ANDROID_EMBEDDED_IDENTITY_RED");
  invariant(Object.values(manifestProof).every(Boolean), "R4_ANDROID_MANIFEST_PROOF_RED");
  invariant(signature.includes("Verified using v2 scheme (APK Signature Scheme v2): true"),
    "R4_ANDROID_APK_V2_SIGNATURE_RED");
  const android = {
    contract: "rik-expo-app-r4.android-normal-release-apk.v1",
    status: "GREEN_ANDROID_NORMAL_RELEASE_LOCAL_PROOF_APK",
    master_sha256: MASTER_SHA256,
    exact_product_source_sha256: sourceSha,
    build_profile: "gradle-assembleRelease-normal-embedded-bundle",
    apk: {
      path: normalize(relative(ROOT, apkPath)),
      bytes: statSync(apkPath).size,
      sha256: sha256(apkBytes),
    },
    embedded_bundle: {
      path: "assets/index.android.bundle",
      bytes: bundle.length,
      sha256: sha256(bundle),
      identity: apkEmbedded,
    },
    signature: {
      v2_verified: true,
      signer_certificate_sha256: signature.match(/Signer #1 certificate SHA-256 digest: ([0-9a-f]+)/iu)?.[1] ?? null,
      certificate_class: "LOCAL_DEBUG_CERTIFICATE_NOT_DEPLOY_SIGNING",
    },
    manifest: manifestProof,
    runtime_target: { device: "Pixel 7", api_level: 34 },
    dev_server_or_metro_required: false,
    production_backend_accessed: false,
    deploy_signing_performed: false,
    deploy_performed: false,
    release_performed: false,
  };

  atomicJson(resolve(EVIDENCE, "14_WEB_PRODUCTION_BUILD_R4.json"), web);
  atomicJson(resolve(EVIDENCE, "15_ANDROID_NORMAL_APK_R4.json"), android);
  process.stdout.write(`${JSON.stringify({ status: "GREEN_R4_SURFACE_BUILD_SEAL", source_sha: sourceSha,
    web_build_sha: webAggregate.sha256, apk_sha: android.apk.sha256 }, null, 2)}\n`);
}

main();
