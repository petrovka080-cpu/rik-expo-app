import type { StripFoundationInputValue } from "./reinforcedConcreteStripFoundationR1";
import {
  STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
  compileStripFoundationProfessionalGoldR2,
} from "./stripFoundationProfessionalCompositionR2";

export const STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723_ID =
  "STRIP-FOUNDATION-S27-23-VISIBLE-PRELIMINARY-R1";

export const STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723 = Object.freeze({
  stripWidthM: 0.8,
  stripHeightM: 2,
  preparationThicknessM: 0.1,
  concreteOrderAllowancePercent: 8,
  reinforcementBudgetKgPerM3: 120,
  bindingWireRatio: 0.012,
  formworkSides: 2,
  formworkTransportKgPerContactM2: 75,
  excavationWidthM: 1.8,
  excavationDepthM: 2,
  beddingWidthM: 0.8,
  beddingThicknessM: 0.3,
  backfillM3PerAxisM: 1.4,
  pumpProductivityM3H: 45,
  excavatorProductivityM3H: 30,
  compactorProductivityM3H: 12,
  concreteDeliveryDistanceKm: 25,
  reinforcementDeliveryDistanceKm: 30,
  formworkDeliveryDistanceKm: 18,
  beddingDeliveryDistanceKm: 20,
  soilDisposalDistanceKm: 15,
  excavatedSoilDensityTM3: 1.8,
  spacerChairRatePieceM2: 4,
  formworkReleaseAgentConsumptionLM2: 0.01,
  waterproofingPrimerConsumptionLM2: 0.05,
  waterproofingDetailReinforcementM2M2: 1.1,
} as const);

export type StripFoundationAutomaticKnownInputS2723 = Readonly<{
  total_axis_length_m: number;
  strip_width_m?: number;
  strip_height_m?: number;
  overrides?: Readonly<Record<string, StripFoundationInputValue>>;
}>;

export type StripFoundationAutomaticDerivationS2723 = Readonly<{
  input: Readonly<Record<string, StripFoundationInputValue>>;
  derived: Readonly<Record<string, number>>;
  assumptions: Readonly<Record<string, number | string | boolean>>;
}>;

function positive(value: number, id: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`STRIP_FOUNDATION_S2723_INVALID_POSITIVE_INPUT:${id}`);
  }
  return value;
}

function rounded(value: number): number {
  return Number(value.toFixed(9));
}

/**
 * Converts the user's known strip length (and optional project width/height)
 * into the existing professional composition inputs. All other values are
 * visible, replaceable preliminary-profile assumptions; no final mass or
 * machine-hour questionnaire is required before the first estimate.
 */
