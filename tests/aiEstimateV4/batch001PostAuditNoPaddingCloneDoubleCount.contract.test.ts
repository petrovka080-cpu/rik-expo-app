import { postAuditWorks, rowMetadata } from "./batch001PostAuditR2TestSupport";
test("нет duplicate row/owner и варианты имеют разные составы", () => {
  const signatures = new Set<string>(); for (const { result, rows } of postAuditWorks()) { const ids = rows.map((r) => String(rowMetadata(r).rowCode)); expect(new Set(ids).size).toBe(ids.length); const owners = rows.map((r) => String(rowMetadata(r).costOwnerId)); expect(new Set(owners).size).toBe(owners.length); signatures.add(rows.map((r) => r.titleRu).sort().join("|")); expect(result.draft).not.toBeNull(); } expect(signatures.size).toBe(16);
});
