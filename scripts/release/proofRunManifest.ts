import fs from "node:fs";
import path from "node:path";

export type ProofRunManifest = {
  run_id: string;
  wave: string;
  command: string;
  mode: "refresh" | "verify";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  exit_code: number;
  head: string | null;
  pid: number;
  stdout_log: string | null;
  stderr_log: string | null;
  fake_green_claimed: false;
};

function safeSegment(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, "_").replace(/^_+|_+$/g, "");
}

export function buildProofRunManifestPath(params: {
  artifactsRoot?: string;
  startedAt: string;
  wave: string;
}): string {
  const artifactsRoot = params.artifactsRoot ?? path.join(process.cwd(), "artifacts");
  const timestamp = params.startedAt.replace(/[:.]/g, "-");
  return path.join(artifactsRoot, "_runs", `${timestamp}_${safeSegment(params.wave)}`, "manifest.json");
}

export function writeProofRunManifest(manifest: ProofRunManifest, artifactsRoot?: string): string {
  const manifestPath = buildProofRunManifestPath({
    artifactsRoot,
    startedAt: manifest.started_at,
    wave: manifest.wave,
  });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}