export function deriveStripFoundationAutomaticInputS2723(
  known: StripFoundationAutomaticKnownInputS2723,
): StripFoundationAutomaticDerivationS2723 {
  const profile = STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723;
  const lengthM = positive(Number(known.total_axis_length_m), "total_axis_length_m");
  const widthM = positive(Number(known.strip_width_m ?? profile.stripWidthM), "strip_width_m");
  const heightM = positive(Number(known.strip_height_m ?? profile.stripHeightM), "strip_height_m");
  const concreteNetM3 = rounded(lengthM * widthM * heightM);
  const preparationVolumeM3 = rounded(lengthM * widthM * profile.preparationThicknessM);
  const formworkContactAreaM2 = rounded(lengthM * heightM * profile.formworkSides);
  const reinforcementMassT = rounded(
    concreteNetM3 * profile.reinforcementBudgetKgPerM3 / 1_000,
  );
  const bindingWireMassKg = rounded(
    reinforcementMassT * 1_000 * profile.bindingWireRatio,
  );
  const formworkTransportMassT = rounded(
    formworkContactAreaM2 * profile.formworkTransportKgPerContactM2 / 1_000,
  );
  const excavationVolumeM3 = rounded(
    lengthM * profile.excavationWidthM * profile.excavationDepthM,
  );
  const beddingVolumeM3 = rounded(
    lengthM * profile.beddingWidthM * profile.beddingThicknessM,
  );
  const waterproofingAreaM2 = formworkContactAreaM2;
  const backfillVolumeM3 = rounded(lengthM * profile.backfillM3PerAxisM);
  const horizontalCutoffAreaM2 = rounded(lengthM * widthM);

  const derived = Object.freeze({
    concreteNetM3,
    preparationVolumeM3,
    formworkContactAreaM2,
    reinforcementMassT,
    bindingWireMassKg,
    formworkTransportMassT,
    excavationVolumeM3,
    beddingVolumeM3,
    waterproofingAreaM2,
    backfillVolumeM3,
    horizontalCutoffAreaM2,
  });
  const assumptions = Object.freeze({
    profileId: STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723_ID,
    widthFromProfile: known.strip_width_m == null,
    heightFromProfile: known.strip_height_m == null,
    reinforcementIsBudgetUntilKZh: true,
    groundworksIncluded: true,
    beddingType: "sand",
    waterproofingSystem: "bituminous_coating",
    winterMode: false,
    mechanicalCouplersAssumed: false,
    constructionJointWaterstopAssumed: false,
    excavationSupportAssumed: false,
    excavationDewateringAssumed: false,
  });
  const input: Record<string, StripFoundationInputValue> = {
    ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
    scope_variant: "full_reinforced_structure",
    total_axis_length_m: lengthM,
    strip_width_m: widthM,
    strip_height_m: heightM,
    preparation_included: true,
    preparation_thickness_m: profile.preparationThicknessM,
    concrete_order_allowance_percent: profile.concreteOrderAllowancePercent,
    reinforcement_mass_t: reinforcementMassT,
    binding_wire_mass_kg: bindingWireMassKg,
    reinforcement_fabrication: "ready_cages",
    formwork_sides: profile.formworkSides,
    formwork_transport_mass_t: formworkTransportMassT,
    placement_method: "pump",
    curing_method: "membrane",
    winter_mode: false,
    pump_productivity_m3_h: profile.pumpProductivityM3H,
    delivery_separately_priced: true,
    concrete_delivery_distance_km: profile.concreteDeliveryDistanceKm,
    reinforcement_delivery_distance_km: profile.reinforcementDeliveryDistanceKm,
    formwork_delivery_distance_km: profile.formworkDeliveryDistanceKm,
    groundworks_included: true,
    excavation_volume_m3: excavationVolumeM3,
    excavator_productivity_m3_h: profile.excavatorProductivityM3H,
    foundation_bedding_included: true,
    foundation_bedding_type: "sand",
    foundation_bedding_volume_m3: beddingVolumeM3,
    compactor_productivity_m3_h: profile.compactorProductivityM3H,
    bedding_delivery_distance_km: profile.beddingDeliveryDistanceKm,
    waterproofing_included: true,
    waterproofing_system: "bituminous_coating",
    waterproofing_area_m2: waterproofingAreaM2,
    backfill_included: true,
    backfill_volume_m3: backfillVolumeM3,
    soil_disposal_included: true,
    excavated_soil_density_t_m3: profile.excavatedSoilDensityTM3,
    soil_disposal_distance_km: profile.soilDisposalDistanceKm,
    foundation_automatic_profile_id: STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723_ID,
    spacer_chair_designation:
      "Блочные фиксаторы защитного слоя — предварительный профиль до сверки с КЖ",
    spacer_chair_rate_piece_m2: profile.spacerChairRatePieceM2,
    mechanical_couplers_applicable: false,
    lifting_equipment_applicable: false,
    construction_joint_mode: "NONE",
    formwork_tie_accessories_designation:
      "Стяжные элементы, гайки и шайбы в составе выбранной опалубочной системы",
    formwork_release_agent_designation:
      "Doka-Trenn для впитывающей поверхности опалубки",
    formwork_release_agent_consumption_l_m2:
      profile.formworkReleaseAgentConsumptionLM2,
    waterproofing_coating_designation:
      "Sika Igolflex-101 DE — предварительный режим защиты от влаги",
    waterproofing_pressure_exposure: false,
    waterproofing_primer_designation: "Sika Igolflex P-01 DE",
    waterproofing_primer_consumption_l_m2:
      profile.waterproofingPrimerConsumptionLM2,
    waterproofing_protection_layer_designation:
      "SikaShield PB P15 PE 6 mm — защитная плита 1×2 м",
    waterproofing_detail_reinforcement_designation:
      "Sika Igolflex F-01 EU — армирующая стеклоткань",
    waterproofing_detail_reinforcement_consumption_m2_m2:
      profile.waterproofingDetailReinforcementM2M2,
    formwork_supply_mode: "rental_returnable",
    formwork_return_distance_km: profile.formworkDeliveryDistanceKm,
    as_built_survey_included: true,
    as_built_survey_document_count: 1,
    horizontal_cutoff_waterproofing_included: true,
    horizontal_cutoff_waterproofing_designation:
      "Горизонтальная отсечная гидроизоляция — спецификация уточняется проектом",
    horizontal_cutoff_waterproofing_area_m2: horizontalCutoffAreaM2,
    formwork_tie_consumables_required: true,
    formwork_tie_consumables_supply_mode: "included_in_formwork_system",
    formwork_tie_consumables_designation:
      "Расходные элементы стяжек в комплекте опалубочной системы",
    formwork_tie_consumables_quantity_piece: Math.ceil(formworkContactAreaM2),
    excavation_support_required: false,
    excavation_dewatering_required: false,
    site_cleanup_cost_mode: "included_in_primary_works",
    non_soil_waste_handling_mode: "included_in_primary_works",
    ...known.overrides,
  };
  return { input: Object.freeze(input), derived, assumptions };
}

export function compileStripFoundationAutomaticS2723(
  known: StripFoundationAutomaticKnownInputS2723,
) {
  const derivation = deriveStripFoundationAutomaticInputS2723(known);
  const rows = compileStripFoundationProfessionalGoldR2(derivation.input).map((row) =>
    row.rowId === "reinforcement" && derivation.input.reinforcement_product_profile_id == null
      ? {
        ...row,
        canonicalRuName:
          `Предварительный бюджет арматуры до КЖ (${STRIP_FOUNDATION_AUTOMATIC_PROFILE_S2723.reinforcementBudgetKgPerM3} кг/м³ бетона)`,
      }
      : row);
  return Object.freeze({ ...derivation, rows: Object.freeze(rows) });
}
