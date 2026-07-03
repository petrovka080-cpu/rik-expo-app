import fs from "node:fs";
import path from "node:path";

export function writeEstimateNormRuntimeSummary(command: string, summary: unknown): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.join(process.cwd(), ".release-runtime", "ai-estimate-norm-knowledge-base", timestamp);
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "summary.json");
  fs.writeFileSync(file, JSON.stringify({ command, generated_at: new Date().toISOString(), summary }, null, 2));
  return file;
}

export function exitCodeForSummary(summary: { final_status?: string; failures?: readonly string[] }): number {
  if (summary.final_status?.startsWith("STOP_")) return 1;
  if ((summary.failures ?? []).length > 0) return 1;
  return 0;
}
