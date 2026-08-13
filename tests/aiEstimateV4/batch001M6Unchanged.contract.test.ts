import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("M6 не менялся", () => { const a=readPostAuditArtifact<Record<string,unknown>>("11-queue/M5_QUEUE_BEFORE_AFTER_DIFF.json"); expect(a.m6Before).toBe(7550); expect(a.m6After).toBe(7550); expect(a.m6Diff).toBe(0); });
