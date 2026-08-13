import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("outside exact scope = 0", () => { const a=readPostAuditArtifact<Record<string,unknown>>("10-admission/FINAL_BATCH001_INDEPENDENT_ADMISSION.json"); expect(a.outsideScopeMutation).toBe(0); expect(a.exactWorks).toBe("16/16"); });
