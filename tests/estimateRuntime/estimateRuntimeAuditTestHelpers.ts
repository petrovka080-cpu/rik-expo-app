import { execFileSync } from "node:child_process";
import path from "node:path";

const TSX_CLI = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const AUDIT_RUNNER = path.join(process.cwd(), "tests", "estimateRuntime", "runEstimateRuntimeAudit.ts");

export function runEstimateRuntimeAuditSummary<T>(mode: string): T {
  const stdout = execFileSync(process.execPath, [TSX_CLI, AUDIT_RUNNER, mode], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 900_000,
  });
  return JSON.parse(stdout) as T;
}
