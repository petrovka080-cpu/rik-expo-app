import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { CanonicalEstimateCompileCoreResult } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT,
  CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID,
  CERAMIC_BLOCK_EXTERNAL_WALL_SHORT_INPUT,
  compileCeramicBlockExternalWallR1,
} from "../../../src/lib/estimate/v4/ceramicBlockExternalWallR1";
import {
  anchorGroupInstallationAcceptanceInputR1,
  compileAnchorGroupInstallationR1,
} from "../../../src/lib/estimate/v4/anchorGroupInstallationR1";
import {
  BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT,
  BORED_REINFORCED_CONCRETE_PILE_CATALOG_ID,
  BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT,
  compileBoredReinforcedConcretePileR1,
} from "../../../src/lib/estimate/v4/boredReinforcedConcretePileR1";
import {
  MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT,
  MONOLITHIC_REBAR_CAGE_CATALOG_ID,
  MONOLITHIC_REBAR_CAGE_SHORT_INPUT,
  compileMonolithicRebarCageR1,
} from "../../../src/lib/estimate/v4/monolithicRebarCageR1";
import {
  STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT,
  STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID,
  STEEL_COLUMNS_BEAMS_INSTALLATION_SHORT_INPUT,
  compileSteelColumnsBeamsInstallationR1,
} from "../../../src/lib/estimate/v4/steelColumnsBeamsInstallationR1";
import {
  PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT,
  PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID,
  PVC_ROOF_MEMBRANE_INSTALLATION_SHORT_INPUT,
  compilePvcRoofMembraneInstallationR1,
} from "../../../src/lib/estimate/v4/pvcRoofMembraneInstallationR1";
import {
  FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT,
  FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID,
  FACADE_MINERAL_WOOL_INSTALLATION_SHORT_INPUT,
  compileFacadeMineralWoolInstallationR1,
} from "../../../src/lib/estimate/v4/facadeMineralWoolInstallationR1";
import {
  MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT,
  MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID,
  MECHANIZED_GYPSUM_WALL_PLASTER_SHORT_INPUT,
  compileMechanizedGypsumWallPlasterR1,
} from "../../../src/lib/estimate/v4/mechanizedGypsumWallPlasterR1";
import {
  PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
  PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
  PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
  compilePorcelainFloorTileInstallationR1,
} from "../../../src/lib/estimate/v4/porcelainFloorTileInstallationR1";
import {
  CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
  CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID,
  CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
  compileCementSandScreedDemolitionR1,
} from "../../../src/lib/estimate/v4/cementSandScreedDemolitionR1";
import {
  ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
  ASPHALT_UPPER_COURSE_CATALOG_ID,
  ASPHALT_UPPER_COURSE_SHORT_INPUT,
  compileAsphaltUpperCourseR1,
} from "../../../src/lib/estimate/v4/asphaltUpperCourseR1";
import {
  SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
  SURFACE_DRAINAGE_CHANNEL_CATALOG_ID,
  SURFACE_DRAINAGE_CHANNEL_SHORT_INPUT,
  compileSurfaceDrainageChannelR1,
} from "../../../src/lib/estimate/v4/surfaceDrainageChannelR1";
import {
  PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT,
  PE110_ELECTROFUSION_JOINT_CATALOG_ID,
  PE110_ELECTROFUSION_JOINT_SHORT_INPUT,
  compilePe110ElectrofusionJointR1,
} from "../../../src/lib/estimate/v4/pe110ElectrofusionJointR1";
import {
  GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT,
  GRAVITY_SEWER_PVC_SN8_CATALOG_ID,
  GRAVITY_SEWER_PVC_SN8_SHORT_INPUT,
  compileGravitySewerPvcSn8R1,
} from "../../../src/lib/estimate/v4/gravitySewerPvcSn8R1";
import {
  PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
  PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID,
  PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
  compilePerforatedDrainPipeFilterR1,
} from "../../../src/lib/estimate/v4/perforatedDrainPipeFilterR1";
import {
  STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
  STEEL_PANEL_RADIATOR_CATALOG_ID,
  STEEL_PANEL_RADIATOR_SHORT_INPUT,
  compileSteelPanelRadiatorR1,
} from "../../../src/lib/estimate/v4/steelPanelRadiatorR1";
import {
  GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
  GALVANIZED_STEEL_DUCT_CATALOG_ID,
  GALVANIZED_STEEL_DUCT_SHORT_INPUT,
  compileGalvanizedSteelDuctR1,
} from "../../../src/lib/estimate/v4/galvanizedSteelDuctR1";
import {
  SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
  SPLIT_SYSTEM_BLOCKS_CATALOG_ID,
  SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
  compileSplitSystemBlocksR1,
} from "../../../src/lib/estimate/v4/splitSystemBlocksR1";
import {
  SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
  SPRINKLER_HEAD_CONNECTION_CATALOG_ID,
  SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
  compileSprinklerHeadConnectionR1,
} from "../../../src/lib/estimate/v4/sprinklerHeadConnectionR1";
import {
  VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
  VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  compileVvgngLsPowerCableR1,
} from "../../../src/lib/estimate/v4/vvgngLsPowerCableR1";
import {
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  compileLedLuminaireInstallationR1,
} from "../../../src/lib/estimate/v4/ledLuminaireInstallationR1";
import {
  CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  compileCat6TwistedPairCableR1,
} from "../../../src/lib/estimate/v4/cat6TwistedPairCableR1";
import {
  OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  OPTICAL_FIBER_SPLICING_CATALOG_ID,
  OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  compileOpticalFiberSplicingR1,
} from "../../../src/lib/estimate/v4/opticalFiberSplicingR1";
import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  compileAddressableSmokeDetectorR1,
} from "../../../src/lib/estimate/v4/addressableSmokeDetectorR1";
import {
  PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  compilePumpUnitAlignmentConnectionR1,
} from "../../../src/lib/estimate/v4/pumpUnitAlignmentConnectionR1";
import {
  HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  HOT_WATER_BOILER_PIPING_CATALOG_ID,
  HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  compileHotWaterBoilerPipingR1,
} from "../../../src/lib/estimate/v4/hotWaterBoilerPipingR1";
import {
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  compileIndustrialSteelPipeButtWeldR1,
} from "../../../src/lib/estimate/v4/industrialSteelPipeButtWeldR1";
import {
  SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  SERVER_RACK_42U_GROUNDING_CATALOG_ID,
  SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  compileServerRack42uGroundingR1,
} from "../../../src/lib/estimate/v4/serverRack42uGroundingR1";
import {
  compileSlabFoundationConcretePlacementR1,
  slabFoundationConcretePlacementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/slabFoundationConcretePlacementR1";
import {
  compileStripFoundationConcretePlacementR1,
  stripFoundationConcretePlacementAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import { MASTER_BENCHMARK_FIXTURE_MAPPING } from "./masterBenchmarkEvidence.shared";

type Json = Record<string, unknown>;
type Compile = (
  parameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }>,
) => Promise<CanonicalEstimateCompileCoreResult>;

const CONTRACT = "rik-expo-app.r4-a13-6.master-backend-benchmarks.v30";
const CANDIDATE_RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "a76ff40a-8030-5ee4-a83b-11ec0828fee4";
const AUDIT_PATH = resolve(process.env.R4A13_AUDIT_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/catalog-minimum-input-audit-v55/catalog-first-estimate-audit.json");
const HISTORICAL_ROOT = resolve(process.env.R4A13_BENCHMARK_EVIDENCE_ROOT
  ?? ".release-runtime/r568/rc09-real-material-scope-truth/30-goldens");
const WAVE_ROOT = resolve(process.env.R4A13_CONCRETE_PLACEMENT_WAVE_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/concrete-placement-waterstop-wave");
const BORED_PILE_RECEIPT_PATH = resolve(process.env.R4A13_BORED_PILE_RECEIPT_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-bored-pile-successor-v1/acceptance.json");
const ANCHOR_GROUP_RECEIPT_PATHS = [
  resolve(process.env.R4A13_ANCHOR_GROUP_RECEIPT_V1_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-anchor-group-successor-v1/acceptance.json"),
  resolve(process.env.R4A13_ANCHOR_GROUP_RECEIPT_V2_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-anchor-group-successor-v2/acceptance.json"),
] as const;
const MONOLITHIC_REBAR_CAGE_RECEIPT_PATH = resolve(
  process.env.R4A13_MONOLITHIC_REBAR_CAGE_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-monolithic-rebar-cage-successor-v1/acceptance.json",
);
const CERAMIC_BLOCK_EXTERNAL_WALL_RECEIPT_PATHS = [
  resolve(process.env.R4A13_CERAMIC_BLOCK_EXTERNAL_WALL_RECEIPT_V1_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-ceramic-block-external-wall-successor-v1/acceptance.json"),
  resolve(process.env.R4A13_CERAMIC_BLOCK_EXTERNAL_WALL_RECEIPT_V2_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-ceramic-block-external-wall-successor-v2/acceptance.json"),
] as const;
const STEEL_COLUMNS_BEAMS_INSTALLATION_RECEIPT_PATH = resolve(
  process.env.R4A13_STEEL_COLUMNS_BEAMS_INSTALLATION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-steel-columns-beams-installation-successor-v1/acceptance.json",
);
const PVC_ROOF_MEMBRANE_INSTALLATION_RECEIPT_PATH = resolve(
  process.env.R4A13_PVC_ROOF_MEMBRANE_INSTALLATION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-pvc-roof-membrane-installation-successor-v1/acceptance.json",
);
const FACADE_MINERAL_WOOL_INSTALLATION_RECEIPT_PATH = resolve(
  process.env.R4A13_FACADE_MINERAL_WOOL_INSTALLATION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-facade-mineral-wool-installation-successor-v1/acceptance.json",
);
const MECHANIZED_GYPSUM_WALL_PLASTER_RECEIPT_PATH = resolve(
  process.env.R4A13_MECHANIZED_GYPSUM_WALL_PLASTER_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-mechanized-gypsum-wall-plaster-successor-v1/acceptance.json",
);
const PORCELAIN_FLOOR_TILE_INSTALLATION_RECEIPT_PATH = resolve(
  process.env.R4A13_PORCELAIN_FLOOR_TILE_INSTALLATION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-porcelain-floor-tile-installation-successor-v1/acceptance.json",
);
const CEMENT_SAND_SCREED_DEMOLITION_RECEIPT_PATH = resolve(
  process.env.R4A13_CEMENT_SAND_SCREED_DEMOLITION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-cement-sand-screed-demolition-successor-v1/acceptance.json",
);
const ASPHALT_UPPER_COURSE_RECEIPT_PATH = resolve(
  process.env.R4A13_ASPHALT_UPPER_COURSE_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-asphalt-upper-course-successor-v1/acceptance.json",
);
const SURFACE_DRAINAGE_CHANNEL_RECEIPT_PATH = resolve(
  process.env.R4A13_SURFACE_DRAINAGE_CHANNEL_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-surface-drainage-channel-successor-v1/acceptance.json",
);
const PE110_ELECTROFUSION_JOINT_RECEIPT_PATH = resolve(
  process.env.R4A13_PE110_ELECTROFUSION_JOINT_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-pe110-electrofusion-joint-successor-v1/acceptance.json",
);
const GRAVITY_SEWER_PVC_SN8_RECEIPT_PATH = resolve(
  process.env.R4A13_GRAVITY_SEWER_PVC_SN8_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-gravity-sewer-pvc-sn8-successor-v1/acceptance.json",
);
const PERFORATED_DRAIN_PIPE_FILTER_RECEIPT_PATH = resolve(
  process.env.R4A13_PERFORATED_DRAIN_PIPE_FILTER_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-perforated-drain-pipe-filter-successor-v1/acceptance.json",
);
const STEEL_PANEL_RADIATOR_RECEIPT_PATH = resolve(
  process.env.R4A13_STEEL_PANEL_RADIATOR_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-steel-panel-radiator-successor-v1/acceptance.json",
);
const GALVANIZED_STEEL_DUCT_RECEIPT_PATH = resolve(
  process.env.R4A13_GALVANIZED_STEEL_DUCT_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-galvanized-steel-duct-successor-v1/acceptance.json",
);
const SPLIT_SYSTEM_BLOCKS_RECEIPT_PATH = resolve(
  process.env.R4A13_SPLIT_SYSTEM_BLOCKS_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-split-system-blocks-successor-v1/acceptance.json",
);
const SPRINKLER_HEAD_CONNECTION_RECEIPT_PATH = resolve(
  process.env.R4A13_SPRINKLER_HEAD_CONNECTION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-sprinkler-head-connection-successor-v1/acceptance.json",
);
const VVGNG_LS_POWER_CABLE_RECEIPT_PATH = resolve(
  process.env.R4A13_VVGNG_LS_POWER_CABLE_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-vvgng-ls-power-cable-successor-v1/acceptance.json",
);
const LED_LUMINAIRE_INSTALLATION_RECEIPT_PATH = resolve(
  process.env.R4A13_LED_LUMINAIRE_INSTALLATION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-led-luminaire-installation-successor-v1/acceptance.json",
);
const CAT6_TWISTED_PAIR_CABLE_RECEIPT_PATH = resolve(
  process.env.R4A13_CAT6_TWISTED_PAIR_CABLE_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-cat6-twisted-pair-cable-successor-v1/acceptance.json",
);
const OPTICAL_FIBER_SPLICING_RECEIPT_PATH = resolve(
  process.env.R4A13_OPTICAL_FIBER_SPLICING_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-optical-fiber-splicing-successor-v1/acceptance.json",
);
const ADDRESSABLE_SMOKE_DETECTOR_RECEIPT_PATH = resolve(
  process.env.R4A13_ADDRESSABLE_SMOKE_DETECTOR_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-addressable-smoke-detector-successor-v1/acceptance.json",
);
const PUMP_UNIT_ALIGNMENT_CONNECTION_RECEIPT_PATH = resolve(
  process.env.R4A13_PUMP_UNIT_ALIGNMENT_CONNECTION_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-pump-unit-alignment-connection-successor-v1/acceptance.json",
);
const HOT_WATER_BOILER_PIPING_RECEIPT_PATH = resolve(
  process.env.R4A13_HOT_WATER_BOILER_PIPING_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-hot-water-boiler-piping-successor-v1/acceptance.json",
);
const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RECEIPT_PATH = resolve(
  process.env.R4A13_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-industrial-steel-pipe-butt-weld-successor-v1/acceptance.json",
);
const SERVER_RACK_42U_GROUNDING_RECEIPT_PATH = resolve(
  process.env.R4A13_SERVER_RACK_42U_GROUNDING_RECEIPT_PATH
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-server-rack-42u-grounding-successor-v1/acceptance.json",
);
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-backend-benchmarks-v30");

const WAVE_RECEIPTS = [
  "apply-01-strip/acceptance.json",
  "apply-02-anchor-group/acceptance.json",
  "apply-03-column-base/acceptance.json",
  "apply-04-belt/acceptance.json",
  "apply-05-concrete-slab/acceptance.json",
  "apply-06-pile-cap/acceptance.json",
  "apply-07-pedestal/acceptance.json",
  "apply-08-slab-foundation/acceptance.json",
  "apply-09-stairs/acceptance.json",
  "apply-10-reinforcement-frame/acceptance.json",
] as const;
const REQUIRED_CURRENT_ROW_IDS = [
  "material:concrete:ready-mix",
  "material:concrete:curing-membrane",
  "work:concrete:place-and-compact",
  "work:concrete:cure",
  "equipment:concrete:pump",
  "equipment:concrete:deep-vibrator",
  "service:concrete:acceptance-control",
] as const;
const CONDITIONAL_JOINT_ROW_IDS = [
  "material:concrete:construction-joint-waterstop",
  "work:concrete:construction-joint-waterstop-install",
] as const;
const FORBIDDEN_SCOPE = /(?:excavat|reinforc|rebar|formwork|waterproof|backfill|geotext|sand.base|crushed.stone|blinding|котлован|арматур|опалуб|гидроизол|обратн.*засып|геотекст|песчан.*основан|щебен.*основан)/iu;

const BORED_PILE_REQUIRED_ROW_IDS = [
  "work:bored-pile:construct",
  "material:bored-pile:ready-mix-concrete",
  "material:bored-pile:reinforcement-cage",
  "material:bored-pile:centralizers",
  "equipment:bored-pile:drilling-rig",
  "equipment:bored-pile:crane",
  "service:bored-pile:integrity-test",
  "service:bored-pile:drilling-log",
] as const;
const BORED_PILE_CONDITIONAL_ROW_IDS = [
  "material:bored-pile:temporary-casing",
  "work:bored-pile:temporary-casing",
  "material:bored-pile:bentonite-slurry",
  "service:bored-pile:bentonite-system",
  "material:bored-pile:rebar-couplers",
  "work:bored-pile:rebar-couplers",
] as const;
const BORED_PILE_FORBIDDEN_SCOPE = /(?:pile.cap|strip.foundation|foundation.slab|ростверк|ленточн.*фундамент|фундаментн.*плит)/iu;

const ANCHOR_GROUP_REQUIRED_ROW_IDS = [
  "work:anchor-group:install-align-groups",
  "material:anchor-group:anchor-bolts",
  "material:anchor-group:nuts",
  "material:anchor-group:washers",
  "material:anchor-group:thread-protection-caps",
  "equipment:anchor-group:survey",
  "service:anchor-group:documents",
] as const;
const ANCHOR_GROUP_CONDITIONAL_ROW_IDS = [
  "material:anchor-group:temporary-braces",
  "work:anchor-group:temporary-braces",
  "material:anchor-group:non-shrink-base-grout",
  "work:anchor-group:non-shrink-base-grout",
] as const;
const ANCHOR_GROUP_FORBIDDEN_SCOPE = /(?:ready.mix|reinforc|rebar|sand|crushed.stone|waterproof|formwork|товарн.*бетон|арматур|песок|щебен|гидроизол|опалуб)/iu;

const REBAR_CAGE_REQUIRED_ROW_IDS = [
  "work:rebar-cage:assemble-install",
  "material:rebar-cage:a500c-d12",
  "material:rebar-cage:a500c-d16",
  "material:rebar-cage:annealed-tie-wire",
  "material:rebar-cage:cover-spacer-35",
  "equipment:rebar-cage:cutting-bending-machine",
  "service:rebar-cage:acceptance-record",
] as const;
const REBAR_CAGE_CONDITIONAL_ROW_IDS = [
  "material:rebar-cage:mechanical-couplers",
  "material:rebar-cage:welding-electrodes",
] as const;
const REBAR_CAGE_FORBIDDEN_SCOPE = /(?:ready.mix|concrete.pump|formwork|curing.film|товарн.*бетон|бетононасос|опалуб|плёнк.*уход)/iu;

const CERAMIC_BLOCK_WALL_REQUIRED_ROW_IDS = [
  "rc09:ceramic_block_wall_masonry",
  "rc09:ceramic_block_440x250x219",
  "rc09:first_course_masonry_mortar_m100",
  "rc09:thin_joint_masonry_adhesive",
  "rc09:stainless_flexible_wall_tie",
  "rc09:horizontal_cutoff_waterproofing",
  "rc09:masonry_lifting_platform",
] as const;
const CERAMIC_BLOCK_WALL_CONDITIONAL_ROW_IDS = [
  "rc09:masonry_lintel",
  "rc09:masonry_reinforcement_mesh",
  "rc09:abutment_mineral_wool",
] as const;
const CERAMIC_BLOCK_WALL_FORBIDDEN_SCOPE = /(?:generic.enclosing.structure|autoclaved|aac|универсальн.*огражда|газобет)/iu;

const STEEL_COLUMNS_BEAMS_REQUIRED_ROW_IDS = [
  "rc09:steel_columns_beams_install",
  "rc09:fabricated_steel_columns_beams_c345",
  "rc09:structural_bolt_m24_class_10_9",
  "rc09:welding_wire_sv08g2s",
  "rc09:repair_primer_epoxy_zinc",
  "rc09:steel_frame_mobile_crane",
  "rc09:steel_frame_survey_control",
  "rc09:steel_weld_ndt",
] as const;
const STEEL_COLUMNS_BEAMS_CONDITIONAL_ROW_IDS = [
  "rc09:non_shrink_column_base_grout",
  "rc09:structural_fireproofing",
] as const;
const STEEL_COLUMNS_BEAMS_FORBIDDEN_SCOPE = /(?:foundation.concrete|roofing.package)/iu;

const PVC_ROOF_MEMBRANE_REQUIRED_ROW_IDS = [
  "rc09:pvc_membrane_hot_air_install",
  "rc09:reinforced_pvc_roof_membrane_1_5mm",
  "rc09:pvc_membrane_telescopic_fastener",
  "rc09:pvc_membrane_edge_rail",
  "rc09:liquid_pvc_joint_sealant",
  "rc09:automatic_hot_air_roof_welder",
  "rc09:pvc_membrane_weld_probe_test",
] as const;
const PVC_ROOF_MEMBRANE_CONDITIONAL_ROW_IDS = [
  "rc09:unreinforced_pvc_detail_membrane",
  "rc09:pvc_contact_adhesive",
] as const;
const PVC_ROOF_MEMBRANE_FORBIDDEN_SCOPE = /(?:roof.vapour.barrier|roof.insulation|roof.slope.screed|roof.cement.screed|metal.tile.lathing)/iu;

const FACADE_MINERAL_WOOL_REQUIRED_ROW_IDS = [
  "rc09:facade_mineral_wool_install",
  "rc09:facade_mineral_wool_board_120mm",
  "rc09:facade_mineral_wool_adhesive",
  "rc09:facade_disc_dowel_200mm_metal_pin",
  "rc09:facade_insulation_lift",
  "rc09:facade_insulation_pullout_control",
] as const;
const FACADE_MINERAL_WOOL_CONDITIONAL_ROW_IDS = [
  "rc09:mineral_wool_fire_barrier_lamella",
  "rc09:facade_start_profile",
] as const;
const FACADE_MINERAL_WOOL_FORBIDDEN_SCOPE = /(?:facade.decorative.plaster|facade.paint|facade.base.coat.mesh)/iu;

const MECHANIZED_GYPSUM_WALL_PLASTER_REQUIRED_ROW_IDS = [
  "rc09:mechanized_gypsum_wall_plaster",
  "rc09:concrete_contact_primer",
  "rc09:machine_gypsum_plaster_15mm",
  "rc09:galvanized_plaster_beacon_10mm",
  "rc09:plaster_corner_profile",
  "rc09:plastering_station",
  "rc09:surface_protection_film_and_tape",
] as const;
const MECHANIZED_GYPSUM_WALL_PLASTER_CONDITIONAL_ROW_IDS = [
  "rc09:alkali_resistant_plaster_mesh",
] as const;
const MECHANIZED_GYPSUM_WALL_PLASTER_FORBIDDEN_SCOPE = /(?:cement.plaster.mix.in.same.room|wall.putty|wall.paint|decorative.finish)/iu;

const PORCELAIN_FLOOR_TILE_INSTALLATION_REQUIRED_ROW_IDS = [
  "rc09:porcelain_floor_tile_lay",
  "rc09:porcelain_tile_600x600",
  "rc09:c2te_s1_tile_adhesive",
  "rc09:cement_grout_2mm_joint",
  "rc09:tile_leveling_consumable_clip_2mm",
  "rc09:neutral_silicone_movement_joint",
  "rc09:wet_tile_saw",
] as const;
const PORCELAIN_FLOOR_TILE_INSTALLATION_CONDITIONAL_ROW_IDS = [
  "rc09:floor_leveling_compound",
  "rc09:floor_waterproofing",
] as const;
const PORCELAIN_FLOOR_TILE_INSTALLATION_FORBIDDEN_SCOPE = /(?:generic.tile.leveling.system.m2|unconfirmed.floor.screed)/iu;

const CEMENT_SAND_SCREED_DEMOLITION_REQUIRED_ROW_IDS = [
  "rc09:screed_demolition",
  "rc09:demolition_dust_protection_film",
  "rc09:reinforced_demolition_waste_bag",
  "rc09:diamond_cutting_disc_screed",
  "rc09:industrial_vacuum_filter_bag",
  "rc09:electric_breaker_operation",
  "rc09:industrial_vacuum_operation",
  "rc09:screed_waste_mass_handling",
] as const;
const CEMENT_SAND_SCREED_DEMOLITION_CONDITIONAL_ROW_IDS = [
  "rc09:screed_demolition_dust_suppression_water",
] as const;
const CEMENT_SAND_SCREED_DEMOLITION_FORBIDDEN_SCOPE = /(?:new.screed.mix|floor.finish.material)/iu;

const ASPHALT_UPPER_COURSE_REQUIRED_ROW_IDS = [
  "rc09:asphalt_upper_course_lay_compact",
  "rc09:dense_hot_asphalt_mix_upper_course",
  "rc09:cationic_bitumen_emulsion_tack_coat",
  "rc09:asphalt_joint_edge_sealant",
  "rc09:asphalt_paver_operation",
  "rc09:tandem_roller_operation",
  "rc09:asphalt_density_temperature_control",
] as const;
const ASPHALT_UPPER_COURSE_CONDITIONAL_ROW_IDS = [
  "rc09:asphalt_core_sampling",
] as const;
const ASPHALT_UPPER_COURSE_FORBIDDEN_SCOPE = /(?:subgrade|sand.base|crushed.stone|geotextile|lower.asphalt.course)/iu;

const SURFACE_DRAINAGE_CHANNEL_REQUIRED_ROW_IDS = [
  "rc09:drainage_channel_install",
  "rc09:polymer_concrete_channel_dn200_d400",
  "rc09:ductile_iron_grating_d400",
  "rc09:channel_grating_fastener",
  "rc09:channel_concrete_encasement_b25",
  "rc09:channel_end_cap_dn200",
  "rc09:channel_joint_sealant",
  "rc09:channel_level_slope_control",
] as const;
const SURFACE_DRAINAGE_CHANNEL_CONDITIONAL_ROW_IDS = [
  "rc09:channel_silt_trap",
  "rc09:channel_reinforcement_mesh",
  "rc09:pavement_reinstatement",
] as const;
const SURFACE_DRAINAGE_CHANNEL_FORBIDDEN_SCOPE = /(?:storm.sewer.network|road.full.pavement.package)/iu;

const PE110_ELECTROFUSION_JOINT_REQUIRED_ROW_IDS = [
  "rc09:pe110_electrofusion_weld",
  "rc09:pe100_electrofusion_coupler_110_sdr17",
  "rc09:pe_joint_isopropyl_cleaner",
  "rc09:lint_free_pipe_wipe",
  "rc09:pe_joint_identification_label",
  "rc09:electrofusion_control_unit",
  "rc09:pe_pipe_rotary_scraper",
  "rc09:electrofusion_joint_protocol",
] as const;
const PE110_ELECTROFUSION_JOINT_CONDITIONAL_ROW_IDS = [
  "rc09:electrofusion_generator",
  "rc09:pe_pipe_positioner",
] as const;
const PE110_ELECTROFUSION_JOINT_FORBIDDEN_SCOPE =
  /(?:pe.pipe.length|pipeline.trench|sand.bedding|water.chamber|network.disinfection)/iu;

const GRAVITY_SEWER_PVC_SN8_REQUIRED_ROW_IDS = [
  "rc09:pvc_sn8_sewer_pipe_lay",
  "rc09:pvc_sewer_pipe_sn8_d160",
  "rc09:pvc_sewer_socket_seal_d160",
  "rc09:pvc_sewer_assembly_lubricant",
  "rc09:washed_sand_pipe_bedding",
  "rc09:pipe_laser_level",
  "rc09:sewer_pipe_leak_test",
] as const;
const GRAVITY_SEWER_PVC_SN8_CONDITIONAL_ROW_IDS = [
  "rc09:sewer_fitting",
  "rc09:crossing_casing",
  "rc09:weak_ground_geotextile",
] as const;
const GRAVITY_SEWER_PVC_SN8_FORBIDDEN_SCOPE = /(?:sewer.manhole|sewer.pumping.station)/iu;

const PERFORATED_DRAIN_PIPE_FILTER_REQUIRED_ROW_IDS = [
  "rc09:perforated_drain_pipe_lay",
  "rc09:perforated_drain_pipe_d110",
  "rc09:drain_pipe_coupler_d110",
  "rc09:needle_punched_geotextile_300",
  "rc09:washed_granite_crushed_stone_20_40",
  "rc09:drainage_laser_level",
  "rc09:drainage_flush_flow_test",
] as const;
const PERFORATED_DRAIN_PIPE_FILTER_CONDITIONAL_ROW_IDS = [
  "rc09:drain_inspection_chamber",
  "rc09:sand_drain_bedding",
] as const;
const PERFORATED_DRAIN_PIPE_FILTER_FORBIDDEN_SCOPE =
  /(?:stormwater.main.collector|road.drainage.full.system)/iu;

const STEEL_PANEL_RADIATOR_REQUIRED_ROW_IDS = [
  "rc09:panel_radiator_install",
  "rc09:steel_panel_radiator_type22_500x1000",
  "rc09:radiator_wall_bracket",
  "rc09:thermostatic_radiator_valve",
  "rc09:radiator_lockshield_valve",
  "rc09:manual_air_vent",
  "rc09:radiator_connection_fitting_set",
  "rc09:radiator_connection_leak_test",
] as const;
const STEEL_PANEL_RADIATOR_CONDITIONAL_ROW_IDS = [
  "rc09:radiator_thermostatic_head",
  "rc09:concealed_pipe_insulation",
] as const;
const STEEL_PANEL_RADIATOR_FORBIDDEN_SCOPE =
  /(?:heating.full.distribution|building.heating.balance)/iu;

const GALVANIZED_STEEL_DUCT_REQUIRED_ROW_IDS = [
  "rc09:galvanized_duct_install",
  "rc09:rectangular_galvanized_duct_0_7mm",
  "rc09:duct_shaped_fittings_0_7mm",
  "rc09:duct_flange_sealing_tape",
  "rc09:duct_polymer_sealant_class_b",
  "rc09:duct_hanger_threaded_rod_m8",
  "rc09:duct_support_traverse",
  "rc09:duct_scissor_lift",
] as const;
const GALVANIZED_STEEL_DUCT_CONDITIONAL_ROW_IDS = [
  "rc09:duct_thermal_insulation",
  "rc09:duct_fireproofing",
  "rc09:equipment_flexible_connector",
] as const;
const GALVANIZED_STEEL_DUCT_FORBIDDEN_SCOPE =
  /(?:air.handling.unit|ventilation.fan|air.terminal|full.ventilation.system)/iu;

const SPLIT_SYSTEM_BLOCKS_REQUIRED_ROW_IDS = [
  "rc09:split_system_install_commission",
  "rc09:split_system_indoor_outdoor_3_5kw",
  "rc09:refrigeration_copper_pipe_pair",
  "rc09:closed_cell_pipe_insulation_pair",
  "rc09:condensate_drain_pipe_d20",
  "rc09:split_interconnect_cable",
  "rc09:outdoor_unit_wall_bracket",
  "rc09:dry_nitrogen_pressure_test",
  "rc09:split_system_vacuum_leak_commission",
] as const;
const SPLIT_SYSTEM_BLOCKS_CONDITIONAL_ROW_IDS = [
  "rc09:additional_refrigerant",
  "rc09:fire_rated_penetration_seal",
  "rc09:decorative_trunking",
] as const;
const SPLIT_SYSTEM_BLOCKS_FORBIDDEN_SCOPE =
  /(?:building.vrf.system|full.electrical.distribution)/iu;

const SPRINKLER_HEAD_CONNECTION_REQUIRED_ROW_IDS = [
  "rc09:sprinkler_head_install",
  "rc09:sprinkler_head_k80_68c",
  "rc09:sprinkler_reducing_socket_half_inch",
  "rc09:approved_thread_seal_sprinkler",
  "rc09:sprinkler_decorative_escutcheon",
  "rc09:sprinkler_protective_cap",
  "rc09:manufacturer_sprinkler_wrench",
  "rc09:sprinkler_head_visual_record",
] as const;
const SPRINKLER_HEAD_CONNECTION_CONDITIONAL_ROW_IDS = [
  "rc09:listed_flexible_sprinkler_hose",
] as const;
const SPRINKLER_HEAD_CONNECTION_FORBIDDEN_SCOPE =
  /(?:sprinkler.pipe.network|fire.pump|alarm.valve.station|full.fire.suppression)/iu;
const VVGNG_LS_POWER_CABLE_REQUIRED_ROW_IDS = [
  "rc09:vvgng_ls_cable_lay",
  "rc09:vvgng_a_ls_5x6_cable",
  "rc09:fire_resistant_cable_marker",
  "rc09:halogen_free_cable_clamp",
  "rc09:cable_gland_for_5x6",
  "rc09:copper_lug_6mm2",
  "rc09:firestop_cable_penetration_compound",
  "rc09:power_cable_insulation_continuity_test",
] as const;
const VVGNG_LS_POWER_CABLE_CONDITIONAL_ROW_IDS = [
  "rc09:cable_tray",
  "rc09:cable_protective_pipe",
  "rc09:cable_pulling_lubricant",
] as const;
const VVGNG_LS_POWER_CABLE_FORBIDDEN_SCOPE =
  /(?:switchboard|building.full.power.system)/iu;
const LED_LUMINAIRE_INSTALLATION_REQUIRED_ROW_IDS = [
  "rc09:led_luminaire_install",
  "rc09:led_luminaire_36w_ip40",
  "rc09:luminaire_mounting_anchor_set",
  "rc09:luminaire_terminal_connector",
  "rc09:luminaire_connection_wire_3x1_5",
  "rc09:luminaire_pe_lug",
  "rc09:luminaire_work_platform",
  "rc09:luminaire_pe_continuity_test",
] as const;
const LED_LUMINAIRE_INSTALLATION_CONDITIONAL_ROW_IDS = [
  "rc09:separate_led_driver",
  "rc09:suspended_ceiling_reinforcement_adapter",
] as const;
const LED_LUMINAIRE_INSTALLATION_FORBIDDEN_SCOPE =
  /(?:lighting.cable.line|light.switch|distribution.board)/iu;
const CAT6_TWISTED_PAIR_CABLE_REQUIRED_ROW_IDS = [
  "rc09:cat6_cable_lay",
  "rc09:uutp_cat6_4pair_lszh",
  "rc09:cat6_cable_identification_label",
  "rc09:reusable_velcro_cable_tie",
  "rc09:cat6_firestop_penetration",
  "rc09:structured_cable_certifier",
  "rc09:cat6_route_continuity_check",
] as const;
const CAT6_TWISTED_PAIR_CABLE_CONDITIONAL_ROW_IDS = [
  "rc09:cat6_keystone",
  "rc09:cat6_patch_panel",
  "rc09:cat6_information_outlet",
  "rc09:cable_j_hook",
] as const;
const CAT6_TWISTED_PAIR_CABLE_FORBIDDEN_SCOPE =
  /(?:network.switch|server.rack|full.structured.cabling.system)/iu;
const OPTICAL_FIBER_SPLICING_REQUIRED_ROW_IDS = [
  "rc09:optical_fiber_fusion_splice",
  "rc09:fiber_splice_heat_shrink_sleeve",
  "rc09:fiber_lint_free_wipe",
  "rc09:fiber_isopropyl_cleaner",
  "rc09:fiber_splice_identification_marker",
  "rc09:fiber_fusion_splicer",
  "rc09:optical_time_domain_reflectometer",
  "rc09:fiber_otdr_measurement_protocol",
] as const;
const OPTICAL_FIBER_SPLICING_CONDITIONAL_ROW_IDS = [
  "rc09:fiber_pigtail",
  "rc09:fiber_splice_tray",
] as const;
const OPTICAL_FIBER_SPLICING_FORBIDDEN_SCOPE =
  /(?:fiber.optic.cable.route|optical.distribution.frame|server.cabinet)/iu;
const ADDRESSABLE_SMOKE_DETECTOR_REQUIRED_ROW_IDS = [
  "rc09:addressable_smoke_detector_install",
  "rc09:addressable_optical_smoke_detector",
  "rc09:addressable_detector_base",
  "rc09:detector_fire_resistant_fastener",
  "rc09:detector_address_label",
  "rc09:smoke_detector_test_aerosol",
  "rc09:smoke_detector_test_dispenser",
  "rc09:smoke_detector_activation_record",
] as const;
const ADDRESSABLE_SMOKE_DETECTOR_CONDITIONAL_ROW_IDS = [
  "rc09:addressable_loop_isolator",
  "rc09:fire_resistant_junction_box",
] as const;
const ADDRESSABLE_SMOKE_DETECTOR_FORBIDDEN_SCOPE =
  /(?:fire.alarm.loop.cable|fire.alarm.control.panel|sounder|power.supply|full.fire.alarm.system)/iu;
const PUMP_UNIT_ALIGNMENT_CONNECTION_REQUIRED_ROW_IDS = [
  "rc09:pump_unit_install_align",
  "rc09:pump_motor_baseframe_45m3h_55m",
  "rc09:pump_anchor_bolt_set",
  "rc09:pump_alignment_shim_set",
  "rc09:non_shrink_pump_base_grout",
  "rc09:pump_flange_gasket_fastener_set",
  "rc09:laser_shaft_alignment_tool",
  "rc09:pump_vibration_qh_current_test",
] as const;
const PUMP_UNIT_ALIGNMENT_CONNECTION_CONDITIONAL_ROW_IDS = [
  "rc09:pump_vibration_isolator",
  "rc09:pump_flexible_connector",
] as const;
const PUMP_UNIT_ALIGNMENT_CONNECTION_FORBIDDEN_SCOPE =
  /(?:pumping.station.collectors|water.reservoir|pumping.station.automation|full.pumping.station)/iu;
const HOT_WATER_BOILER_PIPING_REQUIRED_ROW_IDS = [
  "rc09:hot_water_boiler_install_pipe",
  "rc09:hot_water_boiler_500kw",
  "rc09:modulating_gas_burner_500kw",
  "rc09:boiler_flange_gasket_fastener_set",
  "rc09:boiler_isolation_valve",
  "rc09:boiler_safety_group",
  "rc09:boiler_thermomanometer_sensor_set",
  "rc09:high_temperature_flue_sealant",
  "rc09:boiler_hydraulic_safety_commission",
] as const;
const HOT_WATER_BOILER_PIPING_CONDITIONAL_ROW_IDS = [
  "rc09:gas_train",
  "rc09:boiler_circulation_pump",
  "rc09:plate_heat_exchanger",
  "rc09:expansion_vessel",
  "rc09:water_treatment",
] as const;
const HOT_WATER_BOILER_PIPING_FORBIDDEN_SCOPE = /full.boiler.house/iu;
const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_REQUIRED_ROW_IDS = [
  "rc09:steel_process_pipe_butt_weld",
  "rc09:welding_wire_sv08g2s_d1_2",
  "rc09:welding_shielding_gas_mixture",
  "rc09:pipe_weld_degreaser",
  "rc09:pipe_weld_grinding_disc",
  "rc09:inverter_welding_power_source",
  "rc09:pipe_internal_external_clamp",
  "rc09:pipe_weld_ndt_control",
  "rc09:pipe_weld_log_record",
] as const;
const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CONDITIONAL_ROW_IDS = [
  "rc09:root_purge_gas",
  "rc09:preheat_postweld_heat_treatment",
  "rc09:field_joint_coating_repair",
] as const;
const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORBIDDEN_SCOPE =
  /(?:process.pipe.full.length|pipe.fitting|pipe.support|whole.pipeline.pressure.test)/iu;
const SERVER_RACK_42U_GROUNDING_REQUIRED_ROW_IDS = [
  "rc09:server_rack_42u_install_ground",
  "rc09:server_rack_42u_600x1200",
  "rc09:server_rack_anchor_set",
  "rc09:server_rack_bonding_kit",
  "rc09:copper_pe_conductor_16mm2",
  "rc09:copper_lug_16mm2",
  "rc09:rack_cage_nut_bolt_m6",
  "rc09:rack_cable_organizer",
  "rc09:rack_ground_continuity_test",
] as const;
const SERVER_RACK_42U_GROUNDING_CONDITIONAL_ROW_IDS = [
  "rc09:rack_plinth",
  "rc09:rack_pdu",
  "rc09:vertical_cable_organizer",
] as const;
const SERVER_RACK_42U_GROUNDING_FORBIDDEN_SCOPE =
  /(?:\bups\b|battery.system|server.room.cooling|server.room.fire.suppression|access.control|full.server.room)/iu;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`MASTER_CONCRETE_PLACEMENT_BENCHMARK:${code}`);
}

function writeAtomic(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, value, "utf8");
  renameSync(pending, path);
}

function visibleRows(result: CanonicalEstimateCompileCoreResult) {
  return [...result.rows, ...result.preliminaryNeeds];
}

const CASES: readonly Readonly<{
  ordinal: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
    | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30;
  catalogId: string;
  compile: Compile;
  shortInput: Readonly<Record<string, string | number>>;
  refinedInput: () => Readonly<Record<string, string | number | boolean>>;
  requiredRowIds: readonly string[];
  conditionalRowIds: readonly string[];
  forbiddenScope: RegExp;
  waveReceiptIndex?: number;
}>[] = [
  {
    ordinal: 1,
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard",
    compile: compileStripFoundationConcretePlacementR1,
    shortInput: {
      plan_dimension_concrete_volume_m3: 24,
      concrete_class: "B25",
      watertightness: "W6",
      frost_resistance: "F150",
      mobility: "P4",
      placement_method: "pump",
    },
    refinedInput: () => ({
      ...stripFoundationConcretePlacementAcceptanceInputR1("standard"),
      plan_dimension_concrete_volume_m3: 24,
      construction_joint_mode: "WATERSTOP",
      construction_joint_waterstop_specification: "Гидрошпонка ПВХ по проектному узлу рабочего шва",
      construction_joint_waterstop_length_m: 18,
      construction_joint_installation_worker_h: 12,
    }),
    requiredRowIds: REQUIRED_CURRENT_ROW_IDS,
    conditionalRowIds: CONDITIONAL_JOINT_ROW_IDS,
    forbiddenScope: FORBIDDEN_SCOPE,
    waveReceiptIndex: 0,
  },
  {
    ordinal: 2,
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    compile: compileSlabFoundationConcretePlacementR1,
    shortInput: {
      plan_dimension_concrete_volume_m3: 60,
      concrete_class: "B25",
      watertightness: "W8",
      frost_resistance: "F150",
      mobility: "P4",
    },
    refinedInput: () => ({
      ...slabFoundationConcretePlacementAcceptanceInputR1("standard"),
      plan_dimension_concrete_volume_m3: 60,
      watertightness: "W8",
      mixture_designation: "B25 W8 F150 P4",
      construction_joint_mode: "WATERSTOP",
      construction_joint_waterstop_specification: "Гидрошпонка ПВХ по проектному узлу рабочего шва плиты",
      construction_joint_waterstop_length_m: 24,
      construction_joint_installation_worker_h: 16,
    }),
    requiredRowIds: REQUIRED_CURRENT_ROW_IDS,
    conditionalRowIds: CONDITIONAL_JOINT_ROW_IDS,
    forbiddenScope: FORBIDDEN_SCOPE,
    waveReceiptIndex: 7,
  },
  {
    ordinal: 3,
    catalogId: BORED_REINFORCED_CONCRETE_PILE_CATALOG_ID,
    compile: compileBoredReinforcedConcretePileR1,
    shortInput: BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT,
    refinedInput: () => ({
      ...BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT,
      temporary_casing_mode: "REQUIRED",
      temporary_casing_specification: "Обсадная труба Ø620 мм по ППР",
      temporary_casing_length_m: 72,
      temporary_casing_worker_h: 18,
      bentonite_slurry_mode: "REQUIRED",
      bentonite_slurry_specification: "Раствор по карте BP-MS-01",
      bentonite_slurry_volume_m3: 24,
      bentonite_service_h: 16,
      rebar_coupler_mode: "REQUIRED",
      rebar_coupler_specification: "Муфта A500C Ø25 по BBS",
      rebar_coupler_quantity_piece: 144,
      rebar_coupler_worker_h: 30,
    }),
    requiredRowIds: BORED_PILE_REQUIRED_ROW_IDS,
    conditionalRowIds: BORED_PILE_CONDITIONAL_ROW_IDS,
    forbiddenScope: BORED_PILE_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 4,
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_standard",
    compile: compileAnchorGroupInstallationR1,
    shortInput: {
      anchor_group_count: 10,
      bolts_per_group: 4,
      anchor_bolt_designation: "M24 class 8.8",
    },
    refinedInput: () => ({
      ...anchorGroupInstallationAcceptanceInputR1("standard"),
      anchor_group_count: 10,
      bolts_per_group: 4,
      anchor_bolt_quantity_piece: 40,
      anchor_bolt_designation: "M24 class 8.8",
      temporary_brace_mode: "REQUIRED",
      temporary_brace_designation: "Temporary steel brace by method statement",
      temporary_brace_quantity_piece: 20,
      temporary_brace_worker_h: 16,
      base_grout_mode: "REQUIRED",
      base_grout_designation: "Non-shrink grout by structural detail",
      base_grout_quantity_kg: 500,
      base_grout_worker_h: 20,
    }),
    requiredRowIds: ANCHOR_GROUP_REQUIRED_ROW_IDS,
    conditionalRowIds: ANCHOR_GROUP_CONDITIONAL_ROW_IDS,
    forbiddenScope: ANCHOR_GROUP_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 5,
    catalogId: MONOLITHIC_REBAR_CAGE_CATALOG_ID,
    compile: compileMonolithicRebarCageR1,
    shortInput: MONOLITHIC_REBAR_CAGE_SHORT_INPUT,
    refinedInput: () => ({
      ...MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT,
      mechanical_coupler_mode: "REQUIRED",
      mechanical_coupler_designation: "Муфта A500C Ø16 по BBS",
      mechanical_coupler_quantity_piece: 48,
      welding_electrode_mode: "REQUIRED",
      welding_electrode_designation: "Электрод по WPS арматурных соединений",
      welding_electrode_mass_kg: 12,
    }),
    requiredRowIds: REBAR_CAGE_REQUIRED_ROW_IDS,
    conditionalRowIds: REBAR_CAGE_CONDITIONAL_ROW_IDS,
    forbiddenScope: REBAR_CAGE_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 6,
    catalogId: CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID,
    compile: compileCeramicBlockExternalWallR1,
    shortInput: CERAMIC_BLOCK_EXTERNAL_WALL_SHORT_INPUT,
    refinedInput: () => ({
      ...CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT,
      lintel_mode: "REQUIRED",
      lintel_designation: "Керамическая армированная перемычка по рабочему чертежу",
      lintel_quantity_piece: 4,
      reinforcement_mesh_mode: "REQUIRED",
      reinforcement_mesh_designation: "Сетка кладочная по конструктивному решению",
      reinforcement_mesh_quantity_m2: 24,
      abutment_mineral_wool_mode: "REQUIRED",
      abutment_mineral_wool_designation: "Минеральная вата по узлу примыкания",
      abutment_mineral_wool_quantity_m3: 1.2,
    }),
    requiredRowIds: CERAMIC_BLOCK_WALL_REQUIRED_ROW_IDS,
    conditionalRowIds: CERAMIC_BLOCK_WALL_CONDITIONAL_ROW_IDS,
    forbiddenScope: CERAMIC_BLOCK_WALL_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 7,
    catalogId: STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID,
    compile: compileSteelColumnsBeamsInstallationR1,
    shortInput: STEEL_COLUMNS_BEAMS_INSTALLATION_SHORT_INPUT,
    refinedInput: () => ({
      ...STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT,
      column_base_grout_mode: "REQUIRED",
      column_base_grout_designation: "Безусадочный состав по узлу базы колонны КМД",
      column_base_grout_mass_kg: 540,
      structural_fireproofing_mode: "REQUIRED",
      structural_fireproofing_designation: "Огнезащитная система по утверждённой ведомости огнезащиты",
      structural_fireproofing_area_m2: 680,
    }),
    requiredRowIds: STEEL_COLUMNS_BEAMS_REQUIRED_ROW_IDS,
    conditionalRowIds: STEEL_COLUMNS_BEAMS_CONDITIONAL_ROW_IDS,
    forbiddenScope: STEEL_COLUMNS_BEAMS_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 8,
    catalogId: PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID,
    compile: compilePvcRoofMembraneInstallationR1,
    shortInput: PVC_ROOF_MEMBRANE_INSTALLATION_SHORT_INPUT,
    refinedInput: () => ({
      ...PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT,
      detail_membrane_mode: "REQUIRED",
      detail_membrane_designation: "Неармированная ПВХ-мембрана по ведомости деталей",
      detail_membrane_area_m2: 28,
      contact_adhesive_mode: "REQUIRED",
      contact_adhesive_designation: "Контактный клей совместимой кровельной системы",
      contact_adhesive_mass_kg: 18,
    }),
    requiredRowIds: PVC_ROOF_MEMBRANE_REQUIRED_ROW_IDS,
    conditionalRowIds: PVC_ROOF_MEMBRANE_CONDITIONAL_ROW_IDS,
    forbiddenScope: PVC_ROOF_MEMBRANE_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 9,
    catalogId: FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID,
    compile: compileFacadeMineralWoolInstallationR1,
    shortInput: FACADE_MINERAL_WOOL_INSTALLATION_SHORT_INPUT,
    refinedInput: () => ({
      ...FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT,
      fire_barrier_lamella_mode: "REQUIRED",
      fire_barrier_lamella_designation: "Минераловатная ламель по противопожарным узлам",
      fire_barrier_lamella_length_m: 42,
      start_profile_mode: "REQUIRED",
      start_profile_designation: "Стартовый профиль по фасадному узлу",
      start_profile_length_m: 65,
    }),
    requiredRowIds: FACADE_MINERAL_WOOL_REQUIRED_ROW_IDS,
    conditionalRowIds: FACADE_MINERAL_WOOL_CONDITIONAL_ROW_IDS,
    forbiddenScope: FACADE_MINERAL_WOOL_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 10,
    catalogId: MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID,
    compile: compileMechanizedGypsumWallPlasterR1,
    shortInput: MECHANIZED_GYPSUM_WALL_PLASTER_SHORT_INPUT,
    refinedInput: () => ({
      ...MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT,
      plaster_mesh_mode: "REQUIRED",
      plaster_mesh_designation: "Щёлочестойкая сетка по узлам стыков неоднородных оснований",
      plaster_mesh_area_m2: 80,
    }),
    requiredRowIds: MECHANIZED_GYPSUM_WALL_PLASTER_REQUIRED_ROW_IDS,
    conditionalRowIds: MECHANIZED_GYPSUM_WALL_PLASTER_CONDITIONAL_ROW_IDS,
    forbiddenScope: MECHANIZED_GYPSUM_WALL_PLASTER_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 11,
    catalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
    compile: compilePorcelainFloorTileInstallationR1,
    shortInput: PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
    refinedInput: () => ({
      ...PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
      floor_leveling_mode: "REQUIRED",
      floor_leveling_compound_designation: "Выравнивающий состав по обследованию основания",
      floor_leveling_compound_mass_kg: 1200,
      floor_waterproofing_mode: "REQUIRED",
      floor_waterproofing_designation: "Гидроизоляционная система по проекту мокрой зоны",
      floor_waterproofing_area_m2: 120,
    }),
    requiredRowIds: PORCELAIN_FLOOR_TILE_INSTALLATION_REQUIRED_ROW_IDS,
    conditionalRowIds: PORCELAIN_FLOOR_TILE_INSTALLATION_CONDITIONAL_ROW_IDS,
    forbiddenScope: PORCELAIN_FLOOR_TILE_INSTALLATION_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 12,
    catalogId: CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID,
    compile: compileCementSandScreedDemolitionR1,
    shortInput: CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
    refinedInput: () => ({
      ...CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
      dust_suppression_mode: "REQUIRED",
      dust_suppression_water_volume_l: 300,
    }),
    requiredRowIds: CEMENT_SAND_SCREED_DEMOLITION_REQUIRED_ROW_IDS,
    conditionalRowIds: CEMENT_SAND_SCREED_DEMOLITION_CONDITIONAL_ROW_IDS,
    forbiddenScope: CEMENT_SAND_SCREED_DEMOLITION_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 13,
    catalogId: ASPHALT_UPPER_COURSE_CATALOG_ID,
    compile: compileAsphaltUpperCourseR1,
    shortInput: ASPHALT_UPPER_COURSE_SHORT_INPUT,
    refinedInput: () => ({
      ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
      core_sampling_mode: "REQUIRED",
      core_sampling_count_test: 2,
    }),
    requiredRowIds: ASPHALT_UPPER_COURSE_REQUIRED_ROW_IDS,
    conditionalRowIds: ASPHALT_UPPER_COURSE_CONDITIONAL_ROW_IDS,
    forbiddenScope: ASPHALT_UPPER_COURSE_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 14,
    catalogId: SURFACE_DRAINAGE_CHANNEL_CATALOG_ID,
    compile: compileSurfaceDrainageChannelR1,
    shortInput: SURFACE_DRAINAGE_CHANNEL_SHORT_INPUT,
    refinedInput: () => ({
      ...SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
      silt_trap_mode: "REQUIRED",
      silt_trap_designation: "Пескоуловитель DN200 выбранной системы",
      silt_trap_quantity_piece: 2,
      reinforcement_mesh_mode: "REQUIRED",
      reinforcement_mesh_designation: "Сетка арматурная по рабочему узлу обоймы",
      reinforcement_mesh_area_m2: 45,
      pavement_reinstatement_mode: "REQUIRED",
      pavement_reinstatement_designation: "Локальное восстановление покрытия по рабочему узлу",
      pavement_reinstatement_area_m2: 16,
    }),
    requiredRowIds: SURFACE_DRAINAGE_CHANNEL_REQUIRED_ROW_IDS,
    conditionalRowIds: SURFACE_DRAINAGE_CHANNEL_CONDITIONAL_ROW_IDS,
    forbiddenScope: SURFACE_DRAINAGE_CHANNEL_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 15,
    catalogId: PE110_ELECTROFUSION_JOINT_CATALOG_ID,
    compile: compilePe110ElectrofusionJointR1,
    shortInput: PE110_ELECTROFUSION_JOINT_SHORT_INPUT,
    refinedInput: () => ({
      ...PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT,
      generator_mode: "REQUIRED",
      generator_designation: "Автономный генератор по ППР",
      generator_machine_h: 5,
      positioner_mode: "REQUIRED",
      positioner_designation: "Позиционер трубы ПЭ Ø110",
      positioner_machine_h: 4,
    }),
    requiredRowIds: PE110_ELECTROFUSION_JOINT_REQUIRED_ROW_IDS,
    conditionalRowIds: PE110_ELECTROFUSION_JOINT_CONDITIONAL_ROW_IDS,
    forbiddenScope: PE110_ELECTROFUSION_JOINT_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 16,
    catalogId: GRAVITY_SEWER_PVC_SN8_CATALOG_ID,
    compile: compileGravitySewerPvcSn8R1,
    shortInput: GRAVITY_SEWER_PVC_SN8_SHORT_INPUT,
    refinedInput: () => ({
      ...GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT,
      fitting_mode: "REQUIRED",
      fitting_designation: "Отвод PVC-U SN8 Ø160 по проекту",
      fitting_quantity_piece: 3,
      casing_mode: "REQUIRED",
      casing_designation: "Футляр стальной по узлу пересечения",
      casing_length_m: 12,
      geotextile_mode: "REQUIRED",
      geotextile_designation: "Геотекстиль по узлу слабого грунта",
      geotextile_area_m2: 65,
    }),
    requiredRowIds: GRAVITY_SEWER_PVC_SN8_REQUIRED_ROW_IDS,
    conditionalRowIds: GRAVITY_SEWER_PVC_SN8_CONDITIONAL_ROW_IDS,
    forbiddenScope: GRAVITY_SEWER_PVC_SN8_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 17,
    catalogId: PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID,
    compile: compilePerforatedDrainPipeFilterR1,
    shortInput: PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
    refinedInput: () => ({
      ...PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
      inspection_chamber_mode: "REQUIRED",
      inspection_chamber_designation: "Колодец дренажный смотровой по плану трассы",
      inspection_chamber_quantity_piece: 3,
      sand_bedding_mode: "REQUIRED",
      sand_bedding_designation: "Песок мытый для постели по проектному узлу",
      sand_bedding_volume_m3: 8.5,
    }),
    requiredRowIds: PERFORATED_DRAIN_PIPE_FILTER_REQUIRED_ROW_IDS,
    conditionalRowIds: PERFORATED_DRAIN_PIPE_FILTER_CONDITIONAL_ROW_IDS,
    forbiddenScope: PERFORATED_DRAIN_PIPE_FILTER_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 18,
    catalogId: STEEL_PANEL_RADIATOR_CATALOG_ID,
    compile: compileSteelPanelRadiatorR1,
    shortInput: STEEL_PANEL_RADIATOR_SHORT_INPUT,
    refinedInput: () => ({
      ...STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
      thermostatic_head_mode: "REQUIRED",
      thermostatic_head_designation: "Термостатическая головка по спецификации",
      thermostatic_head_quantity_piece: 8,
      concealed_pipe_insulation_mode: "REQUIRED",
      concealed_pipe_insulation_designation: "Теплоизоляция скрытой подводки по узлу",
      concealed_pipe_insulation_length_m: 24,
    }),
    requiredRowIds: STEEL_PANEL_RADIATOR_REQUIRED_ROW_IDS,
    conditionalRowIds: STEEL_PANEL_RADIATOR_CONDITIONAL_ROW_IDS,
    forbiddenScope: STEEL_PANEL_RADIATOR_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 19,
    catalogId: GALVANIZED_STEEL_DUCT_CATALOG_ID,
    compile: compileGalvanizedSteelDuctR1,
    shortInput: GALVANIZED_STEEL_DUCT_SHORT_INPUT,
    refinedInput: () => ({
      ...GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
      thermal_insulation_mode: "REQUIRED",
      thermal_insulation_designation: "Теплоизоляция по спецификации",
      thermal_insulation_area_m2: 280,
      fireproofing_mode: "REQUIRED",
      fireproofing_designation: "Огнезащитное покрытие по проекту",
      fireproofing_area_m2: 42,
      flexible_connector_mode: "REQUIRED",
      flexible_connector_designation: "Гибкая вставка по узлу оборудования",
      flexible_connector_quantity_piece: 4,
    }),
    requiredRowIds: GALVANIZED_STEEL_DUCT_REQUIRED_ROW_IDS,
    conditionalRowIds: GALVANIZED_STEEL_DUCT_CONDITIONAL_ROW_IDS,
    forbiddenScope: GALVANIZED_STEEL_DUCT_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 20,
    catalogId: SPLIT_SYSTEM_BLOCKS_CATALOG_ID,
    compile: compileSplitSystemBlocksR1,
    shortInput: SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
    refinedInput: () => ({
      ...SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
      additional_refrigerant_mode: "REQUIRED",
      additional_refrigerant_designation: "R32 по паспорту выбранной модели",
      additional_refrigerant_mass_kg: 1.2,
      fire_rated_penetration_seal_mode: "REQUIRED",
      fire_rated_penetration_seal_designation: "Огнестойкая проходка по проекту",
      fire_rated_penetration_seal_quantity_piece: 4,
      decorative_trunking_mode: "REQUIRED",
      decorative_trunking_designation: "Короб ПВХ по раскладке трассы",
      decorative_trunking_length_m: 18,
    }),
    requiredRowIds: SPLIT_SYSTEM_BLOCKS_REQUIRED_ROW_IDS,
    conditionalRowIds: SPLIT_SYSTEM_BLOCKS_CONDITIONAL_ROW_IDS,
    forbiddenScope: SPLIT_SYSTEM_BLOCKS_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 21,
    catalogId: SPRINKLER_HEAD_CONNECTION_CATALOG_ID,
    compile: compileSprinklerHeadConnectionR1,
    shortInput: SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
    refinedInput: () => ({
      ...SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
      flexible_hose_mode: "REQUIRED",
      flexible_hose_designation: "Сертифицированная гибкая подводка по узлу",
      flexible_hose_quantity_piece: 40,
    }),
    requiredRowIds: SPRINKLER_HEAD_CONNECTION_REQUIRED_ROW_IDS,
    conditionalRowIds: SPRINKLER_HEAD_CONNECTION_CONDITIONAL_ROW_IDS,
    forbiddenScope: SPRINKLER_HEAD_CONNECTION_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 22,
    catalogId: VVGNG_LS_POWER_CABLE_CATALOG_ID,
    compile: compileVvgngLsPowerCableR1,
    shortInput: VVGNG_LS_POWER_CABLE_SHORT_INPUT,
    refinedInput: () => ({
      ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      cable_tray_mode: "REQUIRED",
      cable_tray_designation: "Лоток по проекту",
      cable_tray_length_m: 90,
      protective_pipe_mode: "REQUIRED",
      protective_pipe_designation: "Труба по узлу",
      protective_pipe_length_m: 12,
      pulling_lubricant_mode: "REQUIRED",
      pulling_lubricant_designation: "Смазка по ППР",
      pulling_lubricant_quantity_kg: 2.5,
    }),
    requiredRowIds: VVGNG_LS_POWER_CABLE_REQUIRED_ROW_IDS,
    conditionalRowIds: VVGNG_LS_POWER_CABLE_CONDITIONAL_ROW_IDS,
    forbiddenScope: VVGNG_LS_POWER_CABLE_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 23,
    catalogId: LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
    compile: compileLedLuminaireInstallationR1,
    shortInput: LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
    refinedInput: () => ({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
      separate_driver_mode: "REQUIRED",
      separate_driver_designation: "Драйвер по ведомости светильников",
      separate_driver_quantity_piece: 30,
      ceiling_adapter_mode: "REQUIRED",
      ceiling_adapter_designation: "Адаптер усиления по узлу потолка",
      ceiling_adapter_quantity_set: 30,
    }),
    requiredRowIds: LED_LUMINAIRE_INSTALLATION_REQUIRED_ROW_IDS,
    conditionalRowIds: LED_LUMINAIRE_INSTALLATION_CONDITIONAL_ROW_IDS,
    forbiddenScope: LED_LUMINAIRE_INSTALLATION_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 24,
    catalogId: CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
    compile: compileCat6TwistedPairCableR1,
    shortInput: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
    refinedInput: () => ({
      ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
      keystone_mode: "REQUIRED",
      keystone_designation: "Keystone Cat.6 по спецификации",
      keystone_quantity_piece: 24,
      patch_panel_mode: "REQUIRED",
      patch_panel_designation: "Патч-панель Cat.6 по спецификации",
      patch_panel_quantity_piece: 1,
      information_outlet_mode: "REQUIRED",
      information_outlet_designation: "Розетка Cat.6 по плану",
      information_outlet_quantity_piece: 12,
      j_hook_mode: "REQUIRED",
      j_hook_designation: "J-hook по раскладке",
      j_hook_quantity_piece: 60,
    }),
    requiredRowIds: CAT6_TWISTED_PAIR_CABLE_REQUIRED_ROW_IDS,
    conditionalRowIds: CAT6_TWISTED_PAIR_CABLE_CONDITIONAL_ROW_IDS,
    forbiddenScope: CAT6_TWISTED_PAIR_CABLE_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 25,
    catalogId: OPTICAL_FIBER_SPLICING_CATALOG_ID,
    compile: compileOpticalFiberSplicingR1,
    shortInput: OPTICAL_FIBER_SPLICING_SHORT_INPUT,
    refinedInput: () => ({
      ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
      pigtail_mode: "REQUIRED",
      pigtail_designation: "Пигтейл OS2 LC/UPC по спецификации",
      pigtail_quantity_piece: 48,
      splice_tray_mode: "REQUIRED",
      splice_tray_designation: "Кассета на 24 сварки по спецификации",
      splice_tray_quantity_piece: 2,
    }),
    requiredRowIds: OPTICAL_FIBER_SPLICING_REQUIRED_ROW_IDS,
    conditionalRowIds: OPTICAL_FIBER_SPLICING_CONDITIONAL_ROW_IDS,
    forbiddenScope: OPTICAL_FIBER_SPLICING_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 26,
    catalogId: ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
    compile: compileAddressableSmokeDetectorR1,
    shortInput: ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
    refinedInput: () => ({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
      loop_isolator_mode: "REQUIRED",
      loop_isolator_designation: "Изолятор адресного шлейфа по схеме",
      loop_isolator_quantity_piece: 2,
      junction_box_mode: "REQUIRED",
      junction_box_designation: "Коробка E30 по узлу",
      junction_box_quantity_piece: 5,
    }),
    requiredRowIds: ADDRESSABLE_SMOKE_DETECTOR_REQUIRED_ROW_IDS,
    conditionalRowIds: ADDRESSABLE_SMOKE_DETECTOR_CONDITIONAL_ROW_IDS,
    forbiddenScope: ADDRESSABLE_SMOKE_DETECTOR_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 27,
    catalogId: PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
    compile: compilePumpUnitAlignmentConnectionR1,
    shortInput: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
    refinedInput: () => ({
      ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
      vibration_isolator_mode: "REQUIRED",
      vibration_isolator_designation: "Виброизоляторы по чертежу насосной рамы",
      vibration_isolator_quantity_set: 2,
      flexible_connector_mode: "REQUIRED",
      flexible_connector_designation: "Гибкие вставки по схеме обвязки",
      flexible_connector_quantity_set: 4,
    }),
    requiredRowIds: PUMP_UNIT_ALIGNMENT_CONNECTION_REQUIRED_ROW_IDS,
    conditionalRowIds: PUMP_UNIT_ALIGNMENT_CONNECTION_CONDITIONAL_ROW_IDS,
    forbiddenScope: PUMP_UNIT_ALIGNMENT_CONNECTION_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 28,
    catalogId: HOT_WATER_BOILER_PIPING_CATALOG_ID,
    compile: compileHotWaterBoilerPipingR1,
    shortInput: HOT_WATER_BOILER_PIPING_SHORT_INPUT,
    refinedInput: () => ({
      ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
      gas_train_mode: "REQUIRED",
      gas_train_designation: "Газовая рампа по паспорту горелки",
      gas_train_quantity: 1,
      circulation_pump_mode: "REQUIRED",
      circulation_pump_designation: "Насос котлового контура по проекту",
      circulation_pump_quantity: 2,
      plate_heat_exchanger_mode: "REQUIRED",
      plate_heat_exchanger_designation: "Теплообменник по тепломеханической схеме",
      plate_heat_exchanger_quantity: 1,
      expansion_vessel_mode: "REQUIRED",
      expansion_vessel_designation: "Расширительный бак по расчёту проекта",
      expansion_vessel_quantity: 1,
      water_treatment_mode: "REQUIRED",
      water_treatment_designation: "Водоподготовка по анализу исходной воды",
      water_treatment_quantity: 1,
    }),
    requiredRowIds: HOT_WATER_BOILER_PIPING_REQUIRED_ROW_IDS,
    conditionalRowIds: HOT_WATER_BOILER_PIPING_CONDITIONAL_ROW_IDS,
    forbiddenScope: HOT_WATER_BOILER_PIPING_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 29,
    catalogId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
    compile: compileIndustrialSteelPipeButtWeldR1,
    shortInput: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
    refinedInput: () => ({
      ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
      root_purge_gas_mode: "REQUIRED",
      root_purge_gas_designation: "Аргон для продувки корня по WPS",
      root_purge_gas_quantity: 5.4,
      preheat_postweld_heat_treatment_mode: "REQUIRED",
      preheat_postweld_heat_treatment_designation: "Индукционный подогрев по WPS",
      preheat_postweld_heat_treatment_quantity: 12,
      field_joint_coating_repair_mode: "REQUIRED",
      field_joint_coating_repair_designation: "Система покрытия по проекту",
      field_joint_coating_repair_quantity: 6.8,
    }),
    requiredRowIds: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_REQUIRED_ROW_IDS,
    conditionalRowIds: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CONDITIONAL_ROW_IDS,
    forbiddenScope: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORBIDDEN_SCOPE,
  },
  {
    ordinal: 30,
    catalogId: SERVER_RACK_42U_GROUNDING_CATALOG_ID,
    compile: compileServerRack42uGroundingR1,
    shortInput: SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
    refinedInput: () => ({
      ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
      rack_plinth_mode: "REQUIRED",
      rack_plinth_designation: "Цоколь 100 мм по спецификации шкафа",
      rack_plinth_quantity: 6,
      rack_pdu_mode: "REQUIRED",
      rack_pdu_designation: "PDU 32 A по электрической спецификации",
      rack_pdu_quantity: 12,
      vertical_cable_organizer_mode: "REQUIRED",
      vertical_cable_organizer_designation: "Органайзер вертикальный по раскладке",
      vertical_cable_organizer_quantity: 12,
    }),
    requiredRowIds: SERVER_RACK_42U_GROUNDING_REQUIRED_ROW_IDS,
    conditionalRowIds: SERVER_RACK_42U_GROUNDING_CONDITIONAL_ROW_IDS,
    forbiddenScope: SERVER_RACK_42U_GROUNDING_FORBIDDEN_SCOPE,
  },
];

async function main(): Promise<void> {
  const auditBytes = readFileSync(AUDIT_PATH);
  const audit = JSON.parse(auditBytes.toString("utf8")) as Json;
  const candidate = audit.candidate as Json;
  invariant(candidate.definitionReleaseId === CANDIDATE_RELEASE_ID, "AUDIT_CANDIDATE");
  invariant(candidate.status === "prepared" && candidate.activatedAt === null, "AUDIT_BOUNDARY");
  invariant(audit.releaseActivated === false && audit.deployPerformed === false
    && audit.otaPerformed === false, "AUDIT_SIDE_EFFECT_BOUNDARY");
  invariant((audit.counts as Json).minimumCompiled === 10_331
    && (audit.counts as Json).minimumFailed === 0
    && (audit.counts as Json).refinedFixtureCompiledWithoutNeeds === 10_331,
  "AUDIT_COUNTS");
  const outcomes = audit.outcomes as Json[];

  let parentReleaseId = "459254f3-3989-56ba-858f-172ce171fdcf";
  let parentSearchReleaseId = "46089c97-7039-505c-8da2-04e2b54bf05c";
  const waveReceipts = WAVE_RECEIPTS.map((relativePath) => {
    const path = resolve(WAVE_ROOT, relativePath);
    const bytes = readFileSync(path);
    const receipt = JSON.parse(bytes.toString("utf8")) as Json;
    const predecessor = receipt.predecessor as Json;
    const successor = receipt.successor as Json;
    const receiptAudit = receipt.audit as Json;
    invariant(predecessor.releaseId === parentReleaseId
      && predecessor.searchReleaseId === parentSearchReleaseId, `WAVE_PARENT:${relativePath}`);
    invariant(String(receipt.status).startsWith("GREEN_")
      && String(receipt.status).endsWith("_PREPARED_NOT_ACTIVE"), `WAVE_STATUS:${relativePath}`);
    invariant((receiptAudit.unrelatedManifestChanges as number) === 0,
      `WAVE_UNRELATED_DRIFT:${relativePath}`);
    invariant(receipt.productionAccessed === false && receipt.deployPerformed === false
      && receipt.activationPerformed === false && receipt.releasePerformed === false
      && receipt.otaPerformed === false, `WAVE_SIDE_EFFECT_BOUNDARY:${relativePath}`);
    parentReleaseId = String(successor.releaseId);
    parentSearchReleaseId = String(successor.searchReleaseId);
    return {
      path: path.replaceAll("\\", "/"),
      sha256: sha256(bytes),
      receiptSha256: receipt.receiptSha256,
      predecessorReleaseId: predecessor.releaseId,
      successorReleaseId: successor.releaseId,
      successorSearchReleaseId: successor.searchReleaseId,
      targetCount: Array.isArray(receipt.targetCatalogIds) ? receipt.targetCatalogIds.length : 0,
      unrelatedManifestChanges: receiptAudit.unrelatedManifestChanges,
    };
  });
  const boredPileReceiptBytes = readFileSync(BORED_PILE_RECEIPT_PATH);
  const boredPileReceipt = JSON.parse(boredPileReceiptBytes.toString("utf8")) as Json;
  const boredPilePredecessor = boredPileReceipt.predecessor as Json;
  const boredPileSuccessor = boredPileReceipt.successor as Json;
  const boredPileAudit = boredPileReceipt.audit as Json;
  invariant(boredPilePredecessor.releaseId === parentReleaseId
    && boredPilePredecessor.searchReleaseId === parentSearchReleaseId,
  "BORED_PILE_PARENT");
  invariant(boredPileReceipt.status === "GREEN_MASTER_BORED_PILE_PREPARED_NOT_ACTIVE"
    && boredPileReceipt.mutationPerformed === true,
  "BORED_PILE_RECEIPT_STATUS");
  invariant((boredPileAudit.unrelatedManifestChanges as number) === 0,
    "BORED_PILE_UNRELATED_DRIFT");
  invariant(boredPileReceipt.productionAccessed === false
    && boredPileReceipt.deployPerformed === false
    && boredPileReceipt.activationPerformed === false
    && boredPileReceipt.releasePerformed === false
    && boredPileReceipt.otaPerformed === false,
  "BORED_PILE_SIDE_EFFECT_BOUNDARY");
  const boredPileReceiptEvidence = {
    path: BORED_PILE_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(boredPileReceiptBytes),
    receiptSha256: boredPileReceipt.receiptSha256,
    predecessorReleaseId: boredPilePredecessor.releaseId,
    successorReleaseId: boredPileSuccessor.releaseId,
    successorSearchReleaseId: boredPileSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: boredPileAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(boredPileSuccessor.releaseId);
  parentSearchReleaseId = String(boredPileSuccessor.searchReleaseId);

  const anchorGroupReceipts = ANCHOR_GROUP_RECEIPT_PATHS.map((path, index) => {
    const bytes = readFileSync(path);
    const receipt = JSON.parse(bytes.toString("utf8")) as Json;
    const predecessor = receipt.predecessor as Json;
    const successor = receipt.successor as Json;
    const receiptAudit = receipt.audit as Json;
    invariant(predecessor.releaseId === parentReleaseId
      && predecessor.searchReleaseId === parentSearchReleaseId,
    `ANCHOR_GROUP_PARENT:${index + 1}`);
    invariant(receipt.status === "GREEN_S19_ANCHOR_GROUP_MINIMUM_INPUT_PREPARED_NOT_ACTIVE"
      && receipt.mutationPerformed === true,
    `ANCHOR_GROUP_RECEIPT_STATUS:${index + 1}`);
    invariant((receiptAudit.unrelatedManifestChanges as number) === 0,
      `ANCHOR_GROUP_UNRELATED_DRIFT:${index + 1}`);
    invariant(receipt.productionAccessed === false
      && receipt.deployPerformed === false
      && receipt.activationPerformed === false
      && receipt.releasePerformed === false
      && receipt.otaPerformed === false,
    `ANCHOR_GROUP_SIDE_EFFECT_BOUNDARY:${index + 1}`);
    parentReleaseId = String(successor.releaseId);
    parentSearchReleaseId = String(successor.searchReleaseId);
    return {
      path: path.replaceAll("\\", "/"),
      sha256: sha256(bytes),
      receiptSha256: receipt.receiptSha256,
      predecessorReleaseId: predecessor.releaseId,
      successorReleaseId: successor.releaseId,
      successorSearchReleaseId: successor.searchReleaseId,
      targetCount: 6,
      unrelatedManifestChanges: receiptAudit.unrelatedManifestChanges,
    };
  });
  const monolithicRebarCageReceiptBytes = readFileSync(MONOLITHIC_REBAR_CAGE_RECEIPT_PATH);
  const monolithicRebarCageReceipt = JSON.parse(
    monolithicRebarCageReceiptBytes.toString("utf8"),
  ) as Json;
  const rebarCagePredecessor = monolithicRebarCageReceipt.predecessor as Json;
  const rebarCageSuccessor = monolithicRebarCageReceipt.successor as Json;
  const rebarCageAudit = monolithicRebarCageReceipt.audit as Json;
  invariant(rebarCagePredecessor.releaseId === parentReleaseId
    && rebarCagePredecessor.searchReleaseId === parentSearchReleaseId,
  "MONOLITHIC_REBAR_CAGE_PARENT");
  invariant(monolithicRebarCageReceipt.status
    === "GREEN_MASTER_MONOLITHIC_REBAR_CAGE_PREPARED_NOT_ACTIVE"
    && monolithicRebarCageReceipt.mutationPerformed === true,
  "MONOLITHIC_REBAR_CAGE_RECEIPT_STATUS");
  invariant((rebarCageAudit.unrelatedManifestChanges as number) === 0,
    "MONOLITHIC_REBAR_CAGE_UNRELATED_DRIFT");
  invariant(monolithicRebarCageReceipt.productionAccessed === false
    && monolithicRebarCageReceipt.deployPerformed === false
    && monolithicRebarCageReceipt.activationPerformed === false
    && monolithicRebarCageReceipt.releasePerformed === false
    && monolithicRebarCageReceipt.otaPerformed === false,
  "MONOLITHIC_REBAR_CAGE_SIDE_EFFECT_BOUNDARY");
  const monolithicRebarCageReceiptEvidence = {
    path: MONOLITHIC_REBAR_CAGE_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(monolithicRebarCageReceiptBytes),
    receiptSha256: monolithicRebarCageReceipt.receiptSha256,
    predecessorReleaseId: rebarCagePredecessor.releaseId,
    successorReleaseId: rebarCageSuccessor.releaseId,
    successorSearchReleaseId: rebarCageSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: rebarCageAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(rebarCageSuccessor.releaseId);
  parentSearchReleaseId = String(rebarCageSuccessor.searchReleaseId);

  const ceramicBlockExternalWallReceipts = CERAMIC_BLOCK_EXTERNAL_WALL_RECEIPT_PATHS.map(
    (path, index) => {
      const bytes = readFileSync(path);
      const receipt = JSON.parse(bytes.toString("utf8")) as Json;
      const predecessor = receipt.predecessor as Json;
      const successor = receipt.successor as Json;
      const receiptAudit = receipt.audit as Json;
      invariant(predecessor.releaseId === parentReleaseId
        && predecessor.searchReleaseId === parentSearchReleaseId,
      `CERAMIC_BLOCK_EXTERNAL_WALL_PARENT:${index + 1}`);
      invariant(receipt.status === "GREEN_MASTER_CERAMIC_BLOCK_EXTERNAL_WALL_PREPARED_NOT_ACTIVE"
        && receipt.mutationPerformed === true,
      `CERAMIC_BLOCK_EXTERNAL_WALL_RECEIPT_STATUS:${index + 1}`);
      invariant((receiptAudit.unrelatedManifestChanges as number) === 0,
        `CERAMIC_BLOCK_EXTERNAL_WALL_UNRELATED_DRIFT:${index + 1}`);
      invariant((receiptAudit.release as Json).status === "prepared"
        && (receiptAudit.release as Json).activated_at === null,
      `CERAMIC_BLOCK_EXTERNAL_WALL_TERMINAL_LIFECYCLE:${index + 1}`);
      invariant(receipt.productionAccessed === false
        && receipt.deployPerformed === false
        && receipt.activationPerformed === false
        && receipt.releasePerformed === false
        && receipt.otaPerformed === false,
      `CERAMIC_BLOCK_EXTERNAL_WALL_SIDE_EFFECT_BOUNDARY:${index + 1}`);
      parentReleaseId = String(successor.releaseId);
      parentSearchReleaseId = String(successor.searchReleaseId);
      return {
        path: path.replaceAll("\\", "/"),
        sha256: sha256(bytes),
        receiptSha256: receipt.receiptSha256,
        predecessorReleaseId: predecessor.releaseId,
        successorReleaseId: successor.releaseId,
        successorSearchReleaseId: successor.searchReleaseId,
        targetCount: 1,
        unrelatedManifestChanges: receiptAudit.unrelatedManifestChanges,
      };
    },
  );
  const steelColumnsBeamsReceiptBytes = readFileSync(
    STEEL_COLUMNS_BEAMS_INSTALLATION_RECEIPT_PATH,
  );
  const steelColumnsBeamsReceipt = JSON.parse(
    steelColumnsBeamsReceiptBytes.toString("utf8"),
  ) as Json;
  const steelColumnsBeamsPredecessor = steelColumnsBeamsReceipt.predecessor as Json;
  const steelColumnsBeamsSuccessor = steelColumnsBeamsReceipt.successor as Json;
  const steelColumnsBeamsAudit = steelColumnsBeamsReceipt.audit as Json;
  invariant(steelColumnsBeamsPredecessor.releaseId === parentReleaseId
    && steelColumnsBeamsPredecessor.searchReleaseId === parentSearchReleaseId,
  "STEEL_COLUMNS_BEAMS_PARENT");
  invariant(steelColumnsBeamsReceipt.status
    === "GREEN_MASTER_STEEL_COLUMNS_BEAMS_INSTALLATION_PREPARED_NOT_ACTIVE"
    && steelColumnsBeamsReceipt.mutationPerformed === true,
  "STEEL_COLUMNS_BEAMS_RECEIPT_STATUS");
  invariant((steelColumnsBeamsAudit.unrelatedManifestChanges as number) === 0,
    "STEEL_COLUMNS_BEAMS_UNRELATED_DRIFT");
  invariant((steelColumnsBeamsAudit.release as Json).status === "prepared"
    && (steelColumnsBeamsAudit.release as Json).activated_at === null,
  "STEEL_COLUMNS_BEAMS_TERMINAL_LIFECYCLE");
  invariant(steelColumnsBeamsReceipt.productionAccessed === false
    && steelColumnsBeamsReceipt.deployPerformed === false
    && steelColumnsBeamsReceipt.activationPerformed === false
    && steelColumnsBeamsReceipt.releasePerformed === false
    && steelColumnsBeamsReceipt.otaPerformed === false,
  "STEEL_COLUMNS_BEAMS_SIDE_EFFECT_BOUNDARY");
  const steelColumnsBeamsReceiptEvidence = {
    path: STEEL_COLUMNS_BEAMS_INSTALLATION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(steelColumnsBeamsReceiptBytes),
    receiptSha256: steelColumnsBeamsReceipt.receiptSha256,
    predecessorReleaseId: steelColumnsBeamsPredecessor.releaseId,
    successorReleaseId: steelColumnsBeamsSuccessor.releaseId,
    successorSearchReleaseId: steelColumnsBeamsSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: steelColumnsBeamsAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(steelColumnsBeamsSuccessor.releaseId);
  parentSearchReleaseId = String(steelColumnsBeamsSuccessor.searchReleaseId);
  const pvcRoofMembraneReceiptBytes = readFileSync(PVC_ROOF_MEMBRANE_INSTALLATION_RECEIPT_PATH);
  const pvcRoofMembraneReceipt = JSON.parse(
    pvcRoofMembraneReceiptBytes.toString("utf8"),
  ) as Json;
  const pvcRoofMembranePredecessor = pvcRoofMembraneReceipt.predecessor as Json;
  const pvcRoofMembraneSuccessor = pvcRoofMembraneReceipt.successor as Json;
  const pvcRoofMembraneAudit = pvcRoofMembraneReceipt.audit as Json;
  invariant(pvcRoofMembranePredecessor.releaseId === parentReleaseId
    && pvcRoofMembranePredecessor.searchReleaseId === parentSearchReleaseId,
  "PVC_ROOF_MEMBRANE_PARENT");
  invariant(pvcRoofMembraneReceipt.status
    === "GREEN_MASTER_PVC_ROOF_MEMBRANE_INSTALLATION_PREPARED_NOT_ACTIVE"
    && pvcRoofMembraneReceipt.mutationPerformed === true,
  "PVC_ROOF_MEMBRANE_RECEIPT_STATUS");
  invariant((pvcRoofMembraneAudit.unrelatedManifestChanges as number) === 0,
    "PVC_ROOF_MEMBRANE_UNRELATED_DRIFT");
  invariant((pvcRoofMembraneAudit.release as Json).status === "prepared"
    && (pvcRoofMembraneAudit.release as Json).activated_at === null,
  "PVC_ROOF_MEMBRANE_TERMINAL_LIFECYCLE");
  invariant(pvcRoofMembraneReceipt.productionAccessed === false
    && pvcRoofMembraneReceipt.deployPerformed === false
    && pvcRoofMembraneReceipt.activationPerformed === false
    && pvcRoofMembraneReceipt.releasePerformed === false
    && pvcRoofMembraneReceipt.otaPerformed === false,
  "PVC_ROOF_MEMBRANE_SIDE_EFFECT_BOUNDARY");
  const pvcRoofMembraneReceiptEvidence = {
    path: PVC_ROOF_MEMBRANE_INSTALLATION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(pvcRoofMembraneReceiptBytes),
    receiptSha256: pvcRoofMembraneReceipt.receiptSha256,
    predecessorReleaseId: pvcRoofMembranePredecessor.releaseId,
    successorReleaseId: pvcRoofMembraneSuccessor.releaseId,
    successorSearchReleaseId: pvcRoofMembraneSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: pvcRoofMembraneAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(pvcRoofMembraneSuccessor.releaseId);
  parentSearchReleaseId = String(pvcRoofMembraneSuccessor.searchReleaseId);
  const facadeMineralWoolReceiptBytes = readFileSync(
    FACADE_MINERAL_WOOL_INSTALLATION_RECEIPT_PATH,
  );
  const facadeMineralWoolReceipt = JSON.parse(
    facadeMineralWoolReceiptBytes.toString("utf8"),
  ) as Json;
  const facadeMineralWoolPredecessor = facadeMineralWoolReceipt.predecessor as Json;
  const facadeMineralWoolSuccessor = facadeMineralWoolReceipt.successor as Json;
  const facadeMineralWoolAudit = facadeMineralWoolReceipt.audit as Json;
  invariant(facadeMineralWoolPredecessor.releaseId === parentReleaseId
    && facadeMineralWoolPredecessor.searchReleaseId === parentSearchReleaseId,
  "FACADE_MINERAL_WOOL_PARENT");
  invariant(facadeMineralWoolReceipt.status
    === "GREEN_MASTER_FACADE_MINERAL_WOOL_INSTALLATION_PREPARED_NOT_ACTIVE"
    && facadeMineralWoolReceipt.mutationPerformed === true,
  "FACADE_MINERAL_WOOL_RECEIPT_STATUS");
  invariant((facadeMineralWoolAudit.unrelatedManifestChanges as number) === 0,
    "FACADE_MINERAL_WOOL_UNRELATED_DRIFT");
  invariant((facadeMineralWoolAudit.release as Json).status === "prepared"
    && (facadeMineralWoolAudit.release as Json).activated_at === null,
  "FACADE_MINERAL_WOOL_TERMINAL_LIFECYCLE");
  invariant(facadeMineralWoolReceipt.productionAccessed === false
    && facadeMineralWoolReceipt.deployPerformed === false
    && facadeMineralWoolReceipt.activationPerformed === false
    && facadeMineralWoolReceipt.releasePerformed === false
    && facadeMineralWoolReceipt.otaPerformed === false,
  "FACADE_MINERAL_WOOL_SIDE_EFFECT_BOUNDARY");
  const facadeMineralWoolReceiptEvidence = {
    path: FACADE_MINERAL_WOOL_INSTALLATION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(facadeMineralWoolReceiptBytes),
    receiptSha256: facadeMineralWoolReceipt.receiptSha256,
    predecessorReleaseId: facadeMineralWoolPredecessor.releaseId,
    successorReleaseId: facadeMineralWoolSuccessor.releaseId,
    successorSearchReleaseId: facadeMineralWoolSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: facadeMineralWoolAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(facadeMineralWoolSuccessor.releaseId);
  parentSearchReleaseId = String(facadeMineralWoolSuccessor.searchReleaseId);
  const mechanizedGypsumWallPlasterReceiptBytes = readFileSync(
    MECHANIZED_GYPSUM_WALL_PLASTER_RECEIPT_PATH,
  );
  const mechanizedGypsumWallPlasterReceipt = JSON.parse(
    mechanizedGypsumWallPlasterReceiptBytes.toString("utf8"),
  ) as Json;
  const mechanizedGypsumWallPlasterPredecessor = mechanizedGypsumWallPlasterReceipt.predecessor as Json;
  const mechanizedGypsumWallPlasterSuccessor = mechanizedGypsumWallPlasterReceipt.successor as Json;
  const mechanizedGypsumWallPlasterAudit = mechanizedGypsumWallPlasterReceipt.audit as Json;
  invariant(mechanizedGypsumWallPlasterPredecessor.releaseId === parentReleaseId
    && mechanizedGypsumWallPlasterPredecessor.searchReleaseId === parentSearchReleaseId,
  "MECHANIZED_GYPSUM_WALL_PLASTER_PARENT");
  invariant(mechanizedGypsumWallPlasterReceipt.status
    === "GREEN_MASTER_MECHANIZED_GYPSUM_WALL_PLASTER_PREPARED_NOT_ACTIVE"
    && mechanizedGypsumWallPlasterReceipt.mutationPerformed === true,
  "MECHANIZED_GYPSUM_WALL_PLASTER_RECEIPT_STATUS");
  invariant((mechanizedGypsumWallPlasterAudit.unrelatedManifestChanges as number) === 0,
    "MECHANIZED_GYPSUM_WALL_PLASTER_UNRELATED_DRIFT");
  invariant((mechanizedGypsumWallPlasterAudit.release as Json).status === "prepared"
    && (mechanizedGypsumWallPlasterAudit.release as Json).activated_at === null,
  "MECHANIZED_GYPSUM_WALL_PLASTER_TERMINAL_LIFECYCLE");
  invariant(mechanizedGypsumWallPlasterReceipt.productionAccessed === false
    && mechanizedGypsumWallPlasterReceipt.deployPerformed === false
    && mechanizedGypsumWallPlasterReceipt.activationPerformed === false
    && mechanizedGypsumWallPlasterReceipt.releasePerformed === false
    && mechanizedGypsumWallPlasterReceipt.otaPerformed === false,
  "MECHANIZED_GYPSUM_WALL_PLASTER_SIDE_EFFECT_BOUNDARY");
  const mechanizedGypsumWallPlasterReceiptEvidence = {
    path: MECHANIZED_GYPSUM_WALL_PLASTER_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(mechanizedGypsumWallPlasterReceiptBytes),
    receiptSha256: mechanizedGypsumWallPlasterReceipt.receiptSha256,
    predecessorReleaseId: mechanizedGypsumWallPlasterPredecessor.releaseId,
    successorReleaseId: mechanizedGypsumWallPlasterSuccessor.releaseId,
    successorSearchReleaseId: mechanizedGypsumWallPlasterSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: mechanizedGypsumWallPlasterAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(mechanizedGypsumWallPlasterSuccessor.releaseId);
  parentSearchReleaseId = String(mechanizedGypsumWallPlasterSuccessor.searchReleaseId);
  const porcelainFloorTileInstallationReceiptBytes = readFileSync(
    PORCELAIN_FLOOR_TILE_INSTALLATION_RECEIPT_PATH,
  );
  const porcelainFloorTileInstallationReceipt = JSON.parse(
    porcelainFloorTileInstallationReceiptBytes.toString("utf8"),
  ) as Json;
  const porcelainFloorTileInstallationPredecessor = porcelainFloorTileInstallationReceipt.predecessor as Json;
  const porcelainFloorTileInstallationSuccessor = porcelainFloorTileInstallationReceipt.successor as Json;
  const porcelainFloorTileInstallationAudit = porcelainFloorTileInstallationReceipt.audit as Json;
  invariant(porcelainFloorTileInstallationPredecessor.releaseId === parentReleaseId
    && porcelainFloorTileInstallationPredecessor.searchReleaseId === parentSearchReleaseId,
  "PORCELAIN_FLOOR_TILE_INSTALLATION_PARENT");
  invariant(porcelainFloorTileInstallationReceipt.status
    === "GREEN_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PREPARED_NOT_ACTIVE"
    && porcelainFloorTileInstallationReceipt.mutationPerformed === true,
  "PORCELAIN_FLOOR_TILE_INSTALLATION_RECEIPT_STATUS");
  invariant((porcelainFloorTileInstallationAudit.unrelatedManifestChanges as number) === 0,
    "PORCELAIN_FLOOR_TILE_INSTALLATION_UNRELATED_DRIFT");
  invariant((porcelainFloorTileInstallationAudit.release as Json).status === "prepared"
    && (porcelainFloorTileInstallationAudit.release as Json).activated_at === null,
  "PORCELAIN_FLOOR_TILE_INSTALLATION_TERMINAL_LIFECYCLE");
  invariant(porcelainFloorTileInstallationReceipt.productionAccessed === false
    && porcelainFloorTileInstallationReceipt.deployPerformed === false
    && porcelainFloorTileInstallationReceipt.activationPerformed === false
    && porcelainFloorTileInstallationReceipt.releasePerformed === false
    && porcelainFloorTileInstallationReceipt.otaPerformed === false,
  "PORCELAIN_FLOOR_TILE_INSTALLATION_SIDE_EFFECT_BOUNDARY");
  const porcelainFloorTileInstallationReceiptEvidence = {
    path: PORCELAIN_FLOOR_TILE_INSTALLATION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(porcelainFloorTileInstallationReceiptBytes),
    receiptSha256: porcelainFloorTileInstallationReceipt.receiptSha256,
    predecessorReleaseId: porcelainFloorTileInstallationPredecessor.releaseId,
    successorReleaseId: porcelainFloorTileInstallationSuccessor.releaseId,
    successorSearchReleaseId: porcelainFloorTileInstallationSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: porcelainFloorTileInstallationAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(porcelainFloorTileInstallationSuccessor.releaseId);
  parentSearchReleaseId = String(porcelainFloorTileInstallationSuccessor.searchReleaseId);
  const cementSandScreedDemolitionReceiptBytes = readFileSync(
    CEMENT_SAND_SCREED_DEMOLITION_RECEIPT_PATH,
  );
  const cementSandScreedDemolitionReceipt = JSON.parse(
    cementSandScreedDemolitionReceiptBytes.toString("utf8"),
  ) as Json;
  const cementSandScreedDemolitionPredecessor = cementSandScreedDemolitionReceipt.predecessor as Json;
  const cementSandScreedDemolitionSuccessor = cementSandScreedDemolitionReceipt.successor as Json;
  const cementSandScreedDemolitionAudit = cementSandScreedDemolitionReceipt.audit as Json;
  invariant(cementSandScreedDemolitionPredecessor.releaseId === parentReleaseId
    && cementSandScreedDemolitionPredecessor.searchReleaseId === parentSearchReleaseId,
  "CEMENT_SAND_SCREED_DEMOLITION_PARENT");
  invariant(cementSandScreedDemolitionReceipt.status
    === "GREEN_MASTER_CEMENT_SAND_SCREED_DEMOLITION_PREPARED_NOT_ACTIVE"
    && cementSandScreedDemolitionReceipt.mutationPerformed === true,
  "CEMENT_SAND_SCREED_DEMOLITION_RECEIPT_STATUS");
  invariant((cementSandScreedDemolitionAudit.unrelatedManifestChanges as number) === 0,
    "CEMENT_SAND_SCREED_DEMOLITION_UNRELATED_DRIFT");
  invariant((cementSandScreedDemolitionAudit.release as Json).status === "prepared"
    && (cementSandScreedDemolitionAudit.release as Json).activated_at === null,
  "CEMENT_SAND_SCREED_DEMOLITION_TERMINAL_LIFECYCLE");
  invariant(cementSandScreedDemolitionReceipt.productionAccessed === false
    && cementSandScreedDemolitionReceipt.deployPerformed === false
    && cementSandScreedDemolitionReceipt.activationPerformed === false
    && cementSandScreedDemolitionReceipt.releasePerformed === false
    && cementSandScreedDemolitionReceipt.otaPerformed === false,
  "CEMENT_SAND_SCREED_DEMOLITION_SIDE_EFFECT_BOUNDARY");
  const cementSandScreedDemolitionReceiptEvidence = {
    path: CEMENT_SAND_SCREED_DEMOLITION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(cementSandScreedDemolitionReceiptBytes),
    receiptSha256: cementSandScreedDemolitionReceipt.receiptSha256,
    predecessorReleaseId: cementSandScreedDemolitionPredecessor.releaseId,
    successorReleaseId: cementSandScreedDemolitionSuccessor.releaseId,
    successorSearchReleaseId: cementSandScreedDemolitionSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: cementSandScreedDemolitionAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(cementSandScreedDemolitionSuccessor.releaseId);
  parentSearchReleaseId = String(cementSandScreedDemolitionSuccessor.searchReleaseId);
  const asphaltUpperCourseReceiptBytes = readFileSync(ASPHALT_UPPER_COURSE_RECEIPT_PATH);
  const asphaltUpperCourseReceipt = JSON.parse(
    asphaltUpperCourseReceiptBytes.toString("utf8"),
  ) as Json;
  const asphaltUpperCoursePredecessor = asphaltUpperCourseReceipt.predecessor as Json;
  const asphaltUpperCourseSuccessor = asphaltUpperCourseReceipt.successor as Json;
  const asphaltUpperCourseAudit = asphaltUpperCourseReceipt.audit as Json;
  invariant(asphaltUpperCoursePredecessor.releaseId === parentReleaseId
    && asphaltUpperCoursePredecessor.searchReleaseId === parentSearchReleaseId,
  "ASPHALT_UPPER_COURSE_PARENT");
  invariant(asphaltUpperCourseReceipt.status
    === "GREEN_MASTER_ASPHALT_UPPER_COURSE_PREPARED_NOT_ACTIVE"
    && asphaltUpperCourseReceipt.mutationPerformed === true,
  "ASPHALT_UPPER_COURSE_RECEIPT_STATUS");
  invariant((asphaltUpperCourseAudit.unrelatedManifestChanges as number) === 0,
    "ASPHALT_UPPER_COURSE_UNRELATED_DRIFT");
  invariant((asphaltUpperCourseAudit.release as Json).status === "prepared"
    && (asphaltUpperCourseAudit.release as Json).activated_at === null,
  "ASPHALT_UPPER_COURSE_TERMINAL_LIFECYCLE");
  invariant(asphaltUpperCourseReceipt.productionAccessed === false
    && asphaltUpperCourseReceipt.deployPerformed === false
    && asphaltUpperCourseReceipt.activationPerformed === false
    && asphaltUpperCourseReceipt.releasePerformed === false
    && asphaltUpperCourseReceipt.otaPerformed === false,
  "ASPHALT_UPPER_COURSE_SIDE_EFFECT_BOUNDARY");
  const asphaltUpperCourseReceiptEvidence = {
    path: ASPHALT_UPPER_COURSE_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(asphaltUpperCourseReceiptBytes),
    receiptSha256: asphaltUpperCourseReceipt.receiptSha256,
    predecessorReleaseId: asphaltUpperCoursePredecessor.releaseId,
    successorReleaseId: asphaltUpperCourseSuccessor.releaseId,
    successorSearchReleaseId: asphaltUpperCourseSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: asphaltUpperCourseAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(asphaltUpperCourseSuccessor.releaseId);
  parentSearchReleaseId = String(asphaltUpperCourseSuccessor.searchReleaseId);
  const surfaceDrainageChannelReceiptBytes = readFileSync(SURFACE_DRAINAGE_CHANNEL_RECEIPT_PATH);
  const surfaceDrainageChannelReceipt = JSON.parse(
    surfaceDrainageChannelReceiptBytes.toString("utf8"),
  ) as Json;
  const surfaceDrainageChannelPredecessor = surfaceDrainageChannelReceipt.predecessor as Json;
  const surfaceDrainageChannelSuccessor = surfaceDrainageChannelReceipt.successor as Json;
  const surfaceDrainageChannelAudit = surfaceDrainageChannelReceipt.audit as Json;
  invariant(surfaceDrainageChannelPredecessor.releaseId === parentReleaseId
    && surfaceDrainageChannelPredecessor.searchReleaseId === parentSearchReleaseId,
  "SURFACE_DRAINAGE_CHANNEL_PARENT");
  invariant(surfaceDrainageChannelReceipt.status
    === "GREEN_MASTER_SURFACE_DRAINAGE_CHANNEL_PREPARED_NOT_ACTIVE"
    && surfaceDrainageChannelReceipt.mutationPerformed === true,
  "SURFACE_DRAINAGE_CHANNEL_RECEIPT_STATUS");
  invariant((surfaceDrainageChannelAudit.unrelatedManifestChanges as number) === 0,
    "SURFACE_DRAINAGE_CHANNEL_UNRELATED_DRIFT");
  invariant((surfaceDrainageChannelAudit.release as Json).status === "prepared"
    && (surfaceDrainageChannelAudit.release as Json).activated_at === null,
  "SURFACE_DRAINAGE_CHANNEL_TERMINAL_LIFECYCLE");
  invariant(surfaceDrainageChannelReceipt.productionAccessed === false
    && surfaceDrainageChannelReceipt.deployPerformed === false
    && surfaceDrainageChannelReceipt.activationPerformed === false
    && surfaceDrainageChannelReceipt.releasePerformed === false
    && surfaceDrainageChannelReceipt.otaPerformed === false,
  "SURFACE_DRAINAGE_CHANNEL_SIDE_EFFECT_BOUNDARY");
  const surfaceDrainageChannelReceiptEvidence = {
    path: SURFACE_DRAINAGE_CHANNEL_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(surfaceDrainageChannelReceiptBytes),
    receiptSha256: surfaceDrainageChannelReceipt.receiptSha256,
    predecessorReleaseId: surfaceDrainageChannelPredecessor.releaseId,
    successorReleaseId: surfaceDrainageChannelSuccessor.releaseId,
    successorSearchReleaseId: surfaceDrainageChannelSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: surfaceDrainageChannelAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(surfaceDrainageChannelSuccessor.releaseId);
  parentSearchReleaseId = String(surfaceDrainageChannelSuccessor.searchReleaseId);
  const pe110ElectrofusionJointReceiptBytes = readFileSync(
    PE110_ELECTROFUSION_JOINT_RECEIPT_PATH,
  );
  const pe110ElectrofusionJointReceipt = JSON.parse(
    pe110ElectrofusionJointReceiptBytes.toString("utf8"),
  ) as Json;
  const pe110ElectrofusionJointPredecessor = pe110ElectrofusionJointReceipt.predecessor as Json;
  const pe110ElectrofusionJointSuccessor = pe110ElectrofusionJointReceipt.successor as Json;
  const pe110ElectrofusionJointAudit = pe110ElectrofusionJointReceipt.audit as Json;
  invariant(pe110ElectrofusionJointPredecessor.releaseId === parentReleaseId
    && pe110ElectrofusionJointPredecessor.searchReleaseId === parentSearchReleaseId,
  "PE110_ELECTROFUSION_JOINT_PARENT");
  invariant(pe110ElectrofusionJointReceipt.status
    === "GREEN_MASTER_PE110_ELECTROFUSION_JOINT_PREPARED_NOT_ACTIVE"
    && pe110ElectrofusionJointReceipt.mutationPerformed === true,
  "PE110_ELECTROFUSION_JOINT_RECEIPT_STATUS");
  invariant((pe110ElectrofusionJointAudit.unrelatedManifestChanges as number) === 0,
    "PE110_ELECTROFUSION_JOINT_UNRELATED_DRIFT");
  invariant((pe110ElectrofusionJointAudit.release as Json).status === "prepared"
    && (pe110ElectrofusionJointAudit.release as Json).activated_at === null,
  "PE110_ELECTROFUSION_JOINT_TERMINAL_LIFECYCLE");
  invariant(pe110ElectrofusionJointReceipt.productionAccessed === false
    && pe110ElectrofusionJointReceipt.deployPerformed === false
    && pe110ElectrofusionJointReceipt.activationPerformed === false
    && pe110ElectrofusionJointReceipt.releasePerformed === false
    && pe110ElectrofusionJointReceipt.otaPerformed === false,
  "PE110_ELECTROFUSION_JOINT_SIDE_EFFECT_BOUNDARY");
  const pe110ElectrofusionJointReceiptEvidence = {
    path: PE110_ELECTROFUSION_JOINT_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(pe110ElectrofusionJointReceiptBytes),
    receiptSha256: pe110ElectrofusionJointReceipt.receiptSha256,
    predecessorReleaseId: pe110ElectrofusionJointPredecessor.releaseId,
    successorReleaseId: pe110ElectrofusionJointSuccessor.releaseId,
    successorSearchReleaseId: pe110ElectrofusionJointSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: pe110ElectrofusionJointAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(pe110ElectrofusionJointSuccessor.releaseId);
  parentSearchReleaseId = String(pe110ElectrofusionJointSuccessor.searchReleaseId);
  const gravitySewerPvcSn8ReceiptBytes = readFileSync(GRAVITY_SEWER_PVC_SN8_RECEIPT_PATH);
  const gravitySewerPvcSn8Receipt = JSON.parse(
    gravitySewerPvcSn8ReceiptBytes.toString("utf8"),
  ) as Json;
  const gravitySewerPvcSn8Predecessor = gravitySewerPvcSn8Receipt.predecessor as Json;
  const gravitySewerPvcSn8Successor = gravitySewerPvcSn8Receipt.successor as Json;
  const gravitySewerPvcSn8Audit = gravitySewerPvcSn8Receipt.audit as Json;
  invariant(gravitySewerPvcSn8Predecessor.releaseId === parentReleaseId
    && gravitySewerPvcSn8Predecessor.searchReleaseId === parentSearchReleaseId,
  "GRAVITY_SEWER_PVC_SN8_PARENT");
  invariant(gravitySewerPvcSn8Receipt.status
    === "GREEN_MASTER_GRAVITY_SEWER_PVC_SN8_PREPARED_NOT_ACTIVE"
    && gravitySewerPvcSn8Receipt.mutationPerformed === true,
  "GRAVITY_SEWER_PVC_SN8_RECEIPT_STATUS");
  invariant((gravitySewerPvcSn8Audit.unrelatedManifestChanges as number) === 0,
    "GRAVITY_SEWER_PVC_SN8_UNRELATED_DRIFT");
  invariant((gravitySewerPvcSn8Audit.release as Json).status === "prepared"
    && (gravitySewerPvcSn8Audit.release as Json).activated_at === null,
  "GRAVITY_SEWER_PVC_SN8_TERMINAL_LIFECYCLE");
  invariant(gravitySewerPvcSn8Receipt.productionAccessed === false
    && gravitySewerPvcSn8Receipt.deployPerformed === false
    && gravitySewerPvcSn8Receipt.activationPerformed === false
    && gravitySewerPvcSn8Receipt.releasePerformed === false
    && gravitySewerPvcSn8Receipt.otaPerformed === false,
  "GRAVITY_SEWER_PVC_SN8_SIDE_EFFECT_BOUNDARY");
  const gravitySewerPvcSn8ReceiptEvidence = {
    path: GRAVITY_SEWER_PVC_SN8_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(gravitySewerPvcSn8ReceiptBytes),
    receiptSha256: gravitySewerPvcSn8Receipt.receiptSha256,
    predecessorReleaseId: gravitySewerPvcSn8Predecessor.releaseId,
    successorReleaseId: gravitySewerPvcSn8Successor.releaseId,
    successorSearchReleaseId: gravitySewerPvcSn8Successor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: gravitySewerPvcSn8Audit.unrelatedManifestChanges,
  };
  parentReleaseId = String(gravitySewerPvcSn8Successor.releaseId);
  parentSearchReleaseId = String(gravitySewerPvcSn8Successor.searchReleaseId);
  const perforatedDrainPipeFilterReceiptBytes = readFileSync(
    PERFORATED_DRAIN_PIPE_FILTER_RECEIPT_PATH,
  );
  const perforatedDrainPipeFilterReceipt = JSON.parse(
    perforatedDrainPipeFilterReceiptBytes.toString("utf8"),
  ) as Json;
  const perforatedDrainPipeFilterPredecessor =
    perforatedDrainPipeFilterReceipt.predecessor as Json;
  const perforatedDrainPipeFilterSuccessor = perforatedDrainPipeFilterReceipt.successor as Json;
  const perforatedDrainPipeFilterAudit = perforatedDrainPipeFilterReceipt.audit as Json;
  invariant(perforatedDrainPipeFilterPredecessor.releaseId === parentReleaseId
    && perforatedDrainPipeFilterPredecessor.searchReleaseId === parentSearchReleaseId,
  "PERFORATED_DRAIN_PIPE_FILTER_PARENT");
  invariant(perforatedDrainPipeFilterReceipt.status
    === "GREEN_MASTER_PERFORATED_DRAIN_PIPE_FILTER_PREPARED_NOT_ACTIVE"
    && perforatedDrainPipeFilterReceipt.mutationPerformed === true,
  "PERFORATED_DRAIN_PIPE_FILTER_RECEIPT_STATUS");
  invariant((perforatedDrainPipeFilterAudit.unrelatedManifestChanges as number) === 0,
    "PERFORATED_DRAIN_PIPE_FILTER_UNRELATED_DRIFT");
  invariant((perforatedDrainPipeFilterAudit.release as Json).status === "prepared"
    && (perforatedDrainPipeFilterAudit.release as Json).activated_at === null,
  "PERFORATED_DRAIN_PIPE_FILTER_TERMINAL_LIFECYCLE");
  invariant(perforatedDrainPipeFilterReceipt.productionAccessed === false
    && perforatedDrainPipeFilterReceipt.deployPerformed === false
    && perforatedDrainPipeFilterReceipt.activationPerformed === false
    && perforatedDrainPipeFilterReceipt.releasePerformed === false
    && perforatedDrainPipeFilterReceipt.otaPerformed === false,
  "PERFORATED_DRAIN_PIPE_FILTER_SIDE_EFFECT_BOUNDARY");
  const perforatedDrainPipeFilterReceiptEvidence = {
    path: PERFORATED_DRAIN_PIPE_FILTER_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(perforatedDrainPipeFilterReceiptBytes),
    receiptSha256: perforatedDrainPipeFilterReceipt.receiptSha256,
    predecessorReleaseId: perforatedDrainPipeFilterPredecessor.releaseId,
    successorReleaseId: perforatedDrainPipeFilterSuccessor.releaseId,
    successorSearchReleaseId: perforatedDrainPipeFilterSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: perforatedDrainPipeFilterAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(perforatedDrainPipeFilterSuccessor.releaseId);
  parentSearchReleaseId = String(perforatedDrainPipeFilterSuccessor.searchReleaseId);
  const steelPanelRadiatorReceiptBytes = readFileSync(STEEL_PANEL_RADIATOR_RECEIPT_PATH);
  const steelPanelRadiatorReceipt = JSON.parse(
    steelPanelRadiatorReceiptBytes.toString("utf8"),
  ) as Json;
  const steelPanelRadiatorPredecessor = steelPanelRadiatorReceipt.predecessor as Json;
  const steelPanelRadiatorSuccessor = steelPanelRadiatorReceipt.successor as Json;
  const steelPanelRadiatorAudit = steelPanelRadiatorReceipt.audit as Json;
  invariant(steelPanelRadiatorPredecessor.releaseId === parentReleaseId
    && steelPanelRadiatorPredecessor.searchReleaseId === parentSearchReleaseId,
  "STEEL_PANEL_RADIATOR_PARENT");
  invariant(steelPanelRadiatorReceipt.status
    === "GREEN_MASTER_STEEL_PANEL_RADIATOR_PREPARED_NOT_ACTIVE"
    && steelPanelRadiatorReceipt.mutationPerformed === true,
  "STEEL_PANEL_RADIATOR_RECEIPT_STATUS");
  invariant((steelPanelRadiatorAudit.unrelatedManifestChanges as number) === 0,
    "STEEL_PANEL_RADIATOR_UNRELATED_DRIFT");
  invariant((steelPanelRadiatorAudit.release as Json).status === "prepared"
    && (steelPanelRadiatorAudit.release as Json).activated_at === null,
  "STEEL_PANEL_RADIATOR_TERMINAL_LIFECYCLE");
  invariant(steelPanelRadiatorReceipt.productionAccessed === false
    && steelPanelRadiatorReceipt.deployPerformed === false
    && steelPanelRadiatorReceipt.activationPerformed === false
    && steelPanelRadiatorReceipt.releasePerformed === false
    && steelPanelRadiatorReceipt.otaPerformed === false,
  "STEEL_PANEL_RADIATOR_SIDE_EFFECT_BOUNDARY");
  const steelPanelRadiatorReceiptEvidence = {
    path: STEEL_PANEL_RADIATOR_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(steelPanelRadiatorReceiptBytes),
    receiptSha256: steelPanelRadiatorReceipt.receiptSha256,
    predecessorReleaseId: steelPanelRadiatorPredecessor.releaseId,
    successorReleaseId: steelPanelRadiatorSuccessor.releaseId,
    successorSearchReleaseId: steelPanelRadiatorSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: steelPanelRadiatorAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(steelPanelRadiatorSuccessor.releaseId);
  parentSearchReleaseId = String(steelPanelRadiatorSuccessor.searchReleaseId);
  const galvanizedSteelDuctReceiptBytes = readFileSync(GALVANIZED_STEEL_DUCT_RECEIPT_PATH);
  const galvanizedSteelDuctReceipt = JSON.parse(
    galvanizedSteelDuctReceiptBytes.toString("utf8"),
  ) as Json;
  const galvanizedSteelDuctPredecessor = galvanizedSteelDuctReceipt.predecessor as Json;
  const galvanizedSteelDuctSuccessor = galvanizedSteelDuctReceipt.successor as Json;
  const galvanizedSteelDuctAudit = galvanizedSteelDuctReceipt.audit as Json;
  invariant(galvanizedSteelDuctPredecessor.releaseId === parentReleaseId
    && galvanizedSteelDuctPredecessor.searchReleaseId === parentSearchReleaseId,
  "GALVANIZED_STEEL_DUCT_PARENT");
  invariant(galvanizedSteelDuctReceipt.status
    === "GREEN_MASTER_GALVANIZED_STEEL_DUCT_PREPARED_NOT_ACTIVE"
    && galvanizedSteelDuctReceipt.mutationPerformed === true,
  "GALVANIZED_STEEL_DUCT_RECEIPT_STATUS");
  invariant((galvanizedSteelDuctAudit.unrelatedManifestChanges as number) === 0,
    "GALVANIZED_STEEL_DUCT_UNRELATED_DRIFT");
  invariant((galvanizedSteelDuctAudit.release as Json).status === "prepared"
    && (galvanizedSteelDuctAudit.release as Json).activated_at === null,
  "GALVANIZED_STEEL_DUCT_TERMINAL_LIFECYCLE");
  invariant(galvanizedSteelDuctReceipt.productionAccessed === false
    && galvanizedSteelDuctReceipt.deployPerformed === false
    && galvanizedSteelDuctReceipt.activationPerformed === false
    && galvanizedSteelDuctReceipt.releasePerformed === false
    && galvanizedSteelDuctReceipt.otaPerformed === false,
  "GALVANIZED_STEEL_DUCT_SIDE_EFFECT_BOUNDARY");
  const galvanizedSteelDuctReceiptEvidence = {
    path: GALVANIZED_STEEL_DUCT_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(galvanizedSteelDuctReceiptBytes),
    receiptSha256: galvanizedSteelDuctReceipt.receiptSha256,
    predecessorReleaseId: galvanizedSteelDuctPredecessor.releaseId,
    successorReleaseId: galvanizedSteelDuctSuccessor.releaseId,
    successorSearchReleaseId: galvanizedSteelDuctSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: galvanizedSteelDuctAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(galvanizedSteelDuctSuccessor.releaseId);
  parentSearchReleaseId = String(galvanizedSteelDuctSuccessor.searchReleaseId);
  const splitSystemBlocksReceiptBytes = readFileSync(SPLIT_SYSTEM_BLOCKS_RECEIPT_PATH);
  const splitSystemBlocksReceipt = JSON.parse(
    splitSystemBlocksReceiptBytes.toString("utf8"),
  ) as Json;
  const splitSystemBlocksPredecessor = splitSystemBlocksReceipt.predecessor as Json;
  const splitSystemBlocksSuccessor = splitSystemBlocksReceipt.successor as Json;
  const splitSystemBlocksAudit = splitSystemBlocksReceipt.audit as Json;
  invariant(splitSystemBlocksPredecessor.releaseId === parentReleaseId
    && splitSystemBlocksPredecessor.searchReleaseId === parentSearchReleaseId,
  "SPLIT_SYSTEM_BLOCKS_PARENT");
  invariant(splitSystemBlocksReceipt.status
    === "GREEN_MASTER_SPLIT_SYSTEM_BLOCKS_PREPARED_NOT_ACTIVE"
    && splitSystemBlocksReceipt.mutationPerformed === true,
  "SPLIT_SYSTEM_BLOCKS_RECEIPT_STATUS");
  invariant((splitSystemBlocksAudit.unrelatedManifestChanges as number) === 0,
    "SPLIT_SYSTEM_BLOCKS_UNRELATED_DRIFT");
  invariant((splitSystemBlocksAudit.release as Json).status === "prepared"
    && (splitSystemBlocksAudit.release as Json).activated_at === null,
  "SPLIT_SYSTEM_BLOCKS_TERMINAL_LIFECYCLE");
  invariant(splitSystemBlocksReceipt.productionAccessed === false
    && splitSystemBlocksReceipt.deployPerformed === false
    && splitSystemBlocksReceipt.activationPerformed === false
    && splitSystemBlocksReceipt.releasePerformed === false
    && splitSystemBlocksReceipt.otaPerformed === false,
  "SPLIT_SYSTEM_BLOCKS_SIDE_EFFECT_BOUNDARY");
  const splitSystemBlocksReceiptEvidence = {
    path: SPLIT_SYSTEM_BLOCKS_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(splitSystemBlocksReceiptBytes),
    receiptSha256: splitSystemBlocksReceipt.receiptSha256,
    predecessorReleaseId: splitSystemBlocksPredecessor.releaseId,
    successorReleaseId: splitSystemBlocksSuccessor.releaseId,
    successorSearchReleaseId: splitSystemBlocksSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: splitSystemBlocksAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(splitSystemBlocksSuccessor.releaseId);
  parentSearchReleaseId = String(splitSystemBlocksSuccessor.searchReleaseId);
  const sprinklerHeadConnectionReceiptBytes = readFileSync(
    SPRINKLER_HEAD_CONNECTION_RECEIPT_PATH,
  );
  const sprinklerHeadConnectionReceipt = JSON.parse(
    sprinklerHeadConnectionReceiptBytes.toString("utf8"),
  ) as Json;
  const sprinklerHeadConnectionPredecessor = sprinklerHeadConnectionReceipt.predecessor as Json;
  const sprinklerHeadConnectionSuccessor = sprinklerHeadConnectionReceipt.successor as Json;
  const sprinklerHeadConnectionAudit = sprinklerHeadConnectionReceipt.audit as Json;
  invariant(sprinklerHeadConnectionPredecessor.releaseId === parentReleaseId
    && sprinklerHeadConnectionPredecessor.searchReleaseId === parentSearchReleaseId,
  "SPRINKLER_HEAD_CONNECTION_PARENT");
  invariant(sprinklerHeadConnectionReceipt.status
    === "GREEN_MASTER_SPRINKLER_HEAD_CONNECTION_PREPARED_NOT_ACTIVE"
    && sprinklerHeadConnectionReceipt.mutationPerformed === true,
  "SPRINKLER_HEAD_CONNECTION_RECEIPT_STATUS");
  invariant((sprinklerHeadConnectionAudit.unrelatedManifestChanges as number) === 0,
    "SPRINKLER_HEAD_CONNECTION_UNRELATED_DRIFT");
  invariant((sprinklerHeadConnectionAudit.release as Json).status === "prepared"
    && (sprinklerHeadConnectionAudit.release as Json).activated_at === null,
  "SPRINKLER_HEAD_CONNECTION_TERMINAL_LIFECYCLE");
  invariant(sprinklerHeadConnectionReceipt.productionAccessed === false
    && sprinklerHeadConnectionReceipt.deployPerformed === false
    && sprinklerHeadConnectionReceipt.activationPerformed === false
    && sprinklerHeadConnectionReceipt.releasePerformed === false
    && sprinklerHeadConnectionReceipt.otaPerformed === false,
  "SPRINKLER_HEAD_CONNECTION_SIDE_EFFECT_BOUNDARY");
  const sprinklerHeadConnectionReceiptEvidence = {
    path: SPRINKLER_HEAD_CONNECTION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(sprinklerHeadConnectionReceiptBytes),
    receiptSha256: sprinklerHeadConnectionReceipt.receiptSha256,
    predecessorReleaseId: sprinklerHeadConnectionPredecessor.releaseId,
    successorReleaseId: sprinklerHeadConnectionSuccessor.releaseId,
    successorSearchReleaseId: sprinklerHeadConnectionSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: sprinklerHeadConnectionAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(sprinklerHeadConnectionSuccessor.releaseId);
  parentSearchReleaseId = String(sprinklerHeadConnectionSuccessor.searchReleaseId);
  const vvgngLsPowerCableReceiptBytes = readFileSync(VVGNG_LS_POWER_CABLE_RECEIPT_PATH);
  const vvgngLsPowerCableReceipt = JSON.parse(
    vvgngLsPowerCableReceiptBytes.toString("utf8"),
  ) as Json;
  const vvgngLsPowerCablePredecessor = vvgngLsPowerCableReceipt.predecessor as Json;
  const vvgngLsPowerCableSuccessor = vvgngLsPowerCableReceipt.successor as Json;
  const vvgngLsPowerCableAudit = vvgngLsPowerCableReceipt.audit as Json;
  invariant(vvgngLsPowerCablePredecessor.releaseId === parentReleaseId
    && vvgngLsPowerCablePredecessor.searchReleaseId === parentSearchReleaseId,
  "VVGNG_LS_POWER_CABLE_PARENT");
  invariant(vvgngLsPowerCableReceipt.status
    === "GREEN_MASTER_VVGNG_LS_POWER_CABLE_PREPARED_NOT_ACTIVE"
    && vvgngLsPowerCableReceipt.mutationPerformed === true,
  "VVGNG_LS_POWER_CABLE_RECEIPT_STATUS");
  invariant((vvgngLsPowerCableAudit.unrelatedManifestChanges as number) === 0,
    "VVGNG_LS_POWER_CABLE_UNRELATED_DRIFT");
  invariant((vvgngLsPowerCableAudit.release as Json).status === "prepared"
    && (vvgngLsPowerCableAudit.release as Json).activated_at === null,
  "VVGNG_LS_POWER_CABLE_TERMINAL_LIFECYCLE");
  invariant(vvgngLsPowerCableReceipt.productionAccessed === false
    && vvgngLsPowerCableReceipt.deployPerformed === false
    && vvgngLsPowerCableReceipt.activationPerformed === false
    && vvgngLsPowerCableReceipt.releasePerformed === false
    && vvgngLsPowerCableReceipt.otaPerformed === false,
  "VVGNG_LS_POWER_CABLE_SIDE_EFFECT_BOUNDARY");
  const vvgngLsPowerCableReceiptEvidence = {
    path: VVGNG_LS_POWER_CABLE_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(vvgngLsPowerCableReceiptBytes),
    receiptSha256: vvgngLsPowerCableReceipt.receiptSha256,
    predecessorReleaseId: vvgngLsPowerCablePredecessor.releaseId,
    successorReleaseId: vvgngLsPowerCableSuccessor.releaseId,
    successorSearchReleaseId: vvgngLsPowerCableSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: vvgngLsPowerCableAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(vvgngLsPowerCableSuccessor.releaseId);
  parentSearchReleaseId = String(vvgngLsPowerCableSuccessor.searchReleaseId);
  const ledLuminaireInstallationReceiptBytes = readFileSync(
    LED_LUMINAIRE_INSTALLATION_RECEIPT_PATH,
  );
  const ledLuminaireInstallationReceipt = JSON.parse(
    ledLuminaireInstallationReceiptBytes.toString("utf8"),
  ) as Json;
  const ledLuminaireInstallationPredecessor = ledLuminaireInstallationReceipt.predecessor as Json;
  const ledLuminaireInstallationSuccessor = ledLuminaireInstallationReceipt.successor as Json;
  const ledLuminaireInstallationAudit = ledLuminaireInstallationReceipt.audit as Json;
  invariant(ledLuminaireInstallationPredecessor.releaseId === parentReleaseId
    && ledLuminaireInstallationPredecessor.searchReleaseId === parentSearchReleaseId,
  "LED_LUMINAIRE_INSTALLATION_PARENT");
  invariant(ledLuminaireInstallationReceipt.status
    === "GREEN_MASTER_LED_LUMINAIRE_INSTALLATION_PREPARED_NOT_ACTIVE"
    && ledLuminaireInstallationReceipt.mutationPerformed === true,
  "LED_LUMINAIRE_INSTALLATION_RECEIPT_STATUS");
  invariant((ledLuminaireInstallationAudit.unrelatedManifestChanges as number) === 0,
    "LED_LUMINAIRE_INSTALLATION_UNRELATED_DRIFT");
  invariant((ledLuminaireInstallationAudit.release as Json).status === "prepared"
    && (ledLuminaireInstallationAudit.release as Json).activated_at === null,
  "LED_LUMINAIRE_INSTALLATION_TERMINAL_LIFECYCLE");
  invariant(ledLuminaireInstallationReceipt.productionAccessed === false
    && ledLuminaireInstallationReceipt.deployPerformed === false
    && ledLuminaireInstallationReceipt.activationPerformed === false
    && ledLuminaireInstallationReceipt.releasePerformed === false
    && ledLuminaireInstallationReceipt.otaPerformed === false,
  "LED_LUMINAIRE_INSTALLATION_SIDE_EFFECT_BOUNDARY");
  const ledLuminaireInstallationReceiptEvidence = {
    path: LED_LUMINAIRE_INSTALLATION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(ledLuminaireInstallationReceiptBytes),
    receiptSha256: ledLuminaireInstallationReceipt.receiptSha256,
    predecessorReleaseId: ledLuminaireInstallationPredecessor.releaseId,
    successorReleaseId: ledLuminaireInstallationSuccessor.releaseId,
    successorSearchReleaseId: ledLuminaireInstallationSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: ledLuminaireInstallationAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(ledLuminaireInstallationSuccessor.releaseId);
  parentSearchReleaseId = String(ledLuminaireInstallationSuccessor.searchReleaseId);
  const cat6TwistedPairCableReceiptBytes = readFileSync(CAT6_TWISTED_PAIR_CABLE_RECEIPT_PATH);
  const cat6TwistedPairCableReceipt = JSON.parse(
    cat6TwistedPairCableReceiptBytes.toString("utf8"),
  ) as Json;
  const cat6TwistedPairCablePredecessor = cat6TwistedPairCableReceipt.predecessor as Json;
  const cat6TwistedPairCableSuccessor = cat6TwistedPairCableReceipt.successor as Json;
  const cat6TwistedPairCableAudit = cat6TwistedPairCableReceipt.audit as Json;
  invariant(cat6TwistedPairCablePredecessor.releaseId === parentReleaseId
    && cat6TwistedPairCablePredecessor.searchReleaseId === parentSearchReleaseId,
  "CAT6_TWISTED_PAIR_CABLE_PARENT");
  invariant(cat6TwistedPairCableReceipt.status
    === "GREEN_MASTER_CAT6_TWISTED_PAIR_CABLE_PREPARED_NOT_ACTIVE"
    && cat6TwistedPairCableReceipt.mutationPerformed === true,
  "CAT6_TWISTED_PAIR_CABLE_RECEIPT_STATUS");
  invariant((cat6TwistedPairCableAudit.unrelatedManifestChanges as number) === 0,
    "CAT6_TWISTED_PAIR_CABLE_UNRELATED_DRIFT");
  invariant((cat6TwistedPairCableAudit.release as Json).status === "prepared"
    && (cat6TwistedPairCableAudit.release as Json).activated_at === null,
  "CAT6_TWISTED_PAIR_CABLE_TERMINAL_LIFECYCLE");
  invariant(cat6TwistedPairCableReceipt.productionAccessed === false
    && cat6TwistedPairCableReceipt.deployPerformed === false
    && cat6TwistedPairCableReceipt.activationPerformed === false
    && cat6TwistedPairCableReceipt.releasePerformed === false
    && cat6TwistedPairCableReceipt.otaPerformed === false,
  "CAT6_TWISTED_PAIR_CABLE_SIDE_EFFECT_BOUNDARY");
  const cat6TwistedPairCableReceiptEvidence = {
    path: CAT6_TWISTED_PAIR_CABLE_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(cat6TwistedPairCableReceiptBytes),
    receiptSha256: cat6TwistedPairCableReceipt.receiptSha256,
    predecessorReleaseId: cat6TwistedPairCablePredecessor.releaseId,
    successorReleaseId: cat6TwistedPairCableSuccessor.releaseId,
    successorSearchReleaseId: cat6TwistedPairCableSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: cat6TwistedPairCableAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(cat6TwistedPairCableSuccessor.releaseId);
  parentSearchReleaseId = String(cat6TwistedPairCableSuccessor.searchReleaseId);
  const opticalFiberSplicingReceiptBytes = readFileSync(OPTICAL_FIBER_SPLICING_RECEIPT_PATH);
  const opticalFiberSplicingReceipt = JSON.parse(
    opticalFiberSplicingReceiptBytes.toString("utf8"),
  ) as Json;
  const opticalFiberSplicingPredecessor = opticalFiberSplicingReceipt.predecessor as Json;
  const opticalFiberSplicingSuccessor = opticalFiberSplicingReceipt.successor as Json;
  const opticalFiberSplicingAudit = opticalFiberSplicingReceipt.audit as Json;
  invariant(opticalFiberSplicingPredecessor.releaseId === parentReleaseId
    && opticalFiberSplicingPredecessor.searchReleaseId === parentSearchReleaseId,
  "OPTICAL_FIBER_SPLICING_PARENT");
  invariant(opticalFiberSplicingReceipt.status
    === "GREEN_MASTER_OPTICAL_FIBER_SPLICING_PREPARED_NOT_ACTIVE"
    && opticalFiberSplicingReceipt.idempotent === false
    && opticalFiberSplicingReceipt.mutationPerformed === true,
  "OPTICAL_FIBER_SPLICING_RECEIPT_STATUS");
  invariant((opticalFiberSplicingAudit.unrelatedManifestChanges as number) === 0,
    "OPTICAL_FIBER_SPLICING_UNRELATED_DRIFT");
  invariant((opticalFiberSplicingAudit.release as Json).status === "prepared"
    && (opticalFiberSplicingAudit.release as Json).activated_at === null,
  "OPTICAL_FIBER_SPLICING_TERMINAL_LIFECYCLE");
  invariant(opticalFiberSplicingReceipt.productionAccessed === false
    && opticalFiberSplicingReceipt.deployPerformed === false
    && opticalFiberSplicingReceipt.activationPerformed === false
    && opticalFiberSplicingReceipt.releasePerformed === false
    && opticalFiberSplicingReceipt.otaPerformed === false,
  "OPTICAL_FIBER_SPLICING_SIDE_EFFECT_BOUNDARY");
  const opticalFiberSplicingReceiptEvidence = {
    path: OPTICAL_FIBER_SPLICING_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(opticalFiberSplicingReceiptBytes),
    receiptSha256: opticalFiberSplicingReceipt.receiptSha256,
    predecessorReleaseId: opticalFiberSplicingPredecessor.releaseId,
    successorReleaseId: opticalFiberSplicingSuccessor.releaseId,
    successorSearchReleaseId: opticalFiberSplicingSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: opticalFiberSplicingAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(opticalFiberSplicingSuccessor.releaseId);
  parentSearchReleaseId = String(opticalFiberSplicingSuccessor.searchReleaseId);
  const addressableSmokeDetectorReceiptBytes = readFileSync(
    ADDRESSABLE_SMOKE_DETECTOR_RECEIPT_PATH,
  );
  const addressableSmokeDetectorReceipt = JSON.parse(
    addressableSmokeDetectorReceiptBytes.toString("utf8"),
  ) as Json;
  const addressableSmokeDetectorPredecessor = addressableSmokeDetectorReceipt.predecessor as Json;
  const addressableSmokeDetectorSuccessor = addressableSmokeDetectorReceipt.successor as Json;
  const addressableSmokeDetectorAudit = addressableSmokeDetectorReceipt.audit as Json;
  invariant(addressableSmokeDetectorPredecessor.releaseId === parentReleaseId
    && addressableSmokeDetectorPredecessor.searchReleaseId === parentSearchReleaseId,
  "ADDRESSABLE_SMOKE_DETECTOR_PARENT");
  invariant(addressableSmokeDetectorReceipt.status
    === "GREEN_MASTER_ADDRESSABLE_SMOKE_DETECTOR_PREPARED_NOT_ACTIVE"
    && addressableSmokeDetectorReceipt.mutationPerformed === true,
  "ADDRESSABLE_SMOKE_DETECTOR_RECEIPT_STATUS");
  invariant((addressableSmokeDetectorAudit.unrelatedManifestChanges as number) === 0,
    "ADDRESSABLE_SMOKE_DETECTOR_UNRELATED_DRIFT");
  invariant((addressableSmokeDetectorAudit.release as Json).status === "prepared"
    && (addressableSmokeDetectorAudit.release as Json).activated_at === null,
  "ADDRESSABLE_SMOKE_DETECTOR_TERMINAL_LIFECYCLE");
  invariant(addressableSmokeDetectorReceipt.productionAccessed === false
    && addressableSmokeDetectorReceipt.deployPerformed === false
    && addressableSmokeDetectorReceipt.activationPerformed === false
    && addressableSmokeDetectorReceipt.releasePerformed === false
    && addressableSmokeDetectorReceipt.otaPerformed === false,
  "ADDRESSABLE_SMOKE_DETECTOR_SIDE_EFFECT_BOUNDARY");
  const addressableSmokeDetectorReceiptEvidence = {
    path: ADDRESSABLE_SMOKE_DETECTOR_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(addressableSmokeDetectorReceiptBytes),
    receiptSha256: addressableSmokeDetectorReceipt.receiptSha256,
    predecessorReleaseId: addressableSmokeDetectorPredecessor.releaseId,
    successorReleaseId: addressableSmokeDetectorSuccessor.releaseId,
    successorSearchReleaseId: addressableSmokeDetectorSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: addressableSmokeDetectorAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(addressableSmokeDetectorSuccessor.releaseId);
  parentSearchReleaseId = String(addressableSmokeDetectorSuccessor.searchReleaseId);
  const pumpUnitAlignmentConnectionReceiptBytes = readFileSync(
    PUMP_UNIT_ALIGNMENT_CONNECTION_RECEIPT_PATH,
  );
  const pumpUnitAlignmentConnectionReceipt = JSON.parse(
    pumpUnitAlignmentConnectionReceiptBytes.toString("utf8"),
  ) as Json;
  const pumpUnitAlignmentConnectionPredecessor =
    pumpUnitAlignmentConnectionReceipt.predecessor as Json;
  const pumpUnitAlignmentConnectionSuccessor =
    pumpUnitAlignmentConnectionReceipt.successor as Json;
  const pumpUnitAlignmentConnectionAudit = pumpUnitAlignmentConnectionReceipt.audit as Json;
  invariant(pumpUnitAlignmentConnectionPredecessor.releaseId === parentReleaseId
    && pumpUnitAlignmentConnectionPredecessor.searchReleaseId === parentSearchReleaseId,
  "PUMP_UNIT_ALIGNMENT_CONNECTION_PARENT");
  invariant(pumpUnitAlignmentConnectionReceipt.status
    === "GREEN_MASTER_PUMP_UNIT_ALIGNMENT_CONNECTION_PREPARED_NOT_ACTIVE"
    && pumpUnitAlignmentConnectionReceipt.mutationPerformed === true,
  "PUMP_UNIT_ALIGNMENT_CONNECTION_RECEIPT_STATUS");
  invariant((pumpUnitAlignmentConnectionAudit.unrelatedManifestChanges as number) === 0,
    "PUMP_UNIT_ALIGNMENT_CONNECTION_UNRELATED_DRIFT");
  invariant((pumpUnitAlignmentConnectionAudit.release as Json).status === "prepared"
    && (pumpUnitAlignmentConnectionAudit.release as Json).activated_at === null,
  "PUMP_UNIT_ALIGNMENT_CONNECTION_TERMINAL_LIFECYCLE");
  invariant(pumpUnitAlignmentConnectionReceipt.productionAccessed === false
    && pumpUnitAlignmentConnectionReceipt.deployPerformed === false
    && pumpUnitAlignmentConnectionReceipt.activationPerformed === false
    && pumpUnitAlignmentConnectionReceipt.releasePerformed === false
    && pumpUnitAlignmentConnectionReceipt.otaPerformed === false,
  "PUMP_UNIT_ALIGNMENT_CONNECTION_SIDE_EFFECT_BOUNDARY");
  const pumpUnitAlignmentConnectionReceiptEvidence = {
    path: PUMP_UNIT_ALIGNMENT_CONNECTION_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(pumpUnitAlignmentConnectionReceiptBytes),
    receiptSha256: pumpUnitAlignmentConnectionReceipt.receiptSha256,
    predecessorReleaseId: pumpUnitAlignmentConnectionPredecessor.releaseId,
    successorReleaseId: pumpUnitAlignmentConnectionSuccessor.releaseId,
    successorSearchReleaseId: pumpUnitAlignmentConnectionSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: pumpUnitAlignmentConnectionAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(pumpUnitAlignmentConnectionSuccessor.releaseId);
  parentSearchReleaseId = String(pumpUnitAlignmentConnectionSuccessor.searchReleaseId);
  const hotWaterBoilerPipingReceiptBytes = readFileSync(
    HOT_WATER_BOILER_PIPING_RECEIPT_PATH,
  );
  const hotWaterBoilerPipingReceipt = JSON.parse(
    hotWaterBoilerPipingReceiptBytes.toString("utf8"),
  ) as Json;
  const hotWaterBoilerPipingPredecessor = hotWaterBoilerPipingReceipt.predecessor as Json;
  const hotWaterBoilerPipingSuccessor = hotWaterBoilerPipingReceipt.successor as Json;
  const hotWaterBoilerPipingAudit = hotWaterBoilerPipingReceipt.audit as Json;
  invariant(hotWaterBoilerPipingPredecessor.releaseId === parentReleaseId
    && hotWaterBoilerPipingPredecessor.searchReleaseId === parentSearchReleaseId,
  "HOT_WATER_BOILER_PIPING_PARENT");
  invariant(hotWaterBoilerPipingReceipt.status
    === "GREEN_MASTER_HOT_WATER_BOILER_PIPING_PREPARED_NOT_ACTIVE"
    && hotWaterBoilerPipingReceipt.mutationPerformed === true,
  "HOT_WATER_BOILER_PIPING_RECEIPT_STATUS");
  invariant((hotWaterBoilerPipingAudit.unrelatedManifestChanges as number) === 0,
    "HOT_WATER_BOILER_PIPING_UNRELATED_DRIFT");
  invariant((hotWaterBoilerPipingAudit.release as Json).status === "prepared"
    && (hotWaterBoilerPipingAudit.release as Json).activated_at === null,
  "HOT_WATER_BOILER_PIPING_TERMINAL_LIFECYCLE");
  invariant(hotWaterBoilerPipingReceipt.productionAccessed === false
    && hotWaterBoilerPipingReceipt.deployPerformed === false
    && hotWaterBoilerPipingReceipt.activationPerformed === false
    && hotWaterBoilerPipingReceipt.releasePerformed === false
    && hotWaterBoilerPipingReceipt.otaPerformed === false,
  "HOT_WATER_BOILER_PIPING_SIDE_EFFECT_BOUNDARY");
  const hotWaterBoilerPipingReceiptEvidence = {
    path: HOT_WATER_BOILER_PIPING_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(hotWaterBoilerPipingReceiptBytes),
    receiptSha256: hotWaterBoilerPipingReceipt.receiptSha256,
    predecessorReleaseId: hotWaterBoilerPipingPredecessor.releaseId,
    successorReleaseId: hotWaterBoilerPipingSuccessor.releaseId,
    successorSearchReleaseId: hotWaterBoilerPipingSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: hotWaterBoilerPipingAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(hotWaterBoilerPipingSuccessor.releaseId);
  parentSearchReleaseId = String(hotWaterBoilerPipingSuccessor.searchReleaseId);
  const industrialSteelPipeButtWeldReceiptBytes = readFileSync(
    INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RECEIPT_PATH,
  );
  const industrialSteelPipeButtWeldReceipt = JSON.parse(
    industrialSteelPipeButtWeldReceiptBytes.toString("utf8"),
  ) as Json;
  const industrialSteelPipeButtWeldPredecessor =
    industrialSteelPipeButtWeldReceipt.predecessor as Json;
  const industrialSteelPipeButtWeldSuccessor =
    industrialSteelPipeButtWeldReceipt.successor as Json;
  const industrialSteelPipeButtWeldAudit = industrialSteelPipeButtWeldReceipt.audit as Json;
  invariant(industrialSteelPipeButtWeldPredecessor.releaseId === parentReleaseId
    && industrialSteelPipeButtWeldPredecessor.searchReleaseId === parentSearchReleaseId,
  "INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARENT");
  invariant(industrialSteelPipeButtWeldReceipt.status
    === "GREEN_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PREPARED_NOT_ACTIVE"
    && industrialSteelPipeButtWeldReceipt.mutationPerformed === true,
  "INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RECEIPT_STATUS");
  invariant((industrialSteelPipeButtWeldAudit.unrelatedManifestChanges as number) === 0,
    "INDUSTRIAL_STEEL_PIPE_BUTT_WELD_UNRELATED_DRIFT");
  invariant((industrialSteelPipeButtWeldAudit.release as Json).status === "prepared"
    && (industrialSteelPipeButtWeldAudit.release as Json).activated_at === null,
  "INDUSTRIAL_STEEL_PIPE_BUTT_WELD_TERMINAL_LIFECYCLE");
  invariant(industrialSteelPipeButtWeldReceipt.productionAccessed === false
    && industrialSteelPipeButtWeldReceipt.deployPerformed === false
    && industrialSteelPipeButtWeldReceipt.activationPerformed === false
    && industrialSteelPipeButtWeldReceipt.releasePerformed === false
    && industrialSteelPipeButtWeldReceipt.otaPerformed === false,
  "INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SIDE_EFFECT_BOUNDARY");
  const industrialSteelPipeButtWeldReceiptEvidence = {
    path: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(industrialSteelPipeButtWeldReceiptBytes),
    receiptSha256: industrialSteelPipeButtWeldReceipt.receiptSha256,
    predecessorReleaseId: industrialSteelPipeButtWeldPredecessor.releaseId,
    successorReleaseId: industrialSteelPipeButtWeldSuccessor.releaseId,
    successorSearchReleaseId: industrialSteelPipeButtWeldSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: industrialSteelPipeButtWeldAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(industrialSteelPipeButtWeldSuccessor.releaseId);
  parentSearchReleaseId = String(industrialSteelPipeButtWeldSuccessor.searchReleaseId);
  const serverRack42uGroundingReceiptBytes = readFileSync(
    SERVER_RACK_42U_GROUNDING_RECEIPT_PATH,
  );
  const serverRack42uGroundingReceipt = JSON.parse(
    serverRack42uGroundingReceiptBytes.toString("utf8"),
  ) as Json;
  const serverRack42uGroundingPredecessor = serverRack42uGroundingReceipt.predecessor as Json;
  const serverRack42uGroundingSuccessor = serverRack42uGroundingReceipt.successor as Json;
  const serverRack42uGroundingAudit = serverRack42uGroundingReceipt.audit as Json;
  invariant(serverRack42uGroundingPredecessor.releaseId === parentReleaseId
    && serverRack42uGroundingPredecessor.searchReleaseId === parentSearchReleaseId,
  "SERVER_RACK_42U_GROUNDING_PARENT");
  invariant(serverRack42uGroundingReceipt.status
    === "GREEN_MASTER_SERVER_RACK_42U_GROUNDING_PREPARED_NOT_ACTIVE"
    && serverRack42uGroundingReceipt.mutationPerformed === true,
  "SERVER_RACK_42U_GROUNDING_RECEIPT_STATUS");
  invariant((serverRack42uGroundingAudit.unrelatedManifestChanges as number) === 0,
    "SERVER_RACK_42U_GROUNDING_UNRELATED_DRIFT");
  invariant((serverRack42uGroundingAudit.release as Json).status === "prepared"
    && (serverRack42uGroundingAudit.release as Json).activated_at === null,
  "SERVER_RACK_42U_GROUNDING_TERMINAL_LIFECYCLE");
  invariant(serverRack42uGroundingReceipt.productionAccessed === false
    && serverRack42uGroundingReceipt.deployPerformed === false
    && serverRack42uGroundingReceipt.activationPerformed === false
    && serverRack42uGroundingReceipt.releasePerformed === false
    && serverRack42uGroundingReceipt.otaPerformed === false,
  "SERVER_RACK_42U_GROUNDING_SIDE_EFFECT_BOUNDARY");
  const serverRack42uGroundingReceiptEvidence = {
    path: SERVER_RACK_42U_GROUNDING_RECEIPT_PATH.replaceAll("\\", "/"),
    sha256: sha256(serverRack42uGroundingReceiptBytes),
    receiptSha256: serverRack42uGroundingReceipt.receiptSha256,
    predecessorReleaseId: serverRack42uGroundingPredecessor.releaseId,
    successorReleaseId: serverRack42uGroundingSuccessor.releaseId,
    successorSearchReleaseId: serverRack42uGroundingSuccessor.searchReleaseId,
    targetCount: 1,
    unrelatedManifestChanges: serverRack42uGroundingAudit.unrelatedManifestChanges,
  };
  parentReleaseId = String(serverRack42uGroundingSuccessor.releaseId);
  parentSearchReleaseId = String(serverRack42uGroundingSuccessor.searchReleaseId);
  invariant(parentReleaseId === CANDIDATE_RELEASE_ID,
    "SERVER_RACK_42U_GROUNDING_FINAL_CANDIDATE");

  const benchmarks = [];
  for (const benchmarkCase of CASES) {
    const mapping = MASTER_BENCHMARK_FIXTURE_MAPPING[benchmarkCase.ordinal - 1];
    invariant(mapping?.ordinal === benchmarkCase.ordinal, `MAPPING:${benchmarkCase.ordinal}`);
    const fixturePath = resolve(HISTORICAL_ROOT, mapping.fixtureId, "fixture.json");
    const fixtureBytes = readFileSync(fixturePath);
    const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Json;
    const currentOutcome = outcomes.find((outcome) => outcome.catalogId === benchmarkCase.catalogId);
    invariant(currentOutcome != null, `AUDIT_OUTCOME:${benchmarkCase.ordinal}`);
    invariant(currentOutcome.minimum && (currentOutcome.minimum as Json).status === "COMPILED",
      `AUDIT_MINIMUM:${benchmarkCase.ordinal}`);
    invariant(currentOutcome.refinement && (currentOutcome.refinement as Json).status === "COMPILED",
      `AUDIT_REFINEMENT:${benchmarkCase.ordinal}`);

    const short = await benchmarkCase.compile({ ...benchmarkCase.shortInput }, {
      catalogId: benchmarkCase.catalogId,
    });
    const shortVisible = visibleRows(short);
    const shortIds = new Set(shortVisible.map((row) => row.row_id));
    for (const rowId of [...benchmarkCase.requiredRowIds, ...benchmarkCase.conditionalRowIds]) {
      invariant(shortIds.has(rowId), `SHORT_ROW:${benchmarkCase.ordinal}:${rowId}`);
    }
    invariant(short.preliminaryNeeds.length > 0, `SHORT_REFINEMENTS:${benchmarkCase.ordinal}`);
    invariant(shortVisible.every((row) =>
      !benchmarkCase.forbiddenScope.test(`${row.row_id} ${row.title_ru}`)),
      `SHORT_FORBIDDEN_SCOPE:${benchmarkCase.ordinal}`);

    const refined = await benchmarkCase.compile({ ...benchmarkCase.refinedInput() }, {
      catalogId: benchmarkCase.catalogId,
    });
    const refinedIds = new Set(refined.rows.map((row) => row.row_id));
    invariant(refined.preliminaryNeeds.length === 0, `REFINED_NEEDS:${benchmarkCase.ordinal}`);
    for (const rowId of [...benchmarkCase.requiredRowIds, ...benchmarkCase.conditionalRowIds]) {
      invariant(refinedIds.has(rowId), `REFINED_ROW:${benchmarkCase.ordinal}:${rowId}`);
    }
    invariant(refined.rows.every((row) =>
      !benchmarkCase.forbiddenScope.test(`${row.row_id} ${row.title_ru}`)),
      `REFINED_FORBIDDEN_SCOPE:${benchmarkCase.ordinal}`);

    benchmarks.push({
      ordinal: benchmarkCase.ordinal,
      masterTitleRu: mapping.masterTitleRu,
      fixtureId: mapping.fixtureId,
      historicalFixturePath: fixturePath.replaceAll("\\", "/"),
      historicalFixtureSha256: sha256(fixtureBytes),
      historicalExpectedIdentityRu: fixture.expectedWorkIdentity,
      historicalExpectedMandatoryResourceIds: fixture.expectedMandatoryResourceIds,
      historicalExpectedConditionalResourceIds: fixture.expectedConditionalResourceIds,
      historicalForbiddenResourceIds: fixture.forbiddenResourceIds,
      currentCatalogId: benchmarkCase.catalogId,
      currentDefinitionVersionId: currentOutcome.definitionVersionId,
      currentSourceBatch: currentOutcome.sourceBatch,
      shortPromptInput: benchmarkCase.shortInput,
      shortPromptStatus: "COMPILED_VISIBLE_COMPOSITION_WITH_ROW_LOCAL_REFINEMENTS",
      shortCalculatedRowIds: short.rows.map((row) => row.row_id),
      shortPreliminaryNeeds: short.preliminaryNeeds.map((need) => ({
        rowId: need.row_id,
        needState: need.need_state,
        missingParameterIds: need.missing_parameter_ids,
      })),
      currentMandatoryRowIds: benchmarkCase.requiredRowIds,
      currentConditionalRowIds: benchmarkCase.conditionalRowIds,
      refinedStatus: "COMPILED_WITHOUT_UNRESOLVED_NEEDS",
      refinedRowIds: refined.rows.map((row) => row.row_id),
      forbiddenWholeAssemblyScopeStatus: "ABSENT_FROM_SHORT_AND_REFINED_COMPOSITION",
      backendContentAcceptanceStatus: "ACCEPTED_CURRENT_PREPARED_CANDIDATE",
      webAcceptanceStatus: "NOT_EVALUATED",
      androidAcceptanceStatus: "NOT_EVALUATED",
      successorReceipt: benchmarkCase.waveReceiptIndex != null
        ? waveReceipts[benchmarkCase.waveReceiptIndex]
        : benchmarkCase.ordinal === 3
          ? boredPileReceiptEvidence
          : benchmarkCase.ordinal === 4
            ? anchorGroupReceipts.at(-1)
            : benchmarkCase.ordinal === 5
              ? monolithicRebarCageReceiptEvidence
              : benchmarkCase.ordinal === 6
                ? ceramicBlockExternalWallReceipts.at(-1)
                : benchmarkCase.ordinal === 7
                  ? steelColumnsBeamsReceiptEvidence
                  : benchmarkCase.ordinal === 8
                    ? pvcRoofMembraneReceiptEvidence
                    : benchmarkCase.ordinal === 9
                      ? facadeMineralWoolReceiptEvidence
                      : benchmarkCase.ordinal === 10
                        ? mechanizedGypsumWallPlasterReceiptEvidence
                        : benchmarkCase.ordinal === 11
                          ? porcelainFloorTileInstallationReceiptEvidence
                          : benchmarkCase.ordinal === 12
                            ? cementSandScreedDemolitionReceiptEvidence
                            : benchmarkCase.ordinal === 13
                              ? asphaltUpperCourseReceiptEvidence
                              : benchmarkCase.ordinal === 14
                                ? surfaceDrainageChannelReceiptEvidence
                                : benchmarkCase.ordinal === 15
                                  ? pe110ElectrofusionJointReceiptEvidence
                                  : benchmarkCase.ordinal === 16
                                    ? gravitySewerPvcSn8ReceiptEvidence
                                    : benchmarkCase.ordinal === 17
                                      ? perforatedDrainPipeFilterReceiptEvidence
                                      : benchmarkCase.ordinal === 18
                                        ? steelPanelRadiatorReceiptEvidence
                                        : benchmarkCase.ordinal === 19
                                          ? galvanizedSteelDuctReceiptEvidence
                                          : benchmarkCase.ordinal === 20
                                            ? splitSystemBlocksReceiptEvidence
                                            : benchmarkCase.ordinal === 21
                                              ? sprinklerHeadConnectionReceiptEvidence
                                              : benchmarkCase.ordinal === 22
                                                ? vvgngLsPowerCableReceiptEvidence
                                                : benchmarkCase.ordinal === 23
                                                  ? ledLuminaireInstallationReceiptEvidence
                                                  : benchmarkCase.ordinal === 24
                                                    ? cat6TwistedPairCableReceiptEvidence
                                                    : benchmarkCase.ordinal === 25
                                                      ? opticalFiberSplicingReceiptEvidence
                                                      : benchmarkCase.ordinal === 26
                                                        ? addressableSmokeDetectorReceiptEvidence
                                                        : benchmarkCase.ordinal === 27
                                                          ? pumpUnitAlignmentConnectionReceiptEvidence
                                                          : benchmarkCase.ordinal === 28
                                                            ? hotWaterBoilerPipingReceiptEvidence
                                                            : benchmarkCase.ordinal === 29
                                                              ? industrialSteelPipeButtWeldReceiptEvidence
                                                              : serverRack42uGroundingReceiptEvidence,
    });
  }

  const report = {
    schemaVersion: CONTRACT,
    generatedAt: new Date().toISOString(),
    status: "BACKEND_CONTENT_ACCEPTED_30_OF_30_WEB_ANDROID_OPEN",
    candidate: {
      definitionReleaseId: CANDIDATE_RELEASE_ID,
      status: candidate.status,
      activatedAt: candidate.activatedAt,
      auditPath: AUDIT_PATH.replaceAll("\\", "/"),
      auditSha256: sha256(auditBytes),
      auditReceiptSha256: audit.receiptSha256,
    },
    boundary: [
      "Acceptance covers current backend routing, visible composition, row-local preliminary needs and refined compilation for MASTER benchmarks 1-30.",
      "Benchmarks 1-2 exclude whole-foundation/whole-slab scope; benchmark 3 excludes adjacent foundation assemblies; benchmark 4 excludes concrete, reinforcement, formwork, waterproofing and base layers; benchmark 5 excludes concrete, pumps, formwork and curing; benchmark 6 excludes generic enclosing-structure and AAC substitution; benchmark 7 excludes foundation concrete and roofing packages; benchmark 8 excludes vapour barrier, insulation, screeds and metal-tile lathing; benchmark 9 excludes decorative plaster, facade paint and the base reinforcing coat with mesh; benchmark 10 excludes cement plaster in the same room, putty, paint and decorative finish; benchmark 11 excludes generic tile-leveling area rows and unconfirmed screed or floor-system layers; benchmark 12 excludes new screed mix and floor-finish materials; benchmark 13 excludes subgrade, sand base, crushed stone, geotextile and lower asphalt courses; benchmark 14 excludes the full storm-sewer network and full road-pavement package; benchmark 15 excludes pipe length, trench, sand bedding, water chambers and whole-network disinfection; benchmark 16 excludes sewer manholes and pumping stations; benchmark 17 excludes the stormwater main collector and full road-drainage system; benchmark 18 excludes full heating distribution and whole-building balancing; benchmark 19 excludes air-handling units, fans, air terminals and the full ventilation system; benchmark 20 excludes the building VRF system and full electrical distribution; benchmark 21 excludes the sprinkler pipe network, fire pump, alarm valve station and full fire-suppression system; benchmark 22 excludes switchboards and the full building power system; benchmark 23 excludes the lighting cable line, switches and distribution board; benchmark 24 excludes network switches, server racks and the full structured-cabling system; benchmark 25 excludes the fiber-optic cable route, optical distribution frame and server cabinet; benchmark 26 excludes fire-alarm loop cable, control panels, sounders, power supplies and the full fire-alarm system.",
      "Unknown contingency, reinforcement, centralizers, labour, equipment, QA and conditional technology quantities remain project refinements; anchor bolts use supplied group geometry, rebar cage masses use only explicit BBS quantities, ceramic-wall material quantities use only explicit project/product schedules, steel-frame connections use only explicit KM/KMD/PPR/control-plan quantities, PVC-membrane materials, fastening, equipment and control use only explicit layout/product/method documents, facade-insulation quantities use only explicit facade-system/project/PPR/control documents, mechanized-plaster material, profile, station, protection and mesh quantities use only explicit product-system/survey/PPR details, porcelain-tile materials, clips, joints, cutting and substrate layers use only explicit layout/product/survey/PPR evidence, asphalt mix, tack coat, joint sealant, equipment and QA quantities use only explicit pavement-project, mix-design, method and control-plan evidence, drainage-channel components, concrete support, joints and control use only explicit drainage-project, selected-system, detail and survey-plan evidence, electrofusion couplers, consumables, equipment time and protocols use only explicit joint schedule, selected-system passport, WPS, PPR and QA evidence, perforated-drain pipe, couplers, filter materials, control and test quantities use only explicit route, selected-system, filter-detail, PPR and QA evidence, radiator, bracket, valve, vent, fitting and test quantities use only explicit radiator schedule, product passport, connection detail, PPR and QA evidence, duct sections, fittings, seals, supports and equipment use only explicit duct schedule, layout and PPR evidence, split-system supports, nitrogen and conditional quantities use only explicit project, equipment-passport, method and QA evidence, cable markers, clamps, terminations, firestops, tests and conditional containment use only explicit route, cable schedule, termination/firestop details, PPR and QA evidence, luminaire fixing, connection, access, test and conditional driver/adapter quantities use only explicit schedule, mounting/connection details, PPR and QA evidence, Cat.6 labels, Velcro, firestop, certifier shifts and conditional passive components use only explicit route, SCS schedule, details and QA evidence, optical-fiber sleeves, cleaning, marking, equipment shifts, pigtails and splice trays use only explicit splice schedule, method statement and QA program, and detector fastening, test aerosol, dispenser time, protocols, loop isolators and junction boxes use only explicit fire-alarm design, mounting, method and commissioning documents; no scalar was invented.",
      "Benchmark 27 excludes pumping-station collectors, water reservoirs, pumping-station automation and the full pumping station.",
      "Pump anchors, shims, grout, flange sets, alignment-tool time, vibration isolators and flexible connectors use only approved foundation, piping, method and QA documentation; no historical project rate was imported.",
      "Benchmark 28 excludes the full boiler house, its civil works and common building-level flue, ventilation, fire and automation systems.",
      "Boiler flanges, valves, safety group, instrumentation, sealant and conditional auxiliaries use only approved boiler, piping, method and QA documentation; no historical project rate was imported.",
      "Benchmark 29 excludes full process-pipe length, fittings, supports and whole-pipeline pressure testing.",
      "Welding wire, shielding and purge gases, degreaser, grinding discs, equipment hours, heat treatment and field-joint coating use only approved WPS, method, resource and QA documentation; no historical project rate was imported.",
      "Benchmark 30 excludes UPS, battery systems, server-room cooling, fire suppression, access control and the full server room.",
      "Rack product configuration, anchor/bonding sets, PE conductor/lugs, cage nuts, organizers and conditional plinth/PDU use only approved schedules, layouts, details and QA documentation; no historical project rate was imported.",
      "No current real Web or Android acceptance is claimed.",
    ],
    counts: {
      masterBenchmarkDenominator: 30,
      backendContentAccepted: benchmarks.length,
      webAccepted: 0,
      androidAccepted: 0,
      verifiedSuccessorReceipts: waveReceipts.length + 26 + anchorGroupReceipts.length
        + ceramicBlockExternalWallReceipts.length,
      successorTargetDefinitions: waveReceipts.reduce(
        (sum, receipt) => sum + receipt.targetCount,
        boredPileReceiptEvidence.targetCount,
      ) + anchorGroupReceipts.reduce((sum, receipt) => sum + receipt.targetCount, 0)
        + monolithicRebarCageReceiptEvidence.targetCount
        + ceramicBlockExternalWallReceipts.reduce((sum, receipt) =>
          sum + receipt.targetCount, 0)
        + steelColumnsBeamsReceiptEvidence.targetCount
        + pvcRoofMembraneReceiptEvidence.targetCount
        + facadeMineralWoolReceiptEvidence.targetCount
        + mechanizedGypsumWallPlasterReceiptEvidence.targetCount
        + porcelainFloorTileInstallationReceiptEvidence.targetCount
        + cementSandScreedDemolitionReceiptEvidence.targetCount
        + asphaltUpperCourseReceiptEvidence.targetCount
        + surfaceDrainageChannelReceiptEvidence.targetCount
        + pe110ElectrofusionJointReceiptEvidence.targetCount
        + gravitySewerPvcSn8ReceiptEvidence.targetCount
        + perforatedDrainPipeFilterReceiptEvidence.targetCount
        + steelPanelRadiatorReceiptEvidence.targetCount
        + galvanizedSteelDuctReceiptEvidence.targetCount
        + splitSystemBlocksReceiptEvidence.targetCount
        + sprinklerHeadConnectionReceiptEvidence.targetCount
        + vvgngLsPowerCableReceiptEvidence.targetCount
        + ledLuminaireInstallationReceiptEvidence.targetCount
        + cat6TwistedPairCableReceiptEvidence.targetCount
        + opticalFiberSplicingReceiptEvidence.targetCount
        + addressableSmokeDetectorReceiptEvidence.targetCount
        + pumpUnitAlignmentConnectionReceiptEvidence.targetCount
        + hotWaterBoilerPipingReceiptEvidence.targetCount
        + industrialSteelPipeButtWeldReceiptEvidence.targetCount
        + serverRack42uGroundingReceiptEvidence.targetCount,
    },
    benchmarks,
    waveReceipts,
    boredPileReceipt: boredPileReceiptEvidence,
    anchorGroupReceipts,
    monolithicRebarCageReceipt: monolithicRebarCageReceiptEvidence,
    ceramicBlockExternalWallReceipts,
    steelColumnsBeamsReceipt: steelColumnsBeamsReceiptEvidence,
    pvcRoofMembraneReceipt: pvcRoofMembraneReceiptEvidence,
    facadeMineralWoolReceipt: facadeMineralWoolReceiptEvidence,
    mechanizedGypsumWallPlasterReceipt: mechanizedGypsumWallPlasterReceiptEvidence,
    porcelainFloorTileInstallationReceipt: porcelainFloorTileInstallationReceiptEvidence,
    cementSandScreedDemolitionReceipt: cementSandScreedDemolitionReceiptEvidence,
    asphaltUpperCourseReceipt: asphaltUpperCourseReceiptEvidence,
    surfaceDrainageChannelReceipt: surfaceDrainageChannelReceiptEvidence,
    pe110ElectrofusionJointReceipt: pe110ElectrofusionJointReceiptEvidence,
    gravitySewerPvcSn8Receipt: gravitySewerPvcSn8ReceiptEvidence,
    perforatedDrainPipeFilterReceipt: perforatedDrainPipeFilterReceiptEvidence,
    steelPanelRadiatorReceipt: steelPanelRadiatorReceiptEvidence,
    galvanizedSteelDuctReceipt: galvanizedSteelDuctReceiptEvidence,
    splitSystemBlocksReceipt: splitSystemBlocksReceiptEvidence,
    sprinklerHeadConnectionReceipt: sprinklerHeadConnectionReceiptEvidence,
    vvgngLsPowerCableReceipt: vvgngLsPowerCableReceiptEvidence,
    ledLuminaireInstallationReceipt: ledLuminaireInstallationReceiptEvidence,
    cat6TwistedPairCableReceipt: cat6TwistedPairCableReceiptEvidence,
    opticalFiberSplicingReceipt: opticalFiberSplicingReceiptEvidence,
    addressableSmokeDetectorReceipt: addressableSmokeDetectorReceiptEvidence,
    pumpUnitAlignmentConnectionReceipt: pumpUnitAlignmentConnectionReceiptEvidence,
    hotWaterBoilerPipingReceipt: hotWaterBoilerPipingReceiptEvidence,
    industrialSteelPipeButtWeldReceipt: industrialSteelPipeButtWeldReceiptEvidence,
    serverRack42uGroundingReceipt: serverRack42uGroundingReceiptEvidence,
    activationPerformed: false,
    deployPerformed: false,
    otaPerformed: false,
  };
  const canonical = `${JSON.stringify(report, null, 2)}\n`;
  const reportSha256 = sha256(canonical);
  writeAtomic(resolve(OUTPUT_ROOT, "master-backend-benchmarks.json"), canonical);
  writeAtomic(resolve(OUTPUT_ROOT, "master-backend-benchmarks.sha256"),
    `${reportSha256}  master-backend-benchmarks.json\n`);
  writeAtomic(resolve(OUTPUT_ROOT, "master-backend-benchmarks.md"), [
    "# MASTER backend benchmark evidence",
    "",
    `Candidate: \`${CANDIDATE_RELEASE_ID}\` (prepared, inactive).`,
    "",
    `Report SHA-256: \`${reportSha256}\``,
    "",
    "- Current backend content accepted: 30 / 30 MASTER technological benchmarks.",
    "- Short prompts compile to visible composition with row-local voluntary refinements.",
    "- Concrete placement keeps the conditional construction-joint branch; bored piles keep conditional casing, bentonite and couplers; anchor groups keep conditional braces and non-shrink grout; rebar cages keep diameter-specific BBS masses plus conditional couplers and electrodes; ceramic-block walls keep conditional lintels, reinforcement mesh and abutment insulation; steel frames keep conditional column-base grout and fireproofing; PVC roofs keep conditional detail membrane and contact adhesive; facade mineral-wool insulation keeps conditional fire-barrier lamellas and start profiles; mechanized gypsum plaster keeps local reinforcing mesh conditional; porcelain floors keep leveling compound and waterproofing conditional; asphalt upper courses keep core sampling conditional; surface drainage channels keep silt traps, encasement reinforcement and local pavement reinstatement conditional; PE110 electrofusion welding keeps generator and positioner conditional; PVC SN8 gravity sewer keeps fittings, crossing casing and weak-ground geotextile conditional; perforated drainage pipe keeps inspection chambers and sand bedding conditional; steel panel radiators keep thermostatic heads and concealed-pipe insulation conditional; galvanized-steel ducts keep insulation, fireproofing and flexible connectors conditional; split systems keep additional refrigerant, fire-rated penetration seals and decorative trunking conditional; sprinkler heads keep listed flexible hoses conditional; VVGng-LS cable keeps tray, protective pipe and pulling lubricant conditional; LED luminaires keep separate drivers and ceiling reinforcement adapters conditional; Cat.6 keeps keystones, patch panels, outlets and J-hooks conditional; optical-fiber splicing keeps pigtails and splice trays conditional; addressable smoke detectors keep loop isolators and fire-resistant junction boxes conditional.",
    "- Pump-unit installation keeps vibration isolators and flexible connectors conditional.",
    "- Hot-water boiler piping keeps the gas train, circulation pump, plate heat exchanger, expansion vessel and water treatment conditional.",
    "- Industrial steel pipe butt welding keeps root purging, heat treatment and field-joint coating repair conditional.",
    "- Server-rack installation keeps plinths, PDUs and vertical cable organizers conditional.",
    "- Current Web and Android acceptance: 0 / 30; not evaluated in this artifact.",
    "- Activation, deploy and OTA were not performed.",
    "",
  ].join("\n"));
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    outputRoot: OUTPUT_ROOT,
    reportSha256,
    counts: report.counts,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
