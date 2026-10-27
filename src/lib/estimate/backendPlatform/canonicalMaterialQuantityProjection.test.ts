import type { ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { calculateProfessionalMaterialQuantityLine } from "../professionalMaterialQuantityCalculator";
import {
  CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1,
  canonicalMaterialQuantityBasisFromRow,
} from "./canonicalMaterialQuantityProjection";

function row(policyOverrides: Record<string, unknown> = {}): ProfessionalBoqRow {
  return {
    rowId: "wall-putty:primary-material",
    rowType: "material",
    titleRu: "Ceresit CT 127",
    quantity: 70,
    unit: "kg",
    unitLabel: "kg",
    unitPrice: null,
    currency: "KGS",
    category: "Материалы",
    sourceId: null,
    sourceLabel: null,
    formulaId: "wall-putty:ct127-net",
    quantityFormula: null,
    calculationTrace: null,
    sourceParameters: {
      smartEstimateProjectionV2: {
        formulaExplanation: {
          resourceGraph: {
            professionalMaterialQuantityPolicyV1: {
              version: CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1,
              basisVersion: "professional-material-quantity-basis:v1",
              materialType: "wet_mix",
              unit: "kg",
              wastePercent: 0,
              lossPercent: 0,
              procurementUnit: "kg",
              procurementPackageSize: 20,
              formula: "area_m2 * selected_consumption_kg_m2",
              formulaInputs: { selected_bag_size_kg: 20 },
              sourceId: "ct127-tds",
              citationLabel: "C_CT127_TDS_1_0120",
              quantityDependsOnParams: ["area_m2", "selected_consumption_kg_m2"],
              ...policyOverrides,
            },
          },
        },
      },
    },
    templateId: "wall-putty",
    templateVersion: "1",
    normId: null,
    normFamilyId: "putty",
    normSourceId: null,
    normSourceTitle: null,
    normVersion: null,
    normReviewStatus: "applicable",
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: null,
    materialKey: null,
    rateKey: null,
    includedInProcurement: true,
    materialQuantity: null,
    costingMode: null,
    costTreatment: null,
    costOwnershipId: null,
    payable: true,
  };
}

describe("canonical material quantity projection", () => {
  test("keeps a 70 kg compiled need and rounds only procurement to four 20 kg bags", () => {
    expect(canonicalMaterialQuantityBasisFromRow(row())).toMatchObject({
      version: "professional-material-quantity-basis:v1",
      netQuantity: 70,
      grossQuantity: 70,
      procurementPackageSize: 20,
      procurementQuantity: 80,
      wastePercent: 0,
      lossPercent: 0,
    });
    expect(calculateProfessionalMaterialQuantityLine({
      row: row(),
      templateId: "wall-putty",
      family: "putty",
    })).toMatchObject({
      baseQuantity: 70,
      formulaResult: 70,
      netQuantity: 70,
      grossQuantity: 70,
      procurementQuantity: 80,
      quantityState: "calculated",
    });
  });

  test("rejects an unversioned or zero-size package policy", () => {
    expect(() => canonicalMaterialQuantityBasisFromRow(row({ version: "unknown" })))
      .toThrow("CANONICAL_MATERIAL_QUANTITY_POLICY_INVALID:wall-putty:primary-material");
    expect(() => canonicalMaterialQuantityBasisFromRow(row({ procurementPackageSize: 0 })))
      .toThrow("CANONICAL_MATERIAL_QUANTITY_POLICY_INVALID:wall-putty:primary-material");
  });
});
