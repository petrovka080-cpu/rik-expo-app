import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("repair diff ограничен exact16 доменом, тестами, scripts и evidence", () => {
  const proof = readPostAuditArtifact<Record<string, number | string>>("01-scope/BATCH001_OUTSIDE_SCOPE_DIFF_PROOF.json");
  expect(proof.outsideScopeCount).toBe(0); expect(proof.verdict).toBe("GREEN");
});
