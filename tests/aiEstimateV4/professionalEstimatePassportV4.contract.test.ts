import { estimate10000ReadinessManifest as baseManifest } from "../../src/lib/estimate/estimate10000ReadinessManifest";
import expandedTemplates from "../../data/estimate-catalog/expanded-complex/templates.json";
import { professionalEstimatePassportId } from "../../src/lib/estimate/v4/professionalEstimatePassportV4";

describe("ProfessionalEstimatePassportV4 ownership", () => {
  test("maps the 7602 implementation templates one-to-one without claiming real-work truth", () => {
    const base = baseManifest.templates;
    const expanded = expandedTemplates;
    const catalogIds = [
      ...base.map((row) => row.work_key),
      ...expanded.map((row) => `expanded-template:${row.template_id}`),
    ];
    // The static base artifact lost exactly 4008 area identities; expanded templates stay at 1610.
    expect(base).toHaveLength(5992);
    expect(expanded).toHaveLength(1610);
    const passportIds = catalogIds.map(professionalEstimatePassportId);
    expect(catalogIds.filter((id) => /_(?:small|medium|large)_area$/u.test(id))).toEqual([]);
    expect(catalogIds).toHaveLength(7602);
    expect(new Set(catalogIds).size).toBe(7602);
    expect(new Set(passportIds).size).toBe(7602);
  });

  test("keeps the 19 surviving asphalt records on measured geometry", () => {
    const current = baseManifest.templates.filter((row) =>
      row.work_key.startsWith("paving_roads_landscape_interior_asphalt_")
    );
    // 35 prior catalog rows − 16 retired size identities = 19 surviving physical works.
    expect(current).toHaveLength(19);
    for (const size of ["small", "medium", "large"]) {
      expect(current.some((row) => row.work_key === `paving_roads_landscape_interior_asphalt_install_${size}_area`)).toBe(false);
    }
    expect(current.every((row) =>
      /_(standard|wet_zone|technical_room)$/.test(row.work_key)
    )).toBe(true);
  });
});
