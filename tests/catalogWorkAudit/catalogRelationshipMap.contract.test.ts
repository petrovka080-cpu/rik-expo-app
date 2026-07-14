import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("maps request, foreman, marketplace, history, and PDF catalog links", () => {
  const map = readAuditJson<{ flows: Array<{ name: string; path: string[] }> } & Record<string, unknown>>("catalog_relationship_map.json");
  expect(map.catalog_relationship_map_written).toBe(true);
  expect(map.request_catalog_links_mapped).toBe(true);
  expect(map.foreman_request_catalog_links_mapped).toBe(true);
  expect(map.marketplace_catalog_links_mapped).toBe(true);
  expect(map.pdf_catalog_links_mapped).toBe(true);
  expect(map.history_catalog_links_mapped).toBe(true);
  expect(map.flows.map((flow) => flow.name)).toEqual(expect.arrayContaining(["request_manual_material_picker", "global_estimate_auto_binding", "foreman_ai_resolve", "pdf_history"]));
});
