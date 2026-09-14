import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import {
  BIA_TN10_MASONRY_RUNTIME_BINDING_V1,
  EPA_CD_COMPOSITE_RUNTIME_BINDING_V1,
  EPA_CD_CONCRETE_RUNTIME_BINDING_V1,
  FHWA_FP24_SECTION208_RUNTIME_BINDING_V1,
  FORD_TRANSIT_V363_DELIVERY_RUNTIME_BINDING_V1,
  JOTUN_HARDTOP_XP_100UM_RUNTIME_BINDING_V1,
  KG_AUTHOR_SUPERVISION_RUNTIME_BINDING_V1,
  KG_DESIGN_PRICE_RUNTIME_BINDING_V1,
  KRER46_DEMOLITION_RUNTIME_BINDING_V1,
  LEGRAND_049272_BUS_SCS_RUNTIME_BINDING_V1,
  RAIN_BIRD_XFD_DRIPLINE_RUNTIME_BINDING_V1,
  REINFORCEMENT_BAR_SCHEDULE_RUNTIME_BINDING_V1,
  RICS_NRM2_FORMWORK_RUNTIME_BINDING_V1,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_RUNTIME_BINDING_V1,
  ROCKWOOL_FIXROCK_CONVENTIONAL_RUNTIME_BINDING_V1,
  SARNAFIL_AT18_FIELD_80MM_RUNTIME_BINDING_V1,
  SIEMENS_SINTESO_FDB221_RUNTIME_BINDING_V1,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_RUNTIME_BINDING_V1,
  SOUDAFOAM_GENIUS_RUNTIME_BINDING_V1,
  TENNANT_T350_CONVENTIONAL_RUNTIME_BINDING_V1,
  UNITED_RENTALS_CA_ONE_SHIFT_RUNTIME_BINDING_V1,
  WAVIN_OSMA_C3766BK_110MM_3M_RUNTIME_BINDING_V1,
} from "../v4/domainFactory";
import { applySarnafilAt18PhysicalNormToRoofBoqV1 } from "./roofingSarnafilAt18ProductionBindingV1";
import { applyRockwoolComfortboard80PhysicalNormToInsulationBoqV1 } from "./insulationRockwoolComfortboard80ProductionBindingV1";
import { applySiemensSintesoFdb221PhysicalNormToFireSafetyBoqV1 } from "./fireSafetySiemensFdb221ProductionBindingV1";
import { applyLegrand049272BusScsPhysicalNormToLowVoltageBoqV1 } from "./lowVoltageLegrand049272ProductionBindingV1";
import { applyJotunHardtopXpPhysicalNormToMetalworkBoqV1 } from "./metalworkJotunHardtopXpProductionBindingV1";
import { applySikagardWoodPreserverPhysicalNormToCarpentryBoqV1 } from "./carpentrySikagardWoodPreserverProductionBindingV1";
import { applyWavinOsmaC3766BkPhysicalNormToSewerageBoqV1 } from "./sewerageWavinOsmaC3766BkProductionBindingV1";
import { applyRockwoolFixrockPhysicalNormToFacadeBoqV1 } from "./facadeRockwoolFixrockProductionBindingV1";
import { applyKgAuthorSupervisionPhysicalNormToServicesBoqV1 } from "./servicesKgAuthorSupervisionProductionBindingV1";
import { applyRicsNrm2PhysicalNormToFormworkBoqV1 } from "./formworkRicsNrm2ProductionBindingV1";
import { applyReinforcementBarSchedulePhysicalNormToBoqV1 } from "./reinforcementBarScheduleProductionBindingV1";
import { applyFordTransitDeliveryPhysicalNormToBoqV1 } from "./deliveryFordTransitProductionBindingV1";
import { applyTennantT350PhysicalNormToCleaningBoqV1 } from "./cleaningTennantT350ProductionBindingV1";
import { applyUnitedRentalsCaOneShiftPhysicalNormToBoqV1 } from "./equipmentRentUnitedRentalsProductionBindingV1";
import { applyRainBirdXfdPhysicalNormToLandscapingBoqV1 } from "./landscapingRainBirdXfdProductionBindingV1";
import { applySoudafoamGeniusPhysicalNormToWindowsDoorsBoqV1 } from "./windowsDoorsSoudafoamProductionBindingV1";
import { applyFhwaFp24PhysicalNormToEarthworksBoqV1 } from "./earthworksFhwaFp24ProductionBindingV1";
import { applyEpaCdWastePhysicalNormToBoqV1 } from "./wasteRemovalEpaProductionBindingV1";
import { applyBiaTn10MasonryPhysicalNormToBoqV1 } from "./masonryBiaTn10ProductionBindingV1";
import { applyKrer46DemolitionPhysicalNormToBoqV1 } from "./demolitionKrer46ProductionBindingV1";
import { applyKgDesignPricePhysicalNormToBoqV1 } from "./documentationKgDesignPriceProductionBindingV1";

type PhysicalNormRuntimeBindingIdentityV1 = {
  norm_id: string;
  work_group: string;
  source_id: string;
};

type OwnedDomainPhysicalNormApplyV1 = (
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
) => DynamicProfessionalBoqRow[];

export type OwnedDomainPhysicalNormConsumerRouteV1 = {
  route_id: string;
  runtime_bindings: readonly PhysicalNormRuntimeBindingIdentityV1[];
  apply: OwnedDomainPhysicalNormApplyV1;
};

