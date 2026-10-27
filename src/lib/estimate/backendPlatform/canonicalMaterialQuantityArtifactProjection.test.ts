import { buildCanonicalProcurementProjection } from "./canonicalEstimateArtifactContract";

describe("canonical procurement material quantity projection", () => {
  test("keeps net demand separate and rounds only procurement to the package size", () => {
    const projection = buildCanonicalProcurementProjection({
      revision: {
        id: "revision-wall-putty",
        release_id: "release-wall-putty",
        catalog_id: "canonical-work:base:plaster_paint_interior_wall_putty_apply_standard",
        checksum_sha256: "a".repeat(64),
        row_count: 1,
        currency_code: "KGS",
      },
      procurementRows: [{
        row_id: "wall-putty:ct127",
        ordinal: 0,
        section: "materials",
        category: "material",
        title_ru: "Ceresit CT 127",
        unit_id: "kg",
        quantity: "70",
        unit_price: null,
        amount: null,
        currency_code: null,
        procurement_eligible: true,
        included_in_estimate: true,
        included_in_procurement: true,
        ownership_status: "OWNED",
        row_sha256: "b".repeat(64),
        calculation_trace: {
          resourceGraph: {
            professionalMaterialQuantityPolicyV1: {
              version: "canonical-material-quantity-policy:v1",
              basisVersion: "professional-material-quantity-basis:v1",
              materialType: "wet_mix",
              unit: "kg",
              wastePercent: 0,
              lossPercent: 0,
              procurementUnit: "kg",
              procurementPackageSize: 20,
              formula: "area_m2 * selected_consumption_kg_m2",
              formulaInputs: { area_m2: 100, selected_consumption_kg_m2: 0.7 },
              sourceId: "ct127-tds",
              citationLabel: "C_CT127_TDS_1_0120",
              quantityDependsOnParams: ["area_m2", "selected_consumption_kg_m2"],
            },
          },
        },
      }],
    });

    expect(projection.rows).toHaveLength(1);
    expect(projection.rows[0]).toMatchObject({
      unitId: "kg",
      quantity: "80",
      netQuantity: "70",
      grossQuantity: "70",
      procurementQuantity: "80",
      procurementUnit: "kg",
      procurementPackageSize: "20",
      unitPrice: null,
      amount: null,
    });
  });
});
