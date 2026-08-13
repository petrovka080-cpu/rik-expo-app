import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("ProgramControlStateV4 фиксирует 71/11539", () => { const a=readPostAuditArtifact<Record<string,unknown>>("12-program-v4/MASTER_11610_PROGRAM_CONTROL_STATE_V4.json"); expect(a.currentGlobalAdmitted).toBe(71); expect(a.currentGlobalRemaining).toBe(11539); expect(a.m5Remaining).toBe(3989); });
