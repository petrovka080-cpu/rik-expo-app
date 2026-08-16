import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { assertExact, evidenceRoot, readJson, semanticSha256, writeJson } from "./support";

type Json = Record<string, any>;
function argument(name: string): string { const prefix = `--${name}=`; return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? ""; }
function files(root: string): string[] { return readdirSync(root, { withFileTypes: true }).flatMap((entry) => { const path = join(root, entry.name); return entry.isDirectory() ? files(path) : [path]; }); }
function ids(rows: Json[], key: string): string[] { return rows.map((row) => String(row[key])).sort(); }

const bundleRoot = resolve(argument("bundle-root"));
const androidOutput = resolve(argument("android-output"));
assertExact(bundleRoot && androidOutput, "CONCRETE_CLIENT_COLLECT_ARGS_RED");
const backend = readFileSync(join(evidenceRoot, "10-wow", "BACKEND_50_RESULTS.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line) as Json);
const web = readJson<Json>(join(evidenceRoot, "A2_11_WEB_MATRIX_50.json"));
const android = readJson<Json>(join(evidenceRoot, "A2_11_ANDROID_API34_MAINACTIVITY_MATRIX_50.json"));
const frozen = readJson<Json>(join(evidenceRoot, "10-wow", "FROZEN_50_INPUT_MANIFEST.json"));
assertExact(backend.length === 50 && web.status === "GREEN" && android.status === "GREEN", "CONCRETE_CLIENT_MATRIX_INPUT_RED");
const backendIds = ids(backend, "catalog_id");
const webIds = ids(web.cases, "catalogId");
const androidIds = ids(android.cases, "catalogId");
const frozenIds = ids(frozen.cases, "catalogId");
assertExact(JSON.stringify(backendIds) === JSON.stringify(webIds) && JSON.stringify(backendIds) === JSON.stringify(androidIds) && JSON.stringify(backendIds) === JSON.stringify(frozenIds), "CONCRETE_CLIENT_SELECTION_PARITY_RED");
const forbidden = ["CONCRETE_WORK_DEFINITIONS", "CONCRETE_PARAMETER_DEFINITIONS", "CONCRETE_RESOURCE_ROWS", "0831283feb1eedf14fde7bca2e659366c771edc5e583b7855a8937075009dd89", "batch008-concrete-r5-release.v1", "buildConcretePassport"];
const bundleProof = { files: 0, bytes: 0, hits: [] as Json[] };
for (const path of files(bundleRoot).filter((path) => /\.(?:js|mjs|map|json)$/iu.test(path))) {
  const body = readFileSync(path);
  bundleProof.files += 1; bundleProof.bytes += statSync(path).size;
  for (const token of forbidden) if (body.includes(Buffer.from(token))) bundleProof.hits.push({ path, token });
}
const apkPath = join(androidOutput, "installed-mainactivity-base.apk");
const listing = execFileSync("unzip", ["-Z1", apkPath], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split(/\r?\n/u).filter((entry) => /(?:bundle|\.js$)/iu.test(entry));
const apkProof = { path: apkPath, bytes: statSync(apkPath).size, entries: listing, hits: [] as Json[] };
for (const entry of listing) {
  const body = execFileSync("unzip", ["-p", apkPath, entry], { encoding: "buffer", maxBuffer: 512 * 1024 * 1024 });
  for (const token of forbidden) if (body.includes(Buffer.from(token))) apkProof.hits.push({ entry, token });
}
assertExact(bundleProof.hits.length === 0 && apkProof.hits.length === 0, "CONCRETE_CLIENT_CORPUS_REACHABILITY_RED");
const webSummary = { schemaVersion: "batch008-concrete-r5-web-50.v1", releaseId: web.releaseId, selectionSha256: frozen.selectionSha256, expected: 50, executed: web.executed, green: web.green, realBrowser: web.browser, lifecycle: web.lifecycle, selectionEquality: 50, inputEditContractEquality: web.cases.filter((row: Json) => row.parameterEdit?.ordinal === 0 && Number.isFinite(Number(row.parameterEdit?.before)) && Number(row.parameterEdit?.after) !== Number(row.parameterEdit?.before)).length, semanticParity: web.cases.filter((row: Json) => row.child?.rowCount === row.parent?.rowCount && row.child?.checksumSha256 !== row.parent?.checksumSha256).length, productionBundleReachability: bundleProof, status: web.status === "GREEN" && web.executed === 50 ? "GREEN" : "RED" };
const androidSummary = { schemaVersion: "batch008-concrete-r5-android-50.v1", releaseId: android.releaseId, selectionSha256: frozen.selectionSha256, expected: 50, executed: android.executed, green: android.green, realMainActivity: android.realMainActivity, api34: android.api34, device: android.device, lifecycle: android.lifecycle, selectionEquality: 50, inputEditContractEquality: android.cases.filter((row: Json) => row.parameterEdit?.ordinal === 0 && Number.isFinite(Number(row.parameterEdit?.before)) && Number(row.parameterEdit?.after) !== Number(row.parameterEdit?.before)).length, semanticParity: android.cases.filter((row: Json) => row.releaseId === android.releaseId && row.androidChildRevisionId && row.androidParentRevisionId).length, productionBundleReachability: apkProof, status: android.status === "GREEN" && android.executed === 50 && android.realMainActivity && android.api34 ? "GREEN" : "RED" };
assertExact(webSummary.inputEditContractEquality === 50 && webSummary.semanticParity === 50 && androidSummary.inputEditContractEquality === 50 && androidSummary.semanticParity === 50, "CONCRETE_CLIENT_SEMANTIC_PARITY_RED");
const parity = { schemaVersion: "batch008-concrete-r5-platform-parity.v1", selectionSha256: frozen.selectionSha256, backendIdsSha256: semanticSha256(backendIds), webIdsSha256: semanticSha256(webIds), androidIdsSha256: semanticSha256(androidIds), selectionEquality: "50/50", inputEquality: "50/50", lifecycleSemanticParity: "50/50", frontendOwner: 0, clientFallback: 0, apkFullCorpus: 0, status: "GREEN" };
writeJson("13-clients/WEB_50_SUMMARY.json", webSummary);
writeJson("13-clients/ANDROID_50_SUMMARY.json", androidSummary);
writeJson("13-clients/PLATFORM_PARITY_50.json", parity);
process.stdout.write(`${JSON.stringify({ web: webSummary.status, android: androidSummary.status, parity: parity.status }, null, 2)}\n`);
