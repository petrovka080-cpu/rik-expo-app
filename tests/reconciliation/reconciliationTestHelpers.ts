import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS,
  AI_ESTIMATE_PLATFORM_RECONCILIATION_PREFIX,
  writeAiEstimatePlatformCurrentStateReconciliationLedger,
} from "../../scripts/audit/runAiEstimatePlatformCurrentStateReconciliationLedger";

type JsonRecord = Record<string, unknown>;

let generated = false;

function artifactPath(name: string): string {
  return path.join(process.cwd(), "artifacts", AI_ESTIMATE_PLATFORM_RECONCILIATION_PREFIX, name);
}

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

export function ensureReconciliationLedger(): void {
  if (generated) return;
  const matrixPath = artifactPath("matrix.json");
  let shouldGenerate = true;
  if (fs.existsSync(matrixPath)) {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as JsonRecord;
    shouldGenerate =
      matrix.final_status !== AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS ||
      matrix.latest_head_sha !== currentHead();
  }
  if (shouldGenerate) {
    writeAiEstimatePlatformCurrentStateReconciliationLedger(process.cwd());
  }
  generated = true;
}

export function readReconciliationArtifact<T extends JsonRecord = JsonRecord>(name: string): T {
  ensureReconciliationLedger();
  return JSON.parse(fs.readFileSync(artifactPath(name), "utf8")) as T;
}

export function reconciliationArtifactExists(name: string): boolean {
  ensureReconciliationLedger();
  return fs.existsSync(artifactPath(name));
}

export function arrayField(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}
