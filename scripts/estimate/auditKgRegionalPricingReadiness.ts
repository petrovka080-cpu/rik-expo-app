import fs from "fs";
import path from "path";
import {
  auditKgRegionalPricingReadiness,
} from "../../src/lib/estimate/auditKgRegionalPricingReadiness";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-11610-kg-regional-pricing");

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, values: readonly unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

export function runKgRegionalPricingReadinessAuditCli(argv = process.argv.slice(2)): void {
  const args = new Set(argv);
  const writeSummary = args.has("--write-summary");
  const writeLedger = args.has("--write-ledger");
  const writePriceKeys = args.has("--write-price-keys");
  const failOnBlocker = args.has("--fail-on-blocker");
  const outDir = writeSummary || writeLedger || writePriceKeys
    ? path.join(RUNTIME_ROOT, timestamp())
    : null;
  const summaryPath = outDir && writeSummary ? path.join(outDir, "kg-regional-pricing-summary.json") : null;
  const ledgerPath = outDir && writeLedger ? path.join(outDir, "kg-regional-pricing-blocker-ledger.jsonl") : null;
  const priceKeysPath = outDir && writePriceKeys ? path.join(outDir, "kg-regional-pricing-price-keys.jsonl") : null;
  const samplesPath = outDir && writeSummary ? path.join(outDir, "kg-regional-pricing-resource-samples.json") : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;
  const result = auditKgRegionalPricingReadiness({
    includePriceKeys: writePriceKeys,
    onBlocker: ledgerStream
      ? (entry) => {
          ledgerStream.write(`${JSON.stringify(entry)}\n`);
        }
      : undefined,
    sampleLimit: 24,
  });
  ledgerStream?.end();

  if (summaryPath) writeJson(summaryPath, result.summary);
  if (priceKeysPath) writeJsonl(priceKeysPath, result.price_keys ?? []);
  if (samplesPath) writeJson(samplesPath, result.resource_samples);

  const output = {
    ...result.summary,
    summary_artifact: summaryPath,
    blocker_ledger_artifact: ledgerPath,
    price_keys_artifact: priceKeysPath,
    resource_samples_artifact: samplesPath,
    blocker_sample: result.blockers.slice(0, 5),
  };
  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`${output.final_status}\n`);
    process.stdout.write(`catalog_total=${output.catalog_total}\n`);
    process.stdout.write(`price_key_coverage_percent=${output.price_key_coverage_percent}\n`);
    process.stdout.write(`blocker_ledger_entries=${output.blocker_ledger_entries}\n`);
  }
  if (failOnBlocker && result.summary.mandatory_blockers_count > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditKgRegionalPricingReadiness.ts")) {
  runKgRegionalPricingReadinessAuditCli();
}
