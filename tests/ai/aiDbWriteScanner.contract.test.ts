import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { scanAiDbWrites } from "../../src/lib/ai/enterpriseGuardrails";

function writeRuntimeFile(rootDir: string, fileName: string, content: string): void {
  const runtimeDir = path.join(rootDir, "src/lib/ai/builtInAi");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, fileName), content, "utf8");
}

describe("AI DB write scanner", () => {
  it("allows cryptographic digest update while blocking database mutations", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-db-write-scan-"));
    writeRuntimeFile(
      rootDir,
      "cryptoDigest.ts",
      [
        'import crypto from "node:crypto";',
        "export function digest(value: string): string {",
        '  return crypto.createHash("sha256").update(value).digest("hex");',
        "}",
      ].join("\n"),
    );
    writeRuntimeFile(
      rootDir,
      "dbMutation.ts",
      [
        "export async function mutate(db: { from(name: string): { update(value: unknown): unknown }; rpc(name: string): unknown }) {",
        '  db.from("orders").update({ status: "done" });',
        '  db.rpc("submit_order");',
        "}",
      ].join("\n"),
    );

    const scan = scanAiDbWrites(rootDir);

    expect(scan.findings).toEqual([
      expect.objectContaining({ file: "src/lib/ai/builtInAi/dbMutation.ts", matchedText: ".update(" }),
      expect.objectContaining({ file: "src/lib/ai/builtInAi/dbMutation.ts", matchedText: '.rpc("submit' }),
    ]);
  });
});
