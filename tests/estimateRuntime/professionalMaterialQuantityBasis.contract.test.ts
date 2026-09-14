import type { ProfessionalBoqRow } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { calculateProfessionalMaterialQuantityLine } from "../../src/lib/estimate/professionalMaterialQuantityCalculator";
import { PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1 } from "../../src/lib/estimate/professionalMaterialQuantityContract";

const puttyRow: ProfessionalBoqRow = {
  rowId: "wall_putty_primary_material",
  rowType: "material",
  titleRu: "Шпаклёвочная смесь Ceresit CT 127",
  quantity: 70,
  unit: "kg",
  currency: "KGS",
  includedInProcurement: true,
  sourceParameters: {
    professionalMaterialQuantityBasisV1: {
      version: PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1,
      materialType: "wet_mix",
      unit: "kg",
      netQuantity: 70,
      wastePercent: 0,
      lossPercent: 0,
      grossQuantity: 70,
      procurementUnit: "kg",
      procurementPackageSize: 20,
      procurementQuantity: 80,
      formula: "area_m2 × selected_consumption_kg_m2",
      formulaInputs: { area_m2: 100, selected_consumption_kg_m2: 0.7 },
      sourceId: "ceresit_ct127_tds",
      citationLabel: "Ceresit CT 127 TDS",
      calculationTrace: "net=70 kg; package=20 kg; procurement=80 kg",
      quantityDependsOnParams: ["area_m2", "selected_consumption_kg_m2"],
    },
  },
};

describe("professional material quantity source-owned basis", () => {
  test("keeps net demand separate from package-rounded procurement", () => {
    expect(calculateProfessionalMaterialQuantityLine({
      row: puttyRow,
      templateId: "wall-putty",
      family: "putty",
    })).toMatchObject({
      baseQuantity: 70,
      netQuantity: 70,
      grossQuantity: 70,
      procurementPackageSize: 20,
      procurementQuantity: 80,
      formulaResult: 70,
      quantityState: "calculated",
    });
  });

  test("fails closed when rounded procurement is substituted into the estimate row", () => {
    expect(() => calculateProfessionalMaterialQuantityLine({
      row: { ...puttyRow, quantity: 80 },
      templateId: "wall-putty",
      family: "putty",
    })).toThrow("MATERIAL_QUANTITY_BASIS_INVALID:wall_putty_primary_material:values");
  });
});
