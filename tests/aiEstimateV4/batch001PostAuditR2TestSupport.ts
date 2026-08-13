import { readFileSync } from "node:fs";
import path from "node:path";
import { compileAllBatch001Works } from "./batch001R2TestSupport";

export const POST_AUDIT_ROOT = path.resolve(".release-runtime/master-11610-group-batches-r2/07-batch001-post-audit-r1");
export const PREDECESSOR_HEAD = "f7c9c328e1f02fc38e29088526764f68714b7fe9";
export const PREDECESSOR_TREE = "20fc6d4dda3720fb037c4f4cca3e257730faf4fa";

export function readPostAuditArtifact<T = Record<string, unknown>>(relative: string): T {
  return JSON.parse(readFileSync(path.join(POST_AUDIT_ROOT, relative), "utf8")) as T;
}

export function postAuditWorks() {
  return compileAllBatch001Works().map((result) => {
    if (result.compile_result.status !== "COMPILED" || !result.draft) {
      throw new Error(`POST_AUDIT_COMPILE_FAILED:${result.inventory.catalog_id}:${result.compile_result.blockers.join(",")}`);
    }
    return { result, rows: result.draft.items };
  });
}

export function postAuditRows() {
  return postAuditWorks().flatMap(({ result, rows }) => rows.map((row) => ({ catalogId: result.inventory.catalog_id, row })));
}

export function professionalCategory(row: ReturnType<typeof postAuditRows>[number]["row"]): string {
  return String((row.sourceParameters as Record<string, unknown> | undefined)?.professionalBoqCategory ?? "");
}

export function rowMetadata(row: ReturnType<typeof postAuditRows>[number]["row"]): Record<string, unknown> {
  return row.sourceParameters as Record<string, unknown>;
}
