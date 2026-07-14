import fs from "fs";
import path from "path";
import {
  auditProfessionalEstimateRiskReadiness,
} from "../../src/lib/estimate/auditProfessionalEstimateRiskReadiness";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-11610-risk-audit-5000-remediation");

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function streamEnd(stream: fs.WriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });
}

export async function runProfessionalEstimateRiskReadinessAuditCli(
  argv = process.argv.slice(2),
): Promise<void> {
  const args = new Set(argv);
  const writeSummary = args.has("--write-summary");
  const writeLedger = args.has("--write-ledger");
  const failOnOpenP0P1 = args.has("--fail-on-open-p0-p1");
  const outDir = writeSummary || writeLedger
    ? path.join(RUNTIME_ROOT, timestamp())
    : null;
  const summaryPath = outDir && writeSummary
    ? path.join(outDir, "professional-estimate-risk-summary.json")
    : null;
  const findingsPath = outDir && writeSummary
    ? path.join(outDir, "professional-estimate-risk-finding-sample.json")
    : null;
  const ledgerPath = outDir && writeLedger
    ? path.join(outDir, "professional-estimate-risk-ledger.jsonl")
    : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;

  const result = auditProfessionalEstimateRiskReadiness({
    findingSampleLimit: 24,
    onFinding: ledgerStream
      ? (entry) => {
          ledgerStream.write(`${JSON.stringify(entry)}\n`);
        }
      : undefined,
  });
  if (ledgerStream) await streamEnd(ledgerStream);

  if (summaryPath) writeJson(summaryPath, result.summary);
  if (findingsPath) writeJson(findingsPath, result.findings);

  const output = {
    ...result.summary,
    summary_artifact: summaryPath,
    finding_sample_artifact: findingsPath,
    risk_ledger_artifact: ledgerPath,
    finding_sample: result.findings.slice(0, 5),
  };
  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`${output.final_status}\n`);
    process.stdout.write(`catalog_total=${output.catalog_total}\n`);
    process.stdout.write(`catalog_audited=${output.catalog_audited}\n`);
    process.stdout.write(`p0_open_count=${output.p0_open_count}\n`);
    process.stdout.write(`p1_open_count=${output.p1_open_count}\n`);
    process.stdout.write(`upstream_unresolved_blockers_count=${output.upstream_unresolved_blockers_count}\n`);
  }
  if (failOnOpenP0P1 && output.open_findings_count > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditProfessionalEstimateRiskReadiness.ts")) {
  runProfessionalEstimateRiskReadinessAuditCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
