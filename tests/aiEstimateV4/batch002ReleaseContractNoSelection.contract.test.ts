import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("BATCH002 подготовлен без selection/execution", () => { const a=readPostAuditArtifact<Record<string,unknown>>("13-batch002-release/BATCH002_SELECTION_CONTRACT_VALIDATION.json"); expect(a.batch002Selected).toBe(false); expect(a.executionManifestCount).toBe(0); expect(a.authorization).toBe("PENDING"); });
