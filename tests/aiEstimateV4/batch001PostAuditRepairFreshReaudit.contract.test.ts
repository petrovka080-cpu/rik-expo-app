import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("repair loop завершен fresh GREEN audit", () => { const a=readPostAuditArtifact<Record<string,unknown>>("09-repair/attempts/01/FRESH_REAUDIT.json"); expect(a.verdict).toBe("GREEN"); expect(a.hiddenApplicableComponents).toBe(0); });
