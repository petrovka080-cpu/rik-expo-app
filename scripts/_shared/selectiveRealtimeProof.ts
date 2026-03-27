import fs from "node:fs";
import path from "node:path";

export type ProofCheck = {
  id: string;
  ok: boolean;
  details: string;
};

export const projectRoot = process.cwd();

export const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

export const writeArtifact = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

export const createCheck = (id: string, ok: boolean, details: string): ProofCheck => ({
  id,
  ok,
  details,
});

export const finalizeProof = (params: {
  artifactBase: string;
  role: "buyer" | "accountant" | "warehouse";
  checks: ProofCheck[];
  extra?: Record<string, unknown>;
}) => {
  const status = params.checks.every((check) => check.ok) ? "passed" : "failed";
  const summary = {
    status,
    role: params.role,
    runtimeVerified: false,
    checks: params.checks,
    ...params.extra,
  };
  writeArtifact(`${params.artifactBase}.json`, summary);
  writeArtifact(`${params.artifactBase}.summary.json`, summary);
  return summary;
};

export const includesAll = (source: string, fragments: readonly string[]) =>
  fragments.every((fragment) => source.includes(fragment));
