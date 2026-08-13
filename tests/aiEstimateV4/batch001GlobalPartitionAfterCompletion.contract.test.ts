import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("55 + 16 + 3989 + 7550 = 11610", () => { const a=readPostAuditArtifact<Record<string,number>>("11-queue/GLOBAL_AFTER_BATCH001_UNION_INTERSECTION_PROOF.json"); expect(a.asphaltGlobalAdmitted+a.completedCount+a.remainingCount+a.m6Remaining).toBe(11610); });
