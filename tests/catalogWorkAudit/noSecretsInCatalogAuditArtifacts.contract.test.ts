import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("does not write secrets into catalog audit artifacts", () => {
  const scan = readAuditJson<Record<string, unknown>>("secret_scan.json");
  expect(scan.secrets_written_to_artifacts).toBe(false);
  expect(scan.findings).toEqual([]);
});
