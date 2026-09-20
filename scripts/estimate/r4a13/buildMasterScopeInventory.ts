import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  assertMasterScopeInventory,
  MASTER_CRITERION_GROUP_COUNTS,
  parseMasterCriteria,
  parseMasterTechnologyBenchmarks,
} from "./masterScopeInventory.shared";

const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-scope-inventory-v1");
const CONTRACT = "rik-expo-app.r4-a13-6.s20-master-scope-inventory.v1";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeAtomic(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, value, "utf8");
  renameSync(pending, path);
}

const masterBytes = readFileSync(MASTER_PATH, "utf8");
const criteria = parseMasterCriteria(masterBytes);
const benchmarks = parseMasterTechnologyBenchmarks(masterBytes);
assertMasterScopeInventory({ criteria, benchmarks });

const report = {
  schemaVersion: CONTRACT,
  generatedAt: new Date().toISOString(),
  master: {
    path: MASTER_PATH.replaceAll("\\", "/"),
    sha256: sha256(masterBytes),
  },
  status: "INVENTORY_GREEN_ACCEPTANCE_OPEN",
  boundary: "This proves scope preservation only. It does not mark any criterion or technological benchmark accepted.",
  counts: {
    criteria: criteria.length,
    uniqueCriterionIds: new Set(criteria.map((criterion) => criterion.id)).size,
    criterionGroups: MASTER_CRITERION_GROUP_COUNTS,
    technologicalBenchmarks: benchmarks.length,
  },
  criteria: criteria.map((criterion) => ({ ...criterion, acceptanceStatus: "NOT_EVALUATED" })),
  technologicalBenchmarks: benchmarks.map((benchmark) => ({
    ...benchmark,
    stableCaseMappingStatus: "NOT_EVALUATED",
    contentAcceptanceStatus: "NOT_EVALUATED",
    webAcceptanceStatus: "NOT_EVALUATED",
    androidAcceptanceStatus: "NOT_EVALUATED",
  })),
  activationPerformed: false,
  deployPerformed: false,
  otaPerformed: false,
};
const canonical = `${JSON.stringify(report, null, 2)}\n`;
const reportSha256 = sha256(canonical);
writeAtomic(resolve(OUTPUT_ROOT, "master-scope-inventory.json"), canonical);
writeAtomic(resolve(OUTPUT_ROOT, "master-scope-inventory.sha256"),
  `${reportSha256}  master-scope-inventory.json\n`);
writeAtomic(resolve(OUTPUT_ROOT, "master-scope-inventory.md"), [
  "# S20 MASTER scope inventory",
  "",
  `MASTER SHA-256: \`${report.master.sha256}\``,
  "",
  `Report SHA-256: \`${reportSha256}\``,
  "",
  `- Criterion IDs: ${report.counts.criteria}; unique: ${report.counts.uniqueCriterionIds}.`,
  `- Technological benchmarks: ${report.counts.technologicalBenchmarks}.`,
  "- Inventory is GREEN; criterion and benchmark acceptance remains open until primary evidence is mapped and reviewed.",
  "- No activation, deployment or OTA was performed.",
  "",
].join("\n"));

process.stdout.write(`${JSON.stringify({
  status: report.status,
  outputRoot: OUTPUT_ROOT,
  masterSha256: report.master.sha256,
  reportSha256,
  counts: report.counts,
}, null, 2)}\n`);
