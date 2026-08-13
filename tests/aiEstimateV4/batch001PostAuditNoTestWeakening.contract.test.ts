import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("существующие тесты не ослаблены", () => { const a=readPostAuditArtifact<Record<string,unknown>>("01-scope/BATCH001_TEST_STRENGTH_DIFF.json"); expect(a.modifiedExistingTestCount).toBe(0); expect(a.deletedExistingTestCount).toBe(0); });
