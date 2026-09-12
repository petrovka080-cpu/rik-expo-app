import airConditioningNormPack from "../../../../../data/estimate-norms/professional/air_conditioning.json";
import baseboardsNormPack from "../../../../../data/estimate-norms/professional/baseboards.json";
import ceilingsNormPack from "../../../../../data/estimate-norms/professional/ceilings.json";
import drywallNormPack from "../../../../../data/estimate-norms/professional/drywall.json";
import electricalNormPack from "../../../../../data/estimate-norms/professional/electrical.json";
import heatingNormPack from "../../../../../data/estimate-norms/professional/heating.json";
import plumbingNormPack from "../../../../../data/estimate-norms/professional/plumbing.json";
import ventilationNormPack from "../../../../../data/estimate-norms/professional/ventilation.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../professionalProjectAssemblyV4";

export const PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1 =
  "professional-physical-norm-applicability:v1" as const;

export const UPONOR_UFH_150MM_PRODUCT_PROFILE_ID =
  "manufacturer-profile:uponor-underfloor-heating:150mm:v1" as const;

export const UPONOR_UFH_150MM_NORM_ID =
  "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1" as const;

export const UPONOR_UFH_150MM_SOURCE_ID =
  `src_professional_norm_pack_${UPONOR_UFH_150MM_NORM_ID}` as const;

export const LINDAB_VSR_PRODUCT_PROFILE_ID =
  "manufacturer-profile:lindab-vsr-ventiduct:v1" as const;

export const LINDAB_VSR_NORM_ID =
  "ventilation_lindab_vsr_duct_linear_m_route_v1" as const;

export const LINDAB_VSR_SOURCE_ID =
  `src_professional_norm_pack_${LINDAB_VSR_NORM_ID}` as const;

export const DAIKIN_3MXS_K_PRODUCT_PROFILE_ID =
  "manufacturer-profile:daikin-3mxs-k:r410a:v1" as const;

export const DAIKIN_3MXS_K_NORM_ID =
  "air_conditioning_daikin_3mxs_k_additional_refrigerant_kg_m_v1" as const;

export const DAIKIN_3MXS_K_SOURCE_ID =
  `src_professional_norm_pack_${DAIKIN_3MXS_K_NORM_ID}` as const;

const DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "equipment_model",
  "manufacturer_system_profile_id",
  "refrigerant_type",
  "total_refrigerant_piping_length_m",
  "outdoor_unit_nameplate_reference",
  "maximum_piping_and_height_limits_confirmed",
] as const);

export const KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID =
  "manufacturer-profile:knauf-d112:standard-12.5mm-single-layer:reference-10x10:v1" as const;

export const KNAUF_D112_WALL_FASTENER_NORM_ID =
  "ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1" as const;

export const KNAUF_D112_WALL_FASTENER_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_WALL_FASTENER_NORM_ID}` as const;

export const KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID =
  "manufacturer-profile:knauf-fugenfueller-leicht:perimeter-joint:25kg:v1" as const;

export const KNAUF_FUGENFUELLER_PERIMETER_NORM_ID =
  "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1" as const;

export const KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}` as const;

export const FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID =
  "manufacturer-profile:forbo-eurocol-232-eurosol-montage:310ml:v1" as const;

export const FORBO_232_MOUNTING_ADHESIVE_NORM_ID =
  "baseboards_forbo_232_mounting_adhesive_upper_ml_linear_m_v1" as const;

export const FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID =
  `src_professional_norm_pack_${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}` as const;

const FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "skirting_length_linear_m",
  "skirting_material",
  "substrate_type",
  "selected_adhesive_product",
  "adhesive_profile_mode",
  "adhesive_consumption_ml_linear_m",
  "substrate_ready_confirmed",
  "processing_conditions_confirmed",
  "ventilation_fire_controls_confirmed",
  "manufacturer_instruction_reference",
] as const);

export const LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID =
  "manufacturer-profile:legrand-p31:symmetrical-tray:75-300mm:v1" as const;

export const LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID =
  "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1" as const;

export const LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID =
  `src_professional_norm_pack_${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}` as const;

export const WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID =
  "manufacturer-profile:wavin-hep2o:push-fit:v1" as const;

export const WAVIN_HEP2O_SMARTSLEEVE_NORM_ID =
  "plumbing_wavin_hep2o_smartsleeve_piece_connection_v1" as const;

export const WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}` as const;

export const WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID =
  "plumbing_wavin_hep2o_15mm_horizontal_clip_spacing_v1" as const;

export const WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_NORM_ID =
  "plumbing_wavin_hep2o_22mm_horizontal_clip_spacing_v1" as const;

export const WAVIN_HEP2O_15MM_VERTICAL_CLIP_NORM_ID =
  "plumbing_wavin_hep2o_15mm_vertical_clip_spacing_v1" as const;

export const WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID}` as const;

export const WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_NORM_ID}` as const;

export const WAVIN_HEP2O_15MM_VERTICAL_CLIP_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_15MM_VERTICAL_CLIP_NORM_ID}` as const;

