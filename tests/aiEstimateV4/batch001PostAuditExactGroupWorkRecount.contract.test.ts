import { readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("независимый recount равен 3 группам и 16 работам", () => {
  const recount = readPostAuditArtifact<Record<string, number>>("02-identities/GROUP_WORK_IDENTITY_RECOUNT.json");
  expect(recount.groupCount).toBe(3); expect(recount.workCount).toBe(16);
});
