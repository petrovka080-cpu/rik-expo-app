import type { ProfessionalMaterialType } from "./professionalMaterialQuantityContract";

export type ProfessionalMaterialWastePolicyResult = {
  wastePercent: number;
  lossPercent: number;
  policyId: string;
  reason: string;
};

function text(input: string | null | undefined): string {
  return String(input ?? "").toLowerCase();
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}

export function resolveProfessionalMaterialWastePolicy(input: {
  family: string;
  materialName: string;
  materialType: ProfessionalMaterialType;
  unit: string;
}): ProfessionalMaterialWastePolicyResult {
  const name = text(`${input.family} ${input.materialName} ${input.unit}`);
  let wastePercent = 0;
  let lossPercent = 0;
  let policyId = "waste:none";
  let reason = "non_consumed_or_exact_procurement_line";

  if (input.materialType === "transport_service" || input.materialType === "service" || input.materialType === "equipment_rental") {
    return { wastePercent, lossPercent, policyId, reason };
  }

  if (input.materialType === "wet_mix" || /cement|adhesive|glue|plaster|screed|concrete|asphalt|mix|mortar|bitumen/.test(name)) {
    wastePercent = 5;
    lossPercent = 1;
    policyId = "waste:wet_mix_5_loss_1";
    reason = "wet_or_bagged_mixes_need_site_loss_allowance";
  } else if (input.materialType === "sheet_material" || /tile|sheet|panel|membrane|geotextile|glass|insulation|facade/.test(name)) {
    wastePercent = /tile|glass|ceramic/.test(name) ? 10 : 7;
    lossPercent = 1;
    policyId = "waste:sheet_cutting";
    reason = "sheet_and_panel_materials_need_cutting_allowance";
  } else if (input.materialType === "linear_material" || /pipe|cable|conductor|profile|baseboard|hose|rebar|linear/.test(name)) {
    wastePercent = /cable|conductor/.test(name) ? 5 : 4;
    lossPercent = 1;
    policyId = "waste:linear_cutting";
    reason = "linear_materials_need_cutting_allowance";
  } else if (input.materialType === "bulk_material" || /sand|gravel|crushed|soil|backfill|aggregate|gabion|stone/.test(name)) {
    wastePercent = 4;
    lossPercent = 1.5;
    policyId = "waste:bulk_handling";
    reason = "bulk_materials_need_handling_and_transport_loss";
  } else if (input.materialType === "piece_material" || input.materialType === "set_material") {
    wastePercent = 2;
    lossPercent = 0;
    policyId = "waste:piece_spares";
    reason = "piece_materials_need_small_spares_allowance";
  } else {
    wastePercent = 3;
    lossPercent = 1;
    policyId = "waste:consumable_default";
    reason = "consumables_need_site_loss_allowance";
  }

  return {
    wastePercent: clampPercent(wastePercent),
    lossPercent: clampPercent(lossPercent),
    policyId,
    reason,
  };
}
