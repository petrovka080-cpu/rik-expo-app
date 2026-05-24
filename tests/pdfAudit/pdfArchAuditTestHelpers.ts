import fs from "node:fs";
import path from "node:path";

export const PDF_ARCH_AUDIT_WAVE =
  "S_ESTIMATE_PDF_ARCHITECTURE_AUDIT_AND_DOCUMENT_ENGINE_DECISION_GATE_POINT_OF_NO_RETURN";

export function auditArtifactPath(name: string): string {
  return path.resolve(process.cwd(), "artifacts", name);
}

export function readAuditJson<T = Record<string, unknown>>(name: string): T {
  const filePath = auditArtifactPath(name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing audit artifact: ${name}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}