const uponorNorm = (() => {
  const found = heatingNormPack.norm_items.find((item) => item.norm_id === UPONOR_UFH_150MM_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${UPONOR_UFH_150MM_NORM_ID}`);
  return found;
})();
if (
  heatingNormPack.work_group !== "heating" ||
  uponorNorm.unit !== "linear_m" ||
  uponorNorm.rate.unit !== "pipe linear m/heated floor m2 at 150 mm spacing, excluding feed and tail lengths" ||
  uponorNorm.applicability.pipe_spacing_mm !== 150 ||
  uponorNorm.rounding.mode !== "ceil_after_loop_and_feed_tail_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${UPONOR_UFH_150MM_NORM_ID}`);
}

export const UPONOR_UFH_150MM_SOURCE_METADATA = Object.freeze({
  source_id: UPONOR_UFH_150MM_SOURCE_ID,
  norm_id: UPONOR_UFH_150MM_NORM_ID,
  source_document_version: heatingNormPack.source_pack_version,
  source_title: uponorNorm.source.title,
  source_url: uponorNorm.source.url,
  exact_locator: uponorNorm.source.page,
  rate_value: uponorNorm.rate.value,
  rate_unit: uponorNorm.rate.unit,
  pipe_spacing_mm: uponorNorm.applicability.pipe_spacing_mm,
  definition_hash: estimateDeterministicHash({
    work_group: heatingNormPack.work_group,
    source_pack_version: heatingNormPack.source_pack_version,
    norm_item: uponorNorm,
  }),
});

const lindabVsrNorm = (() => {
  const found = ventilationNormPack.norm_items.find((item) => item.norm_id === LINDAB_VSR_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${LINDAB_VSR_NORM_ID}`);
  return found;
})();

if (
  ventilationNormPack.work_group !== "ventilation" ||
  lindabVsrNorm.unit !== "linear_m" ||
  lindabVsrNorm.rate.unit !== "duct linear m/approved straight route linear m" ||
  lindabVsrNorm.rate.value !== 1 ||
  lindabVsrNorm.rounding.mode !== "ceil_after_fitting_and_nozzle_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${LINDAB_VSR_NORM_ID}`);
}

export const LINDAB_VSR_SOURCE_METADATA = Object.freeze({
  source_id: LINDAB_VSR_SOURCE_ID,
  norm_id: LINDAB_VSR_NORM_ID,
  source_document_version: ventilationNormPack.source_pack_version,
  source_title: lindabVsrNorm.source.title,
  source_url: lindabVsrNorm.source.url,
  exact_locator: lindabVsrNorm.source.page,
  rate_value: lindabVsrNorm.rate.value,
  rate_unit: lindabVsrNorm.rate.unit,
  available_diameter_range_mm: lindabVsrNorm.applicability.available_diameter_range_mm,
  maximum_standard_length_m: lindabVsrNorm.applicability.maximum_standard_length_m,
  definition_hash: estimateDeterministicHash({
    work_group: ventilationNormPack.work_group,
    source_pack_version: ventilationNormPack.source_pack_version,
    norm_item: lindabVsrNorm,
  }),
});

const daikin3MxsKNorm = (() => {
  const found = airConditioningNormPack.norm_items.find((item) => item.norm_id === DAIKIN_3MXS_K_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${DAIKIN_3MXS_K_NORM_ID}`);
  return found;
})();

if (
  airConditioningNormPack.work_group !== "air_conditioning" ||
  daikin3MxsKNorm.unit !== "kg" ||
  daikin3MxsKNorm.rate.value !== 0.02 ||
  daikin3MxsKNorm.rate.unit !== "kg/m of total piping length exceeding 30 m" ||
  daikin3MxsKNorm.applicability.refrigerant !== "R-410A" ||
  daikin3MxsKNorm.applicability.factory_chargeless_length_m !== 30 ||
  daikin3MxsKNorm.applicability.maximum_total_piping_length_m !== 50 ||
  daikin3MxsKNorm.applicability.maximum_piping_to_each_indoor_unit_m !== 25 ||
  daikin3MxsKNorm.applicability.maximum_outdoor_to_indoor_height_difference_m !== 15 ||
  daikin3MxsKNorm.applicability.maximum_indoor_to_indoor_height_difference_m !== 7.5 ||
  daikin3MxsKNorm.applicability.model_nameplate_and_installation_manual_must_be_confirmed !== true ||
  daikin3MxsKNorm.applicability.other_daikin_or_other_manufacturer_models_forbidden !== true ||
  daikin3MxsKNorm.applicability.maximum_piping_and_height_difference_limits_require_separate_check !== true ||
  daikin3MxsKNorm.parameters.length !== DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !daikin3MxsKNorm.parameters.includes(parameterId),
  ) ||
  daikin3MxsKNorm.rounding.package_unit !== "not_applicable" ||
  daikin3MxsKNorm.rounding.package_size !== 1 ||
  daikin3MxsKNorm.rounding.mode !== "no_package_rounding_apply_exact_manufacturer_formula"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${DAIKIN_3MXS_K_NORM_ID}`);
}

export const DAIKIN_3MXS_K_SOURCE_METADATA = Object.freeze({
  source_id: DAIKIN_3MXS_K_SOURCE_ID,
  norm_id: DAIKIN_3MXS_K_NORM_ID,
  source_document_version: airConditioningNormPack.source_pack_version,
  source_title: daikin3MxsKNorm.source.title,
  source_url: daikin3MxsKNorm.source.url,
  exact_locator: daikin3MxsKNorm.source.page,
  rate_value: daikin3MxsKNorm.rate.value,
  rate_unit: daikin3MxsKNorm.rate.unit,
  refrigerant: daikin3MxsKNorm.applicability.refrigerant,
  factory_chargeless_length_m: daikin3MxsKNorm.applicability.factory_chargeless_length_m,
  maximum_total_piping_length_m: daikin3MxsKNorm.applicability.maximum_total_piping_length_m,
  maximum_piping_to_each_indoor_unit_m: daikin3MxsKNorm.applicability.maximum_piping_to_each_indoor_unit_m,
  maximum_outdoor_to_indoor_height_difference_m:
    daikin3MxsKNorm.applicability.maximum_outdoor_to_indoor_height_difference_m,
  maximum_indoor_to_indoor_height_difference_m:
    daikin3MxsKNorm.applicability.maximum_indoor_to_indoor_height_difference_m,
  definition_hash: estimateDeterministicHash({
    work_group: airConditioningNormPack.work_group,
    source_pack_version: airConditioningNormPack.source_pack_version,
    norm_item: daikin3MxsKNorm,
  }),
});

const knaufD112WallFastenerNorm = (() => {
  const found = ceilingsNormPack.norm_items.find((item) => item.norm_id === KNAUF_D112_WALL_FASTENER_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_WALL_FASTENER_NORM_ID}`);
  return found;
})();
const knaufD112ReferenceCeilingM = knaufD112WallFastenerNorm.applicability.reference_ceiling_m;

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112WallFastenerNorm.unit !== "piece" ||
  knaufD112WallFastenerNorm.rate.value !== 0.4 ||
  knaufD112WallFastenerNorm.rate.unit !== "piece/m2 for the documented 10 m x 10 m reference ceiling" ||
  knaufD112WallFastenerNorm.applicability.system !== "Knauf D112" ||
  knaufD112WallFastenerNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !knaufD112ReferenceCeilingM ||
  knaufD112ReferenceCeilingM[0] !== 10 ||
  knaufD112ReferenceCeilingM[1] !== 10 ||
  knaufD112WallFastenerNorm.applicability.fastener_must_be_approved_for_substrate !== true ||
  knaufD112WallFastenerNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  knaufD112WallFastenerNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_WALL_FASTENER_NORM_ID}`);
}

export const KNAUF_D112_WALL_FASTENER_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112WallFastenerNorm.source.title,
  source_url: knaufD112WallFastenerNorm.source.url,
  exact_locator: knaufD112WallFastenerNorm.source.page,
  rate_value: knaufD112WallFastenerNorm.rate.value,
  rate_unit: knaufD112WallFastenerNorm.rate.unit,
  system: knaufD112WallFastenerNorm.applicability.system,
  variant: knaufD112WallFastenerNorm.applicability.variant,
  reference_ceiling_m: knaufD112ReferenceCeilingM,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112WallFastenerNorm,
  }),
});

const knaufFugenfuellerPerimeterNorm = (() => {
  const found = drywallNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}`);
  }
  return found;
})();
const knaufFugenfuellerRateRange = "rate_range_kg_linear_m" in knaufFugenfuellerPerimeterNorm.applicability
  ? knaufFugenfuellerPerimeterNorm.applicability.rate_range_kg_linear_m
  : null;

if (
  drywallNormPack.work_group !== "drywall" ||
  knaufFugenfuellerPerimeterNorm.unit !== "kg" ||
  knaufFugenfuellerPerimeterNorm.rate.value !== 0.15 ||
  knaufFugenfuellerPerimeterNorm.rate.unit !== "kg/linear_m; range 0.15-0.25 kg/linear_m" ||
  !("systems" in knaufFugenfuellerPerimeterNorm.applicability) ||
  knaufFugenfuellerPerimeterNorm.applicability.systems.length !== 1 ||
  knaufFugenfuellerPerimeterNorm.applicability.systems[0] !== "gypsum_board" ||
  !("connection" in knaufFugenfuellerPerimeterNorm.applicability) ||
  knaufFugenfuellerPerimeterNorm.applicability.connection !== "perimeter" ||
  !knaufFugenfuellerRateRange ||
  knaufFugenfuellerRateRange[0] !== 0.15 ||
  knaufFugenfuellerRateRange[1] !== 0.25 ||
  knaufFugenfuellerPerimeterNorm.waste_percent_default !== 8 ||
  knaufFugenfuellerPerimeterNorm.rounding.package_unit !== "bag" ||
  knaufFugenfuellerPerimeterNorm.rounding.package_size !== 25 ||
  knaufFugenfuellerPerimeterNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}`);
}

export const KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
  norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  source_document_version: drywallNormPack.source_pack_version,
  source_title: knaufFugenfuellerPerimeterNorm.source.title,
  source_url: knaufFugenfuellerPerimeterNorm.source.url,
  exact_locator: knaufFugenfuellerPerimeterNorm.source.page,
  rate_value: knaufFugenfuellerPerimeterNorm.rate.value,
  rate_unit: knaufFugenfuellerPerimeterNorm.rate.unit,
  rate_range_kg_linear_m: [knaufFugenfuellerRateRange[0], knaufFugenfuellerRateRange[1]] as const,
  system: knaufFugenfuellerPerimeterNorm.applicability.systems[0],
  connection: knaufFugenfuellerPerimeterNorm.applicability.connection,
  waste_percent_default: knaufFugenfuellerPerimeterNorm.waste_percent_default,
  package_size_kg: knaufFugenfuellerPerimeterNorm.rounding.package_size,
  definition_hash: estimateDeterministicHash({
    work_group: drywallNormPack.work_group,
    source_pack_version: drywallNormPack.source_pack_version,
    norm_item: knaufFugenfuellerPerimeterNorm,
  }),
});

const forbo232MountingAdhesiveNorm = (() => {
  const found = baseboardsNormPack.norm_items.find(
    (item) => item.norm_id === FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}`);
  }
  return found;
})();
const forbo232RateRange = "manufacturer_rate_range_ml_linear_m" in forbo232MountingAdhesiveNorm.applicability
  ? forbo232MountingAdhesiveNorm.applicability.manufacturer_rate_range_ml_linear_m
  : null;
const forbo232SkirtingMaterials = "skirting_materials" in forbo232MountingAdhesiveNorm.applicability
  ? forbo232MountingAdhesiveNorm.applicability.skirting_materials
  : null;
const forbo232SubstrateTypes = "substrate_types" in forbo232MountingAdhesiveNorm.applicability
  ? forbo232MountingAdhesiveNorm.applicability.substrate_types
  : null;

if (
  baseboardsNormPack.work_group !== "baseboards" ||
  forbo232MountingAdhesiveNorm.unit !== "ml" ||
  forbo232MountingAdhesiveNorm.rate.value !== 40 ||
  forbo232MountingAdhesiveNorm.rate.unit !== "ml/linear_m; conservative upper endpoint of manufacturer range 20-40 ml/linear_m" ||
  !("product" in forbo232MountingAdhesiveNorm.applicability) ||
  forbo232MountingAdhesiveNorm.applicability.product !== "Forbo Eurocol 232 Eurosol Montage" ||
  !forbo232RateRange ||
  forbo232RateRange[0] !== 20 ||
  forbo232RateRange[1] !== 40 ||
  !forbo232SkirtingMaterials ||
  forbo232SkirtingMaterials.length !== 2 ||
  !forbo232SkirtingMaterials.includes("wood") ||
  !forbo232SkirtingMaterials.includes("rigid_pvc") ||
  !forbo232SubstrateTypes ||
  forbo232SubstrateTypes.length !== 3 ||
  !forbo232SubstrateTypes.includes("concrete") ||
  !forbo232SubstrateTypes.includes("wood_material") ||
  !forbo232SubstrateTypes.includes("clean_metal") ||
  forbo232MountingAdhesiveNorm.parameters.length !==
    FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !forbo232MountingAdhesiveNorm.parameters.includes(parameterId),
  ) ||
  forbo232MountingAdhesiveNorm.waste_percent_default !== 0 ||
  forbo232MountingAdhesiveNorm.rounding.package_unit !== "PE_cartridge" ||
  forbo232MountingAdhesiveNorm.rounding.package_size !== 310 ||
  forbo232MountingAdhesiveNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}`);
}

