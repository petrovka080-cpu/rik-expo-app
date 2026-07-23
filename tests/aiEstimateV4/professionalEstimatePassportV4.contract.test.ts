import baseManifest from "../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedTemplates from "../../data/estimate-catalog/expanded-complex/templates.json";
import { professionalEstimatePassportId } from "../../src/lib/estimate/v4/professionalEstimatePassportV4";

describe("ProfessionalEstimatePassportV4 ownership", () => {
  test("maps the 11610 implementation templates one-to-one without claiming real-work truth", () => {
    const base = baseManifest.templates;
    const expanded = expandedTemplates;
    const catalogIds = [
      ...base.map((row) => row.work_key),
      ...expanded.map((row) => `expanded-template:${row.template_id}`),
    ];
    const passportIds = catalogIds.map(professionalEstimatePassportId);
    expect(catalogIds).toHaveLength(11610);
    expect(new Set(catalogIds).size).toBe(11610);
    expect(new Set(passportIds).size).toBe(11610);
  });

  test("proves the current Wave A inventory is synthetic rather than 35 real works", () => {
    const current = baseManifest.templates.filter((row) =>
      row.work_key.startsWith("paving_roads_landscape_interior_asphalt_")
    );
    expect(current).toHaveLength(35);
    expect(current.every((row) =>
      /_(standard|small_area|large_area|wet_zone|technical_room)$/.test(row.work_key)
    )).toBe(true);
  });
});