function route(
  routeId: string,
  runtimeBindings: readonly PhysicalNormRuntimeBindingIdentityV1[],
  apply: OwnedDomainPhysicalNormApplyV1,
): OwnedDomainPhysicalNormConsumerRouteV1 {
  if (runtimeBindings.length === 0) {
    throw new Error(`OWNED_DOMAIN_PHYSICAL_NORM_ROUTE_WITHOUT_BINDINGS:${routeId}`);
  }
  return Object.freeze({
    route_id: routeId,
    runtime_bindings: Object.freeze([...runtimeBindings]),
    apply,
  });
}

/**
 * This is both the executable production dispatch and its audit inventory.
 * Keeping the function reference and exact runtime identity in one route
 * prevents an audit-only registry entry from being counted as a consumer.
 */
export const OWNED_DOMAIN_PHYSICAL_NORM_CONSUMER_ROUTES_V1 = Object.freeze([
  route("roofing_sarnafil_at18", [SARNAFIL_AT18_FIELD_80MM_RUNTIME_BINDING_V1], applySarnafilAt18PhysicalNormToRoofBoqV1),
  route("insulation_rockwool_comfortboard80", [ROCKWOOL_COMFORTBOARD80_R63_38MM_RUNTIME_BINDING_V1], applyRockwoolComfortboard80PhysicalNormToInsulationBoqV1),
  route("fire_safety_siemens_sinteso_fdb221", [SIEMENS_SINTESO_FDB221_RUNTIME_BINDING_V1], applySiemensSintesoFdb221PhysicalNormToFireSafetyBoqV1),
  route("low_voltage_legrand_049272", [LEGRAND_049272_BUS_SCS_RUNTIME_BINDING_V1], applyLegrand049272BusScsPhysicalNormToLowVoltageBoqV1),
  route("metalwork_jotun_hardtop_xp", [JOTUN_HARDTOP_XP_100UM_RUNTIME_BINDING_V1], applyJotunHardtopXpPhysicalNormToMetalworkBoqV1),
  route("carpentry_sikagard_wood_preserver", [SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_RUNTIME_BINDING_V1], applySikagardWoodPreserverPhysicalNormToCarpentryBoqV1),
  route("sewerage_wavin_osma_c3766bk", [WAVIN_OSMA_C3766BK_110MM_3M_RUNTIME_BINDING_V1], applyWavinOsmaC3766BkPhysicalNormToSewerageBoqV1),
  route("facade_rockwool_fixrock", [ROCKWOOL_FIXROCK_CONVENTIONAL_RUNTIME_BINDING_V1], applyRockwoolFixrockPhysicalNormToFacadeBoqV1),
  route("services_kg_author_supervision", [KG_AUTHOR_SUPERVISION_RUNTIME_BINDING_V1], applyKgAuthorSupervisionPhysicalNormToServicesBoqV1),
  route("formwork_rics_nrm2", [RICS_NRM2_FORMWORK_RUNTIME_BINDING_V1], applyRicsNrm2PhysicalNormToFormworkBoqV1),
  route("reinforcement_bar_schedule", [REINFORCEMENT_BAR_SCHEDULE_RUNTIME_BINDING_V1], applyReinforcementBarSchedulePhysicalNormToBoqV1),
  route("delivery_ford_transit_v363", [FORD_TRANSIT_V363_DELIVERY_RUNTIME_BINDING_V1], applyFordTransitDeliveryPhysicalNormToBoqV1),
  route("cleaning_tennant_t350", [TENNANT_T350_CONVENTIONAL_RUNTIME_BINDING_V1], applyTennantT350PhysicalNormToCleaningBoqV1),
  route("equipment_rent_united_rentals", [UNITED_RENTALS_CA_ONE_SHIFT_RUNTIME_BINDING_V1], applyUnitedRentalsCaOneShiftPhysicalNormToBoqV1),
  route("landscaping_rain_bird_xfd", [RAIN_BIRD_XFD_DRIPLINE_RUNTIME_BINDING_V1], applyRainBirdXfdPhysicalNormToLandscapingBoqV1),
  route("windows_doors_soudafoam_genius", [SOUDAFOAM_GENIUS_RUNTIME_BINDING_V1], applySoudafoamGeniusPhysicalNormToWindowsDoorsBoqV1),
  route("earthworks_fhwa_fp24_section208", [FHWA_FP24_SECTION208_RUNTIME_BINDING_V1], applyFhwaFp24PhysicalNormToEarthworksBoqV1),
  route("waste_removal_epa_cd", [EPA_CD_COMPOSITE_RUNTIME_BINDING_V1, EPA_CD_CONCRETE_RUNTIME_BINDING_V1], applyEpaCdWastePhysicalNormToBoqV1),
  route("masonry_bia_tn10", [BIA_TN10_MASONRY_RUNTIME_BINDING_V1], applyBiaTn10MasonryPhysicalNormToBoqV1),
  route("demolition_krer46", [KRER46_DEMOLITION_RUNTIME_BINDING_V1], applyKrer46DemolitionPhysicalNormToBoqV1),
  route("documentation_kg_design_price", [KG_DESIGN_PRICE_RUNTIME_BINDING_V1], applyKgDesignPricePhysicalNormToBoqV1),
]);

export function applyOwnedDomainPhysicalNormConsumersV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  return OWNED_DOMAIN_PHYSICAL_NORM_CONSUMER_ROUTES_V1.reduce(
    (currentRows, consumer) => consumer.apply(plan, currentRows),
    [...rows],
  );
}