export const FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA = Object.freeze({
  source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  source_document_version: baseboardsNormPack.source_pack_version,
  source_title: forbo232MountingAdhesiveNorm.source.title,
  source_url: forbo232MountingAdhesiveNorm.source.url,
  exact_locator: forbo232MountingAdhesiveNorm.source.page,
  rate_value: forbo232MountingAdhesiveNorm.rate.value,
  rate_unit: forbo232MountingAdhesiveNorm.rate.unit,
  rate_range_ml_linear_m: [forbo232RateRange[0], forbo232RateRange[1]] as const,
  product: forbo232MountingAdhesiveNorm.applicability.product,
  skirting_materials: [...forbo232SkirtingMaterials],
  substrate_types: [...forbo232SubstrateTypes],
  waste_percent_default: forbo232MountingAdhesiveNorm.waste_percent_default,
  package_size_ml: forbo232MountingAdhesiveNorm.rounding.package_size,
  definition_hash: estimateDeterministicHash({
    work_group: baseboardsNormPack.work_group,
    source_pack_version: baseboardsNormPack.source_pack_version,
    norm_item: forbo232MountingAdhesiveNorm,
  }),
});

const legrandP31TrayJointFastenerNorm = (() => {
  const found = electricalNormPack.norm_items.find(
    (item) => item.norm_id === LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}`);
  }
  return found;
})();
const legrandP31CouplerOptions = "coupler_options" in legrandP31TrayJointFastenerNorm.applicability
  ? legrandP31TrayJointFastenerNorm.applicability.coupler_options
  : null;

if (
  electricalNormPack.work_group !== "electrical" ||
  legrandP31TrayJointFastenerNorm.unit !== "piece" ||
  legrandP31TrayJointFastenerNorm.rate.value !== 8 ||
  legrandP31TrayJointFastenerNorm.rate.unit !== "M6 fasteners/tray joint for 75-300 mm tray" ||
  !("system" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.system !== "Legrand P31 symmetrical cable tray" ||
  !("tray_width_mm_min" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_min !== 75 ||
  !("tray_width_mm_max" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_max !== 300 ||
  !legrandP31CouplerOptions ||
  legrandP31CouplerOptions.length !== 2 ||
  !legrandP31CouplerOptions.includes("EP Coupler LG-341213") ||
  !legrandP31CouplerOptions.includes("ER Coupler LG-482219") ||
  !("tightening_torque_nm" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.tightening_torque_nm !== 11 ||
  !("other_widths_require_their_own_table_row" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.other_widths_require_their_own_table_row !== true ||
  legrandP31TrayJointFastenerNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}`);
}

export const LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA = Object.freeze({
  source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
  norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  source_document_version: electricalNormPack.source_pack_version,
  source_title: legrandP31TrayJointFastenerNorm.source.title,
  source_url: legrandP31TrayJointFastenerNorm.source.url,
  exact_locator: legrandP31TrayJointFastenerNorm.source.page,
  rate_value: legrandP31TrayJointFastenerNorm.rate.value,
  rate_unit: legrandP31TrayJointFastenerNorm.rate.unit,
  system: legrandP31TrayJointFastenerNorm.applicability.system,
  tray_width_mm_min: legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_min,
  tray_width_mm_max: legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_max,
  coupler_options: [...legrandP31CouplerOptions],
  tightening_torque_nm: legrandP31TrayJointFastenerNorm.applicability.tightening_torque_nm,
  definition_hash: estimateDeterministicHash({
    work_group: electricalNormPack.work_group,
    source_pack_version: electricalNormPack.source_pack_version,
    norm_item: legrandP31TrayJointFastenerNorm,
  }),
});

const wavinHep2OSmartSleeveNorm = (() => {
  const found = plumbingNormPack.norm_items.find((item) => item.norm_id === WAVIN_HEP2O_SMARTSLEEVE_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}`);
  return found;
})();

if (
  plumbingNormPack.work_group !== "plumbing" ||
  wavinHep2OSmartSleeveNorm.unit !== "piece" ||
  wavinHep2OSmartSleeveNorm.rate.value !== 1 ||
  wavinHep2OSmartSleeveNorm.rate.unit !== "piece/prepared pipe end inserted into fitting" ||
  wavinHep2OSmartSleeveNorm.applicability.system !== "Wavin Hep2O push-fit" ||
  wavinHep2OSmartSleeveNorm.applicability.count_basis !== "prepared_pipe_end_count" ||
  wavinHep2OSmartSleeveNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}`);
}

export const WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA = Object.freeze({
  source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
  norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
  source_document_version: plumbingNormPack.source_pack_version,
  source_title: wavinHep2OSmartSleeveNorm.source.title,
  source_url: wavinHep2OSmartSleeveNorm.source.url,
  exact_locator: wavinHep2OSmartSleeveNorm.source.page,
  rate_value: wavinHep2OSmartSleeveNorm.rate.value,
  rate_unit: wavinHep2OSmartSleeveNorm.rate.unit,
  system: wavinHep2OSmartSleeveNorm.applicability.system,
  installation_step: wavinHep2OSmartSleeveNorm.applicability.installation_step,
  count_basis: wavinHep2OSmartSleeveNorm.applicability.count_basis,
  definition_hash: estimateDeterministicHash({
    work_group: plumbingNormPack.work_group,
    source_pack_version: plumbingNormPack.source_pack_version,
    norm_item: wavinHep2OSmartSleeveNorm,
  }),
});

const wavinHep2OClipNorms = [{
  norm_id: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID,
  source_id: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
  diameter_mm: 15,
  orientation: "horizontal",
  maximum_clip_spacing_m: 0.3,
}, {
  norm_id: WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_NORM_ID,
  source_id: WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_SOURCE_ID,
  diameter_mm: 22,
  orientation: "horizontal",
  maximum_clip_spacing_m: 0.5,
}, {
  norm_id: WAVIN_HEP2O_15MM_VERTICAL_CLIP_NORM_ID,
  source_id: WAVIN_HEP2O_15MM_VERTICAL_CLIP_SOURCE_ID,
  diameter_mm: 15,
  orientation: "vertical",
  maximum_clip_spacing_m: 0.5,
}] as const;

export const WAVIN_HEP2O_CLIP_SOURCE_METADATA = Object.freeze(wavinHep2OClipNorms.map((expected) => {
  const normItem = plumbingNormPack.norm_items.find((item) => item.norm_id === expected.norm_id);
  if (!normItem) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${expected.norm_id}`);
  if (
    plumbingNormPack.work_group !== "plumbing" ||
    normItem.unit !== "piece" ||
    normItem.rate.value !== expected.maximum_clip_spacing_m ||
    normItem.rate.unit !== "maximum spacing m between clips; count must include run endpoints and fittings" ||
    normItem.applicability.system !== "Wavin Hep2O" ||
    normItem.applicability.pipe_nominal_diameter_mm !== expected.diameter_mm ||
    normItem.applicability.orientation !== expected.orientation ||
    normItem.applicability.maximum_clip_spacing_m !== expected.maximum_clip_spacing_m ||
    normItem.applicability.count_formula !== "support_layout_count_from_max_spacing_with_endpoints" ||
    normItem.applicability.simple_rate_multiplication_forbidden !== true ||
    normItem.rounding.mode !== "ceil_after_layout"
  ) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${expected.norm_id}`);
  }
  return Object.freeze({
    source_id: expected.source_id,
    norm_id: expected.norm_id,
    source_document_version: plumbingNormPack.source_pack_version,
    source_title: normItem.source.title,
    source_url: normItem.source.url,
    exact_locator: normItem.source.page,
    rate_value: normItem.rate.value,
    rate_unit: normItem.rate.unit,
    system: normItem.applicability.system,
    pipe_nominal_diameter_mm: normItem.applicability.pipe_nominal_diameter_mm,
    orientation: normItem.applicability.orientation,
    maximum_clip_spacing_m: normItem.applicability.maximum_clip_spacing_m,
    count_formula: normItem.applicability.count_formula,
    definition_hash: estimateDeterministicHash({
      work_group: plumbingNormPack.work_group,
      source_pack_version: plumbingNormPack.source_pack_version,
      norm_item: normItem,
    }),
  });
}));

const REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "zone_area_m2",
  "designed_pipe_spacing_mm",
  "manifold_location",
  "feed_tail_length_linear_m",
  "loop_length_limit",
  "hydraulic_loop_design_reference",
  "circuit_count",
  "manifold_outlet_count",
  "longest_circuit_length_m",
] as const);

const LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "route_length_m",
  "duct_diameter_mm",
  "nozzle_pattern",
  "air_distribution_design",
  "fitting_schedule",
  "cooled_supply_air_confirmed",
] as const);

const KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "length_m",
  "width_m",
  "system_passport_reference",
  "system_variant",
  "substrate_type",
  "substrate_fastener_reference",
  "substrate_fastener_approved",
  "ceiling_perimeter_anchor_spacing_m",
] as const);

const KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "perimeter_linear_m",
  "cladding_thickness_mm",
  "perimeter_joint_consumption_kg_linear_m",
  "perimeter_connection_joint_method",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

const LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "product_specification_id",
  "containment_type",
  "containment_width_mm",
  "tray_joint_count",
  "tray_width_mm",
  "coupler_reference",
  "manufacturer_system_profile_id",
  "installation_manual_reference",
  "tightening_torque_nm",
] as const);

const WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "exact_material_or_equipment",
  "pipe_material_and_class",
  "jointing_method",
  "connection_count",
  "prepared_pipe_end_count",
  "hep2o_system_variant",
  "hep2o_joint_topology_reference",
] as const);

const WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "route_length_m",
  "nominal_diameter_mm",
  "hep2o_support_orientation",
  "hep2o_support_span_lengths_m",
  "hep2o_support_anchor_node_count",
  "hep2o_support_layout_reference",
  "hep2o_support_anchor_positions_verified",
] as const);

const WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  ...WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS,
] as const);

export const CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1 = Object.freeze([{
  norm_id: UPONOR_UFH_150MM_NORM_ID,
  work_group: "heating",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "WARM_FLOOR_SYSTEM",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
  source_id: UPONOR_UFH_150MM_SOURCE_ID,
  source_document_version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
  source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["circuit_length_m"] as const,
}, {
  norm_id: LINDAB_VSR_NORM_ID,
  work_group: "ventilation",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "DUCT_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: LINDAB_VSR_PRODUCT_PROFILE_ID,
  source_id: LINDAB_VSR_SOURCE_ID,
  source_document_version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
  source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"] as const,
}, {
  norm_id: DAIKIN_3MXS_K_NORM_ID,
  work_group: "air_conditioning",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "REFRIGERANT_SYSTEM",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  source_id: DAIKIN_3MXS_K_SOURCE_ID,
  source_document_version: DAIKIN_3MXS_K_SOURCE_METADATA.source_document_version,
  source_definition_hash: DAIKIN_3MXS_K_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["factory_chargeless_length_m", "manufacturer_charge_kg"] as const,
}, {
  norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FRAME",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  source_document_version: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_perimeter_track_anchors"] as const,
}, {
  norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  work_group: "drywall",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FINISH_JOINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
  source_document_version: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["perimeter_joint_compound_quantity_kg"] as const,
}, {
  norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  work_group: "baseboards",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "BASEBOARD",
  operation_class: "GLUE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  source_document_version: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.source_document_version,
  source_definition_hash: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["forbo_adhesive_procurement_quantity_ml"] as const,
}, {
  norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  work_group: "electrical",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "CABLE_CHANNEL",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
  source_document_version: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_document_version,
  source_definition_hash: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_containment_joint_bolt"] as const,
}, {
  norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
  work_group: "plumbing",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "HEATING_PIPE_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
  source_document_version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
  source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["smart_sleeve_quantity_piece"] as const,
}, ...WAVIN_HEP2O_CLIP_SOURCE_METADATA.map((metadata) => ({
  norm_id: metadata.norm_id,
  work_group: "plumbing",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "HEATING_PIPE_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  source_id: metadata.source_id,
  source_document_version: metadata.source_document_version,
  source_definition_hash: metadata.definition_hash,
  consumed_parameter_ids: WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["support_count"] as const,
}))]);

type AppliedPhysicalNormResolutionV1 = {
  status: "APPLIED";
  applicability_version: typeof PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1;
  product_profile_id: string;
  source_id: string;
  norm_id: string;
  source_document_version: string;
  source_url: string;
  exact_locator: string;
  source_definition_hash: string;
  source_ids?: readonly string[];
  norm_ids?: readonly string[];
  applied_norms?: readonly {
    source_id: string;
    norm_id: string;
    source_document_version: string;
    source_url: string;
    exact_locator: string;
    source_definition_hash: string;
    produced_parameter_ids: readonly string[];
  }[];
  consumed_parameter_ids: readonly string[];
  produced_parameter_ids: readonly string[];
  calculated_pipe_length_m?: number;
  calculated_resource_quantity_m?: number;
  calculated_additional_refrigerant_kg?: number;
  calculated_wall_fastener_quantity_piece?: number;
  calculated_perimeter_joint_compound_quantity_kg?: number;
  calculated_forbo_adhesive_procurement_quantity_ml?: number;
  calculated_tray_joint_fastener_quantity_piece?: number;
  calculated_smart_sleeve_quantity_piece?: number;
  calculated_support_quantity_piece?: number;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  blockers: readonly [];
  deterministic_hash: string;
};

type NonAppliedPhysicalNormResolutionV1 = {
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE";
  applicability_version: typeof PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1;
  product_profile_id: string | null;
  source_id: string;
  norm_id: string;
  source_document_version: string;
  source_url: string;
  exact_locator: string;
  source_definition_hash: string;
  consumed_parameter_ids: readonly string[];
  produced_parameter_ids: readonly [];
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  blockers: readonly string[];
  deterministic_hash: string;
};

export type ProfessionalPhysicalNormApplicabilityResolutionV1 =
  | AppliedPhysicalNormResolutionV1
  | NonAppliedPhysicalNormResolutionV1;

export type AppliedProfessionalPhysicalNormResolutionV1 = AppliedPhysicalNormResolutionV1;

function primitiveString(value: ProfessionalParameterValueV4 | undefined): string | null {
  if (typeof value?.value !== "string") return null;
  const normalized = value.value.trim();
  return normalized.length > 0 ? normalized : null;
}

function explicitValue(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  parameterId: string,
): ProfessionalParameterValueV4 | null {
  const value = values[parameterId];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && value.value.trim().length === 0) return null;
  return value;
}

