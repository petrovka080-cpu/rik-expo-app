import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("maps the foreman request catalog flow without claiming catalog writes", () => {
  const map = readAuditJson<Record<string, unknown>>("foreman_request_flow_map.json");
  expect(map.foreman_request_flow_mapped).toBe(true);
  expect(map.no_catalog_write_attempted).toBe(true);
  expect(map.flow_files).toEqual(expect.arrayContaining(["supabase/functions/foreman-ai-resolve/index.ts"]));
});
