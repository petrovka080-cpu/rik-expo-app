import { readFileSync } from "node:fs"; import path from "node:path";
import { POST_AUDIT_ROOT } from "./batch001PostAuditR2TestSupport";
test("slot ledger имеет решение по каждому пакету каждой работы", () => {
  const rows = readFileSync(path.join(POST_AUDIT_ROOT, "03-work-audit/EXACT16_PROFESSIONAL_COMPLETENESS_SLOT_LEDGER.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  expect(new Set(rows.map((row) => row.catalogId)).size).toBe(16); expect(rows.every((row) => ["APPLICABLE", "PROJECT_INPUT", "N/A_WITH_REASON"].includes(row.decision))).toBe(true);
});