function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function nonApplied(
  status: NonAppliedPhysicalNormResolutionV1["status"],
  productProfileId: string | null,
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumedParameterIds: readonly string[] = [],
  sourceMetadata: {
    source_id: string;
    norm_id: string;
    source_document_version: string;
    source_url: string;
    exact_locator: string;
    definition_hash: string;
  } = UPONOR_UFH_150MM_SOURCE_METADATA,
): NonAppliedPhysicalNormResolutionV1 {
  const withoutHash = {
    status,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: sourceMetadata.source_id,
    norm_id: sourceMetadata.norm_id,
    source_document_version: sourceMetadata.source_document_version,
    source_url: sourceMetadata.source_url,
    exact_locator: sourceMetadata.exact_locator,
    source_definition_hash: sourceMetadata.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveLindabVsr(
  productProfileId: typeof LINDAB_VSR_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const routeLengthM = finiteNumber(explicit.route_length_m);
  const diameterMm = finiteNumber(explicit.duct_diameter_mm);
  const [minimumDiameterMm, maximumDiameterMm] = LINDAB_VSR_SOURCE_METADATA.available_diameter_range_mm;
  const invalidNumeric = [
    routeLengthM === null || routeLengthM <= 0 ? "PROJECT_VALUE_INVALID:route_length_m" : "",
    diameterMm === null || diameterMm < minimumDiameterMm || diameterMm > maximumDiameterMm
      ? `PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:duct_diameter_mm=${diameterMm}`
      : "",
  ].filter(Boolean);
  if (invalidNumeric.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      invalidNumeric,
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  if (explicit.cooled_supply_air_confirmed?.value !== true) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:cooled_supply_air_confirmed=false`],
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const packageSize = lindabVsrNorm.rounding.package_size;
  const calculatedResourceQuantityM = Math.ceil(
    routeLengthM! * LINDAB_VSR_SOURCE_METADATA.rate_value / packageSize,
  ) * packageSize;
  const resourceUnitsPerOutput = LINDAB_VSR_SOURCE_METADATA.rate_value;
  const procurementFactor = calculatedResourceQuantityM / (routeLengthM! * resourceUnitsPerOutput);
  if (procurementFactor > 3) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_RUNTIME_RANGE_EXCEEDED:procurement_factor=${procurementFactor}:maximum=3`],
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  const explicitUnitsPerOutput = finiteNumber(explicitValue(parameterValuesInput, "primary_resource_units_per_output"));
  const explicitProcurementFactor = finiteNumber(explicitValue(parameterValuesInput, "procurement_factor"));
  const conflicts = [
    explicitUnitsPerOutput !== null && Math.abs(explicitUnitsPerOutput - resourceUnitsPerOutput) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:primary_resource_units_per_output=${explicitUnitsPerOutput}:norm_value=${resourceUnitsPerOutput}`
      : "",
    explicitProcurementFactor !== null && Math.abs(explicitProcurementFactor - procurementFactor) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:procurement_factor=${explicitProcurementFactor}:norm_value=${procurementFactor}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS, "primary_resource_units_per_output", "procurement_factor"],
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const capturedAt = LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${LINDAB_VSR_PRODUCT_PROFILE_ID}`,
    `route_length_m=${routeLengthM}`,
    `duct_diameter_mm=${diameterMm}`,
    `cooled_supply_air_confirmed=true`,
    `nozzle_pattern=${primitiveString(explicit.nozzle_pattern!)}`,
    `air_distribution_design=${primitiveString(explicit.air_distribution_design!)}`,
    `fitting_schedule=${primitiveString(explicit.fitting_schedule!)}`,
    `formula=ceil(route_length_m*${resourceUnitsPerOutput}/${packageSize})*${packageSize}`,
    "bends_transitions_supports_seals_and_cutting_are_separate=true",
  ].join(";");
  const sourceManagedValue = (
    value: number,
    unitId: string,
  ): ProfessionalParameterValueV4 => ({
    value,
    unit_id: unitId,
    source_type: "APPLICABLE_NORM",
    source_id: LINDAB_VSR_SOURCE_ID,
    captured_at: capturedAt,
    confidence: "high",
    applicability,
  });
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    primary_resource_units_per_output: sourceManagedValue(resourceUnitsPerOutput, "ratio"),
    procurement_factor: sourceManagedValue(procurementFactor, "ratio"),
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: LINDAB_VSR_SOURCE_ID,
    norm_id: LINDAB_VSR_NORM_ID,
    source_document_version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
    source_url: LINDAB_VSR_SOURCE_METADATA.source_url,
    exact_locator: LINDAB_VSR_SOURCE_METADATA.exact_locator,
    source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"],
    calculated_resource_quantity_m: calculatedResourceQuantityM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveDaikin3MxsK(
  productProfileId: typeof DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS,
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }

  const equipmentModel = primitiveString(explicit.equipment_model!);
  const manufacturerProfile = primitiveString(explicit.manufacturer_system_profile_id!);
  const refrigerantType = primitiveString(explicit.refrigerant_type!);
  const totalPipingLengthM = finiteNumber(explicit.total_refrigerant_piping_length_m);
  const applicabilityBlockers = [
    equipmentModel === "Daikin 3MXS-K"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:equipment_model=${equipmentModel}`,
    manufacturerProfile === DAIKIN_3MXS_K_PRODUCT_PROFILE_ID
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:manufacturer_system_profile_id=${manufacturerProfile}`,
    refrigerantType === DAIKIN_3MXS_K_SOURCE_METADATA.refrigerant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:refrigerant_type=${refrigerantType}`,
    totalPipingLengthM !== null && totalPipingLengthM > DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m
      ? ""
      : `PHYSICAL_NORM_ADDITIONAL_CHARGE_NOT_REQUIRED_OR_LENGTH_INVALID:total_refrigerant_piping_length_m=${totalPipingLengthM}`,
    explicit.maximum_piping_and_height_limits_confirmed?.value === true
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:maximum_piping_and_height_limits_confirmed=false`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS,
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }

  const rawAdditionalChargeKg = (
    totalPipingLengthM! - DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m
  ) * DAIKIN_3MXS_K_SOURCE_METADATA.rate_value;
  const calculatedAdditionalRefrigerantKg = Number(rawAdditionalChargeKg.toFixed(9));
  const explicitFactoryLength = finiteNumber(explicitValue(parameterValuesInput, "factory_chargeless_length_m"));
  const explicitCharge = finiteNumber(explicitValue(parameterValuesInput, "manufacturer_charge_kg"));
  const conflicts = [
    explicitFactoryLength !== null &&
      Math.abs(explicitFactoryLength - DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:factory_chargeless_length_m=${explicitFactoryLength}:norm_value=${DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m}`
      : "",
    explicitCharge !== null && Math.abs(explicitCharge - calculatedAdditionalRefrigerantKg) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:manufacturer_charge_kg=${explicitCharge}:norm_value=${calculatedAdditionalRefrigerantKg}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS, "factory_chargeless_length_m", "manufacturer_charge_kg"],
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }

  const capturedAt = DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${DAIKIN_3MXS_K_PRODUCT_PROFILE_ID}`,
    `equipment_model=${equipmentModel}`,
    `refrigerant_type=${refrigerantType}`,
    `total_refrigerant_piping_length_m=${totalPipingLengthM}`,
    `factory_chargeless_length_m=${DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m}`,
    `outdoor_unit_nameplate_reference=${primitiveString(explicit.outdoor_unit_nameplate_reference!)}`,
    `maximum_piping_and_height_limits_confirmed=true`,
    `formula=max(0,total_refrigerant_piping_length_m-${DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m})*${DAIKIN_3MXS_K_SOURCE_METADATA.rate_value}`,
  ].join(";");
  const sourceManagedValue = (value: number, unitId: string): ProfessionalParameterValueV4 => ({
    value,
    unit_id: unitId,
    source_type: "APPLICABLE_NORM",
    source_id: DAIKIN_3MXS_K_SOURCE_ID,
    captured_at: capturedAt,
    confidence: "high",
    applicability,
  });
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    factory_chargeless_length_m: sourceManagedValue(
      DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m,
      "m",
    ),
    manufacturer_charge_kg: sourceManagedValue(calculatedAdditionalRefrigerantKg, "kg"),
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: DAIKIN_3MXS_K_SOURCE_ID,
    norm_id: DAIKIN_3MXS_K_NORM_ID,
    source_document_version: DAIKIN_3MXS_K_SOURCE_METADATA.source_document_version,
    source_url: DAIKIN_3MXS_K_SOURCE_METADATA.source_url,
    exact_locator: DAIKIN_3MXS_K_SOURCE_METADATA.exact_locator,
    source_definition_hash: DAIKIN_3MXS_K_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["factory_chargeless_length_m", "manufacturer_charge_kg"],
    calculated_additional_refrigerant_kg: calculatedAdditionalRefrigerantKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112ReferenceCeiling(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const lengthM = finiteNumber(explicit.length_m);
  const widthM = finiteNumber(explicit.width_m);
  const perimeterAnchorSpacingM = finiteNumber(explicit.ceiling_perimeter_anchor_spacing_m);
  const systemVariant = primitiveString(explicit.system_variant!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const substrateFastenerReference = primitiveString(explicit.substrate_fastener_reference!);
  const [referenceLengthM, referenceWidthM] = KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.reference_ceiling_m;
  const referenceAreaM2 = referenceLengthM * referenceWidthM;
  const geometryMatches = areaM2 !== null && lengthM !== null && widthM !== null &&
    Math.abs(areaM2 - referenceAreaM2) <= 1e-9 &&
    Math.abs(lengthM - referenceLengthM) <= 1e-9 &&
    Math.abs(widthM - referenceWidthM) <= 1e-9 &&
    Math.abs(areaM2 - lengthM * widthM) <= 1e-9;
  const applicabilityBlockers = [
    geometryMatches
      ? ""
      : `PHYSICAL_NORM_REFERENCE_GEOMETRY_NOT_APPLICABLE:length_m=${lengthM}:width_m=${widthM}:area_m2=${areaM2}`,
    systemVariant === KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_WALL_FASTENER_NORM_ID}:system_variant=${systemVariant}`,
    substrateType
      ? ""
      : "PROJECT_VALUE_INVALID:substrate_type",
    substrateFastenerReference
      ? ""
      : "PROJECT_VALUE_INVALID:substrate_fastener_reference",
    explicit.substrate_fastener_approved?.value === true
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_WALL_FASTENER_NORM_ID}:substrate_fastener_approved=false`,
    perimeterAnchorSpacingM !== null && perimeterAnchorSpacingM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:ceiling_perimeter_anchor_spacing_m",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }

  const calculatedWallFastenerQuantityPiece = Math.ceil(
    areaM2! * KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.rate_value - 1e-9,
  );
  const projectLayoutFastenerQuantityPiece = Math.ceil(
    (2 * (lengthM! + widthM!)) / perimeterAnchorSpacingM! - 1e-9,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_perimeter_track_anchors"));
  const conflicts = [
    projectLayoutFastenerQuantityPiece === calculatedWallFastenerQuantityPiece
      ? ""
      : `PHYSICAL_NORM_PROJECT_LAYOUT_CONFLICT:perimeter_anchor_count=${projectLayoutFastenerQuantityPiece}:norm_value=${calculatedWallFastenerQuantityPiece}`,
    explicitQuantity !== null && Math.abs(explicitQuantity - calculatedWallFastenerQuantityPiece) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:quantity_perimeter_track_anchors=${explicitQuantity}:norm_value=${calculatedWallFastenerQuantityPiece}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_perimeter_track_anchors"],
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `reference_ceiling=${referenceLengthM}x${referenceWidthM}m`,
    `area_m2=${areaM2}`,
    `substrate_type=${substrateType}`,
    `substrate_fastener_reference=${substrateFastenerReference}`,
    `substrate_fastener_approved=true`,
    `ceiling_perimeter_anchor_spacing_m=${perimeterAnchorSpacingM}`,
    `formula=ceil(area_m2*${KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.rate_value})`,
    "loss_and_waste_excluded=true",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_perimeter_track_anchors: {
      value: calculatedWallFastenerQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
    norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
    source_document_version: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_perimeter_track_anchors"],
    calculated_wall_fastener_quantity_piece: calculatedWallFastenerQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufFugenfuellerPerimeterJoint(
  productProfileId: typeof KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }

  const perimeterLinearM = finiteNumber(explicit.perimeter_linear_m);
  const claddingThicknessMm = finiteNumber(explicit.cladding_thickness_mm);
  const consumptionKgLinearM = finiteNumber(explicit.perimeter_joint_consumption_kg_linear_m);
  const connectionMethod = primitiveString(explicit.perimeter_connection_joint_method!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const [minimumConsumption, maximumConsumption] =
    KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.rate_range_kg_linear_m;
  const applicabilityBlockers = [
    perimeterLinearM !== null && perimeterLinearM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:perimeter_linear_m",
    claddingThicknessMm !== null && claddingThicknessMm > 0
      ? ""
      : "PROJECT_VALUE_INVALID:cladding_thickness_mm",
    consumptionKgLinearM !== null &&
      consumptionKgLinearM >= minimumConsumption &&
      consumptionKgLinearM <= maximumConsumption
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}:perimeter_joint_consumption_kg_linear_m=${consumptionKgLinearM}`,
    connectionMethod === "KNAUF_TRENN_FIX"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}:perimeter_connection_joint_method=${connectionMethod}`,
    systemPassportReference ? "" : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }

  const wasteFactor = 1 + KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.waste_percent_default / 100;
  const packageSizeKg = KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.package_size_kg;
  const rawQuantityKg = perimeterLinearM! * consumptionKgLinearM! * wasteFactor;
  const calculatedPerimeterJointCompoundQuantityKg = Math.ceil(rawQuantityKg / packageSizeKg - 1e-9) * packageSizeKg;
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "perimeter_joint_compound_quantity_kg"));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedPerimeterJointCompoundQuantityKg) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:perimeter_joint_compound_quantity_kg=${explicitQuantity}:norm_value=${calculatedPerimeterJointCompoundQuantityKg}`,
      ],
      [
        ...KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "perimeter_joint_compound_quantity_kg",
      ],
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.system}`,
    `connection=${KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.connection}`,
    `perimeter_connection_joint_method=${connectionMethod}`,
    `perimeter_linear_m=${perimeterLinearM}`,
    `cladding_thickness_mm=${claddingThicknessMm}`,
    `perimeter_joint_consumption_kg_linear_m=${consumptionKgLinearM}`,
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
    `waste_percent=${KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.waste_percent_default}`,
    `formula=ceil((perimeter_linear_m*perimeter_joint_consumption_kg_linear_m*${wasteFactor})/${packageSizeKg})*${packageSizeKg}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    perimeter_joint_compound_quantity_kg: {
      value: calculatedPerimeterJointCompoundQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
    norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
    source_document_version: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["perimeter_joint_compound_quantity_kg"],
    calculated_perimeter_joint_compound_quantity_kg: calculatedPerimeterJointCompoundQuantityKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveForbo232MountingAdhesive(
  productProfileId: typeof FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }

  const skirtingLengthLinearM = finiteNumber(explicit.skirting_length_linear_m);
  const skirtingMaterial = primitiveString(explicit.skirting_material!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const selectedAdhesiveProduct = primitiveString(explicit.selected_adhesive_product!);
  const adhesiveProfileMode = primitiveString(explicit.adhesive_profile_mode!);
  const adhesiveConsumptionMlLinearM = finiteNumber(explicit.adhesive_consumption_ml_linear_m);
  const manufacturerInstructionReference = primitiveString(explicit.manufacturer_instruction_reference!);
  const [minimumConsumption, maximumConsumption] =
    FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.rate_range_ml_linear_m;
  const flagConfirmed = (parameterId: "substrate_ready_confirmed" | "processing_conditions_confirmed" | "ventilation_fire_controls_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const applicabilityBlockers = [
    skirtingLengthLinearM !== null && skirtingLengthLinearM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:skirting_length_linear_m",
    FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.skirting_materials.includes(skirtingMaterial ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:skirting_material=${skirtingMaterial}`,
    FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.substrate_types.includes(substrateType ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:substrate_type=${substrateType}`,
    selectedAdhesiveProduct === FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.product
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:selected_adhesive_product=${selectedAdhesiveProduct}`,
    adhesiveProfileMode === "FORBO_EUROCOL_232"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:adhesive_profile_mode=${adhesiveProfileMode}`,
    adhesiveConsumptionMlLinearM !== null &&
      adhesiveConsumptionMlLinearM >= minimumConsumption &&
      adhesiveConsumptionMlLinearM <= maximumConsumption
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:adhesive_consumption_ml_linear_m=${adhesiveConsumptionMlLinearM}`,
    flagConfirmed("substrate_ready_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:substrate_ready_confirmed=false`,
    flagConfirmed("processing_conditions_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:processing_conditions_confirmed=false`,
    flagConfirmed("ventilation_fire_controls_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:ventilation_fire_controls_confirmed=false`,
    manufacturerInstructionReference ? "" : "PROJECT_VALUE_INVALID:manufacturer_instruction_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }

  const packageSizeMl = FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.package_size_ml;
  const rawAdhesiveQuantityMl = skirtingLengthLinearM! * adhesiveConsumptionMlLinearM!;
  const calculatedForboAdhesiveProcurementQuantityMl =
    Math.ceil(rawAdhesiveQuantityMl / packageSizeMl - 1e-9) * packageSizeMl;
  const explicitQuantity = finiteNumber(explicitValue(
    parameterValuesInput,
    "forbo_adhesive_procurement_quantity_ml",
  ));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedForboAdhesiveProcurementQuantityMl) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:forbo_adhesive_procurement_quantity_ml=${explicitQuantity}:norm_value=${calculatedForboAdhesiveProcurementQuantityMl}`,
      ],
      [
        ...FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "forbo_adhesive_procurement_quantity_ml",
      ],
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }

  const capturedAt = FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID}`,
    `selected_adhesive_product=${selectedAdhesiveProduct}`,
    `skirting_material=${skirtingMaterial}`,
    `substrate_type=${substrateType}`,
    `skirting_length_linear_m=${skirtingLengthLinearM}`,
    `adhesive_consumption_ml_linear_m=${adhesiveConsumptionMlLinearM}`,
    `manufacturer_instruction_reference=${manufacturerInstructionReference}`,
    "substrate_ready_confirmed=true",
    "processing_conditions_confirmed=true",
    "ventilation_fire_controls_confirmed=true",
    `formula=ceil((skirting_length_linear_m*adhesive_consumption_ml_linear_m)/${packageSizeMl})*${packageSizeMl}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    forbo_adhesive_procurement_quantity_ml: {
      value: calculatedForboAdhesiveProcurementQuantityMl,
      unit_id: "ml",
      source_type: "APPLICABLE_NORM" as const,
      source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
    norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
    source_document_version: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.source_document_version,
    source_url: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.source_url,
    exact_locator: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.exact_locator,
    source_definition_hash: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["forbo_adhesive_procurement_quantity_ml"],
    calculated_forbo_adhesive_procurement_quantity_ml: calculatedForboAdhesiveProcurementQuantityMl,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveLegrandP31TrayJointFasteners(
  productProfileId: typeof LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }

  const jointCount = finiteNumber(explicit.tray_joint_count);
  const trayWidthMm = finiteNumber(explicit.tray_width_mm);
  const containmentWidthMm = finiteNumber(explicit.containment_width_mm);
  const tighteningTorqueNm = finiteNumber(explicit.tightening_torque_nm);
  const containmentType = primitiveString(explicit.containment_type!);
  const couplerReference = primitiveString(explicit.coupler_reference!);
  const manufacturerSystemProfileId = primitiveString(explicit.manufacturer_system_profile_id!);
  const productSpecificationId = primitiveString(explicit.product_specification_id!);
  const installationManualReference = primitiveString(explicit.installation_manual_reference!);
  const applicabilityBlockers = [
    jointCount !== null && Number.isInteger(jointCount) && jointCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:tray_joint_count",
    trayWidthMm !== null &&
        trayWidthMm >= LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.tray_width_mm_min &&
        trayWidthMm <= LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.tray_width_mm_max
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:tray_width_mm=${trayWidthMm}`,
    containmentWidthMm !== null && trayWidthMm !== null && Math.abs(containmentWidthMm - trayWidthMm) <= 1e-9
      ? ""
      : `PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:containment_width_mm=${containmentWidthMm}:tray_width_mm=${trayWidthMm}`,
    containmentType === "TRAY"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:containment_type=${containmentType}`,
    couplerReference && LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.coupler_options.includes(couplerReference)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:coupler_reference=${couplerReference}`,
    manufacturerSystemProfileId === LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:manufacturer_system_profile_id=${manufacturerSystemProfileId}`,
    tighteningTorqueNm === LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.tightening_torque_nm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:tightening_torque_nm=${tighteningTorqueNm}`,
    productSpecificationId ? "" : "PROJECT_VALUE_INVALID:product_specification_id",
    installationManualReference ? "" : "PROJECT_VALUE_INVALID:installation_manual_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }

  const calculatedTrayJointFastenerQuantityPiece = Math.ceil(
    jointCount! * LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.rate_value - 1e-9,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_containment_joint_bolt"));
  if (explicitQuantity !== null && Math.abs(explicitQuantity - calculatedTrayJointFastenerQuantityPiece) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_VALUE_CONFLICT:quantity_containment_joint_bolt=${explicitQuantity}:norm_value=${calculatedTrayJointFastenerQuantityPiece}`],
      [...LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_containment_joint_bolt"],
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }

  const capturedAt = LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID}`,
    `system=${LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.system}`,
    `tray_joint_count=${jointCount}`,
    `tray_width_mm=${trayWidthMm}`,
    `coupler_reference=${couplerReference}`,
    `tightening_torque_nm=${tighteningTorqueNm}`,
    `product_specification_id=${productSpecificationId}`,
    `installation_manual_reference=${installationManualReference}`,
    `formula=ceil(tray_joint_count*${LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.rate_value})`,
    "other_widths_require_their_own_table_row=true",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_containment_joint_bolt: {
      value: calculatedTrayJointFastenerQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM" as const,
      source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
    norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
    source_document_version: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_document_version,
    source_url: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_url,
    exact_locator: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.exact_locator,
    source_definition_hash: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_containment_joint_bolt"],
    calculated_tray_joint_fastener_quantity_piece: calculatedTrayJointFastenerQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function parsePositiveLengthSchedule(value: string | null): readonly number[] | null {
  if (!value) return null;
  const tokens = value.split(/[;\n]+/u).map((token) => token.trim());
  if (tokens.length === 0 || tokens.some((token) => token.length === 0)) return null;
  const lengths = tokens.map((token) => Number(token.replace(/\s+/gu, "").replace(",", ".")));
  return lengths.every((length) => Number.isFinite(length) && length > 0) ? lengths : null;
}

function resolveWavinHep2OProfile(
  productProfileId: typeof WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS,
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const exactMaterialOrEquipment = primitiveString(explicit.exact_material_or_equipment!);
  const pipeMaterialAndClass = primitiveString(explicit.pipe_material_and_class!);
  const jointingMethod = primitiveString(explicit.jointing_method!);
  const systemVariant = primitiveString(explicit.hep2o_system_variant!);
  const connectionCount = finiteNumber(explicit.connection_count);
  const preparedPipeEndCount = finiteNumber(explicit.prepared_pipe_end_count);
  const routeLengthM = finiteNumber(explicit.route_length_m);
  const nominalDiameterMm = finiteNumber(explicit.nominal_diameter_mm);
  const supportOrientation = primitiveString(explicit.hep2o_support_orientation!);
  const supportSpanLengths = parsePositiveLengthSchedule(
    primitiveString(explicit.hep2o_support_span_lengths_m!),
  );
  const supportAnchorNodeCount = finiteNumber(explicit.hep2o_support_anchor_node_count);
  const supportAnchorPositionsVerified = explicit.hep2o_support_anchor_positions_verified!.value === true ||
    explicit.hep2o_support_anchor_positions_verified!.value === "true";
  const invalidNumeric = [
    ["connection_count", connectionCount],
    ["prepared_pipe_end_count", preparedPipeEndCount],
  ] as const;
  const numericBlockers = invalidNumeric
    .filter(([, value]) => value === null || !Number.isInteger(value) || value <= 0)
    .map(([parameterId]) => `PROJECT_VALUE_INVALID:${parameterId}`);
  if (routeLengthM === null || routeLengthM <= 0) numericBlockers.push("PROJECT_VALUE_INVALID:route_length_m");
  if (nominalDiameterMm === null || !Number.isInteger(nominalDiameterMm) || nominalDiameterMm <= 0) {
    numericBlockers.push("PROJECT_VALUE_INVALID:nominal_diameter_mm");
  }
  if (supportAnchorNodeCount === null || !Number.isInteger(supportAnchorNodeCount) || supportAnchorNodeCount < 2) {
    numericBlockers.push("PROJECT_VALUE_INVALID:hep2o_support_anchor_node_count");
  }
  if (!supportSpanLengths) numericBlockers.push("PROJECT_VALUE_INVALID:hep2o_support_span_lengths_m");
  if (numericBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      numericBlockers,
      WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS,
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const clipSourceMetadata = WAVIN_HEP2O_CLIP_SOURCE_METADATA.find((metadata) =>
    metadata.pipe_nominal_diameter_mm === nominalDiameterMm && metadata.orientation === supportOrientation);
  const supportSpanLengthSumM = supportSpanLengths!.reduce((sum, length) => sum + length, 0);
  const routeLengthToleranceM = Math.max(1e-9, routeLengthM! * 1e-9);

  const applicabilityBlockers = [
    exactMaterialOrEquipment === "Wavin Hep2O Barrier pipe and Hep2O fittings"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:exact_material_or_equipment=${exactMaterialOrEquipment}`,
    pipeMaterialAndClass === "Wavin Hep2O Barrier pipe"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:pipe_material_and_class=${pipeMaterialAndClass}`,
    jointingMethod === "Wavin Hep2O push-fit with SmartSleeve"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:jointing_method=${jointingMethod}`,
    systemVariant === "WAVIN_HEP2O_PUSH_FIT"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:hep2o_system_variant=${systemVariant}`,
    preparedPipeEndCount! >= connectionCount!
      ? null
      : `PHYSICAL_NORM_PROJECT_TOPOLOGY_CONFLICT:prepared_pipe_end_count=${preparedPipeEndCount}:connection_count=${connectionCount}`,
    clipSourceMetadata
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:WAVIN_HEP2O_CLIP_SPACING:nominal_diameter_mm=${nominalDiameterMm}:orientation=${supportOrientation}`,
    Math.abs(supportSpanLengthSumM - routeLengthM!) <= routeLengthToleranceM
      ? null
      : `PHYSICAL_NORM_PROJECT_TOPOLOGY_CONFLICT:hep2o_support_span_length_sum_m=${supportSpanLengthSumM}:route_length_m=${routeLengthM}`,
    supportAnchorPositionsVerified
      ? null
      : "PHYSICAL_NORM_PROJECT_TOPOLOGY_NOT_VERIFIED:hep2o_support_anchor_positions_verified",
  ].filter((blocker): blocker is string => blocker !== null);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS,
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const calculatedSmartSleeveQuantityPiece = Math.ceil(
    preparedPipeEndCount! * WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.rate_value,
  );
  const calculatedSupportQuantityPiece = supportAnchorNodeCount! + supportSpanLengths!.reduce(
    (sum, spanLengthM) => sum + Math.max(
      0,
      Math.ceil(spanLengthM / clipSourceMetadata!.maximum_clip_spacing_m) - 1,
    ),
    0,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "smart_sleeve_quantity_piece"));
  const explicitSupportCount = finiteNumber(explicitValue(parameterValuesInput, "support_count"));
  const valueConflictBlockers = [
    explicitQuantity === null || explicitQuantity === calculatedSmartSleeveQuantityPiece
      ? null
      : `PHYSICAL_NORM_VALUE_CONFLICT:smart_sleeve_quantity_piece=${explicitQuantity}:norm_value=${calculatedSmartSleeveQuantityPiece}`,
    explicitSupportCount === null || explicitSupportCount === calculatedSupportQuantityPiece
      ? null
      : `PHYSICAL_NORM_VALUE_CONFLICT:support_count=${explicitSupportCount}:norm_value=${calculatedSupportQuantityPiece}`,
  ].filter((blocker): blocker is string => blocker !== null);
  if (valueConflictBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      valueConflictBlockers,
      [...WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS, "smart_sleeve_quantity_piece", "support_count"],
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const capturedAt = WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    smart_sleeve_quantity_piece: {
      value: calculatedSmartSleeveQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID}`,
        `system=${WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.system}`,
        `prepared_pipe_end_count=${preparedPipeEndCount}`,
        `connection_count=${connectionCount}`,
        `joint_topology_reference=${primitiveString(explicit.hep2o_joint_topology_reference!)}`,
        `formula=ceil(prepared_pipe_end_count*${WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.rate_value})`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
    support_count: {
      value: calculatedSupportQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: clipSourceMetadata!.source_id,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID}`,
        `system=${clipSourceMetadata!.system}`,
        `nominal_diameter_mm=${nominalDiameterMm}`,
        `orientation=${supportOrientation}`,
        `maximum_clip_spacing_m=${clipSourceMetadata!.maximum_clip_spacing_m}`,
        `support_span_lengths_m=${supportSpanLengths!.join(",")}`,
        `support_anchor_node_count=${supportAnchorNodeCount}`,
        `support_layout_reference=${primitiveString(explicit.hep2o_support_layout_reference!)}`,
        `formula=anchor_node_count+sum(max(0,ceil(span_length/maximum_spacing)-1))`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
    norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
    source_document_version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
    source_url: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_url,
    exact_locator: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.exact_locator,
    source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
    source_ids: [WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID, clipSourceMetadata!.source_id],
    norm_ids: [WAVIN_HEP2O_SMARTSLEEVE_NORM_ID, clipSourceMetadata!.norm_id],
    applied_norms: [{
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
      source_document_version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
      source_url: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_url,
      exact_locator: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.exact_locator,
      source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["smart_sleeve_quantity_piece"],
    }, {
      source_id: clipSourceMetadata!.source_id,
      norm_id: clipSourceMetadata!.norm_id,
      source_document_version: clipSourceMetadata!.source_document_version,
      source_url: clipSourceMetadata!.source_url,
      exact_locator: clipSourceMetadata!.exact_locator,
      source_definition_hash: clipSourceMetadata!.definition_hash,
      produced_parameter_ids: ["support_count"],
    }],
    consumed_parameter_ids: [...WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["smart_sleeve_quantity_piece", "support_count"] as const,
    calculated_smart_sleeve_quantity_piece: calculatedSmartSleeveQuantityPiece,
    calculated_support_quantity_piece: calculatedSupportQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveProfessionalPhysicalNormParameterValuesV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profileValue = explicitValue(input.parameter_values, "product_profile_id");
  const productProfileId = primitiveString(profileValue ?? undefined);
  if (productProfileId === FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "BASEBOARD" &&
      input.operation_class === "GLUE" &&
      input.material_system === "BASEBOARD" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveForbo232MountingAdhesive(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }
  if (productProfileId === WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "HEATING_PIPE_NETWORK" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "HEATING_PIPE:SPACE_HEATING:HEATING_WATER" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveWavinHep2OProfile(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }
  if (productProfileId === LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "CABLE_CHANNEL" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "CABLE_CHANNEL" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveLegrandP31TrayJointFasteners(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }
  if (productProfileId === KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "FLAT_CEILING" &&
      input.operation_class === "FINISH_JOINT" &&
      input.material_system === "FLAT_CEILING" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveKnaufFugenfuellerPerimeterJoint(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }
  if (productProfileId === KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "FLAT_CEILING" &&
      input.operation_class === "FRAME" &&
      input.material_system === "FLAT_CEILING" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveKnaufD112ReferenceCeiling(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }
  if (productProfileId === DAIKIN_3MXS_K_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "REFRIGERANT_SYSTEM" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "CONDITIONER:COOLING_AIR_CONDITIONING:REFRIGERANT_PROJECT_DEFINED" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveDaikin3MxsK(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }
  if (productProfileId === LINDAB_VSR_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "DUCT_NETWORK" &&
      input.operation_class === "INSTALL" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveLindabVsr(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  if (
    input.technology_class !== "WARM_FLOOR_SYSTEM" ||
    input.operation_class !== "INSTALL" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE" ||
    productProfileId !== UPONOR_UFH_150MM_PRODUCT_PROFILE_ID
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(input.parameter_values, parameterId),
  ]));
  const missing = REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const areaM2 = finiteNumber(explicit.zone_area_m2);
  const spacingMm = finiteNumber(explicit.designed_pipe_spacing_mm);
  const feedTailM = finiteNumber(explicit.feed_tail_length_linear_m);
  const loopLimitM = finiteNumber(explicit.loop_length_limit);
  const circuitCount = finiteNumber(explicit.circuit_count);
  const manifoldOutletCount = finiteNumber(explicit.manifold_outlet_count);
  const longestCircuitM = finiteNumber(explicit.longest_circuit_length_m);
  const numericErrors = [
    ["zone_area_m2", areaM2, (value: number) => value > 0],
    ["designed_pipe_spacing_mm", spacingMm, (value: number) => value > 0],
    ["feed_tail_length_linear_m", feedTailM, (value: number) => value >= 0],
    ["loop_length_limit", loopLimitM, (value: number) => value > 0],
    ["circuit_count", circuitCount, (value: number) => Number.isInteger(value) && value > 0],
    ["manifold_outlet_count", manifoldOutletCount, (value: number) => Number.isInteger(value) && value > 0],
    ["longest_circuit_length_m", longestCircuitM, (value: number) => value > 0],
  ] as const;
  const invalidNumeric = numericErrors
    .filter(([, value, predicate]) => value === null || !predicate(value))
    .map(([parameterId]) => `PROJECT_VALUE_INVALID:${parameterId}`);
  if (invalidNumeric.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      invalidNumeric,
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  if (spacingMm !== UPONOR_UFH_150MM_SOURCE_METADATA.pipe_spacing_mm) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_NOT_APPLICABLE:${UPONOR_UFH_150MM_NORM_ID}:designed_pipe_spacing_mm=${spacingMm}`],
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }
  if (longestCircuitM! > loopLimitM!) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_LAYOUT_LIMIT_EXCEEDED:longest_circuit_length_m=${longestCircuitM}:loop_length_limit=${loopLimitM}`],
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }
  if (manifoldOutletCount! < circuitCount!) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_MANIFOLD_OUTLETS_INSUFFICIENT:circuit_count=${circuitCount}:manifold_outlet_count=${manifoldOutletCount}`],
      REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const rawPipeLengthM = areaM2! * UPONOR_UFH_150MM_SOURCE_METADATA.rate_value + feedTailM!;
  const packageSize = uponorNorm.rounding.package_size;
  const calculatedPipeLengthM = Math.ceil(rawPipeLengthM / packageSize) * packageSize;
  const explicitCircuitLengthM = finiteNumber(explicitValue(input.parameter_values, "circuit_length_m"));
  if (explicitCircuitLengthM !== null && explicitCircuitLengthM !== calculatedPipeLengthM) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:circuit_length_m=${explicitCircuitLengthM}:calculated_pipe_length_m=${calculatedPipeLengthM}`],
      [...REQUIRED_EXPLICIT_PARAMETER_IDS, "circuit_length_m"],
    );
  }
  const capturedAt = REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    circuit_length_m: {
      value: calculatedPipeLengthM,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${UPONOR_UFH_150MM_PRODUCT_PROFILE_ID}`,
        `designed_pipe_spacing_mm=${spacingMm}`,
        `zone_area_m2=${areaM2}`,
        `feed_tail_length_linear_m=${feedTailM}`,
        `loop_length_limit=${loopLimitM}`,
        `hydraulic_loop_design_reference=${primitiveString(explicit.hydraulic_loop_design_reference!)}`,
        `manifold_location=${primitiveString(explicit.manifold_location!)}`,
        `formula=ceil((zone_area_m2*${UPONOR_UFH_150MM_SOURCE_METADATA.rate_value}+feed_tail_length_linear_m)/${packageSize})*${packageSize}`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
    source_id: UPONOR_UFH_150MM_SOURCE_ID,
    norm_id: UPONOR_UFH_150MM_NORM_ID,
    source_document_version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
    source_url: UPONOR_UFH_150MM_SOURCE_METADATA.source_url,
    exact_locator: UPONOR_UFH_150MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["circuit_length_m"] as const,
    calculated_pipe_length_m: calculatedPipeLengthM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
