import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("durable/PDF/procurement сохранены 16/16", () => { const a=readPostAuditArtifact<Record<string,string>>("07-runtime/DURABLE_HISTORY_PDF_PROCUREMENT_SUMMARY.json"); expect(a.durableHistory).toBe("16/16"); expect(a.pdf).toBe("16/16"); expect(a.procurement).toBe("16/16"); });
