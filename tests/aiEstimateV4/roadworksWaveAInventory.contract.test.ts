import catalog from "../../data/estimate-catalog/work-items/work-catalog-10000.json";
import {
  RoadworksWaveAInventory,
  auditRoadworksWaveA,
  getRoadworksWaveAOperation,
} from "../../src/lib/estimate/v4/roadworks";

describe("Roadworks Wave A canonical inventory", () => {
  test("selects exactly the direct asphalt catalog IDs without fabricated families", () => {
    const canonical = catalog.items.filter(
      (item) => item.work_family_id === "roadworks" &&
        item.work_key.startsWith("paving_roads_landscape_interior_asphalt_"),
    );
    expect(RoadworksWaveAInventory).toHaveLength(35);
    expect(RoadworksWaveAInventory.map((item) => item.workId).sort()).toEqual(
      canonical.map((item) => item.work_key).sort(),
    );
    expect(new Set(RoadworksWaveAInventory.map((item) => item.workId)).size).toBe(35);
  });

  test("preserves every catalog identity and gives it a non-generic overlay contract", () => {
    for (const item of RoadworksWaveAInventory) {
      const source = catalog.items.find((candidate) => candidate.work_key === item.workId);
      expect(source).toBeDefined();
      expect(item.catalogItemId).toBe(source?.work_catalog_item_id);
      expect(item.templateId).toBe(source?.template_id);
      expect(item.professionalNameRu).toBe(source?.professional_name_ru);
      expect(item.parameterSchemaId).toBe(`${item.workId}:parameters:v4`);
      expect(item.technologyFamily).not.toMatch(/^(roadworks|asphalt)$/);
      expect(item.assemblyIds.length).toBeGreaterThan(0);
      expect(getRoadworksWaveAOperation(item.workId)).not.toBeNull();
    }
  });

  test("builds deterministic A/B ledgers with zero blockers", () => {
    const auditA = auditRoadworksWaveA();
    const auditB = auditRoadworksWaveA();
    expect(auditA.total).toBe(35);
    expect(auditA.uniqueIds).toBe(35);
    expect(auditA.hash).toBe(auditB.hash);
    expect(Object.values(auditA.blockers)).toEqual(expect.arrayContaining([]));
    expect(Object.values(auditA.blockers).every((count) => count === 0)).toBe(true);
    for (const ledger of Object.values(auditA.ledgers)) expect(ledger).toHaveLength(35);
  });
});
