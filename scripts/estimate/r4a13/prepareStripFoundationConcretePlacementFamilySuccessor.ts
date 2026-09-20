import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory";
import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  compileStripFoundationConcretePlacementR1,
  stripFoundationConcretePlacementAcceptanceInputR1,
  type StripFoundationConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import {
  ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS,
  anchorGroupConcretePlacementAcceptanceInputR1,
  compileAnchorGroupConcretePlacementR1,
  type AnchorGroupConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/anchorGroupConcretePlacementR1";
import {
  COLUMN_BASE_CONCRETE_PLACEMENT_FORMULAS,
  COLUMN_BASE_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_CONCRETE_PLACEMENT_PARAMETERS,
  COLUMN_BASE_CONCRETE_PLACEMENT_RESOURCES,
  COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS,
  columnBaseConcretePlacementAcceptanceInputR1,
  compileColumnBaseConcretePlacementR1,
  type ColumnBaseConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/columnBaseConcretePlacementR1";
import {
  BELT_CONCRETE_PLACEMENT_FORMULAS,
  BELT_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  BELT_CONCRETE_PLACEMENT_PARAMETERS,
  BELT_CONCRETE_PLACEMENT_RESOURCES,
  BELT_CONCRETE_PLACEMENT_TARGETS,
  beltConcretePlacementAcceptanceInputR1,
  compileBeltConcretePlacementR1,
  type BeltConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/beltConcretePlacementR1";
import {
  CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS,
  compileConcreteSlabConcretePlacementR1,
  concreteSlabConcretePlacementAcceptanceInputR1,
  type ConcreteSlabConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabConcretePlacementR1";
import {
  CONCRETE_SLAB_VIBRATION_FORMULAS,
  CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_VIBRATION_NORM_ID,
  CONCRETE_SLAB_VIBRATION_PARAMETERS,
  CONCRETE_SLAB_VIBRATION_RESOURCES,
  CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  CONCRETE_SLAB_VIBRATION_SOURCE_METADATA,
  CONCRETE_SLAB_VIBRATION_TARGETS,
  SLAB_FOUNDATION_VIBRATION_TARGETS,
  compileConcreteSlabVibrationR1,
  concreteSlabVibrationAcceptanceInputR1,
  type ConcreteSlabVibrationContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabVibrationR1";
import {
  CONCRETE_SLAB_CURING_FORMULAS,
  CONCRETE_SLAB_CURING_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_CURING_NORM_ID,
  CONCRETE_SLAB_CURING_PARAMETERS,
  CONCRETE_SLAB_CURING_RESOURCES,
  CONCRETE_SLAB_CURING_SOURCE_ID,
  CONCRETE_SLAB_CURING_SOURCE_METADATA,
  CONCRETE_SLAB_CURING_TARGETS,
  compileConcreteSlabCuringR1,
  concreteSlabCuringAcceptanceInputR1,
  type ConcreteSlabCuringContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabCuringR1";
import {
  ANCHOR_GROUP_CURING_FORMULAS,
  ANCHOR_GROUP_CURING_NORMATIVE_PARAMETER_IDS,
  ANCHOR_GROUP_CURING_NORM_ID,
  ANCHOR_GROUP_CURING_PARAMETERS,
  ANCHOR_GROUP_CURING_RESOURCES,
  ANCHOR_GROUP_CURING_SOURCE_ID,
  ANCHOR_GROUP_CURING_SOURCE_METADATA,
  ANCHOR_GROUP_CURING_TARGETS,
  anchorGroupCuringAcceptanceInputR1,
  compileAnchorGroupCuringR1,
  type AnchorGroupCuringContextKey,
} from "../../../src/lib/estimate/v4/anchorGroupCuringR1";
import {
  BELT_CURING_FORMULAS,
  BELT_CURING_NORMATIVE_PARAMETER_IDS,
  BELT_CURING_NORM_ID,
  BELT_CURING_PARAMETERS,
  BELT_CURING_RESOURCES,
  BELT_CURING_SOURCE_ID,
  BELT_CURING_SOURCE_METADATA,
  BELT_CURING_TARGETS,
  beltCuringAcceptanceInputR1,
  compileBeltCuringR1,
  type BeltCuringContextKey,
} from "../../../src/lib/estimate/v4/beltCuringR1";
import {
  COLUMN_BASE_CURING_FORMULAS,
  COLUMN_BASE_CURING_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_CURING_NORM_ID,
  COLUMN_BASE_CURING_PARAMETERS,
  COLUMN_BASE_CURING_RESOURCES,
  COLUMN_BASE_CURING_SOURCE_ID,
  COLUMN_BASE_CURING_SOURCE_METADATA,
  COLUMN_BASE_CURING_TARGETS,
  columnBaseCuringAcceptanceInputR1,
  compileColumnBaseCuringR1,
  type ColumnBaseCuringContextKey,
} from "../../../src/lib/estimate/v4/columnBaseCuringR1";
import {
  ANCHOR_GROUP_LEVELING_FORMULAS,
  ANCHOR_GROUP_LEVELING_NORMATIVE_PARAMETER_IDS,
  ANCHOR_GROUP_LEVELING_NORM_ID,
  ANCHOR_GROUP_LEVELING_PARAMETERS,
  ANCHOR_GROUP_LEVELING_RESOURCES,
  ANCHOR_GROUP_LEVELING_SOURCE_ID,
  ANCHOR_GROUP_LEVELING_SOURCE_METADATA,
  ANCHOR_GROUP_LEVELING_TARGETS,
  anchorGroupLevelingAcceptanceInputR1,
  compileAnchorGroupLevelingR1,
  type AnchorGroupLevelingContextKey,
} from "../../../src/lib/estimate/v4/anchorGroupLevelingR1";
import {
  BELT_LEVELING_FORMULAS,
  BELT_LEVELING_NORMATIVE_PARAMETER_IDS,
  BELT_LEVELING_NORM_ID,
  BELT_LEVELING_PARAMETERS,
  BELT_LEVELING_RESOURCES,
  BELT_LEVELING_SOURCE_ID,
  BELT_LEVELING_SOURCE_METADATA,
  BELT_LEVELING_TARGETS,
  beltLevelingAcceptanceInputR1,
  compileBeltLevelingR1,
  type BeltLevelingContextKey,
} from "../../../src/lib/estimate/v4/beltLevelingR1";
import {
  COLUMN_BASE_LEVELING_FORMULAS,
  COLUMN_BASE_LEVELING_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_LEVELING_NORM_ID,
  COLUMN_BASE_LEVELING_PARAMETERS,
  COLUMN_BASE_LEVELING_RESOURCES,
  COLUMN_BASE_LEVELING_SOURCE_ID,
  COLUMN_BASE_LEVELING_SOURCE_METADATA,
  COLUMN_BASE_LEVELING_TARGETS,
  columnBaseLevelingAcceptanceInputR1,
  compileColumnBaseLevelingR1,
  type ColumnBaseLevelingContextKey,
} from "../../../src/lib/estimate/v4/columnBaseLevelingR1";
import {
  ANCHOR_GROUP_VIBRATION_FORMULAS,
  ANCHOR_GROUP_VIBRATION_NORMATIVE_PARAMETER_IDS,
  ANCHOR_GROUP_VIBRATION_NORM_ID,
  ANCHOR_GROUP_VIBRATION_PARAMETERS,
  ANCHOR_GROUP_VIBRATION_RESOURCES,
  ANCHOR_GROUP_VIBRATION_SOURCE_ID,
  ANCHOR_GROUP_VIBRATION_SOURCE_METADATA,
  ANCHOR_GROUP_VIBRATION_TARGETS,
  anchorGroupVibrationAcceptanceInputR1,
  compileAnchorGroupVibrationR1,
  type AnchorGroupVibrationContextKey,
} from "../../../src/lib/estimate/v4/anchorGroupVibrationR1";
import {
  BELT_VIBRATION_FORMULAS, BELT_VIBRATION_NORMATIVE_PARAMETER_IDS,
  BELT_VIBRATION_NORM_ID, BELT_VIBRATION_PARAMETERS, BELT_VIBRATION_RESOURCES,
  BELT_VIBRATION_SOURCE_ID, BELT_VIBRATION_SOURCE_METADATA, BELT_VIBRATION_TARGETS,
  beltVibrationAcceptanceInputR1, compileBeltVibrationR1, type BeltVibrationContextKey,
} from "../../../src/lib/estimate/v4/beltVibrationR1";
import {
  COLUMN_BASE_VIBRATION_FORMULAS, COLUMN_BASE_VIBRATION_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_VIBRATION_NORM_ID, COLUMN_BASE_VIBRATION_PARAMETERS,
  COLUMN_BASE_VIBRATION_RESOURCES, COLUMN_BASE_VIBRATION_SOURCE_ID,
  COLUMN_BASE_VIBRATION_SOURCE_METADATA, COLUMN_BASE_VIBRATION_TARGETS,
  columnBaseVibrationAcceptanceInputR1, compileColumnBaseVibrationR1,
  type ColumnBaseVibrationContextKey,
} from "../../../src/lib/estimate/v4/columnBaseVibrationR1";
import {
  CONCRETE_SLAB_LEVELING_FORMULAS,
  CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_LEVELING_NORM_ID,
  CONCRETE_SLAB_LEVELING_PARAMETERS,
  CONCRETE_SLAB_LEVELING_RESOURCES,
  CONCRETE_SLAB_LEVELING_SOURCE_ID,
  CONCRETE_SLAB_LEVELING_SOURCE_METADATA,
  CONCRETE_SLAB_LEVELING_TARGETS,
  compileConcreteSlabLevelingR1,
  concreteSlabLevelingAcceptanceInputR1,
  type ConcreteSlabLevelingContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabLevelingR1";
import {
  CONCRETE_SLAB_REPAIR_FORMULAS,
  CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_REPAIR_NORM_ID,
  CONCRETE_SLAB_REPAIR_PARAMETERS,
  CONCRETE_SLAB_REPAIR_RESOURCES,
  CONCRETE_SLAB_REPAIR_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
  CONCRETE_SLAB_REPAIR_TARGETS,
  compileConcreteSlabRepairR1,
  concreteSlabRepairAcceptanceInputR1,
  type ConcreteSlabRepairContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabRepairR1";
import {
  ANCHOR_GROUP_REPAIR_FORMULAS,
  ANCHOR_GROUP_REPAIR_NORMATIVE_PARAMETER_IDS,
  ANCHOR_GROUP_REPAIR_NORM_ID,
  ANCHOR_GROUP_REPAIR_PARAMETERS,
  ANCHOR_GROUP_REPAIR_RESOURCES,
  ANCHOR_GROUP_REPAIR_SOURCE_ID,
  ANCHOR_GROUP_REPAIR_SOURCE_METADATA,
  ANCHOR_GROUP_REPAIR_TARGETS,
  anchorGroupRepairAcceptanceInputR1,
  compileAnchorGroupRepairR1,
  type AnchorGroupRepairContextKey,
} from "../../../src/lib/estimate/v4/anchorGroupRepairR1";
import {
  BELT_REPAIR_FORMULAS,
  BELT_REPAIR_NORMATIVE_PARAMETER_IDS,
  BELT_REPAIR_NORM_ID,
  BELT_REPAIR_PARAMETERS,
  BELT_REPAIR_RESOURCES,
  BELT_REPAIR_SOURCE_ID,
  BELT_REPAIR_SOURCE_METADATA,
  BELT_REPAIR_TARGETS,
  beltRepairAcceptanceInputR1,
  compileBeltRepairR1,
  type BeltRepairContextKey,
} from "../../../src/lib/estimate/v4/beltRepairR1";
import {
  COLUMN_BASE_REPAIR_FORMULAS,
  COLUMN_BASE_REPAIR_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_REPAIR_NORM_ID,
  COLUMN_BASE_REPAIR_PARAMETERS,
  COLUMN_BASE_REPAIR_RESOURCES,
  COLUMN_BASE_REPAIR_SOURCE_ID,
  COLUMN_BASE_REPAIR_SOURCE_METADATA,
  COLUMN_BASE_REPAIR_TARGETS,
  columnBaseRepairAcceptanceInputR1,
  compileColumnBaseRepairR1,
  type ColumnBaseRepairContextKey,
} from "../../../src/lib/estimate/v4/columnBaseRepairR1";
import {
  PEDESTAL_REPAIR_FORMULAS, PEDESTAL_REPAIR_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_REPAIR_NORM_ID, PEDESTAL_REPAIR_PARAMETERS, PEDESTAL_REPAIR_RESOURCES,
  PEDESTAL_REPAIR_SOURCE_ID, PEDESTAL_REPAIR_SOURCE_METADATA, PEDESTAL_REPAIR_TARGETS,
  compilePedestalRepairR1, pedestalRepairAcceptanceInputR1,
  type PedestalRepairContextKey,
} from "../../../src/lib/estimate/v4/pedestalRepairR1";
import {
  PILE_CAP_REPAIR_FORMULAS, PILE_CAP_REPAIR_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_REPAIR_NORM_ID, PILE_CAP_REPAIR_PARAMETERS, PILE_CAP_REPAIR_RESOURCES,
  PILE_CAP_REPAIR_SOURCE_ID, PILE_CAP_REPAIR_SOURCE_METADATA, PILE_CAP_REPAIR_TARGETS,
  compilePileCapRepairR1, pileCapRepairAcceptanceInputR1,
  type PileCapRepairContextKey,
} from "../../../src/lib/estimate/v4/pileCapRepairR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS,
  compileConcreteSlabEmbeddedItemsR1,
  concreteSlabEmbeddedItemsAcceptanceInputR1,
  type ConcreteSlabEmbeddedItemsContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";
import {
  BELT_EMBEDDED_ITEMS_FORMULAS,
  BELT_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  BELT_EMBEDDED_ITEMS_NORM_ID,
  BELT_EMBEDDED_ITEMS_PARAMETERS,
  BELT_EMBEDDED_ITEMS_RESOURCES,
  BELT_EMBEDDED_ITEMS_SOURCE_ID,
  BELT_EMBEDDED_ITEMS_SOURCE_METADATA,
  BELT_EMBEDDED_ITEMS_TARGETS,
  beltEmbeddedItemsAcceptanceInputR1,
  compileBeltEmbeddedItemsR1,
  type BeltEmbeddedItemsContextKey,
} from "../../../src/lib/estimate/v4/beltEmbeddedItemsR1";
import {
  COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS,
  COLUMN_BASE_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_EMBEDDED_ITEMS_NORM_ID,
  COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS,
  COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES,
  COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID,
  COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_METADATA,
  COLUMN_BASE_EMBEDDED_ITEMS_TARGETS,
  columnBaseEmbeddedItemsAcceptanceInputR1,
  compileColumnBaseEmbeddedItemsR1,
  type ColumnBaseEmbeddedItemsContextKey,
} from "../../../src/lib/estimate/v4/columnBaseEmbeddedItemsR1";
import {
  PEDESTAL_EMBEDDED_ITEMS_FORMULAS, PEDESTAL_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_EMBEDDED_ITEMS_NORM_ID, PEDESTAL_EMBEDDED_ITEMS_PARAMETERS,
  PEDESTAL_EMBEDDED_ITEMS_RESOURCES, PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID,
  PEDESTAL_EMBEDDED_ITEMS_SOURCE_METADATA, PEDESTAL_EMBEDDED_ITEMS_TARGETS,
  pedestalEmbeddedItemsAcceptanceInputR1, compilePedestalEmbeddedItemsR1,
  type PedestalEmbeddedItemsContextKey,
} from "../../../src/lib/estimate/v4/pedestalEmbeddedItemsR1";
import {
  PILE_CAP_EMBEDDED_ITEMS_FORMULAS, PILE_CAP_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_EMBEDDED_ITEMS_NORM_ID, PILE_CAP_EMBEDDED_ITEMS_PARAMETERS,
  PILE_CAP_EMBEDDED_ITEMS_RESOURCES, PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID,
  PILE_CAP_EMBEDDED_ITEMS_SOURCE_METADATA, PILE_CAP_EMBEDDED_ITEMS_TARGETS,
  pileCapEmbeddedItemsAcceptanceInputR1, compilePileCapEmbeddedItemsR1,
  type PileCapEmbeddedItemsContextKey,
} from "../../../src/lib/estimate/v4/pileCapEmbeddedItemsR1";
import {
  FORMWORK_EMBEDDED_ITEMS_FORMULAS, FORMWORK_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  FORMWORK_EMBEDDED_ITEMS_NORM_ID, FORMWORK_EMBEDDED_ITEMS_PARAMETERS,
  FORMWORK_EMBEDDED_ITEMS_RESOURCES, FORMWORK_EMBEDDED_ITEMS_SOURCE_ID,
  FORMWORK_EMBEDDED_ITEMS_SOURCE_METADATA, FORMWORK_EMBEDDED_ITEMS_TARGETS,
  formworkEmbeddedItemsAcceptanceInputR1, compileFormworkEmbeddedItemsR1,
  type FormworkEmbeddedItemsContextKey,
} from "../../../src/lib/estimate/v4/formworkEmbeddedItemsR1";
import {
  PEDESTAL_CURING_FORMULAS, PEDESTAL_CURING_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_CURING_NORM_ID, PEDESTAL_CURING_PARAMETERS, PEDESTAL_CURING_RESOURCES,
  PEDESTAL_CURING_SOURCE_ID, PEDESTAL_CURING_SOURCE_METADATA, PEDESTAL_CURING_TARGETS,
  compilePedestalCuringR1, pedestalCuringAcceptanceInputR1,
  type PedestalCuringContextKey,
} from "../../../src/lib/estimate/v4/pedestalCuringR1";
import {
  PILE_CAP_CURING_FORMULAS, PILE_CAP_CURING_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_CURING_NORM_ID, PILE_CAP_CURING_PARAMETERS, PILE_CAP_CURING_RESOURCES,
  PILE_CAP_CURING_SOURCE_ID, PILE_CAP_CURING_SOURCE_METADATA, PILE_CAP_CURING_TARGETS,
  compilePileCapCuringR1, pileCapCuringAcceptanceInputR1,
  type PileCapCuringContextKey,
} from "../../../src/lib/estimate/v4/pileCapCuringR1";
import {
  PEDESTAL_LEVELING_FORMULAS, PEDESTAL_LEVELING_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_LEVELING_NORM_ID, PEDESTAL_LEVELING_PARAMETERS, PEDESTAL_LEVELING_RESOURCES,
  PEDESTAL_LEVELING_SOURCE_ID, PEDESTAL_LEVELING_SOURCE_METADATA, PEDESTAL_LEVELING_TARGETS,
  compilePedestalLevelingR1, pedestalLevelingAcceptanceInputR1,
  type PedestalLevelingContextKey,
} from "../../../src/lib/estimate/v4/pedestalLevelingR1";
import {
  PILE_CAP_LEVELING_FORMULAS, PILE_CAP_LEVELING_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_LEVELING_NORM_ID, PILE_CAP_LEVELING_PARAMETERS, PILE_CAP_LEVELING_RESOURCES,
  PILE_CAP_LEVELING_SOURCE_ID, PILE_CAP_LEVELING_SOURCE_METADATA, PILE_CAP_LEVELING_TARGETS,
  compilePileCapLevelingR1, pileCapLevelingAcceptanceInputR1,
  type PileCapLevelingContextKey,
} from "../../../src/lib/estimate/v4/pileCapLevelingR1";
import {
  PEDESTAL_VIBRATION_FORMULAS, PEDESTAL_VIBRATION_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_VIBRATION_NORM_ID, PEDESTAL_VIBRATION_PARAMETERS, PEDESTAL_VIBRATION_RESOURCES,
  PEDESTAL_VIBRATION_SOURCE_ID, PEDESTAL_VIBRATION_SOURCE_METADATA, PEDESTAL_VIBRATION_TARGETS,
  compilePedestalVibrationR1, pedestalVibrationAcceptanceInputR1,
  type PedestalVibrationContextKey,
} from "../../../src/lib/estimate/v4/pedestalVibrationR1";
import {
  PILE_CAP_VIBRATION_FORMULAS, PILE_CAP_VIBRATION_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_VIBRATION_NORM_ID, PILE_CAP_VIBRATION_PARAMETERS, PILE_CAP_VIBRATION_RESOURCES,
  PILE_CAP_VIBRATION_SOURCE_ID, PILE_CAP_VIBRATION_SOURCE_METADATA, PILE_CAP_VIBRATION_TARGETS,
  compilePileCapVibrationR1, pileCapVibrationAcceptanceInputR1,
  type PileCapVibrationContextKey,
} from "../../../src/lib/estimate/v4/pileCapVibrationR1";
import {
  CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_NORM_ID,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_SOURCE_METADATA,
  CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS,
  compileConcreteSlabCompleteInstallationR1,
  concreteSlabCompleteInstallationAcceptanceInputR1,
  type ConcreteSlabCompleteInstallationContextKey,
} from "../../../src/lib/estimate/v4/concreteSlabCompleteInstallationR1";
import {
  CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS,
  compileConcreteJointCompleteInstallationR1,
  concreteJointCompleteInstallationAcceptanceInputR1,
  type ConcreteJointCompleteInstallationContextKey,
} from "../../../src/lib/estimate/v4/concreteJointCompleteInstallationR1";
import {
  STAIRS_COMPLETE_INSTALLATION_FORMULAS,
  STAIRS_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
  STAIRS_COMPLETE_INSTALLATION_NORM_ID,
  STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
  STAIRS_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID,
  STAIRS_COMPLETE_INSTALLATION_RESOURCES,
  STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA,
  STAIRS_COMPLETE_INSTALLATION_TARGETS,
  compileStairsCompleteInstallationR1,
  stairsCompleteInstallationAcceptanceInputR1,
  type StairsCompleteInstallationContextKey,
} from "../../../src/lib/estimate/v4/stairsCompleteInstallationR1";
import {
  PILE_CAP_CONCRETE_PLACEMENT_FORMULAS,
  PILE_CAP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_CONCRETE_PLACEMENT_PARAMETERS,
  PILE_CAP_CONCRETE_PLACEMENT_RESOURCES,
  PILE_CAP_CONCRETE_PLACEMENT_TARGETS,
  compilePileCapConcretePlacementR1,
  pileCapConcretePlacementAcceptanceInputR1,
  type PileCapConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/pileCapConcretePlacementR1";
import {
  PEDESTAL_CONCRETE_PLACEMENT_FORMULAS,
  PEDESTAL_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_CONCRETE_PLACEMENT_PARAMETERS,
  PEDESTAL_CONCRETE_PLACEMENT_RESOURCES,
  PEDESTAL_CONCRETE_PLACEMENT_TARGETS,
  compilePedestalConcretePlacementR1,
  pedestalConcretePlacementAcceptanceInputR1,
  type PedestalConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/pedestalConcretePlacementR1";
import {
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS,
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
  SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  compileSlabFoundationConcretePlacementR1,
  slabFoundationConcretePlacementAcceptanceInputR1,
  type SlabFoundationConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/slabFoundationConcretePlacementR1";
import {
  STAIRS_CONCRETE_PLACEMENT_FORMULAS,
  STAIRS_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  STAIRS_CONCRETE_PLACEMENT_PARAMETERS,
  STAIRS_CONCRETE_PLACEMENT_RESOURCES,
  STAIRS_CONCRETE_PLACEMENT_TARGETS,
  compileStairsConcretePlacementR1,
  stairsConcretePlacementAcceptanceInputR1,
  type StairsConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/stairsConcretePlacementR1";
import {
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_FORMULAS,
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_PARAMETERS,
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_RESOURCES,
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS,
  compileReinforcementFrameConcretePlacementR1,
  reinforcementFrameConcretePlacementAcceptanceInputR1,
  type ReinforcementFrameConcretePlacementContextKey,
} from "../../../src/lib/estimate/v4/reinforcementFrameConcretePlacementR1";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  preflightCanonicalParameterTruthMetadata,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

type CompiledFamilyResult = Readonly<{
  rows: readonly Json[];
  preliminaryNeeds: readonly unknown[];
  totals: Json;
}>;

type ConcreteSlabOperationKey =
  | "vibration"
  | "slab_foundation_vibration"
  | "curing"
  | "anchor_group_curing"
  | "belt_curing"
  | "column_base_curing"
  | "anchor_group_leveling"
  | "belt_leveling"
  | "column_base_leveling"
  | "pedestal_leveling"
  | "pile_cap_leveling"
  | "anchor_group_vibration"
  | "belt_vibration"
  | "column_base_vibration"
  | "pedestal_vibration"
  | "pile_cap_vibration"
  | "leveling"
  | "repair"
  | "anchor_group_repair"
  | "belt_repair"
  | "column_base_repair"
  | "pedestal_repair"
  | "pile_cap_repair"
  | "embedded_items"
  | "belt_embedded_items"
  | "column_base_embedded_items"
  | "pedestal_embedded_items"
  | "pile_cap_embedded_items"
  | "formwork_embedded_items"
  | "pedestal_curing"
  | "pile_cap_curing"
  | "complete_installation"
  | "joint_complete_installation"
  | "stairs_complete_installation";

type ConcreteSlabOperationProfile = Readonly<{
  contract: string;
  masterPath: string;
  masterSha256: string;
  parentReleaseId: string;
  parentSearchReleaseId: string;
  outputRoot: string;
  targets: readonly Json[];
  parameters: readonly Json[];
  formulas: readonly Json[];
  resources: readonly Json[];
  normativeParameterIds: readonly string[];
  sourcePaths: readonly string[];
  releaseSlug: string;
  statusFamily: string;
  targetCountMetadataKey: string;
  receiptFilePrefix: string;
  currentReleaseOwner: string;
  primaryNormId: string;
  primarySourceId: string;
  primarySourceMetadata: Json;
  normativeOwnerRowId: string;
  expectedTargetCount: number;
  sourceEffectiveFrom: string;
  sourceUseRestriction: string;
  acceptanceInput: (contextKey: string) => Readonly<Record<string, string | number | boolean>>;
  compile: (parameters: Record<string, unknown>, catalogId: string) => Promise<Json>;
}>;

const ANCHOR_GROUP_MODE = process.argv.includes("--anchor-group");
const COLUMN_BASE_MODE = process.argv.includes("--column-base");
const BELT_MODE = process.argv.includes("--belt");
const CONCRETE_SLAB_MODE = process.argv.includes("--concrete-slab");
const explicitConcreteSlabOperation = process.argv
  .find((argument) => argument.startsWith("--concrete-slab-operation="))
  ?.split("=", 2)[1] as ConcreteSlabOperationKey | undefined;
const requestedConcreteSlabOperations = [
  ...(process.argv.includes("--concrete-slab-vibration") ? ["vibration" as const] : []),
  ...(process.argv.includes("--slab-foundation-vibration")
    ? ["slab_foundation_vibration" as const]
    : []),
  ...(process.argv.includes("--concrete-slab-curing") ? ["curing" as const] : []),
  ...(process.argv.includes("--anchor-group-curing") ? ["anchor_group_curing" as const] : []),
  ...(process.argv.includes("--belt-curing") ? ["belt_curing" as const] : []),
  ...(process.argv.includes("--column-base-curing") ? ["column_base_curing" as const] : []),
  ...(process.argv.includes("--anchor-group-leveling") ? ["anchor_group_leveling" as const] : []),
  ...(process.argv.includes("--belt-leveling") ? ["belt_leveling" as const] : []),
  ...(process.argv.includes("--column-base-leveling") ? ["column_base_leveling" as const] : []),
  ...(process.argv.includes("--pedestal-leveling") ? ["pedestal_leveling" as const] : []),
  ...(process.argv.includes("--pile-cap-leveling") ? ["pile_cap_leveling" as const] : []),
  ...(process.argv.includes("--anchor-group-vibration") ? ["anchor_group_vibration" as const] : []),
  ...(process.argv.includes("--belt-vibration") ? ["belt_vibration" as const] : []),
  ...(process.argv.includes("--column-base-vibration") ? ["column_base_vibration" as const] : []),
  ...(process.argv.includes("--pedestal-vibration") ? ["pedestal_vibration" as const] : []),
  ...(process.argv.includes("--pile-cap-vibration") ? ["pile_cap_vibration" as const] : []),
  ...(process.argv.includes("--concrete-slab-leveling") ? ["leveling" as const] : []),
  ...(process.argv.includes("--anchor-group-repair") ? ["anchor_group_repair" as const] : []),
  ...(process.argv.includes("--belt-repair") ? ["belt_repair" as const] : []),
  ...(process.argv.includes("--column-base-repair") ? ["column_base_repair" as const] : []),
  ...(process.argv.includes("--pedestal-repair") ? ["pedestal_repair" as const] : []),
  ...(process.argv.includes("--pile-cap-repair") ? ["pile_cap_repair" as const] : []),
  ...(process.argv.includes("--belt-embedded-items") ? ["belt_embedded_items" as const] : []),
  ...(process.argv.includes("--column-base-embedded-items")
    ? ["column_base_embedded_items" as const]
    : []),
  ...(process.argv.includes("--pedestal-embedded-items") ? ["pedestal_embedded_items" as const] : []),
  ...(process.argv.includes("--pile-cap-embedded-items") ? ["pile_cap_embedded_items" as const] : []),
  ...(process.argv.includes("--formwork-embedded-items") ? ["formwork_embedded_items" as const] : []),
  ...(process.argv.includes("--pedestal-curing") ? ["pedestal_curing" as const] : []),
  ...(process.argv.includes("--pile-cap-curing") ? ["pile_cap_curing" as const] : []),
  ...(process.argv.includes("--concrete-slab-complete") ? ["complete_installation" as const] : []),
  ...(process.argv.includes("--concrete-joint-complete")
    ? ["joint_complete_installation" as const]
    : []),
  ...(process.argv.includes("--concrete-stairs-complete")
    ? ["stairs_complete_installation" as const]
    : []),
  ...(explicitConcreteSlabOperation ? [explicitConcreteSlabOperation] : []),
];
if (requestedConcreteSlabOperations.length > 1) {
  throw new Error("STOP_CONCRETE_SLAB_OPERATION_MODE_AMBIGUOUS");
}
const CONCRETE_SLAB_OPERATION_KEY = requestedConcreteSlabOperations[0] ?? null;
if (CONCRETE_SLAB_OPERATION_KEY
  && !(["vibration", "slab_foundation_vibration", "anchor_group_vibration", "belt_vibration", "column_base_vibration", "pedestal_vibration", "pile_cap_vibration", "curing", "anchor_group_curing", "belt_curing", "column_base_curing", "pedestal_curing", "pile_cap_curing", "anchor_group_leveling", "belt_leveling", "column_base_leveling", "pedestal_leveling", "pile_cap_leveling", "leveling", "repair", "anchor_group_repair", "belt_repair", "column_base_repair", "pedestal_repair", "pile_cap_repair", "embedded_items", "belt_embedded_items", "column_base_embedded_items", "pedestal_embedded_items", "pile_cap_embedded_items", "formwork_embedded_items", "complete_installation", "joint_complete_installation", "stairs_complete_installation"] as const)
    .includes(CONCRETE_SLAB_OPERATION_KEY)) {
  throw new Error(`STOP_CONCRETE_SLAB_OPERATION_UNSUPPORTED:${CONCRETE_SLAB_OPERATION_KEY}`);
}
const CONCRETE_SLAB_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "vibration";
const SLAB_FOUNDATION_VIBRATION_MODE =
  CONCRETE_SLAB_OPERATION_KEY === "slab_foundation_vibration";
const ANCHOR_GROUP_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "anchor_group_vibration";
const BELT_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "belt_vibration";
const COLUMN_BASE_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "column_base_vibration";
const PEDESTAL_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "pedestal_vibration";
const PILE_CAP_VIBRATION_MODE = CONCRETE_SLAB_OPERATION_KEY === "pile_cap_vibration";
const INTERNAL_VIBRATION_MODE = CONCRETE_SLAB_VIBRATION_MODE
  || SLAB_FOUNDATION_VIBRATION_MODE
  || ANCHOR_GROUP_VIBRATION_MODE
  || BELT_VIBRATION_MODE
  || COLUMN_BASE_VIBRATION_MODE
  || PEDESTAL_VIBRATION_MODE
  || PILE_CAP_VIBRATION_MODE;
const VIBRATION_ELEMENT_RU = PILE_CAP_VIBRATION_MODE
  ? "бетона ростверка"
  : PEDESTAL_VIBRATION_MODE ? "бетона бетонного пьедестала"
  : COLUMN_BASE_VIBRATION_MODE ? "бетона столбчатого основания"
  : BELT_VIBRATION_MODE ? "бетона монолитного пояса"
  : ANCHOR_GROUP_VIBRATION_MODE ? "бетона основания анкерной группы"
  : SLAB_FOUNDATION_VIBRATION_MODE ? "бетона плитного фундамента" : "бетонной плиты";
const VIBRATION_ROW_TOKEN = PILE_CAP_VIBRATION_MODE ? "pile-cap-vibration"
  : PEDESTAL_VIBRATION_MODE ? "pedestal-vibration"
  : COLUMN_BASE_VIBRATION_MODE ? "column-base-vibration"
  : BELT_VIBRATION_MODE ? "belt-vibration"
  : ANCHOR_GROUP_VIBRATION_MODE ? "anchor-group-vibration" : "slab-vibration";
const CONCRETE_SLAB_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "curing";
const ANCHOR_GROUP_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "anchor_group_curing";
const BELT_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "belt_curing";
const COLUMN_BASE_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "column_base_curing";
const PEDESTAL_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "pedestal_curing";
const PILE_CAP_CURING_MODE = CONCRETE_SLAB_OPERATION_KEY === "pile_cap_curing";
const EXTERNAL_CURING_MODE = CONCRETE_SLAB_CURING_MODE
  || ANCHOR_GROUP_CURING_MODE
  || BELT_CURING_MODE
  || COLUMN_BASE_CURING_MODE
  || PEDESTAL_CURING_MODE
  || PILE_CAP_CURING_MODE;
const CURING_ELEMENT_RU = PILE_CAP_CURING_MODE
  ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
  : PEDESTAL_CURING_MODE
  ? "бетонного пьедестала"
  : COLUMN_BASE_CURING_MODE
  ? "столбчатого основания"
  : BELT_CURING_MODE
  ? "монолитного пояса"
  : ANCHOR_GROUP_CURING_MODE
    ? "основания анкерной группы"
    : "бетонной плиты";
const CURING_ROW_TOKEN = PILE_CAP_CURING_MODE
  ? "pile-cap-curing"
  : PEDESTAL_CURING_MODE
  ? "pedestal-curing"
  : COLUMN_BASE_CURING_MODE
  ? "column-base-curing"
  : BELT_CURING_MODE
  ? "belt-curing"
  : ANCHOR_GROUP_CURING_MODE
    ? "anchor-group-curing"
    : "slab-curing";
const CONCRETE_SLAB_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "leveling";
const ANCHOR_GROUP_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "anchor_group_leveling";
const BELT_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "belt_leveling";
const COLUMN_BASE_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "column_base_leveling";
const PEDESTAL_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "pedestal_leveling";
const PILE_CAP_LEVELING_MODE = CONCRETE_SLAB_OPERATION_KEY === "pile_cap_leveling";
const SURFACE_LEVELING_MODE = CONCRETE_SLAB_LEVELING_MODE
  || ANCHOR_GROUP_LEVELING_MODE
  || BELT_LEVELING_MODE
  || COLUMN_BASE_LEVELING_MODE
  || PEDESTAL_LEVELING_MODE
  || PILE_CAP_LEVELING_MODE;
const LEVELING_ELEMENT_RU = PILE_CAP_LEVELING_MODE
  ? "\u0431\u0435\u0442\u043e\u043d\u0430 \u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
  : PEDESTAL_LEVELING_MODE
  ? "\u0431\u0435\u0442\u043e\u043d\u0430 \u0431\u0435\u0442\u043e\u043d\u043d\u043e\u0433\u043e \u043f\u044c\u0435\u0434\u0435\u0441\u0442\u0430\u043b\u0430"
  : COLUMN_BASE_LEVELING_MODE
  ? "бетона столбчатого основания"
  : BELT_LEVELING_MODE
  ? "бетона монолитного пояса"
  : ANCHOR_GROUP_LEVELING_MODE
    ? "бетона основания анкерной группы"
    : "бетонной плиты";
const LEVELING_ROW_TOKEN = PILE_CAP_LEVELING_MODE
  ? "pile-cap-leveling"
  : PEDESTAL_LEVELING_MODE
  ? "pedestal-leveling"
  : COLUMN_BASE_LEVELING_MODE
  ? "column-base-leveling"
  : BELT_LEVELING_MODE
  ? "belt-leveling"
  : ANCHOR_GROUP_LEVELING_MODE
    ? "anchor-group-leveling"
    : "slab-leveling";
const CONCRETE_SLAB_REPAIR_MODE = CONCRETE_SLAB_OPERATION_KEY === "repair";
const ANCHOR_GROUP_REPAIR_MODE = CONCRETE_SLAB_OPERATION_KEY === "anchor_group_repair";
const BELT_REPAIR_MODE = CONCRETE_SLAB_OPERATION_KEY === "belt_repair";
const COLUMN_BASE_REPAIR_MODE = CONCRETE_SLAB_OPERATION_KEY === "column_base_repair";
const PEDESTAL_REPAIR_MODE = CONCRETE_SLAB_OPERATION_KEY === "pedestal_repair";
const PILE_CAP_REPAIR_MODE = CONCRETE_SLAB_OPERATION_KEY === "pile_cap_repair";
const STRUCTURAL_REPAIR_MODE = CONCRETE_SLAB_REPAIR_MODE
  || ANCHOR_GROUP_REPAIR_MODE
  || BELT_REPAIR_MODE
  || COLUMN_BASE_REPAIR_MODE
  || PEDESTAL_REPAIR_MODE
  || PILE_CAP_REPAIR_MODE;
const REPAIR_ELEMENT_RU = PILE_CAP_REPAIR_MODE
  ? "ростверка"
  : PEDESTAL_REPAIR_MODE
  ? "бетонного пьедестала"
  : COLUMN_BASE_REPAIR_MODE
  ? "столбчатого основания"
  : BELT_REPAIR_MODE
  ? "монолитного пояса"
  : ANCHOR_GROUP_REPAIR_MODE
    ? "анкерной группы"
    : "бетонной плиты";
const REPAIR_ROW_TOKEN = PILE_CAP_REPAIR_MODE
  ? "pile-cap-repair"
  : PEDESTAL_REPAIR_MODE
  ? "pedestal-repair"
  : COLUMN_BASE_REPAIR_MODE
  ? "column-base-repair"
  : BELT_REPAIR_MODE ? "belt-repair" : "slab-repair";
const CONCRETE_SLAB_EMBEDDED_ITEMS_MODE = CONCRETE_SLAB_OPERATION_KEY === "embedded_items";
const BELT_EMBEDDED_ITEMS_MODE = CONCRETE_SLAB_OPERATION_KEY === "belt_embedded_items";
const COLUMN_BASE_EMBEDDED_ITEMS_MODE =
  CONCRETE_SLAB_OPERATION_KEY === "column_base_embedded_items";
const PEDESTAL_EMBEDDED_ITEMS_MODE = CONCRETE_SLAB_OPERATION_KEY === "pedestal_embedded_items";
const PILE_CAP_EMBEDDED_ITEMS_MODE = CONCRETE_SLAB_OPERATION_KEY === "pile_cap_embedded_items";
const FORMWORK_EMBEDDED_ITEMS_MODE =
  CONCRETE_SLAB_OPERATION_KEY === "formwork_embedded_items";
const EMBEDDED_ITEMS_MODE = CONCRETE_SLAB_EMBEDDED_ITEMS_MODE
  || BELT_EMBEDDED_ITEMS_MODE
  || COLUMN_BASE_EMBEDDED_ITEMS_MODE
  || PEDESTAL_EMBEDDED_ITEMS_MODE
  || PILE_CAP_EMBEDDED_ITEMS_MODE
  || FORMWORK_EMBEDDED_ITEMS_MODE;
const EMBEDDED_ITEMS_ELEMENT_RU = FORMWORK_EMBEDDED_ITEMS_MODE
  ? "опалубки"
  : PILE_CAP_EMBEDDED_ITEMS_MODE
  ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
  : PEDESTAL_EMBEDDED_ITEMS_MODE
  ? "бетонного пьедестала"
  : COLUMN_BASE_EMBEDDED_ITEMS_MODE
  ? "столбчатого основания"
  : BELT_EMBEDDED_ITEMS_MODE
  ? "монолитного пояса"
  : "бетонной плиты";
const EMBEDDED_ITEMS_ROW_TOKEN = FORMWORK_EMBEDDED_ITEMS_MODE
  ? "formwork-embedded-items"
  : PILE_CAP_EMBEDDED_ITEMS_MODE
  ? "pile-cap-embedded-items"
  : PEDESTAL_EMBEDDED_ITEMS_MODE
  ? "pedestal-embedded-items"
  : COLUMN_BASE_EMBEDDED_ITEMS_MODE
  ? "column-base-embedded-items"
  : BELT_EMBEDDED_ITEMS_MODE
  ? "belt-embedded-items"
  : "slab-embedded-items";
const CONCRETE_SLAB_COMPLETE_MODE = CONCRETE_SLAB_OPERATION_KEY === "complete_installation";
const CONCRETE_JOINT_COMPLETE_MODE =
  CONCRETE_SLAB_OPERATION_KEY === "joint_complete_installation";
const STAIRS_COMPLETE_MODE =
  CONCRETE_SLAB_OPERATION_KEY === "stairs_complete_installation";
const CONCRETE_SLAB_OPERATION_MODE = CONCRETE_SLAB_OPERATION_KEY != null;
const PILE_CAP_MODE = process.argv.includes("--pile-cap");
const PEDESTAL_MODE = process.argv.includes("--pedestal");
const SLAB_FOUNDATION_MODE = process.argv.includes("--slab-foundation");
const STAIRS_MODE = process.argv.includes("--stairs");
const REINFORCEMENT_FRAME_MODE = process.argv.includes("--reinforcement-frame");
if ([ANCHOR_GROUP_MODE, COLUMN_BASE_MODE, BELT_MODE, CONCRETE_SLAB_MODE, CONCRETE_SLAB_OPERATION_MODE, PILE_CAP_MODE, PEDESTAL_MODE, SLAB_FOUNDATION_MODE, STAIRS_MODE, REINFORCEMENT_FRAME_MODE].filter(Boolean).length > 1) {
  throw new Error("STOP_CONCRETE_PLACEMENT_FAMILY_MODE_AMBIGUOUS");
}

const CONCRETE_SLAB_OPERATION_PROFILES: Readonly<Record<
  ConcreteSlabOperationKey,
  ConcreteSlabOperationProfile
>> = Object.freeze({
  vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-slab-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md",
    masterSha256: "9bc2a957ce80d9b0086fa98523b692325d100367761e4d9cbac786d4ebd1e4ea",
    parentReleaseId: "d6c8a091-3a3e-5757-89eb-390886e9b33a",
    parentSearchReleaseId: "77159a8c-8f13-5bfa-a31b-9e39a322013d",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-vibration-family",
    targets: CONCRETE_SLAB_VIBRATION_TARGETS,
    parameters: CONCRETE_SLAB_VIBRATION_PARAMETERS,
    formulas: CONCRETE_SLAB_VIBRATION_FORMULAS,
    resources: CONCRETE_SLAB_VIBRATION_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ],
    releaseSlug: "concrete-slab-vibration",
    statusFamily: "CONCRETE_SLAB_VIBRATION",
    targetCountMetadataKey: "concreteSlabVibrationTargetCount",
    receiptFilePrefix: "01_CONCRETE_SLAB_VIBRATION",
    currentReleaseOwner: "EXACT_CONCRETE_SLAB_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_SLAB_VIBRATION_NORM_ID,
    primarySourceId: CONCRETE_SLAB_VIBRATION_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:slab-vibration",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-08-05",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => concreteSlabVibrationAcceptanceInputR1(
      contextKey as ConcreteSlabVibrationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabVibrationR1(parameters, { catalogId }),
  }),
  slab_foundation_vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.slab-foundation-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md",
    masterSha256: "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
    parentReleaseId: "c26dc62b-7473-50c5-b6cf-f06bda839f44",
    parentSearchReleaseId: "c0e9ad55-b420-50d9-9bff-f3bd2a80e086",
    outputRoot: ".release-runtime/r4a13-6/s19-first-estimate/slab-foundation-vibration-family",
    targets: SLAB_FOUNDATION_VIBRATION_TARGETS,
    parameters: CONCRETE_SLAB_VIBRATION_PARAMETERS,
    formulas: CONCRETE_SLAB_VIBRATION_FORMULAS,
    resources: CONCRETE_SLAB_VIBRATION_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/concreteSlabVibrationR1.contract.test.ts",
    ],
    releaseSlug: "slab-foundation-vibration",
    statusFamily: "SLAB_FOUNDATION_VIBRATION",
    targetCountMetadataKey: "slabFoundationVibrationTargetCount",
    receiptFilePrefix: "01_SLAB_FOUNDATION_VIBRATION",
    currentReleaseOwner: "EXACT_SLAB_FOUNDATION_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_SLAB_VIBRATION_NORM_ID,
    primarySourceId: CONCRETE_SLAB_VIBRATION_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:slab-vibration",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-08-05",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => concreteSlabVibrationAcceptanceInputR1(
      contextKey as ConcreteSlabVibrationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabVibrationR1(parameters, { catalogId }),
  }),
  anchor_group_vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.anchor-group-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "37a2bb0e-861a-5fad-bcc0-b25e0b641062",
    parentSearchReleaseId: "398d5538-ca4c-5d0d-a1e8-b1914cd35ca6",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-vibration-family",
    targets: ANCHOR_GROUP_VIBRATION_TARGETS,
    parameters: ANCHOR_GROUP_VIBRATION_PARAMETERS,
    formulas: ANCHOR_GROUP_VIBRATION_FORMULAS,
    resources: ANCHOR_GROUP_VIBRATION_RESOURCES,
    normativeParameterIds: ANCHOR_GROUP_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts",
      "src/lib/estimate/v4/anchorGroupVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/anchorGroupVibrationR1.contract.test.ts",
    ],
    releaseSlug: "anchor-group-vibration",
    statusFamily: "ANCHOR_GROUP_VIBRATION",
    targetCountMetadataKey: "anchorGroupVibrationTargetCount",
    receiptFilePrefix: "01_ANCHOR_GROUP_VIBRATION",
    currentReleaseOwner: "EXACT_ANCHOR_GROUP_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: ANCHOR_GROUP_VIBRATION_NORM_ID,
    primarySourceId: ANCHOR_GROUP_VIBRATION_SOURCE_ID,
    primarySourceMetadata: ANCHOR_GROUP_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:anchor-group-vibration",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-08-05",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => anchorGroupVibrationAcceptanceInputR1(
      contextKey as AnchorGroupVibrationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileAnchorGroupVibrationR1(parameters, { catalogId }),
  }),
  belt_vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.belt-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "47487585-a96b-5155-b72f-cddc3dea7290",
    parentSearchReleaseId: "c1cc90d6-8fcb-541d-8299-91ab19659623",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-vibration-family",
    targets: BELT_VIBRATION_TARGETS, parameters: BELT_VIBRATION_PARAMETERS,
    formulas: BELT_VIBRATION_FORMULAS, resources: BELT_VIBRATION_RESOURCES,
    normativeParameterIds: BELT_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json", "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts", "src/lib/estimate/v4/beltVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/beltVibrationR1.contract.test.ts",
    ],
    releaseSlug: "belt-vibration", statusFamily: "BELT_VIBRATION",
    targetCountMetadataKey: "beltVibrationTargetCount", receiptFilePrefix: "01_BELT_VIBRATION",
    currentReleaseOwner: "EXACT_BELT_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: BELT_VIBRATION_NORM_ID, primarySourceId: BELT_VIBRATION_SOURCE_ID,
    primarySourceMetadata: BELT_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:belt-vibration", expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-08-05",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => beltVibrationAcceptanceInputR1(contextKey as BeltVibrationContextKey),
    compile: (parameters: Record<string, unknown>, catalogId: string) => compileBeltVibrationR1(parameters, { catalogId }),
  }),
  column_base_vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.column-base-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "d9c6b9f5-7f6b-5c79-b6aa-1b63c41234f9",
    parentSearchReleaseId: "28363232-84c2-50dc-a510-41a66d175779",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-vibration-family",
    targets: COLUMN_BASE_VIBRATION_TARGETS, parameters: COLUMN_BASE_VIBRATION_PARAMETERS,
    formulas: COLUMN_BASE_VIBRATION_FORMULAS, resources: COLUMN_BASE_VIBRATION_RESOURCES,
    normativeParameterIds: COLUMN_BASE_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json", "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts", "src/lib/estimate/v4/beltVibrationR1.ts",
      "src/lib/estimate/v4/columnBaseVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/columnBaseVibrationR1.contract.test.ts",
    ],
    releaseSlug: "column-base-vibration", statusFamily: "COLUMN_BASE_VIBRATION",
    targetCountMetadataKey: "columnBaseVibrationTargetCount", receiptFilePrefix: "01_COLUMN_BASE_VIBRATION",
    currentReleaseOwner: "EXACT_COLUMN_BASE_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: COLUMN_BASE_VIBRATION_NORM_ID, primarySourceId: COLUMN_BASE_VIBRATION_SOURCE_ID,
    primarySourceMetadata: COLUMN_BASE_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:column-base-vibration", expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-01-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_VIBRATION_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => columnBaseVibrationAcceptanceInputR1(
      contextKey as ColumnBaseVibrationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileColumnBaseVibrationR1(parameters, { catalogId }),
  }),
  pedestal_vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pedestal-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (20).md",
    masterSha256: "17b374957c52d9361497645d210d370216bb98dd9443016684d09a5c105426db",
    parentReleaseId: "c18771ad-0acc-581f-9893-568870688ba2",
    parentSearchReleaseId: "caf6f42b-f66e-5ded-955b-bfa508871c3e",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-vibration-family",
    targets: PEDESTAL_VIBRATION_TARGETS,
    parameters: PEDESTAL_VIBRATION_PARAMETERS,
    formulas: PEDESTAL_VIBRATION_FORMULAS,
    resources: PEDESTAL_VIBRATION_RESOURCES,
    normativeParameterIds: PEDESTAL_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts",
      "src/lib/estimate/v4/beltVibrationR1.ts",
      "src/lib/estimate/v4/columnBaseVibrationR1.ts",
      "src/lib/estimate/v4/pedestalVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pedestalVibrationR1.contract.test.ts",
    ],
    releaseSlug: "pedestal-vibration",
    statusFamily: "PEDESTAL_VIBRATION",
    targetCountMetadataKey: "pedestalVibrationTargetCount",
    receiptFilePrefix: "01_PEDESTAL_VIBRATION",
    currentReleaseOwner: "EXACT_PEDESTAL_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: PEDESTAL_VIBRATION_NORM_ID,
    primarySourceId: PEDESTAL_VIBRATION_SOURCE_ID,
    primarySourceMetadata: PEDESTAL_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pedestal-vibration",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-01-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_VIBRATION_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => pedestalVibrationAcceptanceInputR1(
      contextKey as PedestalVibrationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePedestalVibrationR1(parameters, { catalogId }),
  }),
  pile_cap_vibration: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pile-cap-vibration-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (22).md",
    masterSha256: "2b0dd5ca61659d1f73a6546b646757d65791a0a3ac8eae17fca0aa591a697db6",
    parentReleaseId: "90fed1f9-f410-54e5-9c2c-ceeea6120bb8",
    parentSearchReleaseId: "728d1bf1-580e-5b8a-a1c9-5a70ffb61ac3",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-vibration-family",
    targets: PILE_CAP_VIBRATION_TARGETS,
    parameters: PILE_CAP_VIBRATION_PARAMETERS,
    formulas: PILE_CAP_VIBRATION_FORMULAS,
    resources: PILE_CAP_VIBRATION_RESOURCES,
    normativeParameterIds: PILE_CAP_VIBRATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabVibrationR1.ts",
      "src/lib/estimate/v4/columnBaseVibrationR1.ts",
      "src/lib/estimate/v4/pedestalVibrationR1.ts",
      "src/lib/estimate/v4/pileCapVibrationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pileCapVibrationR1.contract.test.ts",
    ],
    releaseSlug: "pile-cap-vibration",
    statusFamily: "PILE_CAP_VIBRATION",
    targetCountMetadataKey: "pileCapVibrationTargetCount",
    receiptFilePrefix: "01_PILE_CAP_VIBRATION",
    currentReleaseOwner: "EXACT_PILE_CAP_VIBRATION_FAMILY_SUCCESSOR",
    primaryNormId: PILE_CAP_VIBRATION_NORM_ID,
    primarySourceId: PILE_CAP_VIBRATION_SOURCE_ID,
    primarySourceMetadata: PILE_CAP_VIBRATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pile-cap-vibration",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2005-01-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_VIBRATION_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => pileCapVibrationAcceptanceInputR1(
      contextKey as PileCapVibrationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePileCapVibrationR1(parameters, { catalogId }),
  }),
  curing: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-slab-curing-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md",
    masterSha256: "9bc2a957ce80d9b0086fa98523b692325d100367761e4d9cbac786d4ebd1e4ea",
    parentReleaseId: "37491173-bdce-5137-bc55-6cba4ce15768",
    parentSearchReleaseId: "c8c18ba6-1aa1-5581-99ee-871e3037c6ce",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-curing-family",
    targets: CONCRETE_SLAB_CURING_TARGETS,
    parameters: CONCRETE_SLAB_CURING_PARAMETERS,
    formulas: CONCRETE_SLAB_CURING_FORMULAS,
    resources: CONCRETE_SLAB_CURING_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_CURING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabCuringR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ],
    releaseSlug: "concrete-slab-curing",
    statusFamily: "CONCRETE_SLAB_CURING",
    targetCountMetadataKey: "concreteSlabCuringTargetCount",
    receiptFilePrefix: "01_CONCRETE_SLAB_CURING",
    currentReleaseOwner: "EXACT_CONCRETE_SLAB_CURING_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_SLAB_CURING_NORM_ID,
    primarySourceId: CONCRETE_SLAB_CURING_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_CURING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:slab-curing",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2023-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_CURING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => concreteSlabCuringAcceptanceInputR1(
      contextKey as ConcreteSlabCuringContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabCuringR1(parameters, { catalogId }),
  }),
  anchor_group_curing: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.anchor-group-curing-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "784d49a3-1347-5fa3-b8d3-3be09b96d028",
    parentSearchReleaseId: "279c4914-5b02-52dd-959c-24fa3d18fcc7",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-curing-family",
    targets: ANCHOR_GROUP_CURING_TARGETS,
    parameters: ANCHOR_GROUP_CURING_PARAMETERS,
    formulas: ANCHOR_GROUP_CURING_FORMULAS,
    resources: ANCHOR_GROUP_CURING_RESOURCES,
    normativeParameterIds: ANCHOR_GROUP_CURING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabCuringR1.ts",
      "src/lib/estimate/v4/anchorGroupCuringR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/anchorGroupCuringR1.contract.test.ts",
    ],
    releaseSlug: "anchor-group-curing",
    statusFamily: "ANCHOR_GROUP_CURING",
    targetCountMetadataKey: "anchorGroupCuringTargetCount",
    receiptFilePrefix: "01_ANCHOR_GROUP_CURING",
    currentReleaseOwner: "EXACT_ANCHOR_GROUP_CURING_FAMILY_SUCCESSOR",
    primaryNormId: ANCHOR_GROUP_CURING_NORM_ID,
    primarySourceId: ANCHOR_GROUP_CURING_SOURCE_ID,
    primarySourceMetadata: ANCHOR_GROUP_CURING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:anchor-group-curing",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2023-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_CURING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => anchorGroupCuringAcceptanceInputR1(
      contextKey as AnchorGroupCuringContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileAnchorGroupCuringR1(parameters, { catalogId }),
  }),
  belt_curing: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.belt-curing-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "9592df17-9f3b-570a-8619-1f570880b352",
    parentSearchReleaseId: "0aa1aaed-fc3e-5893-aad0-4ac4a22d7184",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-curing-family",
    targets: BELT_CURING_TARGETS,
    parameters: BELT_CURING_PARAMETERS,
    formulas: BELT_CURING_FORMULAS,
    resources: BELT_CURING_RESOURCES,
    normativeParameterIds: BELT_CURING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabCuringR1.ts",
      "src/lib/estimate/v4/beltCuringR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/beltCuringR1.contract.test.ts",
    ],
    releaseSlug: "belt-curing",
    statusFamily: "BELT_CURING",
    targetCountMetadataKey: "beltCuringTargetCount",
    receiptFilePrefix: "01_BELT_CURING",
    currentReleaseOwner: "EXACT_BELT_CURING_FAMILY_SUCCESSOR",
    primaryNormId: BELT_CURING_NORM_ID,
    primarySourceId: BELT_CURING_SOURCE_ID,
    primarySourceMetadata: BELT_CURING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:belt-curing",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2023-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_CURING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => beltCuringAcceptanceInputR1(
      contextKey as BeltCuringContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileBeltCuringR1(parameters, { catalogId }),
  }),
  column_base_curing: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.column-base-curing-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "df3c434e-a799-5716-82ee-427e15b50563",
    parentSearchReleaseId: "9b2b3f37-1864-5a89-958f-b11560f56445",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-curing-family",
    targets: COLUMN_BASE_CURING_TARGETS,
    parameters: COLUMN_BASE_CURING_PARAMETERS,
    formulas: COLUMN_BASE_CURING_FORMULAS,
    resources: COLUMN_BASE_CURING_RESOURCES,
    normativeParameterIds: COLUMN_BASE_CURING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabCuringR1.ts",
      "src/lib/estimate/v4/beltCuringR1.ts",
      "src/lib/estimate/v4/columnBaseCuringR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/columnBaseCuringR1.contract.test.ts",
    ],
    releaseSlug: "column-base-curing",
    statusFamily: "COLUMN_BASE_CURING",
    targetCountMetadataKey: "columnBaseCuringTargetCount",
    receiptFilePrefix: "01_COLUMN_BASE_CURING",
    currentReleaseOwner: "EXACT_COLUMN_BASE_CURING_FAMILY_SUCCESSOR",
    primaryNormId: COLUMN_BASE_CURING_NORM_ID,
    primarySourceId: COLUMN_BASE_CURING_SOURCE_ID,
    primarySourceMetadata: COLUMN_BASE_CURING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:column-base-curing",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2023-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_CURING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => columnBaseCuringAcceptanceInputR1(
      contextKey as ColumnBaseCuringContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileColumnBaseCuringR1(parameters, { catalogId }),
  }),
  leveling: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-slab-leveling-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (16).md",
    masterSha256: "9bc2a957ce80d9b0086fa98523b692325d100367761e4d9cbac786d4ebd1e4ea",
    parentReleaseId: "f185fb75-7334-5d7d-a9b6-793d34e8cc24",
    parentSearchReleaseId: "be08859c-3c3c-53b9-b0fa-6ac1a1226659",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-leveling-family",
    targets: CONCRETE_SLAB_LEVELING_TARGETS,
    parameters: CONCRETE_SLAB_LEVELING_PARAMETERS,
    formulas: CONCRETE_SLAB_LEVELING_FORMULAS,
    resources: CONCRETE_SLAB_LEVELING_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabLevelingR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ],
    releaseSlug: "concrete-slab-leveling",
    statusFamily: "CONCRETE_SLAB_LEVELING",
    targetCountMetadataKey: "concreteSlabLevelingTargetCount",
    receiptFilePrefix: "01_CONCRETE_SLAB_LEVELING",
    currentReleaseOwner: "EXACT_CONCRETE_SLAB_LEVELING_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_SLAB_LEVELING_NORM_ID,
    primarySourceId: CONCRETE_SLAB_LEVELING_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_LEVELING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:slab-leveling",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_LEVELING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => concreteSlabLevelingAcceptanceInputR1(
      contextKey as ConcreteSlabLevelingContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabLevelingR1(parameters, { catalogId }),
  }),
  anchor_group_leveling: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.anchor-group-leveling-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "17248005-f969-5185-86a9-dc48c2978c6e",
    parentSearchReleaseId: "55f3a566-b8d8-5ae2-becf-c834d1d0d6a9",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-leveling-family",
    targets: ANCHOR_GROUP_LEVELING_TARGETS,
    parameters: ANCHOR_GROUP_LEVELING_PARAMETERS,
    formulas: ANCHOR_GROUP_LEVELING_FORMULAS,
    resources: ANCHOR_GROUP_LEVELING_RESOURCES,
    normativeParameterIds: ANCHOR_GROUP_LEVELING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabLevelingR1.ts",
      "src/lib/estimate/v4/anchorGroupLevelingR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/anchorGroupLevelingR1.contract.test.ts",
    ],
    releaseSlug: "anchor-group-leveling",
    statusFamily: "ANCHOR_GROUP_LEVELING",
    targetCountMetadataKey: "anchorGroupLevelingTargetCount",
    receiptFilePrefix: "01_ANCHOR_GROUP_LEVELING",
    currentReleaseOwner: "EXACT_ANCHOR_GROUP_LEVELING_FAMILY_SUCCESSOR",
    primaryNormId: ANCHOR_GROUP_LEVELING_NORM_ID,
    primarySourceId: ANCHOR_GROUP_LEVELING_SOURCE_ID,
    primarySourceMetadata: ANCHOR_GROUP_LEVELING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:anchor-group-leveling",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_LEVELING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => anchorGroupLevelingAcceptanceInputR1(
      contextKey as AnchorGroupLevelingContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileAnchorGroupLevelingR1(parameters, { catalogId }),
  }),
  belt_leveling: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.belt-leveling-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "7b2d4e91-6a38-590d-8a49-f6e5f78cc81f",
    parentSearchReleaseId: "cab8fc05-e9ad-5c93-b3dc-4ac8cc0c8e4a",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-leveling-family",
    targets: BELT_LEVELING_TARGETS,
    parameters: BELT_LEVELING_PARAMETERS,
    formulas: BELT_LEVELING_FORMULAS,
    resources: BELT_LEVELING_RESOURCES,
    normativeParameterIds: BELT_LEVELING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabLevelingR1.ts",
      "src/lib/estimate/v4/beltLevelingR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/beltLevelingR1.contract.test.ts",
    ],
    releaseSlug: "belt-leveling",
    statusFamily: "BELT_LEVELING",
    targetCountMetadataKey: "beltLevelingTargetCount",
    receiptFilePrefix: "01_BELT_LEVELING",
    currentReleaseOwner: "EXACT_BELT_LEVELING_FAMILY_SUCCESSOR",
    primaryNormId: BELT_LEVELING_NORM_ID,
    primarySourceId: BELT_LEVELING_SOURCE_ID,
    primarySourceMetadata: BELT_LEVELING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:belt-leveling",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_LEVELING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => beltLevelingAcceptanceInputR1(
      contextKey as BeltLevelingContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileBeltLevelingR1(parameters, { catalogId }),
  }),
  column_base_leveling: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.column-base-leveling-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "ce97a31f-f270-56ca-822d-234e5f383c5b",
    parentSearchReleaseId: "7f280df1-f476-51aa-b447-cbaf4fa4a6d5",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-leveling-family",
    targets: COLUMN_BASE_LEVELING_TARGETS,
    parameters: COLUMN_BASE_LEVELING_PARAMETERS,
    formulas: COLUMN_BASE_LEVELING_FORMULAS,
    resources: COLUMN_BASE_LEVELING_RESOURCES,
    normativeParameterIds: COLUMN_BASE_LEVELING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabLevelingR1.ts",
      "src/lib/estimate/v4/beltLevelingR1.ts",
      "src/lib/estimate/v4/columnBaseLevelingR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/columnBaseLevelingR1.contract.test.ts",
    ],
    releaseSlug: "column-base-leveling",
    statusFamily: "COLUMN_BASE_LEVELING",
    targetCountMetadataKey: "columnBaseLevelingTargetCount",
    receiptFilePrefix: "01_COLUMN_BASE_LEVELING",
    currentReleaseOwner: "EXACT_COLUMN_BASE_LEVELING_FAMILY_SUCCESSOR",
    primaryNormId: COLUMN_BASE_LEVELING_NORM_ID,
    primarySourceId: COLUMN_BASE_LEVELING_SOURCE_ID,
    primarySourceMetadata: COLUMN_BASE_LEVELING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:column-base-leveling",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-01-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_LEVELING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => columnBaseLevelingAcceptanceInputR1(
      contextKey as ColumnBaseLevelingContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileColumnBaseLevelingR1(parameters, { catalogId }),
  }),
  repair: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-slab-repair-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (17).md",
    masterSha256: "0cbd6c99c7fbdef5d432fcc7a8e41054118f4f8cf77bf20d8d99b28b631b55fd",
    parentReleaseId: "e7f064fb-f5b5-5972-b64c-845183b69a29",
    parentSearchReleaseId: "2d77bca9-0272-5b16-aa85-2b553e365c4c",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-repair-family",
    targets: CONCRETE_SLAB_REPAIR_TARGETS,
    parameters: CONCRETE_SLAB_REPAIR_PARAMETERS,
    formulas: CONCRETE_SLAB_REPAIR_FORMULAS,
    resources: CONCRETE_SLAB_REPAIR_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabRepairR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/concreteSlabRepairR1.contract.test.ts",
    ],
    releaseSlug: "concrete-slab-repair",
    statusFamily: "CONCRETE_SLAB_REPAIR",
    targetCountMetadataKey: "concreteSlabRepairTargetCount",
    receiptFilePrefix: "01_CONCRETE_SLAB_REPAIR",
    currentReleaseOwner: "EXACT_CONCRETE_SLAB_REPAIR_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_SLAB_REPAIR_NORM_ID,
    primarySourceId: CONCRETE_SLAB_REPAIR_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:slab-repair-placement",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2025-01-01",
    sourceUseRestriction: "ASSESSMENT_DESIGN_METHOD_SELECTION_ONLY_PROJECT_REPAIR_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => concreteSlabRepairAcceptanceInputR1(
      contextKey as ConcreteSlabRepairContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabRepairR1(parameters, { catalogId }),
  }),
  anchor_group_repair: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.anchor-group-repair-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "9cff4f6b-8d6b-5fbc-9a9f-51938b598899",
    parentSearchReleaseId: "26cf3850-5ca1-592d-9777-c71d23b879c9",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-repair-family",
    targets: ANCHOR_GROUP_REPAIR_TARGETS,
    parameters: ANCHOR_GROUP_REPAIR_PARAMETERS,
    formulas: ANCHOR_GROUP_REPAIR_FORMULAS,
    resources: ANCHOR_GROUP_REPAIR_RESOURCES,
    normativeParameterIds: ANCHOR_GROUP_REPAIR_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabRepairR1.ts",
      "src/lib/estimate/v4/anchorGroupRepairR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/anchorGroupRepairR1.contract.test.ts",
    ],
    releaseSlug: "anchor-group-repair",
    statusFamily: "ANCHOR_GROUP_REPAIR",
    targetCountMetadataKey: "anchorGroupRepairTargetCount",
    receiptFilePrefix: "01_ANCHOR_GROUP_REPAIR",
    currentReleaseOwner: "EXACT_ANCHOR_GROUP_REPAIR_FAMILY_SUCCESSOR",
    primaryNormId: ANCHOR_GROUP_REPAIR_NORM_ID,
    primarySourceId: ANCHOR_GROUP_REPAIR_SOURCE_ID,
    primarySourceMetadata: ANCHOR_GROUP_REPAIR_SOURCE_METADATA,
    normativeOwnerRowId: "service:anchor-group:condition-assessment",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2025-01-01",
    sourceUseRestriction: "ASSESSMENT_AND_PROJECT_REPAIR_SCOPE_DIRECT_SCHEDULE_NO_AUTOMATIC_ANCHOR_METHOD",
    acceptanceInput: (contextKey: string) => anchorGroupRepairAcceptanceInputR1(
      contextKey as AnchorGroupRepairContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileAnchorGroupRepairR1(parameters, { catalogId }),
  }),
  belt_repair: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.belt-repair-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "693132f7-6429-5ef4-a6f1-30501d67941c",
    parentSearchReleaseId: "122afc69-de42-53a6-aa7d-9e734a9a79de",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-repair-family",
    targets: BELT_REPAIR_TARGETS,
    parameters: BELT_REPAIR_PARAMETERS,
    formulas: BELT_REPAIR_FORMULAS,
    resources: BELT_REPAIR_RESOURCES,
    normativeParameterIds: BELT_REPAIR_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabRepairR1.ts",
      "src/lib/estimate/v4/beltRepairR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/beltRepairR1.contract.test.ts",
    ],
    releaseSlug: "belt-repair",
    statusFamily: "BELT_REPAIR",
    targetCountMetadataKey: "beltRepairTargetCount",
    receiptFilePrefix: "01_BELT_REPAIR",
    currentReleaseOwner: "EXACT_BELT_REPAIR_FAMILY_SUCCESSOR",
    primaryNormId: BELT_REPAIR_NORM_ID,
    primarySourceId: BELT_REPAIR_SOURCE_ID,
    primarySourceMetadata: BELT_REPAIR_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:belt-repair-placement",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2025-01-01",
    sourceUseRestriction: "ASSESSMENT_DESIGN_METHOD_SELECTION_ONLY_PROJECT_REPAIR_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => beltRepairAcceptanceInputR1(
      contextKey as BeltRepairContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileBeltRepairR1(parameters, { catalogId }),
  }),
  column_base_repair: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.column-base-repair-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "7785158c-b6bf-5df5-b1ff-76a6c0290350",
    parentSearchReleaseId: "444c5432-4819-53f0-9fa9-17dcc1e5de86",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-repair-family",
    targets: COLUMN_BASE_REPAIR_TARGETS,
    parameters: COLUMN_BASE_REPAIR_PARAMETERS,
    formulas: COLUMN_BASE_REPAIR_FORMULAS,
    resources: COLUMN_BASE_REPAIR_RESOURCES,
    normativeParameterIds: COLUMN_BASE_REPAIR_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json", "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabRepairR1.ts", "src/lib/estimate/v4/beltRepairR1.ts",
      "src/lib/estimate/v4/columnBaseRepairR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/columnBaseRepairR1.contract.test.ts",
    ],
    releaseSlug: "column-base-repair", statusFamily: "COLUMN_BASE_REPAIR",
    targetCountMetadataKey: "columnBaseRepairTargetCount", receiptFilePrefix: "01_COLUMN_BASE_REPAIR",
    currentReleaseOwner: "EXACT_COLUMN_BASE_REPAIR_FAMILY_SUCCESSOR",
    primaryNormId: COLUMN_BASE_REPAIR_NORM_ID, primarySourceId: COLUMN_BASE_REPAIR_SOURCE_ID,
    primarySourceMetadata: COLUMN_BASE_REPAIR_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:column-base-repair-placement", expectedTargetCount: 7,
    sourceEffectiveFrom: "2025-01-01",
    sourceUseRestriction: "ASSESSMENT_DESIGN_METHOD_SELECTION_ONLY_PROJECT_REPAIR_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => columnBaseRepairAcceptanceInputR1(
      contextKey as ColumnBaseRepairContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileColumnBaseRepairR1(parameters, { catalogId }),
  }),
  pedestal_repair: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pedestal-repair-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (20).md",
    masterSha256: "17b374957c52d9361497645d210d370216bb98dd9443016684d09a5c105426db",
    parentReleaseId: "806bf2ac-9048-566b-88de-eceaf11e2005",
    parentSearchReleaseId: "189ffb24-4b74-507b-97c6-18f31b2d85fb",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-repair-family",
    targets: PEDESTAL_REPAIR_TARGETS,
    parameters: PEDESTAL_REPAIR_PARAMETERS,
    formulas: PEDESTAL_REPAIR_FORMULAS,
    resources: PEDESTAL_REPAIR_RESOURCES,
    normativeParameterIds: PEDESTAL_REPAIR_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabRepairR1.ts",
      "src/lib/estimate/v4/beltRepairR1.ts",
      "src/lib/estimate/v4/columnBaseRepairR1.ts",
      "src/lib/estimate/v4/pedestalRepairR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pedestalRepairR1.contract.test.ts",
    ],
    releaseSlug: "pedestal-repair",
    statusFamily: "PEDESTAL_REPAIR",
    targetCountMetadataKey: "pedestalRepairTargetCount",
    receiptFilePrefix: "01_PEDESTAL_REPAIR",
    currentReleaseOwner: "EXACT_PEDESTAL_REPAIR_FAMILY_SUCCESSOR",
    primaryNormId: PEDESTAL_REPAIR_NORM_ID,
    primarySourceId: PEDESTAL_REPAIR_SOURCE_ID,
    primarySourceMetadata: PEDESTAL_REPAIR_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pedestal-repair-placement",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2025-01-01",
    sourceUseRestriction: "ASSESSMENT_DESIGN_METHOD_SELECTION_ONLY_PROJECT_REPAIR_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => pedestalRepairAcceptanceInputR1(
      contextKey as PedestalRepairContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePedestalRepairR1(parameters, { catalogId }),
  }),
  pile_cap_repair: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pile-cap-repair-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (21).md",
    masterSha256: "f3df8e0ace122317d93bbd7764a58b547d53e1681f84aba949b54cf09defd8fc",
    parentReleaseId: "832ec6b9-e8c7-5975-bcc2-dfbae97e65bd",
    parentSearchReleaseId: "bf967a84-061c-5854-a5cf-252a3ef6addf",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-repair-family",
    targets: PILE_CAP_REPAIR_TARGETS,
    parameters: PILE_CAP_REPAIR_PARAMETERS,
    formulas: PILE_CAP_REPAIR_FORMULAS,
    resources: PILE_CAP_REPAIR_RESOURCES,
    normativeParameterIds: PILE_CAP_REPAIR_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabRepairR1.ts",
      "src/lib/estimate/v4/columnBaseRepairR1.ts",
      "src/lib/estimate/v4/pedestalRepairR1.ts",
      "src/lib/estimate/v4/pileCapRepairR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pileCapRepairR1.contract.test.ts",
    ],
    releaseSlug: "pile-cap-repair",
    statusFamily: "PILE_CAP_REPAIR",
    targetCountMetadataKey: "pileCapRepairTargetCount",
    receiptFilePrefix: "01_PILE_CAP_REPAIR",
    currentReleaseOwner: "EXACT_PILE_CAP_REPAIR_FAMILY_SUCCESSOR",
    primaryNormId: PILE_CAP_REPAIR_NORM_ID,
    primarySourceId: PILE_CAP_REPAIR_SOURCE_ID,
    primarySourceMetadata: PILE_CAP_REPAIR_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pile-cap-repair-placement",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2025-01-01",
    sourceUseRestriction: "ASSESSMENT_DESIGN_METHOD_SELECTION_ONLY_PROJECT_REPAIR_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => pileCapRepairAcceptanceInputR1(
      contextKey as PileCapRepairContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePileCapRepairR1(parameters, { catalogId }),
  }),
  embedded_items: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-slab-embedded-items-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (17).md",
    masterSha256: "0cbd6c99c7fbdef5d432fcc7a8e41054118f4f8cf77bf20d8d99b28b631b55fd",
    parentReleaseId: "3ad40dd2-36b5-5427-92d2-52a805a272b3",
    parentSearchReleaseId: "a0d581eb-9bd1-50f3-a366-495846f468f5",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-embedded-items-family",
    targets: CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS,
    parameters: CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
    formulas: CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
    resources: CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/concreteSlabEmbeddedItemsR1.contract.test.ts",
    ],
    releaseSlug: "concrete-slab-embedded-items",
    statusFamily: "CONCRETE_SLAB_EMBEDDED_ITEMS",
    targetCountMetadataKey: "concreteSlabEmbeddedItemsTargetCount",
    receiptFilePrefix: "01_CONCRETE_SLAB_EMBEDDED_ITEMS",
    currentReleaseOwner: "EXACT_CONCRETE_SLAB_EMBEDDED_ITEMS_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
    primarySourceId: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:slab-embedded-items-positioning",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2020-10-01",
    sourceUseRestriction: "METHOD_AND_TOLERANCE_APPLICABILITY_ONLY_PROJECT_EMBEDMENT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => concreteSlabEmbeddedItemsAcceptanceInputR1(
      contextKey as ConcreteSlabEmbeddedItemsContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabEmbeddedItemsR1(parameters, { catalogId }),
  }),
  belt_embedded_items: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.belt-embedded-items-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "ed698d2f-20c8-50b6-b5e3-beb62cc4c6ea",
    parentSearchReleaseId: "8a29f307-528c-5fc7-b462-86ce1371987b",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-embedded-items-family",
    targets: BELT_EMBEDDED_ITEMS_TARGETS,
    parameters: BELT_EMBEDDED_ITEMS_PARAMETERS,
    formulas: BELT_EMBEDDED_ITEMS_FORMULAS,
    resources: BELT_EMBEDDED_ITEMS_RESOURCES,
    normativeParameterIds: BELT_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/beltEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/beltEmbeddedItemsR1.contract.test.ts",
    ],
    releaseSlug: "belt-embedded-items",
    statusFamily: "BELT_EMBEDDED_ITEMS",
    targetCountMetadataKey: "beltEmbeddedItemsTargetCount",
    receiptFilePrefix: "01_BELT_EMBEDDED_ITEMS",
    currentReleaseOwner: "EXACT_BELT_EMBEDDED_ITEMS_FAMILY_SUCCESSOR",
    primaryNormId: BELT_EMBEDDED_ITEMS_NORM_ID,
    primarySourceId: BELT_EMBEDDED_ITEMS_SOURCE_ID,
    primarySourceMetadata: BELT_EMBEDDED_ITEMS_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:belt-embedded-items-positioning",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2020-10-01",
    sourceUseRestriction: "METHOD_AND_TOLERANCE_APPLICABILITY_ONLY_PROJECT_EMBEDMENT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => beltEmbeddedItemsAcceptanceInputR1(
      contextKey as BeltEmbeddedItemsContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileBeltEmbeddedItemsR1(parameters, { catalogId }),
  }),
  column_base_embedded_items: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.column-base-embedded-items-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "182068e5-4d84-5169-a036-68b4acb4f77c",
    parentSearchReleaseId: "faf3df48-9f4b-52a0-9255-e0935fef0dca",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-embedded-items-family",
    targets: COLUMN_BASE_EMBEDDED_ITEMS_TARGETS,
    parameters: COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS,
    formulas: COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS,
    resources: COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES,
    normativeParameterIds: COLUMN_BASE_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/beltEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/columnBaseEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/columnBaseEmbeddedItemsR1.contract.test.ts",
    ],
    releaseSlug: "column-base-embedded-items",
    statusFamily: "COLUMN_BASE_EMBEDDED_ITEMS",
    targetCountMetadataKey: "columnBaseEmbeddedItemsTargetCount",
    receiptFilePrefix: "01_COLUMN_BASE_EMBEDDED_ITEMS",
    currentReleaseOwner: "EXACT_COLUMN_BASE_EMBEDDED_ITEMS_FAMILY_SUCCESSOR",
    primaryNormId: COLUMN_BASE_EMBEDDED_ITEMS_NORM_ID,
    primarySourceId: COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID,
    primarySourceMetadata: COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:column-base-embedded-items-positioning",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2020-10-01",
    sourceUseRestriction: "METHOD_AND_TOLERANCE_APPLICABILITY_ONLY_PROJECT_EMBEDMENT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => columnBaseEmbeddedItemsAcceptanceInputR1(
      contextKey as ColumnBaseEmbeddedItemsContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileColumnBaseEmbeddedItemsR1(parameters, { catalogId }),
  }),
  pedestal_embedded_items: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pedestal-embedded-items-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "c91141b6-319e-53fb-a69c-cfc1211f2e17",
    parentSearchReleaseId: "9b83439a-0212-5fb7-95d1-bb285a245bf4",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-embedded-items-family",
    targets: PEDESTAL_EMBEDDED_ITEMS_TARGETS, parameters: PEDESTAL_EMBEDDED_ITEMS_PARAMETERS,
    formulas: PEDESTAL_EMBEDDED_ITEMS_FORMULAS, resources: PEDESTAL_EMBEDDED_ITEMS_RESOURCES,
    normativeParameterIds: PEDESTAL_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json", "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts", "src/lib/estimate/v4/columnBaseEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/pedestalEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pedestalEmbeddedItemsR1.contract.test.ts",
    ],
    releaseSlug: "pedestal-embedded-items", statusFamily: "PEDESTAL_EMBEDDED_ITEMS",
    targetCountMetadataKey: "pedestalEmbeddedItemsTargetCount", receiptFilePrefix: "01_PEDESTAL_EMBEDDED_ITEMS",
    currentReleaseOwner: "EXACT_PEDESTAL_EMBEDDED_ITEMS_FAMILY_SUCCESSOR",
    primaryNormId: PEDESTAL_EMBEDDED_ITEMS_NORM_ID, primarySourceId: PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID,
    primarySourceMetadata: PEDESTAL_EMBEDDED_ITEMS_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pedestal-embedded-items-positioning", expectedTargetCount: 6,
    sourceEffectiveFrom: "2020-10-01",
    sourceUseRestriction: "METHOD_AND_TOLERANCE_APPLICABILITY_ONLY_PROJECT_EMBEDMENT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => pedestalEmbeddedItemsAcceptanceInputR1(
      contextKey as PedestalEmbeddedItemsContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePedestalEmbeddedItemsR1(parameters, { catalogId }),
  }),
  pile_cap_embedded_items: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pile-cap-embedded-items-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (21).md",
    masterSha256: "f3df8e0ace122317d93bbd7764a58b547d53e1681f84aba949b54cf09defd8fc",
    parentReleaseId: "67b4d62f-f95f-574b-adee-3933ebbf6bcd",
    parentSearchReleaseId: "88f5e326-99ec-5dbd-875c-9538c2a53bd5",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-embedded-items-family",
    targets: PILE_CAP_EMBEDDED_ITEMS_TARGETS,
    parameters: PILE_CAP_EMBEDDED_ITEMS_PARAMETERS,
    formulas: PILE_CAP_EMBEDDED_ITEMS_FORMULAS,
    resources: PILE_CAP_EMBEDDED_ITEMS_RESOURCES,
    normativeParameterIds: PILE_CAP_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/columnBaseEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/pedestalEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/pileCapEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pileCapEmbeddedItemsR1.contract.test.ts",
    ],
    releaseSlug: "pile-cap-embedded-items",
    statusFamily: "PILE_CAP_EMBEDDED_ITEMS",
    targetCountMetadataKey: "pileCapEmbeddedItemsTargetCount",
    receiptFilePrefix: "01_PILE_CAP_EMBEDDED_ITEMS",
    currentReleaseOwner: "EXACT_PILE_CAP_EMBEDDED_ITEMS_FAMILY_SUCCESSOR",
    primaryNormId: PILE_CAP_EMBEDDED_ITEMS_NORM_ID,
    primarySourceId: PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID,
    primarySourceMetadata: PILE_CAP_EMBEDDED_ITEMS_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pile-cap-embedded-items-positioning",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2020-10-01",
    sourceUseRestriction: "METHOD_AND_TOLERANCE_APPLICABILITY_ONLY_PROJECT_EMBEDMENT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => pileCapEmbeddedItemsAcceptanceInputR1(
      contextKey as PileCapEmbeddedItemsContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePileCapEmbeddedItemsR1(parameters, { catalogId }),
  }),
  formwork_embedded_items: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.formwork-embedded-items-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (21).md",
    masterSha256: "f3df8e0ace122317d93bbd7764a58b547d53e1681f84aba949b54cf09defd8fc",
    parentReleaseId: "ec9bc1da-4b2e-5eb6-8e88-90d257c0fb17",
    parentSearchReleaseId: "85f2caab-7fe5-5658-8696-da58a55a351e",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-embedded-items-family",
    targets: FORMWORK_EMBEDDED_ITEMS_TARGETS,
    parameters: FORMWORK_EMBEDDED_ITEMS_PARAMETERS,
    formulas: FORMWORK_EMBEDDED_ITEMS_FORMULAS,
    resources: FORMWORK_EMBEDDED_ITEMS_RESOURCES,
    normativeParameterIds: FORMWORK_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/columnBaseEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/pedestalEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/pileCapEmbeddedItemsR1.ts",
      "src/lib/estimate/v4/formworkEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/formworkEmbeddedItemsR1.contract.test.ts",
    ],
    releaseSlug: "formwork-embedded-items",
    statusFamily: "FORMWORK_EMBEDDED_ITEMS",
    targetCountMetadataKey: "formworkEmbeddedItemsTargetCount",
    receiptFilePrefix: "01_FORMWORK_EMBEDDED_ITEMS",
    currentReleaseOwner: "EXACT_FORMWORK_EMBEDDED_ITEMS_FAMILY_SUCCESSOR",
    primaryNormId: FORMWORK_EMBEDDED_ITEMS_NORM_ID,
    primarySourceId: FORMWORK_EMBEDDED_ITEMS_SOURCE_ID,
    primarySourceMetadata: FORMWORK_EMBEDDED_ITEMS_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:formwork-embedded-items-positioning",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2020-10-01",
    sourceUseRestriction:
      "METHOD_AND_TOLERANCE_APPLICABILITY_ONLY_PROJECT_EMBEDMENT_SCHEDULE_QUANTITIES",
    acceptanceInput: (contextKey: string) => formworkEmbeddedItemsAcceptanceInputR1(
      contextKey as FormworkEmbeddedItemsContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileFormworkEmbeddedItemsR1(parameters, { catalogId }),
  }),
  pile_cap_curing: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pile-cap-curing-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (21).md",
    masterSha256: "f3df8e0ace122317d93bbd7764a58b547d53e1681f84aba949b54cf09defd8fc",
    parentReleaseId: "2bcfb540-4aa7-51bc-a73c-b21808fcc061",
    parentSearchReleaseId: "3a8d9804-f71b-5730-a269-d122503a7234",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-curing-family",
    targets: PILE_CAP_CURING_TARGETS,
    parameters: PILE_CAP_CURING_PARAMETERS,
    formulas: PILE_CAP_CURING_FORMULAS,
    resources: PILE_CAP_CURING_RESOURCES,
    normativeParameterIds: PILE_CAP_CURING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabCuringR1.ts",
      "src/lib/estimate/v4/columnBaseCuringR1.ts",
      "src/lib/estimate/v4/pedestalCuringR1.ts",
      "src/lib/estimate/v4/pileCapCuringR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pileCapCuringR1.contract.test.ts",
    ],
    releaseSlug: "pile-cap-curing",
    statusFamily: "PILE_CAP_CURING",
    targetCountMetadataKey: "pileCapCuringTargetCount",
    receiptFilePrefix: "01_PILE_CAP_CURING",
    currentReleaseOwner: "EXACT_PILE_CAP_CURING_FAMILY_SUCCESSOR",
    primaryNormId: PILE_CAP_CURING_NORM_ID,
    primarySourceId: PILE_CAP_CURING_SOURCE_ID,
    primarySourceMetadata: PILE_CAP_CURING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pile-cap-curing",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2023-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_CURING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => pileCapCuringAcceptanceInputR1(
      contextKey as PileCapCuringContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePileCapCuringR1(parameters, { catalogId }),
  }),
  pile_cap_leveling: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pile-cap-leveling-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (21).md",
    masterSha256: "f3df8e0ace122317d93bbd7764a58b547d53e1681f84aba949b54cf09defd8fc",
    parentReleaseId: "dc0e9d21-1ad0-56ba-bc90-050e8ac4a986",
    parentSearchReleaseId: "4e3a68bb-653b-5230-8ad2-dac2083ed495",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-leveling-family",
    targets: PILE_CAP_LEVELING_TARGETS,
    parameters: PILE_CAP_LEVELING_PARAMETERS,
    formulas: PILE_CAP_LEVELING_FORMULAS,
    resources: PILE_CAP_LEVELING_RESOURCES,
    normativeParameterIds: PILE_CAP_LEVELING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabLevelingR1.ts",
      "src/lib/estimate/v4/columnBaseLevelingR1.ts",
      "src/lib/estimate/v4/pedestalLevelingR1.ts",
      "src/lib/estimate/v4/pileCapLevelingR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pileCapLevelingR1.contract.test.ts",
    ],
    releaseSlug: "pile-cap-leveling",
    statusFamily: "PILE_CAP_LEVELING",
    targetCountMetadataKey: "pileCapLevelingTargetCount",
    receiptFilePrefix: "01_PILE_CAP_LEVELING",
    currentReleaseOwner: "EXACT_PILE_CAP_LEVELING_FAMILY_SUCCESSOR",
    primaryNormId: PILE_CAP_LEVELING_NORM_ID,
    primarySourceId: PILE_CAP_LEVELING_SOURCE_ID,
    primarySourceMetadata: PILE_CAP_LEVELING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pile-cap-leveling",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-01-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_LEVELING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => pileCapLevelingAcceptanceInputR1(
      contextKey as PileCapLevelingContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePileCapLevelingR1(parameters, { catalogId }),
  }),
  pedestal_curing: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pedestal-curing-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (20).md",
    masterSha256: "17b374957c52d9361497645d210d370216bb98dd9443016684d09a5c105426db",
    parentReleaseId: "ef36fe59-713b-571d-bc2c-7d2015dfb8bd",
    parentSearchReleaseId: "9daae0ee-dc38-5e2c-accd-1021d9cac632",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-curing-family",
    targets: PEDESTAL_CURING_TARGETS,
    parameters: PEDESTAL_CURING_PARAMETERS,
    formulas: PEDESTAL_CURING_FORMULAS,
    resources: PEDESTAL_CURING_RESOURCES,
    normativeParameterIds: PEDESTAL_CURING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabCuringR1.ts",
      "src/lib/estimate/v4/columnBaseCuringR1.ts",
      "src/lib/estimate/v4/pedestalCuringR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pedestalCuringR1.contract.test.ts",
    ],
    releaseSlug: "pedestal-curing",
    statusFamily: "PEDESTAL_CURING",
    targetCountMetadataKey: "pedestalCuringTargetCount",
    receiptFilePrefix: "01_PEDESTAL_CURING",
    currentReleaseOwner: "EXACT_PEDESTAL_CURING_FAMILY_SUCCESSOR",
    primaryNormId: PEDESTAL_CURING_NORM_ID,
    primarySourceId: PEDESTAL_CURING_SOURCE_ID,
    primarySourceMetadata: PEDESTAL_CURING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pedestal-curing",
    expectedTargetCount: 6,
    sourceEffectiveFrom: "2023-06-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_CURING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => pedestalCuringAcceptanceInputR1(
      contextKey as PedestalCuringContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePedestalCuringR1(parameters, { catalogId }),
  }),
  pedestal_leveling: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.pedestal-leveling-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (20).md",
    masterSha256: "17b374957c52d9361497645d210d370216bb98dd9443016684d09a5c105426db",
    parentReleaseId: "d85bbcb7-10e9-58b4-90b6-9b1f8b448f28",
    parentSearchReleaseId: "e0d53463-385f-5ef2-8d8e-5295aca5ef66",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-leveling-family",
    targets: PEDESTAL_LEVELING_TARGETS,
    parameters: PEDESTAL_LEVELING_PARAMETERS,
    formulas: PEDESTAL_LEVELING_FORMULAS,
    resources: PEDESTAL_LEVELING_RESOURCES,
    normativeParameterIds: PEDESTAL_LEVELING_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteSlabLevelingR1.ts",
      "src/lib/estimate/v4/columnBaseLevelingR1.ts",
      "src/lib/estimate/v4/pedestalLevelingR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/pedestalLevelingR1.contract.test.ts",
    ],
    releaseSlug: "pedestal-leveling",
    statusFamily: "PEDESTAL_LEVELING",
    targetCountMetadataKey: "pedestalLevelingTargetCount",
    receiptFilePrefix: "01_PEDESTAL_LEVELING",
    currentReleaseOwner: "EXACT_PEDESTAL_LEVELING_FAMILY_SUCCESSOR",
    primaryNormId: PEDESTAL_LEVELING_NORM_ID,
    primarySourceId: PEDESTAL_LEVELING_SOURCE_ID,
    primarySourceMetadata: PEDESTAL_LEVELING_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:pedestal-leveling",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-01-01",
    sourceUseRestriction: "METHOD_APPLICABILITY_ONLY_PROJECT_LEVELING_METHOD_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) => pedestalLevelingAcceptanceInputR1(
      contextKey as PedestalLevelingContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compilePedestalLevelingR1(parameters, { catalogId }),
  }),
  complete_installation: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-slab-complete-installation-family.v2",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "0241944d-f4e5-590f-94fa-a66c6b34f564",
    parentSearchReleaseId: "ca52ee13-14db-575a-863e-2aa50c0f66bc",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-complete-installation-family-r2",
    targets: CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS,
    parameters: CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS,
    formulas: CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS,
    resources: CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES,
    normativeParameterIds: CONCRETE_SLAB_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "data/estimate-norms/professional/formwork.json",
      "src/lib/estimate/v4/concreteSlabCompleteInstallationR1.ts",
      "src/lib/estimate/v4/concreteSlabConcretePlacementR1.ts",
      "src/lib/estimate/v4/concreteSlabReinforcementR1.ts",
      "src/lib/estimate/v4/formworkDokaflexConcreteSlabR1.ts",
      "src/lib/estimate/v4/concreteSlabEmbeddedItemsR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/lib/estimate/ownedDomain/formworkDokaflexProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/concreteSlabCompleteInstallationR1.contract.test.ts",
    ],
    releaseSlug: "concrete-slab-complete-installation-r2",
    statusFamily: "CONCRETE_SLAB_COMPLETE_INSTALLATION",
    targetCountMetadataKey: "concreteSlabCompleteInstallationTargetCount",
    receiptFilePrefix: "01_CONCRETE_SLAB_COMPLETE_INSTALLATION_R2",
    currentReleaseOwner: "EXACT_CONCRETE_SLAB_COMPLETE_INSTALLATION_FAMILY_SUCCESSOR_R2",
    primaryNormId: CONCRETE_SLAB_COMPLETE_INSTALLATION_NORM_ID,
    primarySourceId: CONCRETE_SLAB_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID,
    primarySourceMetadata: CONCRETE_SLAB_COMPLETE_INSTALLATION_SOURCE_METADATA,
    normativeOwnerRowId: "material:concrete:ready-mix",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2021-01-01",
    sourceUseRestriction:
      "COMPONENT_APPLICABILITY_AND_DIRECT_APPROVED_PROJECT_SCHEDULES_NO_UNIVERSAL_PRODUCTIVITY",
    acceptanceInput: (contextKey: string) => concreteSlabCompleteInstallationAcceptanceInputR1(
      contextKey as ConcreteSlabCompleteInstallationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteSlabCompleteInstallationR1(parameters, { catalogId }),
  }),
  joint_complete_installation: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.concrete-joint-complete-installation-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "bc9d4cb4-ffae-5dcd-b3de-d486bcffa575",
    parentSearchReleaseId: "a97ed782-bc5e-56b9-99b3-de17e511230c",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-joint-complete-installation-family",
    targets: CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS,
    parameters: CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS,
    formulas: CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS,
    resources: CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES,
    normativeParameterIds:
      CONCRETE_JOINT_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "src/lib/estimate/v4/concreteJointCompleteInstallationR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/concreteJointCompleteInstallationR1.contract.test.ts",
    ],
    releaseSlug: "concrete-joint-complete-installation",
    statusFamily: "CONCRETE_JOINT_COMPLETE_INSTALLATION",
    targetCountMetadataKey: "concreteJointCompleteInstallationTargetCount",
    receiptFilePrefix: "01_CONCRETE_JOINT_COMPLETE_INSTALLATION",
    currentReleaseOwner: "EXACT_CONCRETE_JOINT_COMPLETE_INSTALLATION_FAMILY_SUCCESSOR",
    primaryNormId: CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID,
    primarySourceId: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
    primarySourceMetadata: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA,
    normativeOwnerRowId: "work:concrete:joint-complete-installation",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2015-06-01",
    sourceUseRestriction:
      "JOINT_DESIGN_APPLICABILITY_ONLY_PROJECT_SELECTED_BRANCHES_AND_DIRECT_SCHEDULE",
    acceptanceInput: (contextKey: string) =>
      concreteJointCompleteInstallationAcceptanceInputR1(
        contextKey as ConcreteJointCompleteInstallationContextKey,
      ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileConcreteJointCompleteInstallationR1(parameters, { catalogId }),
  }),
  stairs_complete_installation: Object.freeze({
    contract: "rik-expo-app.r4-a13-6.stairs-complete-installation-family.v1",
    masterPath: "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (18).md",
    masterSha256: "4f7ec5da9c9262291af11544433d96ef5466ba1acf07288a327a3ec8fa2374c8",
    parentReleaseId: "f662b995-2cb3-53fe-9d6c-c5a358ede7d3",
    parentSearchReleaseId: "b4f8235e-b0df-5569-99b0-e253b4450643",
    outputRoot: ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-complete-installation-family",
    targets: STAIRS_COMPLETE_INSTALLATION_TARGETS,
    parameters: STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
    formulas: STAIRS_COMPLETE_INSTALLATION_FORMULAS,
    resources: STAIRS_COMPLETE_INSTALLATION_RESOURCES,
    normativeParameterIds: STAIRS_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
    sourcePaths: [
      "data/estimate-catalog/source-registry.json",
      "data/estimate-norms/professional/concrete.json",
      "data/estimate-norms/professional/formwork.json",
      "src/lib/estimate/v4/stairsCompleteInstallationR1.ts",
      "src/lib/estimate/v4/stairsConcretePlacementR1.ts",
      "src/lib/estimate/v4/stairsReinforcementR1.ts",
      "src/lib/estimate/v4/stairsProjectFormworkR1.ts",
      "src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1.ts",
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
      "tests/estimateNorms/stairsCompleteInstallationR1.contract.test.ts",
    ],
    releaseSlug: "stairs-complete-installation",
    statusFamily: "STAIRS_COMPLETE_INSTALLATION",
    targetCountMetadataKey: "stairsCompleteInstallationTargetCount",
    receiptFilePrefix: "01_STAIRS_COMPLETE_INSTALLATION",
    currentReleaseOwner: "EXACT_STAIRS_COMPLETE_INSTALLATION_FAMILY_SUCCESSOR",
    primaryNormId: STAIRS_COMPLETE_INSTALLATION_NORM_ID,
    primarySourceId: STAIRS_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID,
    primarySourceMetadata: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA,
    normativeOwnerRowId: "material:concrete:ready-mix",
    expectedTargetCount: 7,
    sourceEffectiveFrom: "2021-01-01",
    sourceUseRestriction:
      "COMPONENT_APPLICABILITY_AND_DIRECT_APPROVED_PROJECT_SCHEDULES_NO_AUTOMATIC_FORMWORK_SYSTEM",
    acceptanceInput: (contextKey: string) => stairsCompleteInstallationAcceptanceInputR1(
      contextKey as StairsCompleteInstallationContextKey,
    ),
    compile: (parameters: Record<string, unknown>, catalogId: string) =>
      compileStairsCompleteInstallationR1(parameters, { catalogId }),
  }),
});
const CONCRETE_SLAB_OPERATION_PROFILE = CONCRETE_SLAB_OPERATION_KEY
  ? CONCRETE_SLAB_OPERATION_PROFILES[CONCRETE_SLAB_OPERATION_KEY]
  : null;
const CONTRACT = REINFORCEMENT_FRAME_MODE
  ? "rik-expo-app.r4-a13-6.reinforcement-frame-concrete-placement-family.v1"
  : STAIRS_MODE
  ? "rik-expo-app.r4-a13-6.stairs-concrete-placement-family.v1"
  : SLAB_FOUNDATION_MODE
  ? "rik-expo-app.r4-a13-6.slab-foundation-concrete-placement-family.v1"
  : PEDESTAL_MODE
  ? "rik-expo-app.r4-a13-6.pedestal-concrete-placement-family.v1"
  : PILE_CAP_MODE
  ? "rik-expo-app.r4-a13-6.pile-cap-concrete-placement-family.v1"
  : CONCRETE_SLAB_MODE
  ? "rik-expo-app.r4-a13-6.concrete-slab-concrete-placement-family.v1"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.contract
  : BELT_MODE
  ? "rik-expo-app.r4-a13-6.belt-concrete-placement-family.v1"
  : COLUMN_BASE_MODE
  ? "rik-expo-app.r4-a13-6.column-base-concrete-placement-family.v1"
  : ANCHOR_GROUP_MODE
  ? "rik-expo-app.r4-a13-6.anchor-group-concrete-placement-family.v1"
  : "rik-expo-app.r4-a13-6.strip-foundation-concrete-placement-family.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH ?? (CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.masterPath
  : REINFORCEMENT_FRAME_MODE || STAIRS_MODE || SLAB_FOUNDATION_MODE || PEDESTAL_MODE || PILE_CAP_MODE || CONCRETE_SLAB_MODE
  ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (13).md"
  : ANCHOR_GROUP_MODE || COLUMN_BASE_MODE || BELT_MODE
  ? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (12).md"
  : "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (8).md"));
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256 ?? (CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.masterSha256
  : REINFORCEMENT_FRAME_MODE || STAIRS_MODE || SLAB_FOUNDATION_MODE || PEDESTAL_MODE || PILE_CAP_MODE || CONCRETE_SLAB_MODE
  ? "677aef6995eb2be13dab31ceae39596ff879e01bc4d44700077a81c42a58b20a"
  : ANCHOR_GROUP_MODE || COLUMN_BASE_MODE || BELT_MODE
  ? "a8bb44ea567236d17218ac447fb57c52915df9ce1478a81232da4c132fa9806b"
  : "50687aa500c59fc01750f5982c4b152150ad1747d7ac8c607ed1e0ef3ba657f4");
const PARENT_RELEASE_ID = process.env.R4A13_PARENT_DEFINITION_RELEASE_ID ?? (REINFORCEMENT_FRAME_MODE
  ? "b50793f5-d20c-58d7-8ad0-8bd191876c20"
  : STAIRS_MODE
  ? "03078c79-d77b-5e49-9008-5f4e8cbdb8a4"
  : SLAB_FOUNDATION_MODE
  ? "714d113e-7146-5bf8-bd82-37a8505ddffd"
  : PEDESTAL_MODE
  ? "1c30bb0c-62b7-503c-9b56-f27117470da3"
  : PILE_CAP_MODE
  ? "2d2f1f06-fb1a-5fe9-84a6-f2cb805a4df4"
  : CONCRETE_SLAB_MODE
  ? "99f44305-0d13-50a9-a145-008f82b0293f"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.parentReleaseId
  : BELT_MODE
  ? "7289c7d3-2577-5e52-a2f5-be3af06dec5d"
  : COLUMN_BASE_MODE
  ? "0a70a3db-9648-5341-8bd0-ef9ae3017427"
  : ANCHOR_GROUP_MODE
  ? "80c3ba4b-3d04-5947-b17d-5fb05bcf2bae"
  : "d46fe46e-56ad-5e5d-ac6e-7e28b43f8946");
const PARENT_SEARCH_RELEASE_ID = process.env.R4A13_PARENT_SEARCH_RELEASE_ID ?? (REINFORCEMENT_FRAME_MODE
  ? "b646530a-4732-56e3-b929-f225d2dc36f1"
  : STAIRS_MODE
  ? "d366a77b-e26a-5bfe-81d8-b10b17af9567"
  : SLAB_FOUNDATION_MODE
  ? "75903929-84a5-5bac-92f6-dfea65f3b8f1"
  : PEDESTAL_MODE
  ? "d930b4c0-8a36-5236-89ee-15edba0a266a"
  : PILE_CAP_MODE
  ? "093c5536-92cf-53cb-bd19-fecefd205db6"
  : CONCRETE_SLAB_MODE
  ? "4a6e59aa-cc9b-5987-9d57-90a259c90cb6"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.parentSearchReleaseId
  : BELT_MODE
  ? "cc38bb7a-aa48-5fa6-8f63-a8df4327d15f"
  : COLUMN_BASE_MODE
  ? "8a235704-43f3-564f-a3b8-70777db354fb"
  : ANCHOR_GROUP_MODE
  ? "132eb3c0-0a52-5257-8420-cf2f8de425b9"
  : "91ba7943-7e9e-56cc-b239-f61f92953ba3");
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  process.env.R4A13_OUTPUT_ROOT ?? (REINFORCEMENT_FRAME_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/reinforcement-frame-concrete-placement-family"
    : STAIRS_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/stairs-concrete-placement-family"
    : SLAB_FOUNDATION_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/slab-foundation-concrete-placement-family"
    : PEDESTAL_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pedestal-concrete-placement-family"
    : PILE_CAP_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/pile-cap-concrete-placement-family"
    : CONCRETE_SLAB_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-slab-concrete-placement-family"
    : CONCRETE_SLAB_OPERATION_PROFILE
    ? CONCRETE_SLAB_OPERATION_PROFILE.outputRoot
    : BELT_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/belt-concrete-placement-family"
    : COLUMN_BASE_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/column-base-concrete-placement-family"
    : ANCHOR_GROUP_MODE
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-concrete-placement-family"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-concrete-placement-family"),
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const ALLOW_HASHED_DIRTY_SOURCE = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const TARGETS: readonly Json[] = REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS
  : STAIRS_MODE
  ? STAIRS_CONCRETE_PLACEMENT_TARGETS
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS
  : PEDESTAL_MODE
  ? PEDESTAL_CONCRETE_PLACEMENT_TARGETS
  : PILE_CAP_MODE
  ? PILE_CAP_CONCRETE_PLACEMENT_TARGETS
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.targets
  : BELT_MODE
  ? BELT_CONCRETE_PLACEMENT_TARGETS
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS
  : ANCHOR_GROUP_MODE
  ? ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS
  : STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS;
const PARAMETERS: readonly Json[] = REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_PARAMETERS
  : STAIRS_MODE
  ? STAIRS_CONCRETE_PLACEMENT_PARAMETERS
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS
  : PEDESTAL_MODE
  ? PEDESTAL_CONCRETE_PLACEMENT_PARAMETERS
  : PILE_CAP_MODE
  ? PILE_CAP_CONCRETE_PLACEMENT_PARAMETERS
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.parameters
  : BELT_MODE
  ? BELT_CONCRETE_PLACEMENT_PARAMETERS
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_CONCRETE_PLACEMENT_PARAMETERS
  : ANCHOR_GROUP_MODE
  ? ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS
  : STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS;
const FORMULAS: readonly Json[] = REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_FORMULAS
  : STAIRS_MODE
  ? STAIRS_CONCRETE_PLACEMENT_FORMULAS
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS
  : PEDESTAL_MODE
  ? PEDESTAL_CONCRETE_PLACEMENT_FORMULAS
  : PILE_CAP_MODE
  ? PILE_CAP_CONCRETE_PLACEMENT_FORMULAS
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.formulas
  : BELT_MODE
  ? BELT_CONCRETE_PLACEMENT_FORMULAS
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_CONCRETE_PLACEMENT_FORMULAS
  : ANCHOR_GROUP_MODE
  ? ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS
  : STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS;
const RESOURCES: readonly Json[] = REINFORCEMENT_FRAME_MODE
  ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_RESOURCES
  : STAIRS_MODE
  ? STAIRS_CONCRETE_PLACEMENT_RESOURCES
  : SLAB_FOUNDATION_MODE
  ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES
  : PEDESTAL_MODE
  ? PEDESTAL_CONCRETE_PLACEMENT_RESOURCES
  : PILE_CAP_MODE
  ? PILE_CAP_CONCRETE_PLACEMENT_RESOURCES
  : CONCRETE_SLAB_MODE
  ? CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.resources
  : BELT_MODE
  ? BELT_CONCRETE_PLACEMENT_RESOURCES
  : COLUMN_BASE_MODE
  ? COLUMN_BASE_CONCRETE_PLACEMENT_RESOURCES
  : ANCHOR_GROUP_MODE
  ? ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES
  : STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES;
const COMPONENT_NORMATIVE_SOURCE_IDS = unique(RESOURCES.flatMap((resource) => {
  const graph = resource.resource_graph as Json | undefined;
  const binding = graph?.professionalPhysicalNormBindingV1 as Json | undefined;
  const guidance = graph?.normativeMethodGuidanceV1 as Json | undefined;
  const trace = Array.isArray((resource.source_metadata as Json | undefined)?.normativeTrace)
    ? (resource.source_metadata as Json).normativeTrace as Json[]
    : [];
  return [
    binding?.source_id,
    binding?.supporting_source_id,
    ...(Array.isArray(binding?.source_ids) ? binding.source_ids : []),
    guidance?.source_id,
    guidance?.supporting_source_id,
    ...trace.flatMap((entry) => [
      entry.source_id,
      entry.sourceId,
      entry.supporting_source_id,
    ]),
  ].filter((sourceId): sourceId is string =>
    typeof sourceId === "string" && sourceId.startsWith("src_"));
}));
const NORMATIVE_PARAMETER_IDS = new Set<string>(
  REINFORCEMENT_FRAME_MODE
    ? REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : STAIRS_MODE
    ? STAIRS_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : SLAB_FOUNDATION_MODE
    ? SLAB_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : PEDESTAL_MODE
    ? PEDESTAL_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : PILE_CAP_MODE
    ? PILE_CAP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : CONCRETE_SLAB_MODE
    ? CONCRETE_SLAB_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : CONCRETE_SLAB_OPERATION_PROFILE
    ? CONCRETE_SLAB_OPERATION_PROFILE.normativeParameterIds
    : BELT_MODE
    ? BELT_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : COLUMN_BASE_MODE
    ? COLUMN_BASE_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : ANCHOR_GROUP_MODE
    ? ANCHOR_GROUP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS
    : STRIP_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
);
const SOURCE_PATHS = REINFORCEMENT_FRAME_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/reinforcementFrameConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : STAIRS_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/stairsConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : SLAB_FOUNDATION_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/slabFoundationConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : PEDESTAL_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/pedestalConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : PILE_CAP_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/pileCapConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : CONCRETE_SLAB_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/concreteSlabConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.sourcePaths
  : BELT_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/beltConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : COLUMN_BASE_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/columnBaseConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : ANCHOR_GROUP_MODE
  ? [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "src/lib/estimate/v4/anchorGroupConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const
  : [
      "src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts",
      "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
      "scripts/estimate/r4a13/prepareStripFoundationConcretePlacementFamilySuccessor.ts",
    ] as const;
const RELEASE_SLUG = REINFORCEMENT_FRAME_MODE
  ? "reinforcement-frame-concrete-placement"
  : STAIRS_MODE
  ? "stairs-concrete-placement"
  : SLAB_FOUNDATION_MODE
  ? "slab-foundation-concrete-placement"
  : PEDESTAL_MODE
  ? "pedestal-concrete-placement"
  : PILE_CAP_MODE
  ? "pile-cap-concrete-placement"
  : CONCRETE_SLAB_MODE
  ? "concrete-slab-concrete-placement"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.releaseSlug
  : BELT_MODE
  ? "belt-concrete-placement"
  : COLUMN_BASE_MODE
  ? "column-base-concrete-placement"
  : ANCHOR_GROUP_MODE
  ? "anchor-group-concrete-placement"
  : "strip-concrete-placement";
const STATUS_FAMILY = REINFORCEMENT_FRAME_MODE
  ? "REINFORCEMENT_FRAME_CONCRETE_PLACEMENT"
  : STAIRS_MODE
  ? "STAIRS_CONCRETE_PLACEMENT"
  : SLAB_FOUNDATION_MODE
  ? "SLAB_FOUNDATION_CONCRETE_PLACEMENT"
  : PEDESTAL_MODE
  ? "PEDESTAL_CONCRETE_PLACEMENT"
  : PILE_CAP_MODE
  ? "PILE_CAP_CONCRETE_PLACEMENT"
  : CONCRETE_SLAB_MODE
  ? "CONCRETE_SLAB_CONCRETE_PLACEMENT"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.statusFamily
  : BELT_MODE
  ? "BELT_CONCRETE_PLACEMENT"
  : COLUMN_BASE_MODE
  ? "COLUMN_BASE_CONCRETE_PLACEMENT"
  : ANCHOR_GROUP_MODE
  ? "ANCHOR_GROUP_CONCRETE_PLACEMENT"
  : "STRIP_FOUNDATION_CONCRETE_PLACEMENT";
const TARGET_COUNT_METADATA_KEY = REINFORCEMENT_FRAME_MODE
  ? "reinforcementFrameConcretePlacementTargetCount"
  : STAIRS_MODE
  ? "stairsConcretePlacementTargetCount"
  : SLAB_FOUNDATION_MODE
  ? "slabFoundationConcretePlacementTargetCount"
  : PEDESTAL_MODE
  ? "pedestalConcretePlacementTargetCount"
  : PILE_CAP_MODE
  ? "pileCapConcretePlacementTargetCount"
  : CONCRETE_SLAB_MODE
  ? "concreteSlabConcretePlacementTargetCount"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.targetCountMetadataKey
  : BELT_MODE
  ? "beltConcretePlacementTargetCount"
  : COLUMN_BASE_MODE
  ? "columnBaseConcretePlacementTargetCount"
  : ANCHOR_GROUP_MODE
  ? "anchorGroupConcretePlacementTargetCount"
  : "stripConcreteTargetCount";
const FAMILY_SUBJECT_RU = CONCRETE_SLAB_OPERATION_MODE
  ? PILE_CAP_CURING_MODE
    ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
    : PEDESTAL_CURING_MODE
    ? "бетонного пьедестала"
    : COLUMN_BASE_CURING_MODE
    ? "столбчатого основания"
    : BELT_CURING_MODE
      ? "монолитного пояса"
      : ANCHOR_GROUP_CURING_MODE
      ? "основания анкерной группы"
    : PILE_CAP_LEVELING_MODE
      ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
      : PEDESTAL_LEVELING_MODE
      ? "\u0431\u0435\u0442\u043e\u043d\u043d\u043e\u0433\u043e \u043f\u044c\u0435\u0434\u0435\u0441\u0442\u0430\u043b\u0430"
      : COLUMN_BASE_LEVELING_MODE
      ? "столбчатого основания"
      : BELT_LEVELING_MODE
        ? "монолитного пояса"
        : ANCHOR_GROUP_LEVELING_MODE
        ? "основания анкерной группы"
      : PILE_CAP_VIBRATION_MODE
        ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
        : PEDESTAL_VIBRATION_MODE
        ? "бетонного пьедестала"
        : COLUMN_BASE_VIBRATION_MODE
          ? "столбчатого основания"
          : BELT_VIBRATION_MODE
          ? "монолитного пояса"
          : ANCHOR_GROUP_VIBRATION_MODE
          ? "основания анкерной группы"
        : PILE_CAP_REPAIR_MODE
          ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
          : PEDESTAL_REPAIR_MODE
          ? "бетонного пьедестала"
          : COLUMN_BASE_REPAIR_MODE
            ? "столбчатого основания"
            : BELT_REPAIR_MODE
            ? "монолитного пояса"
            : ANCHOR_GROUP_REPAIR_MODE
            ? "анкерной группы"
            : FORMWORK_EMBEDDED_ITEMS_MODE
              ? "опалубки"
            : PILE_CAP_EMBEDDED_ITEMS_MODE
              ? "\u0440\u043e\u0441\u0442\u0432\u0435\u0440\u043a\u0430"
              : PEDESTAL_EMBEDDED_ITEMS_MODE
              ? "бетонного пьедестала"
              : COLUMN_BASE_EMBEDDED_ITEMS_MODE
                ? "столбчатого основания"
                : BELT_EMBEDDED_ITEMS_MODE
                ? "монолитного пояса"
    : "бетонной плиты"
  : REINFORCEMENT_FRAME_MODE
  ? "подготовленного армокаркаса"
  : STAIRS_MODE
  ? "бетонной лестницы"
  : SLAB_FOUNDATION_MODE
  ? "плитного фундамента"
  : PEDESTAL_MODE
  ? "бетонного пьедестала"
  : PILE_CAP_MODE
  ? "ростверка"
  : CONCRETE_SLAB_MODE
  ? "бетонной плиты"
  : BELT_MODE
  ? "монолитного пояса"
  : COLUMN_BASE_MODE
  ? "столбчатого основания"
  : ANCHOR_GROUP_MODE
  ? "основания анкерной группы"
  : "ленточного фундамента";
const SCENARIO_PREFIX = STATUS_FAMILY;
const RECEIPT_FILE_PREFIX = REINFORCEMENT_FRAME_MODE
  ? "01_REINFORCEMENT_FRAME_CONCRETE_PLACEMENT"
  : STAIRS_MODE
  ? "01_STAIRS_CONCRETE_PLACEMENT"
  : SLAB_FOUNDATION_MODE
  ? "01_SLAB_FOUNDATION_CONCRETE_PLACEMENT"
  : PEDESTAL_MODE
  ? "01_PEDESTAL_CONCRETE_PLACEMENT"
  : PILE_CAP_MODE
  ? "01_PILE_CAP_CONCRETE_PLACEMENT"
  : CONCRETE_SLAB_MODE
  ? "01_CONCRETE_SLAB_CONCRETE_PLACEMENT"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.receiptFilePrefix
  : BELT_MODE
  ? "01_BELT_CONCRETE_PLACEMENT"
  : COLUMN_BASE_MODE
  ? "01_COLUMN_BASE_CONCRETE_PLACEMENT"
  : ANCHOR_GROUP_MODE
  ? "01_ANCHOR_GROUP_CONCRETE_PLACEMENT"
  : "01_STRIP_CONCRETE_PLACEMENT";
const CURRENT_RELEASE_OWNER = REINFORCEMENT_FRAME_MODE
  ? "EXACT_REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : STAIRS_MODE
  ? "EXACT_STAIRS_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : SLAB_FOUNDATION_MODE
  ? "EXACT_SLAB_FOUNDATION_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : PEDESTAL_MODE
  ? "EXACT_PEDESTAL_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : PILE_CAP_MODE
  ? "EXACT_PILE_CAP_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : CONCRETE_SLAB_MODE
  ? "EXACT_CONCRETE_SLAB_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.currentReleaseOwner
  : BELT_MODE
  ? "EXACT_BELT_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : COLUMN_BASE_MODE
  ? "EXACT_COLUMN_BASE_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : ANCHOR_GROUP_MODE
  ? "EXACT_ANCHOR_GROUP_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR"
  : "EXACT_STRIP_FOUNDATION_CONCRETE_PLACEMENT_FAMILY_SUCCESSOR";
const PRIMARY_NORM_ID = CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.primaryNormId
  : NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID;
const PRIMARY_SOURCE_ID = CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.primarySourceId
  : NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID;
const PRIMARY_SOURCE_METADATA: Json = CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.primarySourceMetadata
  : NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA;
const PRIMARY_PRODUCT_PROFILE_ID = CONCRETE_SLAB_OPERATION_MODE
  ? null
  : NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID;
const NORMATIVE_OWNER_ROW_ID = CONCRETE_SLAB_OPERATION_PROFILE
  ? CONCRETE_SLAB_OPERATION_PROFILE.normativeOwnerRowId
  : "material:concrete:ready-mix";

function isNormativeParameter(parameterId: string): boolean {
  return NORMATIVE_PARAMETER_IDS.has(parameterId)
    || (!CONCRETE_SLAB_OPERATION_MODE
      && parameterId === "product_profile_id");
}

function normativeSourceIdsForParameter(parameterId: string): string[] {
  if (!isNormativeParameter(parameterId)) return [];
  return [PRIMARY_SOURCE_ID];
}

function acceptanceInput(contextKey: string): Readonly<Record<string, string | number | boolean>> {
  return REINFORCEMENT_FRAME_MODE
    ? reinforcementFrameConcretePlacementAcceptanceInputR1(
        contextKey as ReinforcementFrameConcretePlacementContextKey,
      )
    : STAIRS_MODE
    ? stairsConcretePlacementAcceptanceInputR1(
        contextKey as StairsConcretePlacementContextKey,
      )
    : SLAB_FOUNDATION_MODE
    ? slabFoundationConcretePlacementAcceptanceInputR1(
        contextKey as SlabFoundationConcretePlacementContextKey,
      )
    : PEDESTAL_MODE
    ? pedestalConcretePlacementAcceptanceInputR1(
        contextKey as PedestalConcretePlacementContextKey,
      )
    : PILE_CAP_MODE
    ? pileCapConcretePlacementAcceptanceInputR1(
        contextKey as PileCapConcretePlacementContextKey,
      )
    : CONCRETE_SLAB_MODE
    ? concreteSlabConcretePlacementAcceptanceInputR1(
        contextKey as ConcreteSlabConcretePlacementContextKey,
      )
    : CONCRETE_SLAB_OPERATION_PROFILE
    ? CONCRETE_SLAB_OPERATION_PROFILE.acceptanceInput(contextKey)
    : BELT_MODE
    ? beltConcretePlacementAcceptanceInputR1(contextKey as BeltConcretePlacementContextKey)
    : COLUMN_BASE_MODE
    ? columnBaseConcretePlacementAcceptanceInputR1(
        contextKey as ColumnBaseConcretePlacementContextKey,
      )
    : ANCHOR_GROUP_MODE
    ? anchorGroupConcretePlacementAcceptanceInputR1(
        contextKey as AnchorGroupConcretePlacementContextKey,
      )
    : stripFoundationConcretePlacementAcceptanceInputR1(
        contextKey as StripFoundationConcretePlacementContextKey,
      );
}

async function compileFamily(
  parameters: Record<string, unknown>,
  catalogId: string,
): Promise<CompiledFamilyResult> {
  return REINFORCEMENT_FRAME_MODE
    ? compileReinforcementFrameConcretePlacementR1(parameters, { catalogId })
    : STAIRS_MODE
    ? compileStairsConcretePlacementR1(parameters, { catalogId })
    : SLAB_FOUNDATION_MODE
    ? compileSlabFoundationConcretePlacementR1(parameters, { catalogId })
    : PEDESTAL_MODE
    ? compilePedestalConcretePlacementR1(parameters, { catalogId })
    : PILE_CAP_MODE
    ? compilePileCapConcretePlacementR1(parameters, { catalogId })
    : CONCRETE_SLAB_MODE
    ? compileConcreteSlabConcretePlacementR1(parameters, { catalogId })
    : CONCRETE_SLAB_OPERATION_PROFILE
    ? CONCRETE_SLAB_OPERATION_PROFILE.compile(parameters, catalogId) as Promise<CompiledFamilyResult>
    : BELT_MODE
    ? compileBeltConcretePlacementR1(parameters, { catalogId })
    : COLUMN_BASE_MODE
    ? compileColumnBaseConcretePlacementR1(parameters, { catalogId })
    : ANCHOR_GROUP_MODE
    ? compileAnchorGroupConcretePlacementR1(parameters, { catalogId })
    : compileStripFoundationConcretePlacementR1(parameters, { catalogId });
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е")
    .replace(/[^0-9a-zа-я]+/gu, " ").trim();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resourceRowType(category: string): string {
  if (category === "construction_work") return "labor";
  if (category === "delivery") return "service";
  return category;
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_STRIP_CONCRETE_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_STRIP_CONCRETE_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function verifyThroughExistingCore(): Promise<Json> {
  const targetResults: Json[] = [];
  for (const target of TARGETS) {
    const fixture = acceptanceInput(target.contextKey);
    const compiled = await compileFamily({ ...fixture }, target.catalogId);
    const concrete = compiled.rows.find((row) => row.row_id === "material:concrete:ready-mix");
    invariant(compiled.preliminaryNeeds.length === 0,
      `STOP_STRIP_CONCRETE_CORE_PRELIMINARY:${target.contextKey}`);
    invariant(compiled.totals.unpricedRowCount === compiled.totals.includedRowCount,
      `STOP_STRIP_CONCRETE_CORE_PRICE_STATE:${target.contextKey}`);
    if (INTERNAL_VIBRATION_MODE) {
      invariant(concrete == null
        && compiled.rows.some((row) => row.row_id === `work:concrete:${VIBRATION_ROW_TOKEN}`)
        && compiled.rows.some((row) => row.row_id === "equipment:concrete:internal-vibrator")
        && compiled.rows.some(
          (row) => row.row_id === `service:concrete:${VIBRATION_ROW_TOKEN}-quality-control`,
        ), `STOP_STRIP_CONCRETE_VIBRATION_ROWS:${target.contextKey}`);
    } else if (EXTERNAL_CURING_MODE) {
      const materialRows = compiled.rows.filter((row) => row.section === "Материалы");
      invariant(concrete == null
        && compiled.rows.some(
          (row) => row.row_id === `work:concrete:${CURING_ROW_TOKEN}`,
        )
        && compiled.rows.some(
          (row) => row.row_id === `service:concrete:${CURING_ROW_TOKEN}-quality-control`,
        )
        && materialRows.length >= 1
        && materialRows.length <= 2,
      `STOP_STRIP_CONCRETE_CURING_ROWS:${target.contextKey}`);
    } else if (SURFACE_LEVELING_MODE) {
      const materialRows = compiled.rows.filter((row) => row.section === "Материалы");
      invariant(concrete == null
        && compiled.rows.some(
          (row) => row.row_id === `work:concrete:${LEVELING_ROW_TOKEN}`,
        )
        && compiled.rows.some(
          (row) => row.row_id === `service:concrete:${LEVELING_ROW_TOKEN}-surface-control`,
        )
        && materialRows.length <= 1
        && materialRows.every((row) => row.row_id === "material:concrete:screed-guides"),
      `STOP_STRIP_CONCRETE_LEVELING_ROWS:${target.contextKey}`);
    } else if (CONCRETE_SLAB_COMPLETE_MODE) {
      const expectedConcrete = Number(fixture.slab_concrete_volume_m3)
        * (1 + Number(fixture.placement_selected_contingency_percent) / 100);
      invariant(Math.abs(Number(concrete?.quantity) - expectedConcrete) < 1e-8
        && compiled.rows.some(
          (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
        )
        && compiled.rows.some(
          (row) => row.row_id === "equipment:formwork:dokaflex-floor-props-rental",
        )
        && (target.contextKey === "repair"
          ? !compiled.rows.some((row) => row.row_id === "material:concrete:slab-embedded-items")
          : compiled.rows.some(
              (row) => row.row_id === "material:concrete:slab-embedded-items",
            )),
      `STOP_STRIP_CONCRETE_COMPLETE_INSTALLATION_ROWS:${target.contextKey}`);
    } else if (CONCRETE_JOINT_COMPLETE_MODE) {
      invariant(concrete == null
        && Number(compiled.rows.find(
          (row) => row.row_id === "work:concrete:joint-complete-installation",
        )?.quantity) === Number(fixture.joint_length_m)
        && compiled.rows.some(
          (row) => row.row_id === "labor:concrete:joint-complete-installation",
        )
        && !compiled.rows.some((row) => row.row_id.includes("formwork"))
        && !compiled.rows.some((row) => row.row_id.includes("frami")),
      `STOP_STRIP_CONCRETE_JOINT_COMPLETE_ROWS:${target.contextKey}`);
    } else if (STAIRS_COMPLETE_MODE) {
      const expectedConcrete = Number(fixture.stairs_concrete_volume_m3)
        * (1 + Number(fixture.placement_selected_contingency_percent) / 100);
      invariant(Math.abs(Number(concrete?.quantity) - expectedConcrete) < 1e-8
        && compiled.rows.some(
          (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
        )
        && compiled.rows.some(
          (row) => row.row_id === "work:formwork:stairs-measured-contact-area",
        )
        && !compiled.rows.some((row) => row.row_id.includes("frami-xlife"))
        && !compiled.rows.some((row) => row.row_id.includes("dokaflex")),
      `STOP_STRIP_CONCRETE_STAIRS_COMPLETE_ROWS:${target.contextKey}`);
    } else if (ANCHOR_GROUP_REPAIR_MODE) {
      const scope = String(fixture.anchor_group_repair_scope_mode);
      const includesConcrete = scope !== "ANCHOR_HARDWARE_ONLY";
      const includesHardware = scope !== "CONCRETE_SUBSTRATE_ONLY";
      invariant(concrete == null
        && compiled.rows.some(
          (row) => row.row_id === "service:anchor-group:condition-assessment",
        )
        && compiled.rows.some(
          (row) => row.row_id === "service:anchor-group:repair-scope-documentation",
        )
        && compiled.rows.some(
          (row) => row.row_id === "work:concrete:anchor-group-concrete-repair-removal",
        ) === includesConcrete
        && compiled.rows.some(
          (row) => row.row_id === "material:concrete:anchor-group-concrete-repair-material",
        ) === includesConcrete
        && compiled.rows.some(
          (row) => row.row_id === "work:anchor-group:repair-hardware",
        ) === includesHardware
        && !compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")
        && !compiled.rows.some((row) => row.row_id.includes("formwork")),
      `STOP_STRIP_CONCRETE_ANCHOR_GROUP_REPAIR_ROWS:${target.contextKey}`);
    } else if (CONCRETE_SLAB_REPAIR_MODE || BELT_REPAIR_MODE
      || COLUMN_BASE_REPAIR_MODE || PEDESTAL_REPAIR_MODE || PILE_CAP_REPAIR_MODE) {
      invariant(concrete == null
        && compiled.rows.some((row) => row.row_id === `work:concrete:${REPAIR_ROW_TOKEN}-removal`)
        && compiled.rows.some((row) => row.row_id === `work:concrete:${REPAIR_ROW_TOKEN}-placement`)
        && compiled.rows.some((row) => row.row_id === `material:concrete:${REPAIR_ROW_TOKEN}-material`)
        && compiled.rows.some((row) => row.row_id === `service:concrete:${REPAIR_ROW_TOKEN}-inspection`)
        && compiled.rows.some((row) => row.row_id === `delivery:concrete:${REPAIR_ROW_TOKEN}-material`)
        && !compiled.rows.some((row) => row.row_id.includes("formwork")),
      `STOP_STRIP_CONCRETE_REPAIR_ROWS:${target.contextKey}`);
    } else if (EMBEDDED_ITEMS_MODE) {
      invariant(concrete == null
        && compiled.rows.some(
          (row) => row.row_id === `material:concrete:${EMBEDDED_ITEMS_ROW_TOKEN}`,
        )
        && compiled.rows.some(
          (row) => row.row_id === `work:concrete:${EMBEDDED_ITEMS_ROW_TOKEN}-positioning`,
        )
        && compiled.rows.some(
          (row) => row.row_id === `work:concrete:${EMBEDDED_ITEMS_ROW_TOKEN}-fixing`,
        )
        && compiled.rows.some(
          (row) => row.row_id === `service:concrete:${EMBEDDED_ITEMS_ROW_TOKEN}-inspection`,
        )
        && compiled.rows.some(
          (row) => row.row_id === `delivery:concrete:${EMBEDDED_ITEMS_ROW_TOKEN}`,
        )
        && !compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")
        && !compiled.rows.some((row) => row.row_id === "material:concrete:reinforcement")
        && !compiled.rows.some((row) => row.row_id === "material:concrete:formwork")
        && (FORMWORK_EMBEDDED_ITEMS_MODE
          || !compiled.rows.some((row) => row.row_id.includes("formwork"))),
      `STOP_STRIP_CONCRETE_EMBEDDED_ITEMS_ROWS:${target.contextKey}`);
    } else {
      const expectedConcrete = Number(fixture.plan_dimension_concrete_volume_m3)
        * (1 + Number(fixture.selected_contingency_percent) / 100);
      invariant(Math.abs(Number(concrete?.quantity) - expectedConcrete) < 1e-8,
        `STOP_STRIP_CONCRETE_CORE_ORDER:${target.contextKey}`);
      invariant(compiled.rows.some((row) => row.row_id === "work:concrete:place-and-compact")
        && compiled.rows.some((row) => row.row_id === "equipment:concrete:deep-vibrator")
        && compiled.rows.some((row) => row.row_id === "service:concrete:acceptance-control")
        && compiled.rows.some((row) => row.row_id === "delivery:concrete:ready-mix"),
      `STOP_STRIP_CONCRETE_CORE_SCOPE:${target.contextKey}`);
    }
    targetResults.push({
      contextKey: target.contextKey,
      catalogId: target.catalogId,
      includedRows: compiled.rows.length,
      procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      ...(INTERNAL_VIBRATION_MODE
        ? { consolidatedConcreteVolumeM3: fixture.consolidated_concrete_volume_m3 }
        : EXTERNAL_CURING_MODE
        ? {
            curedConcreteVolumeM3: fixture.cured_concrete_volume_m3,
            approvedExternalCuringMethod: fixture.approved_external_curing_method,
          }
        : SURFACE_LEVELING_MODE
        ? {
            leveledConcreteVolumeM3: fixture.leveled_concrete_volume_m3,
            approvedLevelingMethodDesignation: fixture.approved_leveling_method_designation,
          }
        : CONCRETE_SLAB_COMPLETE_MODE
        ? {
            slabConcreteVolumeM3: fixture.slab_concrete_volume_m3,
            slabSupportCondition: fixture.slab_support_condition,
            reinforcementApplicable: fixture.reinforcement_applicable,
            embeddedItemsApplicable: fixture.embedded_items_applicable,
            concreteOrderM3: concrete?.quantity,
          }
        : CONCRETE_JOINT_COMPLETE_MODE
        ? {
            jointLengthM: fixture.joint_length_m,
            jointWidthMm: fixture.joint_width_mm,
            jointDepthMm: fixture.joint_depth_mm,
            jointType: fixture.joint_type,
          }
        : STAIRS_COMPLETE_MODE
        ? {
            stairsConcreteVolumeM3: fixture.stairs_concrete_volume_m3,
            reinforcementApplicable: fixture.reinforcement_applicable,
            temporaryFormworkApplicable: fixture.temporary_formwork_applicable,
            measuredFormworkContactAreaM2:
              fixture.formwork_measured_formwork_contact_area_m2,
            concreteOrderM3: concrete?.quantity,
          }
        : ANCHOR_GROUP_REPAIR_MODE
        ? {
            repairScopeVolumeM3: fixture.repair_scope_volume_m3,
            anchorGroupRepairScopeMode: fixture.anchor_group_repair_scope_mode,
            conditionAssessmentServiceH: fixture.condition_assessment_service_h,
          }
        : CONCRETE_SLAB_REPAIR_MODE
        ? {
            repairScopeVolumeM3: fixture.repair_scope_volume_m3,
            repairSurfaceAreaM2: fixture.repair_surface_area_m2,
            approvedRepairMethodDesignation: fixture.approved_repair_method_designation,
          }
        : EMBEDDED_ITEMS_MODE
        ? {
            embeddedItemCountPiece: fixture.embedded_item_count_piece,
            embeddedItemTotalMassKg: fixture.embedded_item_total_mass_kg,
            approvedEmbedmentDesignReference: fixture.approved_embedment_design_reference,
          }
        : { concreteOrderM3: concrete?.quantity }),
      inputSha256: sha256(fixture),
      compiledSha256: sha256(compiled),
    });
  }
  const serialized = JSON.stringify({
    resources: RESOURCES,
    formulas: FORMULAS,
  });
  for (const forbidden of [
    "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1",
    "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
    "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
  ]) {
    invariant(!serialized.includes(forbidden), `STOP_STRIP_CONCRETE_LEGACY_SOURCE:${forbidden}`);
  }
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    targetCount: targetResults.length,
    parameterCount: PARAMETERS.length,
    formulaCount: FORMULAS.length,
    resourceDefinitionCount: RESOURCES.length,
    targetResults,
    deterministicSha256: sha256(targetResults),
  };
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  definitionIds: ReadonlyMap<string, string>;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        $10::text,$11::int)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PARENT_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint, TARGET_COUNT_METADATA_KEY, TARGETS.length,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, PARENT_SEARCH_RELEASE_ID, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);

  const clarificationFields = PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  for (const target of TARGETS) {
    const aliases = INTERNAL_VIBRATION_MODE ? [
      `виброуплотнение ${VIBRATION_ELEMENT_RU} ${target.contextRu}`,
      `уплотнение свежеуложенного бетона глубинным вибратором ${target.contextRu}`,
      `ACI 309 проектная ведомость виброуплотнения ${target.contextRu}`,
    ] : EXTERNAL_CURING_MODE ? [
      `уход за бетоном ${CURING_ELEMENT_RU} ${target.contextRu}`,
      `внешний уход за свежеуложенным бетоном ${target.contextRu}`,
      `ACI 308 проектный способ ухода за бетоном ${target.contextRu}`,
    ] : SURFACE_LEVELING_MODE ? [
      `выравнивание ${LEVELING_ELEMENT_RU} ${target.contextRu}`,
      `выравнивание и срезка свежеуложенного бетона ${target.contextRu}`,
      `ACI 302 проектный способ выравнивания ${LEVELING_ELEMENT_RU} ${target.contextRu}`,
    ] : STRUCTURAL_REPAIR_MODE ? [
      `ремонт ${REPAIR_ELEMENT_RU} ${target.contextRu}`,
      `обследование и восстановление ${REPAIR_ELEMENT_RU} ${target.contextRu}`,
      `ACI 562 проект ремонта ${REPAIR_ELEMENT_RU} ${target.contextRu}`,
    ] : EMBEDDED_ITEMS_MODE ? [
      `монтаж закладных для ${EMBEDDED_ITEMS_ELEMENT_RU} ${target.contextRu}`,
      `установка закладных изделий до бетонирования ${target.contextRu}`,
      `ACI 301 и ACI 117 закладные изделия ${EMBEDDED_ITEMS_ELEMENT_RU} ${target.contextRu}`,
    ] : CONCRETE_SLAB_COMPLETE_MODE ? [
      `полное устройство бетонной плиты ${target.contextRu}`,
      `бетонная плита с армированием и применимой опалубкой ${target.contextRu}`,
      `бетонирование плиты с работами материалами техникой услугами и логистикой ${target.contextRu}`,
    ] : CONCRETE_JOINT_COMPLETE_MODE ? [
      `устройство деформационного шва ${target.contextRu}`,
      `монтаж проектного узла бетонного шва ${target.contextRu}`,
      `заполнение герметизация и применимая передача нагрузки шва ${target.contextRu}`,
    ] : STAIRS_COMPLETE_MODE ? [
      `полное устройство монолитной бетонной лестницы ${target.contextRu}`,
      `бетонная лестница с армированием и проектной опалубкой ${target.contextRu}`,
      `бетонирование маршей ступеней и площадок ${target.contextRu}`,
    ] : [
      `бетонирование ${FAMILY_SUBJECT_RU} ${target.contextRu}`,
      `полная смета укладки бетона ${target.contextRu}`,
      `заказ товарного бетона NRMCA CIP 31 ${target.contextRu}`,
    ];
    const normalizedCanonicalName = normalizeSearchText(target.titleRu);
    const normalizedAliases = aliases.map(normalizeSearchText);
    const normalizedSearchTerms = unique([
      normalizeSearchText(target.catalogId),
      normalizedCanonicalName,
      ...normalizedCanonicalName.split(" "),
      ...normalizedAliases,
      ...normalizedAliases.flatMap((alias) => alias.split(" ")),
    ]);
    const updated = await client.query(`update public.estimate_search_document set
        canonical_name_ru=$3,primary_uom='m3',short_scope_ru=$4,
        included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
        required_inputs_count=$7,clarification_fields=$8::jsonb,
        normative_classifiers=array_append(array_remove(coalesce(normative_classifiers,'{}'::text[]),$9),$9),
        applicability_tags=array_append(array_remove(coalesce(applicability_tags,'{}'::text[]),
          'FULL_QUANTITY_SCOPE_PRICE_PARTIAL'),'FULL_APPLICABLE_SCOPE_PRICE_PARTIAL'),
        source_provenance=source_provenance||jsonb_build_object('productProfileId',$10::text,
          'contextKey',$11::text,'fullApplicableScope',true,'projectScheduleRequired',true),
        aliases=$12::text[],normalized_canonical_name=$13,normalized_aliases=$14::text[],
        normalized_search_terms=$15::text[],normalized_search_blob=$16,
        definition_version_id=$17::uuid,
        document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3||':'||$17::uuid::text,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$2`, [
      input.searchReleaseId,
      target.catalogId,
      target.titleRu,
      `Полная применимая смета бетонирования ${FAMILY_SUBJECT_RU}: бетон, уход, работы, оборудование, контроль и доставка; ${target.contextRu}.`,
      JSON.stringify([
        "товарный бетон с подтверждёнными классом, водонепроницаемостью, морозостойкостью и подвижностью",
        "укладка, уплотнение, отделка поверхности и уход за бетоном",
        "применимое оборудование, приёмочный контроль и доставка",
        "зимний прогрев только при явно выбранном зимнем режиме",
      ]),
      JSON.stringify([
        "арматура и опалубка как отдельные технологические семейства",
        "автоматические нормы производительности труда и оборудования",
        "скрытое расстояние доставки и неподтверждённые цены",
        "универсальный двухпроцентный запас бетонной смеси",
      ]),
      clarificationFields.length,
      JSON.stringify(clarificationFields),
      PRIMARY_NORM_ID,
      PRIMARY_PRODUCT_PROFILE_ID,
      target.contextKey,
      aliases,
      normalizedCanonicalName,
      normalizedAliases,
      normalizedSearchTerms,
      normalizedSearchTerms.join("\u001f"),
      input.definitionIds.get(target.catalogId),
    ]);
    invariant(updated.rowCount === 1, `STOP_STRIP_CONCRETE_SEARCH_TARGET_MISSING:${target.catalogId}`);
    if (INTERNAL_VIBRATION_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          short_scope_ru=$3,included_boundaries=$4::jsonb,excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'projectScheduleRequired',true,
            'universalProductivityClaimed',false,'materialScope','NO_INTRINSIC_CONSUMABLES')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета виброуплотнения ${VIBRATION_ELEMENT_RU}: объём операции, труд, глубинный вибратор, контроль и применимая мобилизация; ${target.contextRu}.`,
        JSON.stringify([
          "объём свежеуложенного бетона, подлежащий виброуплотнению по утверждённой технологической карте",
          "проектные трудозатраты и машино-время глубинного вибратора",
          "записи контроля качества и отдельная доставка/возврат оборудования, если они не включены в ставку",
          "материалы отсутствуют, потому что операция не потребляет отдельный материал; бетон относится к операции укладки",
        ]),
        JSON.stringify([
          "поставка и укладка бетонной смеси, опалубка, арматура, отделка поверхности и уход за бетоном",
          "автоматическая производительность труда или вибратора, не указанная в проектной ведомости",
          "скрытая длительность аренды, скрытые рейсы и неподтверждённые цены",
          "поверхностная вибрация и иные методы уплотнения без отдельного технологического дескриптора",
        ]),
        PRIMARY_SOURCE_ID,
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_VIBRATION_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (EXTERNAL_CURING_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          short_scope_ru=$3,included_boundaries=$4::jsonb,excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'projectScheduleRequired',true,
            'universalProductivityClaimed',false,'universalConsumptionClaimed',false,
            'methodSelection','PROJECT_SPECIFIED_CONDITIONAL_BRANCH')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета ухода за бетоном ${CURING_ELEMENT_RU}: труд, материалы выбранного проектом способа, применимое оборудование, контроль и мобилизация; ${target.contextRu}.`,
        JSON.stringify([
          `объём и открытая площадь ${CURING_ELEMENT_RU} в границе ухода`,
          "только материалы утверждённого проектом способа: вода, влажное покрытие, влагонепроницаемый лист или мембранный состав",
          "проектные трудозатраты, применимое машино-время и записи контроля качества",
          "отдельная доставка/возврат оборудования только если они не включены в ставку",
        ]),
        JSON.stringify([
          "поставка и укладка бетонной смеси, виброуплотнение, отделка поверхности, опалубка и арматура",
          "одновременное навязывание взаимоисключающих способов ухода",
          "автоматический расход материалов, производительность или умножение ресурсов на длительность ухода",
          "скрытая длительность аренды, скрытые рейсы и неподтверждённые цены",
        ]),
        PRIMARY_SOURCE_ID,
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_CURING_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (SURFACE_LEVELING_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          short_scope_ru=$3,included_boundaries=$4::jsonb,excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'projectScheduleRequired',true,
            'universalProductivityClaimed',false,'universalConsumptionClaimed',false,
            'methodSelection','PROJECT_SPECIFIED_CONDITIONAL_BRANCH')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета выравнивания ${LEVELING_ELEMENT_RU}: труд, проектные направляющие, применимое оборудование, контроль поверхности и мобилизация; ${target.contextRu}.`,
        JSON.stringify([
          `объём и площадь поверхности ${LEVELING_ELEMENT_RU} в границе выравнивания`,
          "только подтверждённые проектом направляющие и их прямое количество, когда они требуются",
          "проектные трудозатраты, применимое машино-время и записи измерения отметок, уклонов, ровности и уровня",
          "отдельная доставка/возврат оборудования только если они не включены в ставку",
        ]),
        JSON.stringify([
          "поставка и укладка бетонной смеси, виброуплотнение, окончательная отделка, уход, опалубка и арматура",
          "автоматический выбор способа выравнивания или оборудования вместо проектной технологической карты",
          "автоматический расход направляющих, производительность труда или оборудования",
          "скрытая длительность аренды, скрытые рейсы и неподтверждённые цены",
        ]),
        PRIMARY_SOURCE_ID,
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_LEVELING_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (STRUCTURAL_REPAIR_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          short_scope_ru=$3,included_boundaries=$4::jsonb,excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'supportingNormSourceId',$7::text,
            'projectScheduleRequired',true,'universalProductivityClaimed',false,
            'universalConsumptionClaimed',false,
            'methodSelection','APPROVED_REPAIR_DESIGN_AND_METHOD')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        ANCHOR_GROUP_REPAIR_MODE
          ? `Полная применимая смета ремонта анкерной группы: обследование и выбранные пользователем бетонная, анкерная либо обе ветви; прямые проектные количества, контроль и логистика; ${target.contextRu}.`
          : `Полная применимая смета ремонта ${REPAIR_ELEMENT_RU}: удаление повреждённого бетона, подготовка, проектные материалы, укладка, уход, оборудование, контроль, доставка и отходы; ${target.contextRu}.`,
        JSON.stringify(ANCHOR_GROUP_REPAIR_MODE ? [
          "обследование состояния и фиксация границ ремонта анкерной группы",
          "бетонная ветвь только при выборе ремонта основания: удаление, подготовка, проектные материалы, укладка и уход",
          "анкерная ветвь только при выборе ремонта компонентов: проектные анкеры, крепёж, подливка, защита, сварка, опоры и оборудование",
          "контроль, документы, доставка и отходы только по прямой проектной ведомости",
        ] : [
          "границы и причина дефекта по обследованию, утверждённый проект и технологическая карта ремонта",
          "удаление повреждённого бетона, подготовка основания, укладка проектного ремонтного материала и уход",
          "только выбранные проектом контактный состав, обработка арматуры, оборудование и испытания",
          "контроль качества, доставка материалов и вывоз отходов только по прямой ведомости",
        ]),
        JSON.stringify(ANCHOR_GROUP_REPAIR_MODE ? [
          "автоматическое включение бетонной или анкерной ветви без подтверждённого состава ремонта",
          "новый бетон, арматура и опалубка за границами выбранного ремонта",
          "автоматический выбор анкеров, материалов, оборудования, производительности или частоты контроля",
          "скрытые количества, рейсы, сроки, неподтверждённые цены и выдуманные значения",
        ] : [
          "полная замена плиты, новое бетонирование, опалубка и армирование за границами проекта ремонта",
          "автоматический выбор способа, материала, состава обработки или оборудования без проекта",
          "универсальные нормы расхода, производительности, испытаний, отходов и рейсов",
          "скрытые количества, неподтверждённые цены и автоматическое масштабирование прямых проектных часов",
        ]),
        PRIMARY_SOURCE_ID,
        CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_source_id,
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_REPAIR_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (EMBEDDED_ITEMS_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          primary_uom='piece',short_scope_ru=$3,included_boundaries=$4::jsonb,
          excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'supportingNormSourceId',$7::text,
            'projectScheduleRequired',true,'universalProductivityClaimed',false,
            'universalConsumptionClaimed',false,
            'methodSelection','APPROVED_EMBEDMENT_DESIGN_DRAWINGS_AND_SCHEDULE')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета монтажа закладных ${EMBEDDED_ITEMS_ELEMENT_RU}: изделия, разбивка, установка, фиксация, выбранные проектом сварка, опоры, подъём, геодезия, покрытие, освидетельствование и логистика; ${target.contextRu}.`,
        JSON.stringify([
          "количество, масса и обозначение закладных по утверждённой проектной ведомости",
          "разбивка, установка и фиксация закладных в проектном положении до бетонирования",
          "сварка, монтажные опоры, подъёмное оборудование, геодезия и восстановление покрытия только когда они явно требуются проектом",
          "освидетельствование до бетонирования и доставка по прямой проектной или коммерческой ведомости",
        ]),
        JSON.stringify([
          "проектирование и изготовление закладных, постустановленные анкеры, бетон, арматура и опалубка",
          "автоматический выбор сварки, опор, подъёмного оборудования, геодезии или покрытия",
          "универсальные нормы расхода и производительности вместо проектной ведомости",
          "скрытые количества, рейсы, сроки аренды и неподтверждённые цены",
        ]),
        PRIMARY_SOURCE_ID,
        CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_source_id,
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_EMBEDDED_ITEMS_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (CONCRETE_SLAB_COMPLETE_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          short_scope_ru=$3,included_boundaries=$4::jsonb,excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'componentNormSourceIds',$7::jsonb,
            'projectScheduleRequired',true,'universalProductivityClaimed',false,
            'universalConsumptionClaimed',false,
            'componentApplicability','USER_CONFIRMED_FAIL_CLOSED')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета устройства бетонной плиты: бетон, армирование, применимая опалубка, закладные, работы, техника, услуги, контроль и логистика; ${target.contextRu}.`,
        JSON.stringify([
          "проектный объём бетонной плиты и подтверждённая спецификация бетонной смеси",
          "армирование только когда оно предусмотрено проектом, по прямой ведомости арматуры",
          "комплект опалубки Dokaflex только для подвесной или междуэтажной плиты по проектной раскладке",
          "закладные изделия только когда они предусмотрены проектом, по прямой ведомости",
          "работы, техника, услуги, контроль и логистика только по применимым подтверждённым ветвям",
        ]),
        JSON.stringify([
          "автоматический выбор конструкции плиты, армирования, опалубки или закладных вместо проекта",
          "универсальные нормы расхода или производительности вместо прямых проектных количеств",
          "неприменимые компоненты: опалубка для плиты по грунту, отсутствующая арматура или отсутствующие закладные",
          "скрытые часы, рейсы, сроки аренды и неподтверждённые цены",
        ]),
        PRIMARY_SOURCE_ID,
        JSON.stringify(COMPONENT_NORMATIVE_SOURCE_IDS),
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_COMPLETE_INSTALLATION_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (CONCRETE_JOINT_COMPLETE_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          primary_uom='m',short_scope_ru=$3,included_boundaries=$4::jsonb,
          excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'projectScheduleRequired',true,
            'universalProductivityClaimed',false,'universalConsumptionClaimed',false,
            'jointBranchSelection','USER_CONFIRMED_FAIL_CLOSED')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета устройства деформационного шва: проектная геометрия, выбранные материалы, труд, оборудование, контроль и логистика; ${target.contextRu}.`,
        JSON.stringify([
          "длина, ширина, глубина и тип шва по проектному узлу",
          "заполнитель, уплотнительный шнур, герметик, гидроизоляционная шпонка и защита кромок только по выбранным проектом ветвям",
          "устройства передачи нагрузки и армирование кромок только по утверждённой ведомости",
          "прямые проектные трудозатраты, оборудование, контроль, доставка и отходы только когда они применимы",
        ]),
        JSON.stringify([
          "вертикальная стеновая опалубка Frami и подмена полного шва комплектом опалубки",
          "автоматический выбор типа шва, продукта, герметизации или устройства передачи нагрузки",
          "универсальные нормы расхода, производительности, отходов и рейсов",
          "скрытые количества и неподтверждённые цены",
        ]),
        PRIMARY_SOURCE_ID,
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_JOINT_COMPLETE_SEARCH_CORRECTION:${target.catalogId}`);
    } else if (STAIRS_COMPLETE_MODE) {
      const corrected = await client.query(`update public.estimate_search_document set
          short_scope_ru=$3,included_boundaries=$4::jsonb,excluded_boundaries=$5::jsonb,
          source_provenance=source_provenance||jsonb_build_object(
            'normSourceId',$6::text,'componentNormSourceIds',$7::jsonb,
            'projectScheduleRequired',true,'universalProductivityClaimed',false,
            'universalConsumptionClaimed',false,
            'formworkSystemSelection','PROJECT_SPECIFIED_NO_AUTOMATIC_BRAND')
        where search_release_id=$1 and catalog_id=$2`, [
        input.searchReleaseId,
        target.catalogId,
        `Полная применимая смета монолитной бетонной лестницы: бетон, армирование, проектная опалубка, работы, техника, контроль и логистика; ${target.contextRu}.`,
        JSON.stringify([
          "проектный объём бетона маршей и площадок и подтверждённая спецификация смеси",
          "армирование только по утверждённой ведомости стержней",
          "опалубка по измеренной площади контакта RICS NRM 2 и прямой проектной ведомости комплекта",
          "прямые трудозатраты, оборудование, контроль, доставка и возврат по применимым ветвям",
        ]),
        JSON.stringify([
          "автоматический выбор Frami, Dokaflex или другой системы без проекта опалубки лестницы",
          "универсальный коэффициент площади опалубки на м³ бетона",
          "универсальные нормы расхода или производительности вместо прямых проектных количеств",
          "скрытые сроки аренды, рейсы и неподтверждённые цены",
        ]),
        PRIMARY_SOURCE_ID,
        JSON.stringify(COMPONENT_NORMATIVE_SOURCE_IDS),
      ]);
      invariant(corrected.rowCount === 1,
        `STOP_STRIP_CONCRETE_STAIRS_COMPLETE_SEARCH_CORRECTION:${target.catalogId}`);
    }
  }
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      [TARGET_COUNT_METADATA_KEY]: TARGETS.length,
      parameterCountPerTarget: PARAMETERS.length,
      formulaCountPerTarget: FORMULAS.length,
      resourceDefinitionCountPerTarget: RESOURCES.length,
    }),
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
  definitionIds: ReadonlyMap<string, string>,
): Promise<Json> {
  const ids = [...definitionIds.values()];
  const catalogIds = TARGETS.map((target) => target.catalogId);
  const release = (await client.query(`select id,status,activated_at,definition_count,parameter_count,
      formula_count,resource_row_count,source_manifest_sha256,parent_release_id
    from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]) and definition_version_id=any($3::uuid[]))::int replaced,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, catalogIds, ids,
  ])).rows[0] as Json;
  const targets = (await client.query(`select definition.id definition_id,definition.catalog_id,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources,
      (select count(*)::int from public.estimate_work_normative_binding b where b.definition_version_id=definition.id) bindings,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id and r.procurement_eligible) procurement_rows,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id and r.source_metadata::text like '%src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1%') forbidden_legacy_rows
    from public.estimate_definition_version definition
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where definition.id=any($1::uuid[]) order by definition.catalog_id`, [ids])).rows as Json[];
  const search = (await client.query(`select count(*)::int targets,
      count(*) filter(where required_inputs_count=$4 and selectable
        and definition_version_id=any($3::uuid[]))::int valid,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_document
        where search_release_id=$1 and selectable and adjudication_class='EFFECTIVE_WORK') visible,
      (select snapshot_sha256 from public.estimate_search_index_release where id=$1) snapshot_sha256
    from public.estimate_search_document
    where search_release_id=$1 and catalog_id=any($2::text[])`, [
    searchReleaseId, catalogIds, ids, PARAMETERS.length,
  ])).rows[0] as Json;
  return { release, manifest, targets, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_STRIP_CONCRETE_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_STRIP_CONCRETE_MASTER_SHA256_DRIFT");
  const expectedTargetCount = CONCRETE_SLAB_OPERATION_PROFILE?.expectedTargetCount ?? 7;
  invariant(TARGETS.length === expectedTargetCount
    && new Set(TARGETS.map((target) => target.catalogId)).size === expectedTargetCount,
    "STOP_STRIP_CONCRETE_TARGET_SET");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_STRIP_CONCRETE_SOURCE_MISSING:${path}`);
    if (!ALLOW_HASHED_DIRTY_SOURCE
      && !ANCHOR_GROUP_MODE && !COLUMN_BASE_MODE && !BELT_MODE && !CONCRETE_SLAB_MODE && !CONCRETE_SLAB_OPERATION_MODE && !PILE_CAP_MODE && !PEDESTAL_MODE && !SLAB_FOUNDATION_MODE && !STAIRS_MODE && !REINFORCEMENT_FRAME_MODE) {
      invariant(git("diff", "--name-only", "HEAD", "--", path) === "",
        `STOP_STRIP_CONCRETE_SOURCE_UNCOMMITTED:${path}`);
    }
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const dirtyOverlaySha256 = sha256({ head, sourceHashes });
  const coreAcceptance = await verifyThroughExistingCore();
  const parameterSchemaSha256 = sha256(PARAMETERS.map((parameter) => ({
    id: parameter.parameter_id,
    type: parameter.value_type,
    unit: parameter.unit_id,
    required: parameter.required,
    constraints: parameter.constraints_json,
  })));
  const definitionSchemaSha256 = sha256({
    parameters: PARAMETERS,
    formulas: FORMULAS,
    resources: RESOURCES,
  });
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    head,
    tree,
    parentReleaseId: PARENT_RELEASE_ID,
    parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
    sourceHashes,
    parameterSchemaSha256,
    definitionSchemaSha256,
    coreAcceptance,
    targets: TARGETS,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `r4-a13-6-${RELEASE_SLUG}-${fingerprint.slice(0, 16)}`;
  const definitionIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:definition`),
  ]));
  const baselineIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:baseline`),
  ]));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_STRIP_CONCRETE_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_STRIP_CONCRETE_CURRENT_RELEASE_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const formulaConsumers = Object.fromEntries(PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    FORMULAS
      .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
      .map((formula) => formula.formula_id),
  ]));
  const resourceConsumers = Object.fromEntries(PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    RESOURCES
      .filter((resource) => formulaConsumers[parameter.parameter_id].includes(resource.formula_id)
        || JSON.stringify(resource.resource_graph).includes(`\"${parameter.parameter_id}\"`)
        || JSON.stringify(resource.inclusion_ast).includes(`\"${parameter.parameter_id}\"`)
        || (isNormativeParameter(parameter.parameter_id)
          && resource.row_id === NORMATIVE_OWNER_ROW_ID))
      .map((resource) => resource.row_id),
  ]));
  const passportRepresentative = INTERNAL_VIBRATION_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      `объём ${VIBRATION_ELEMENT_RU}, подлежащий виброуплотнению по утверждённой технологической карте`,
      "проектные трудозатраты и машино-время глубинного вибратора",
      "контроль качества и применимая доставка/возврат оборудования",
      "отсутствие отдельного расходного материала в границе операции",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : EXTERNAL_CURING_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      `объём и открытая площадь ${CURING_ELEMENT_RU} в границе ухода по утверждённой проектной спецификации`,
      "прямые проектные трудозатраты и материалы только выбранного способа внешнего ухода",
      "применимое оборудование, контроль качества и отдельная мобилизация по проектной ведомости",
      "вода, влажное покрытие, влагонепроницаемый лист или мембранный состав как условные взаимоисключающие ветви",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : SURFACE_LEVELING_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      `объём и площадь поверхности ${LEVELING_ELEMENT_RU} в границе выравнивания по проектной документации`,
      "прямые проектные трудозатраты и направляющие только при их явной необходимости",
      "применимое оборудование, контроль отметок, уклонов, ровности и уровня",
      "отдельная мобилизация оборудования только по прямой проектной или коммерческой ведомости",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : CONCRETE_SLAB_COMPLETE_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "проектный объём и спецификация бетонной смеси, укладка, уплотнение, отделка, уход и контроль",
      "армирование по прямой проектной ведомости только при подтверждённой применимости",
      "комплект опалубки Dokaflex по проектной раскладке только для подвесной или междуэтажной плиты",
      "закладные, техника, услуги и логистика только по явно выбранным применимым ветвям",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : CONCRETE_JOINT_COMPLETE_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "проектные длина, ширина, глубина и тип деформационного шва",
      "только явно выбранные заполнение, герметизация, гидроизоляция, защита кромок, передача нагрузки и армирование",
      "прямые проектные трудозатраты и применимое оборудование",
      "контроль, доставка и отходы только по выбранным ветвям и прямой ведомости",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : STAIRS_COMPLETE_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "проектный объём бетона лестничных маршей и площадок, укладка, уплотнение, уход и контроль",
      "армирование по прямой утверждённой ведомости только при подтверждённой применимости",
      "опалубка по измеренной площади контакта и прямой проектной ведомости без автоматического выбора бренда",
      "применимые материалы, труд, оборудование, услуги и логистика по выбранным ветвям",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : STRUCTURAL_REPAIR_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: ANCHOR_GROUP_REPAIR_MODE ? [
      "обследование состояния, границы и явный выбор состава ремонта анкерной группы",
      "бетонное основание, анкерные компоненты или обе ветви только по выбору пользователя",
      "прямые проектные количества материалов, труда, оборудования, контроля и документов",
      "доставка и отходы только по выбранным ветвям без выдуманных цен и количеств",
    ] : [
      "обследование и границы дефекта, утверждённый проект, способ и технологическая карта ремонта",
      "удаление повреждённого бетона, подготовка поверхности, укладка ремонтного материала и уход",
      "только применимые проектные материалы, оборудование, контроль и испытания",
      "доставка материалов, вывоз и размещение отходов только по прямой проектной ведомости",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : EMBEDDED_ITEMS_MODE ? {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      `утверждённый проект, ведомость, план расположения и допуски закладных изделий ${EMBEDDED_ITEMS_ELEMENT_RU}`,
      "разбивка, установка и фиксация закладных до бетонирования",
      "только явно выбранные проектом сварка, опоры, подъём, геодезия и восстановление покрытия",
      "освидетельствование и логистика только по прямой проектной или коммерческой ведомости",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  } : {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "товарный бетон по подтверждённой спецификации и заказному объёму NRMCA CIP 31",
      "укладка, уплотнение, отделка поверхности и уход за бетоном",
      "применимые материалы и оборудование, включая условный зимний прогрев",
      "приёмочный контроль и отдельная доставка бетонной смеси",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  };

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: `r4-a13-6-${RELEASE_SLUG}-family-successor`,
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PARENT_RELEASE_ID],
    )).rows[0] as Json;
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PARENT_SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    invariant(parent?.status === "prepared" && Number(parent.definition_count) === 10_331,
      "STOP_STRIP_CONCRETE_PARENT_RELEASE_DRIFT");
    invariant(parentSearch?.status === "draft", "STOP_STRIP_CONCRETE_PARENT_SEARCH_DRIFT");
    const truthPreflightTarget = TARGETS[0]!;
    const parameterTruthPreflight = await preflightCanonicalParameterTruthMetadata(
      client,
      PARAMETERS.map((parameter) => ({
        ...parameter,
        truth_metadata: {
          ...parameter.truth_metadata,
          contract: CONTRACT,
          semantic_parameter_key:
            `${truthPreflightTarget.catalogId}:${parameter.parameter_id}`,
          formula_consumers: formulaConsumers[parameter.parameter_id],
          resource_branch_consumers: resourceConsumers[parameter.parameter_id],
        },
      })),
      `STOP_${STATUS_FAMILY}_DRY_RUN_PREFLIGHT`,
    );
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_STRIP_CONCRETE_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
      receipt = {
        status: `GREEN_${STATUS_FAMILY}_ALREADY_PREPARED_NOT_ACTIVE`,
        idempotent: true,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey },
        coreAcceptance,
        parameterTruthPreflight,
        audit,
      };
    } else {
      const parentTargets = (await client.query(`select manifest.*,
          definition.definition_version,definition.passport,definition.applicability,definition.source_metadata,
          (select count(*)::int from public.estimate_parameter_definition p
            where p.definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph f
            where f.definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec r
            where r.definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
        order by manifest.catalog_id`, [
        PARENT_RELEASE_ID, TARGETS.map((target) => target.catalogId),
      ])).rows as Json[];
      invariant(parentTargets.length === TARGETS.length,
        `STOP_STRIP_CONCRETE_PARENT_TARGETS:${parentTargets.length}`);
      const parentByCatalog = new Map(parentTargets.map((target) => [String(target.catalog_id), target]));
      const lineageByCatalog = new Map<string, Awaited<ReturnType<typeof resolveCanonicalApprovedBaselineLeaf>>>();
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId);
        invariant(old, `STOP_STRIP_CONCRETE_PARENT_TARGET_MISSING:${target.catalogId}`);
        lineageByCatalog.set(target.catalogId, await resolveCanonicalApprovedBaselineLeaf(
          client,
          String(old.approved_template_baseline_id),
          target.catalogId,
        ));
      }
      const plannedLocatorPayload = INTERNAL_VIBRATION_MODE ? {
        documentCode: "ACI PRC-309-05",
        exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
        operation: "internal vibration of freshly placed concrete",
        quantityBasis: "approved project method statement and equipment schedule",
        universalProductivityClaimed: false,
        sourceSnapshotSha256: PRIMARY_SOURCE_METADATA.definition_hash,
      } : EXTERNAL_CURING_MODE ? {
        documentCode: "ACI SPEC-308.1-23",
        exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
        operation: "external curing of cast-in-place concrete",
        quantityBasis: "approved project curing method and direct project schedule",
        universalProductivityClaimed: false,
        universalConsumptionClaimed: false,
        sourceSnapshotSha256: PRIMARY_SOURCE_METADATA.definition_hash,
      } : SURFACE_LEVELING_MODE ? {
        documentCode: "ACI PRC-302.1-15",
        exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
        operation: "level and strike off freshly placed cast-in-place concrete slab",
        quantityBasis: "approved project leveling method and direct project schedule",
        universalProductivityClaimed: false,
        universalConsumptionClaimed: false,
        sourceSnapshotSha256: PRIMARY_SOURCE_METADATA.definition_hash,
      } : CONCRETE_JOINT_COMPLETE_MODE ? {
        documentCode: "ACI 302.1R-15 Chapter 5",
        exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
        operation: "install a project-specified concrete joint",
        quantityBasis: "approved joint detail and direct project schedule",
        universalProductivityClaimed: false,
        universalConsumptionClaimed: false,
        sourceSnapshotSha256: PRIMARY_SOURCE_METADATA.definition_hash,
      } : STRUCTURAL_REPAIR_MODE ? {
        documentCode: "ACI CODE-562-25 + ACI PRC-546-23",
        exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
        operation: ANCHOR_GROUP_REPAIR_MODE
          ? "assessment-led scope-gated repair of an existing anchor group system"
          : "assessment-led repair of an existing concrete slab",
        quantityBasis: ANCHOR_GROUP_REPAIR_MODE
          ? "selected concrete or anchor scope and direct approved project repair schedule"
          : "approved repair design, selected method and direct project schedule",
        supportingSourceId: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_source_id,
        supportingSourceSnapshotSha256:
          CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_definition_hash,
        universalProductivityClaimed: false,
        universalConsumptionClaimed: false,
        sourceSnapshotSha256: PRIMARY_SOURCE_METADATA.definition_hash,
      } : EMBEDDED_ITEMS_MODE ? {
        documentCode: "ACI SPEC-301-20 + ACI 117-10",
        exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
        operation: FORMWORK_EMBEDDED_ITEMS_MODE
          ? "place and fix project-specified formwork embedded items before concreting"
          : PILE_CAP_EMBEDDED_ITEMS_MODE
          ? "place and fix project-specified pile-cap embedded items before concreting"
          : PEDESTAL_EMBEDDED_ITEMS_MODE
          ? "place and fix project-specified pedestal embedded items before concreting"
          : COLUMN_BASE_EMBEDDED_ITEMS_MODE
            ? "place and fix project-specified column-base embedded items before concreting"
            : BELT_EMBEDDED_ITEMS_MODE
            ? "place and fix project-specified belt embedded items before concreting"
            : "place and fix project-specified embedded items before concreting",
        quantityBasis: "approved embedment drawings, tolerances and direct project schedule",
        supportingSourceId:
          CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_source_id,
        supportingSourceSnapshotSha256:
          CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_definition_hash,
        universalProductivityClaimed: false,
        universalConsumptionClaimed: false,
        sourceSnapshotSha256: PRIMARY_SOURCE_METADATA.definition_hash,
      } : null;
      const plannedLocatorKey = plannedLocatorPayload ? sha256(plannedLocatorPayload) : null;
      const existingLocator = (await client.query(`select locator.id::text locator_id,locator.locator,source.source_key
        from public.estimate_normative_locator locator
        join public.estimate_normative_source source on source.id=locator.source_id
        where source.source_key=$1 order by locator.id`, [PRIMARY_SOURCE_ID])).rows[0] as Json | undefined;
      const locator = existingLocator ?? (CONCRETE_SLAB_OPERATION_MODE && plannedLocatorKey
        ? {
            locator_id: uuid(`${CONTRACT}:locator:${PRIMARY_SOURCE_ID}:${plannedLocatorKey}`),
            locator: plannedLocatorPayload,
            source_key: PRIMARY_SOURCE_ID,
          }
        : undefined);
      invariant(locator?.locator_id, "STOP_STRIP_CONCRETE_NORMATIVE_LOCATOR_MISSING");

      const nextCounts = {
        definitions: Number(parent.definition_count),
        parameters: Number(parent.parameter_count) + TARGETS.reduce((sum, target) =>
          sum + PARAMETERS.length
            - Number(parentByCatalog.get(target.catalogId)?.parameters), 0),
        formulas: Number(parent.formula_count) + TARGETS.reduce((sum, target) =>
          sum + FORMULAS.length
            - Number(parentByCatalog.get(target.catalogId)?.formulas), 0),
        resources: Number(parent.resource_row_count) + TARGETS.reduce((sum, target) =>
          sum + RESOURCES.length
            - Number(parentByCatalog.get(target.catalogId)?.resources), 0),
      };
      const parameterRows = PARAMETERS.map((parameter) => ({ ...parameter }));
      const formulaRows = FORMULAS.map((formula) => ({
        ...formula,
        ast_sha256: sha256(formula.ast),
      }));
      const resourceRows: Json[] = RESOURCES.map((resource): Json => ({
        ...resource,
        row_type: resourceRowType(resource.category),
      }));
      const concreteOwner = resourceRows.find((resource) => resource.row_id === NORMATIVE_OWNER_ROW_ID);
      invariant(concreteOwner, "STOP_STRIP_CONCRETE_NORMATIVE_OWNER_MISSING");
      const bindingRows = [{
        row_id: concreteOwner.row_id,
        locator_id: locator.locator_id,
        applicability: INTERNAL_VIBRATION_MODE ? {
          technology_class: "CONCRETE_CONSOLIDATION_BY_INTERNAL_VIBRATION",
          operation_class: "CONSOLIDATE_FRESH_CONCRETE",
          material_system: "FRESH_CONCRETE",
          scope_mode: "PROJECT_SCHEDULE_QUANTITIES",
          source_id: PRIMARY_SOURCE_ID,
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
          universal_productivity_claimed: false,
          quantity_basis: "APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE",
        } : EXTERNAL_CURING_MODE ? {
          technology_class: "PROJECT_SELECTED_EXTERNAL_CONCRETE_CURING",
          operation_class: "EXTERNAL_CURING_OF_CAST_IN_PLACE_CONCRETE",
          material_system: "FRESH_CAST_IN_PLACE_CONCRETE",
          scope_mode: "PROJECT_METHOD_AND_DIRECT_SCHEDULE_QUANTITIES",
          source_id: PRIMARY_SOURCE_ID,
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
        } : SURFACE_LEVELING_MODE ? {
          technology_class: "PROJECT_SELECTED_CONCRETE_SLAB_LEVELING",
          operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_CONCRETE_SLAB",
          material_system: "FRESH_CAST_IN_PLACE_CONCRETE",
          scope_mode: "PROJECT_METHOD_AND_DIRECT_SCHEDULE_QUANTITIES",
          source_id: PRIMARY_SOURCE_ID,
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          quantity_basis: "APPROVED_PROJECT_LEVELING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
        } : CONCRETE_SLAB_COMPLETE_MODE ? {
          ...((concreteOwner.resource_graph as Json).professionalPhysicalNormBindingV1 as Json),
          composition_norm_id: PRIMARY_NORM_ID,
          composition_scope: "COMPLETE_CONCRETE_SLAB_WITH_CONDITIONAL_PROJECT_COMPONENTS",
          component_source_ids: COMPONENT_NORMATIVE_SOURCE_IDS,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          quantity_basis: "GEOMETRY_AND_DIRECT_APPROVED_PROJECT_SCHEDULES",
        } : STAIRS_COMPLETE_MODE ? {
          ...((concreteOwner.resource_graph as Json).professionalPhysicalNormBindingV1 as Json),
          composition_norm_id: PRIMARY_NORM_ID,
          composition_scope: "COMPLETE_MONOLITHIC_CONCRETE_STAIRS_WITH_PROJECT_FORMWORK",
          component_source_ids: COMPONENT_NORMATIVE_SOURCE_IDS,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          automatic_formwork_system_selection: false,
          quantity_basis: "GEOMETRY_AND_DIRECT_APPROVED_PROJECT_SCHEDULES",
        } : CONCRETE_JOINT_COMPLETE_MODE ? {
          technology_class: "PROJECT_SPECIFIED_CONCRETE_JOINT_INSTALLATION",
          operation_class: "INSTALL_PROJECT_SPECIFIED_CONCRETE_JOINT",
          material_system: "PROJECT_SELECTED_MULTI_COMPONENT_JOINT_SYSTEM",
          scope_mode: "APPROVED_JOINT_DETAIL_AND_DIRECT_SCHEDULE_QUANTITIES",
          source_id: PRIMARY_SOURCE_ID,
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          quantity_basis: "APPROVED_PROJECT_JOINT_DETAIL_AND_DIRECT_PROJECT_SCHEDULE",
        } : STRUCTURAL_REPAIR_MODE ? {
          technology_class: ANCHOR_GROUP_REPAIR_MODE
            ? "ASSESSMENT_LED_EXISTING_ANCHOR_GROUP_REPAIR"
            : "ASSESSMENT_LED_EXISTING_CONCRETE_SLAB_REPAIR",
          operation_class: ANCHOR_GROUP_REPAIR_MODE
            ? "REPAIR_EXISTING_ANCHOR_GROUP_SYSTEM"
            : "REPAIR_EXISTING_CONCRETE_SLAB",
          material_system: ANCHOR_GROUP_REPAIR_MODE
            ? "PROJECT_SELECTED_CONCRETE_AND_OR_ANCHOR_COMPONENT_REPAIR"
            : "PROJECT_SPECIFIED_CONCRETE_REPAIR_SYSTEM",
          scope_mode: ANCHOR_GROUP_REPAIR_MODE
            ? "USER_SELECTED_REPAIR_SCOPE_AND_DIRECT_SCHEDULE_QUANTITIES"
            : "APPROVED_REPAIR_DESIGN_AND_DIRECT_SCHEDULE_QUANTITIES",
          source_id: PRIMARY_SOURCE_ID,
          supporting_source_id: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_source_id,
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          supporting_source_definition_hash:
            CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          quantity_basis: ANCHOR_GROUP_REPAIR_MODE
            ? "SELECTED_REPAIR_SCOPE_AND_DIRECT_APPROVED_PROJECT_SCHEDULE"
            : "APPROVED_REPAIR_DESIGN_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
        } : EMBEDDED_ITEMS_MODE ? {
          technology_class: FORMWORK_EMBEDDED_ITEMS_MODE
            ? "PROJECT_SPECIFIED_FORMWORK_EMBEDDED_ITEMS"
            : PILE_CAP_EMBEDDED_ITEMS_MODE
            ? "PROJECT_SPECIFIED_PILE_CAP_EMBEDDED_ITEMS"
            : PEDESTAL_EMBEDDED_ITEMS_MODE
            ? "PROJECT_SPECIFIED_PEDESTAL_EMBEDDED_ITEMS"
            : COLUMN_BASE_EMBEDDED_ITEMS_MODE
              ? "PROJECT_SPECIFIED_COLUMN_BASE_EMBEDDED_ITEMS"
              : BELT_EMBEDDED_ITEMS_MODE
              ? "PROJECT_SPECIFIED_BELT_EMBEDDED_ITEMS"
              : "PROJECT_SPECIFIED_CAST_IN_EMBEDDED_ITEMS",
          operation_class: FORMWORK_EMBEDDED_ITEMS_MODE
            ? "PLACE_AND_FIX_PROJECT_SPECIFIED_FORMWORK_EMBEDDED_ITEMS_BEFORE_CONCRETING"
            : PILE_CAP_EMBEDDED_ITEMS_MODE
            ? "PLACE_AND_FIX_PROJECT_SPECIFIED_PILE_CAP_EMBEDDED_ITEMS_BEFORE_CONCRETING"
            : PEDESTAL_EMBEDDED_ITEMS_MODE
            ? "PLACE_AND_FIX_PEDESTAL_EMBEDDED_ITEMS_BEFORE_CONCRETING"
            : COLUMN_BASE_EMBEDDED_ITEMS_MODE
              ? "PLACE_AND_FIX_COLUMN_BASE_EMBEDDED_ITEMS_BEFORE_CONCRETING"
              : BELT_EMBEDDED_ITEMS_MODE
              ? "PLACE_AND_FIX_BELT_EMBEDDED_ITEMS_BEFORE_CONCRETING"
              : "PLACE_AND_FIX_EMBEDDED_ITEMS_BEFORE_CONCRETING",
          material_system: "PROJECT_SPECIFIED_STEEL_EMBEDDED_ITEMS",
          scope_mode: "APPROVED_DRAWINGS_AND_DIRECT_SCHEDULE_QUANTITIES",
          source_id: PRIMARY_SOURCE_ID,
          supporting_source_id:
            CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_source_id,
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          supporting_source_definition_hash:
            CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
          universal_productivity_claimed: false,
          universal_consumption_claimed: false,
          quantity_basis: "APPROVED_EMBEDMENT_DRAWINGS_AND_DIRECT_PROJECT_SCHEDULE",
        } : {
          ...((concreteOwner.resource_graph as Json).professionalPhysicalNormBindingV1 as Json),
          norm_id: PRIMARY_NORM_ID,
          source_document_version: PRIMARY_SOURCE_METADATA.source_document_version,
          source_definition_hash: PRIMARY_SOURCE_METADATA.definition_hash,
          exact_locator: PRIMARY_SOURCE_METADATA.exact_locator,
        },
      }];

      const plannedTargets = [];
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId)!;
        const lineage = lineageByCatalog.get(target.catalogId)!;
        const fixture = acceptanceInput(target.contextKey);
        const definitionId = definitionIds.get(target.catalogId)!;
        const baselineId = baselineIds.get(target.catalogId)!;
        const nextDefinitionVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [target.catalogId],
        )).rows[0].value);
        const targetCoreAcceptance = coreAcceptance.targetResults.find(
          (result: Json) => result.catalogId === target.catalogId,
        );
        const acceptanceEvidenceSha256 = sha256({
          contract: CONTRACT,
          target,
          fixture,
          targetCoreAcceptance,
          parameterSchemaSha256,
          definitionSchemaSha256,
          lineage,
        });
        const targetDefinitionSha256 = sha256({
          contract: CONTRACT,
          target,
          parameterSchemaSha256,
          definitionSchemaSha256,
        });
        const baselineRepresentative = {
          parameter_schema_sha256: parameterSchemaSha256,
          input_values: fixture,
          input_classification: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            isNormativeParameter(parameter.parameter_id)
              ? "NORMATIVE"
              : "VALIDATION_FIXTURE",
          ])),
          uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id, parameter.unit_id,
          ])),
          formula_consumer_ids: formulaConsumers,
          resource_consumer_row_ids: resourceConsumers,
          normative_source_ids: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            normativeSourceIdsForParameter(parameter.parameter_id),
          ])),
          guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            String((parameter.truth_metadata.guide as Json).guide_short_ru),
          ])),
          proposal_source_refs: [{
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            sourceUrl: PRIMARY_SOURCE_METADATA.source_url,
            exactLocator: PRIMARY_SOURCE_METADATA.exact_locator,
          }],
          contract_version: BASELINE_CONTRACT,
        };
        const plan = createCanonicalDefinitionClonePlan({
          contract: CONTRACT,
          definition: {
            id: definitionId,
            releaseId,
            catalogId: target.catalogId,
            definitionVersion: nextDefinitionVersion,
            passport: {
              catalogId: target.catalogId,
              canonicalRuName: target.titleRu,
              workKey: target.catalogId.split(":").at(-1),
              physicalResultRu: `Полная применимая смета бетонирования ${FAMILY_SUBJECT_RU}: ${target.contextRu}`,
              ...(CONCRETE_SLAB_OPERATION_MODE ? { physicalResultRu: target.titleRu } : {}),
              exactNormId: PRIMARY_NORM_ID,
            },
            applicability: INTERNAL_VIBRATION_MODE ? {
              country: "KG",
              operationClass: "CONSOLIDATE_FRESH_CONCRETE",
              materialSystem: "FRESH_CONCRETE",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              approvedMethod: "INTERNAL_VIBRATION",
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              conditionalScopeFailClosed: true,
            } : EXTERNAL_CURING_MODE ? {
              country: "KG",
              operationClass: "EXTERNAL_CURING_OF_CAST_IN_PLACE_CONCRETE",
              materialSystem: "FRESH_CAST_IN_PLACE_CONCRETE",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              approvedMethodParameterId: "approved_external_curing_method",
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : SURFACE_LEVELING_MODE ? {
              country: "KG",
              operationClass: "LEVEL_AND_STRIKE_OFF_FRESH_CONCRETE_SLAB",
              materialSystem: "FRESH_CAST_IN_PLACE_CONCRETE",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              approvedMethodParameterId: "approved_leveling_method_designation",
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : CONCRETE_SLAB_COMPLETE_MODE ? {
              country: "KG",
              operationClass: "INSTALL_COMPLETE_CAST_IN_PLACE_CONCRETE_SLAB",
              materialSystem: "PROJECT_SPECIFIED_MULTI_COMPONENT_CONCRETE_SLAB",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              slabSupportConditionParameterId: "slab_support_condition",
              reinforcementApplicabilityParameterId: "reinforcement_applicable",
              embeddedItemsApplicabilityParameterId: "embedded_items_applicable",
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : STAIRS_COMPLETE_MODE ? {
              country: "KG",
              operationClass: "INSTALL_COMPLETE_MONOLITHIC_CONCRETE_STAIRS",
              materialSystem: "PROJECT_SPECIFIED_CONCRETE_REINFORCEMENT_AND_FORMWORK",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              primaryMeasureParameterId: "stairs_concrete_volume_m3",
              reinforcementApplicabilityParameterId: "reinforcement_applicable",
              formworkApplicabilityParameterId: "temporary_formwork_applicable",
              formworkMeasurementParameterId:
                "formwork_measured_formwork_contact_area_m2",
              automaticFormworkSystemSelection: false,
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : CONCRETE_JOINT_COMPLETE_MODE ? {
              country: "KG",
              operationClass: "INSTALL_PROJECT_SPECIFIED_CONCRETE_JOINT",
              materialSystem: "PROJECT_SELECTED_MULTI_COMPONENT_JOINT_SYSTEM",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              primaryMeasureParameterId: "joint_length_m",
              jointTypeParameterId: "joint_type",
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : STRUCTURAL_REPAIR_MODE ? {
              country: "KG",
              operationClass: ANCHOR_GROUP_REPAIR_MODE
                ? "REPAIR_EXISTING_ANCHOR_GROUP_SYSTEM"
                : "REPAIR_EXISTING_CONCRETE_SLAB",
              materialSystem: ANCHOR_GROUP_REPAIR_MODE
                ? "PROJECT_SELECTED_CONCRETE_AND_OR_ANCHOR_COMPONENT_REPAIR"
                : "PROJECT_SPECIFIED_CONCRETE_REPAIR_SYSTEM",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              assessmentParameterId: ANCHOR_GROUP_REPAIR_MODE
                ? "condition_assessment_service_h"
                : "condition_assessment_reference",
              ...(ANCHOR_GROUP_REPAIR_MODE ? {
                repairScopeParameterId: "anchor_group_repair_scope_mode",
                primaryMeasureParameterId: "repair_scope_volume_m3",
              } : {
                approvedDesignParameterId: "approved_repair_design_reference",
                approvedMethodParameterId: "approved_repair_method_designation",
              }),
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : EMBEDDED_ITEMS_MODE ? {
              country: "KG",
              operationClass: FORMWORK_EMBEDDED_ITEMS_MODE
                ? "PLACE_AND_FIX_PROJECT_SPECIFIED_FORMWORK_EMBEDDED_ITEMS_BEFORE_CONCRETING"
                : PILE_CAP_EMBEDDED_ITEMS_MODE
                ? "PLACE_AND_FIX_PROJECT_SPECIFIED_PILE_CAP_EMBEDDED_ITEMS_BEFORE_CONCRETING"
                : PEDESTAL_EMBEDDED_ITEMS_MODE
                ? "PLACE_AND_FIX_PEDESTAL_EMBEDDED_ITEMS_BEFORE_CONCRETING"
                : COLUMN_BASE_EMBEDDED_ITEMS_MODE
                  ? "PLACE_AND_FIX_COLUMN_BASE_EMBEDDED_ITEMS_BEFORE_CONCRETING"
                  : BELT_EMBEDDED_ITEMS_MODE
                  ? "PLACE_AND_FIX_BELT_EMBEDDED_ITEMS_BEFORE_CONCRETING"
                  : "PLACE_AND_FIX_EMBEDDED_ITEMS_BEFORE_CONCRETING",
              materialSystem: "PROJECT_SPECIFIED_STEEL_EMBEDDED_ITEMS",
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              approvedDesignParameterId: "approved_embedment_design_reference",
              approvedDrawingParameterId: "approved_placement_drawing_reference",
              toleranceParameterId: "tolerance_specification_reference",
              projectScheduleRequired: true,
              universalProductivityClaimed: false,
              universalConsumptionClaimed: false,
              conditionalScopeFailClosed: true,
            } : {
              country: "KG",
              operationClass: "PLACE_READY_MIX_FULL_APPLICABLE_SCOPE",
              materialSystem: "READY_MIX_CONCRETE",
              productProfileId: PRIMARY_PRODUCT_PROFILE_ID,
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              projectScheduleRequired: true,
              conditionalScopeFailClosed: true,
            },
            definitionSha256: targetDefinitionSha256,
            sourceMetadata: {
              contract: CONTRACT,
              predecessorDefinitionId: old.definition_version_id,
              predecessorBaselineLeafId: lineage.baselineId,
              parameterSchemaSha256,
              definitionSchemaSha256,
              acceptanceEvidenceSha256,
              normativeSourceIds: CONCRETE_SLAB_COMPLETE_MODE || STAIRS_COMPLETE_MODE
                ? COMPONENT_NORMATIVE_SOURCE_IDS
                : STRUCTURAL_REPAIR_MODE
                ? [
                    PRIMARY_SOURCE_ID,
                    CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_source_id,
                  ]
                : EMBEDDED_ITEMS_MODE
                ? [
                    PRIMARY_SOURCE_ID,
                    CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_source_id,
                  ]
                : [PRIMARY_SOURCE_ID],
              synthetic: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            },
          },
          representative: {
            parameters: parameterRows,
            formulas: formulaRows,
            resources: resourceRows,
            bindings: bindingRows,
            baseline: baselineRepresentative,
            passport: passportRepresentative,
          },
          parameterTruthMetadata: (parameter) => ({
            ...parameter.truth_metadata,
            contract: CONTRACT,
            semantic_parameter_key: `${target.catalogId}:${parameter.parameter_id}`,
            formula_consumers: formulaConsumers[parameter.parameter_id],
            resource_branch_consumers: resourceConsumers[parameter.parameter_id],
          }),
          resourceId: (resource) => uuid(
            `${CONTRACT}:${fingerprint}:${target.catalogId}:resource:${resource.row_id}`,
          ),
          resourceSemanticOwner: (resource) => `${target.catalogId}:${resource.row_id}`,
          resourceSha256: (resource) => sha256({ contract: CONTRACT, targetCatalogId: target.catalogId, resource }),
          baseline: {
            id: baselineId,
            key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${target.catalogId}`,
            sourceDefinitionVersionId: lineage.definitionVersionId,
            validationScenarioRefs: [{
              scenario: `${SCENARIO_PREFIX}_${target.contextKey.toUpperCase()}`,
              fixture,
              acceptanceEvidenceSha256,
              targetCoreAcceptance,
            }],
            acceptanceEvidenceSha256,
            acceptedReleaseId: releaseId,
            supersedesBaselineId: lineage.baselineId,
          },
          passport: {
            physicalResultRu: target.titleRu,
            excludedScopeRu: INTERNAL_VIBRATION_MODE ? [
              "поставка и укладка бетонной смеси, опалубка, арматура, отделка поверхности и уход за бетоном",
              "поверхностная вибрация и иные методы уплотнения без отдельного технологического дескриптора",
              "автоматическая производительность труда или вибратора",
              "скрытая длительность аренды, скрытые рейсы и неподтверждённые цены",
            ] : EXTERNAL_CURING_MODE ? [
              "поставка и укладка бетонной смеси, виброуплотнение, отделка поверхности, опалубка и арматура",
              "одновременное включение материалов взаимоисключающих способов ухода",
              "автоматический расход материалов, производительность или умножение ресурсов на длительность ухода",
              "скрытая длительность аренды, скрытые рейсы и неподтверждённые цены",
            ] : SURFACE_LEVELING_MODE ? [
              "поставка и укладка бетонной смеси, виброуплотнение, окончательная отделка, уход, опалубка и арматура",
              "автоматический выбор способа выравнивания или оборудования вместо проектной технологической карты",
              "автоматический расход направляющих или производительность труда и оборудования",
              "скрытая длительность аренды, скрытые рейсы и неподтверждённые цены",
            ] : CONCRETE_SLAB_COMPLETE_MODE ? [
              "автоматический выбор конструкции плиты, армирования, опалубки или закладных вместо проекта",
              "опалубка для плиты по грунту и другие неприменимые условные компоненты",
              "универсальные нормы расхода или производительности вместо прямых проектных количеств",
              "скрытые часы, рейсы, сроки аренды и неподтверждённые цены",
            ] : STAIRS_COMPLETE_MODE ? [
              "автоматический выбор Frami, Dokaflex или другой системы без проекта опалубки лестницы",
              "универсальный коэффициент площади опалубки на м³ бетона",
              "универсальные нормы расхода или производительности вместо прямых проектных количеств",
              "скрытые сроки аренды, рейсы и неподтверждённые цены",
            ] : CONCRETE_JOINT_COMPLETE_MODE ? [
              "стеновая опалубка Frami и подмена полного устройства шва одним комплектом опалубки",
              "автоматический выбор типа шва, заполнителя, герметика, гидроизоляции, профиля или передачи нагрузки",
              "универсальные нормы расхода, производительности, отходов и логистики",
              "скрытые количества, рейсы и неподтверждённые цены",
            ] : STRUCTURAL_REPAIR_MODE ? (ANCHOR_GROUP_REPAIR_MODE ? [
              "автоматическое включение бетонной или анкерной ветви без выбора состава ремонта",
              "новое бетонирование, арматура и опалубка за границами выбранного ремонта",
              "автоматический выбор анкерной системы, материалов, оборудования или способа ремонта",
              "универсальные нормы, скрытые количества, рейсы и неподтверждённые цены",
            ] : [
              "полная замена плиты, новое бетонирование, опалубка и армирование вне границ проекта ремонта",
              "автоматический выбор способа, материала, оборудования или обработки арматуры без проекта",
              "универсальные нормы расхода, производительности, испытаний, отходов и логистики",
              "скрытые количества, неподтверждённые цены и автоматическое масштабирование прямых проектных часов",
            ]) : EMBEDDED_ITEMS_MODE ? [
              "проектирование и изготовление закладных, постустановленные анкеры, бетон, арматура и опалубка",
              "автоматический выбор сварки, опор, подъёма, геодезии или защитного покрытия без проекта",
              "универсальные нормы расхода и производительности вместо прямой проектной ведомости",
              "скрытые количества, рейсы, сроки аренды и неподтверждённые цены",
            ] : [
              "арматура и опалубка, принадлежащие отдельным технологическим семействам",
              "универсальный двухпроцентный запас бетонной смеси",
              "автоматически выдуманная производительность труда или оборудования",
              "цены без коммерческого снимка и скрытое расстояние доставки",
            ],
            decision: {
              contract: CONTENT_PASSPORT_CONTRACT,
              status: "GREEN",
              allowed: true,
              waveContract: CONTRACT,
              quantityScope: "FULL",
              priceState: "PARTIAL_NEEDS_PRICE",
              activationAllowed: false,
              productionEligible: false,
            },
            payloadSha256: sha256({ targetDefinitionSha256, acceptanceEvidenceSha256 }),
            sourceHead: head,
            sourceTree: tree,
          },
          bindingApplicability: (binding) => ({
            ...binding.applicability,
            context_key: target.contextKey,
          }),
          expectedNormativeBindingCount: 1,
        });
        plannedTargets.push({
          target,
          old,
          lineage,
          definitionId,
          baselineId,
          nextDefinitionVersion,
          targetDefinitionSha256,
          acceptanceEvidenceSha256,
          plan,
        });
      }
      let publisherPreflight = CONCRETE_SLAB_OPERATION_MODE && !existingLocator
        ? {
            status: "SOURCE_LOCATOR_PENDING_TRANSACTIONAL_APPLY",
            planCount: plannedTargets.length,
            sourceId: PRIMARY_SOURCE_ID,
            locatorId: locator.locator_id,
          }
        : await preflightCanonicalDefinitionPublishPlans(
            client,
            plannedTargets.map((target) => target.plan),
          );

      if (!APPLY) {
        receipt = {
          status: `DRY_RUN_${STATUS_FAMILY}_VALIDATED`,
          idempotent: false,
          mutationPerformed: false,
          predecessor: {
            releaseId: PARENT_RELEASE_ID,
            searchReleaseId: PARENT_SEARCH_RELEASE_ID,
            targets: parentTargets.map((target) => ({
              catalogId: target.catalog_id,
              definitionId: target.definition_version_id,
              shape: [Number(target.parameters), Number(target.formulas), Number(target.resources)],
            })),
          },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          coreAcceptance,
          parameterTruthPreflight,
          publisherPreflight,
        };
      } else {
        await client.query("begin");
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='600s'");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
        try {
          if (CONCRETE_SLAB_OPERATION_MODE && !existingLocator) {
            invariant(plannedLocatorPayload && plannedLocatorKey,
              "STOP_STRIP_CONCRETE_OPERATION_LOCATOR_PLAN_MISSING");
            await client.query(`insert into public.estimate_normative_source(
                id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
              values($1,$2,$3,'American Concrete Institute',$4,$5,$6,$7::jsonb)
              on conflict(source_key) do update set
                official_url=excluded.official_url,
                artifact_sha256=excluded.artifact_sha256,
                metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
              uuid(`${CONTRACT}:source:${PRIMARY_SOURCE_ID}`),
              PRIMARY_SOURCE_ID,
              PRIMARY_SOURCE_METADATA.source_title,
              PRIMARY_SOURCE_METADATA.source_url,
              PRIMARY_SOURCE_METADATA.definition_hash,
              CONCRETE_SLAB_OPERATION_PROFILE!.sourceEffectiveFrom,
              JSON.stringify({
                contract: CONTRACT,
                verifiedAt: PRIMARY_SOURCE_METADATA.verified_at,
                sourceDefinitionHash: PRIMARY_SOURCE_METADATA.definition_hash,
                useRestriction: CONCRETE_SLAB_OPERATION_PROFILE!.sourceUseRestriction,
                universalProductivityClaimed: false,
                ...(CONCRETE_SLAB_OPERATION_KEY !== "vibration"
                  ? { universalConsumptionClaimed: false }
                  : {}),
                ...(STRUCTURAL_REPAIR_MODE
                  ? {
                      supportingSourceId:
                        CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_source_id,
                      supportingSourceUrl:
                        CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_source_url,
                      supportingSourceDefinitionHash:
                        CONCRETE_SLAB_REPAIR_SOURCE_METADATA.supporting_definition_hash,
                    }
                  : EMBEDDED_ITEMS_MODE
                  ? {
                      supportingSourceId:
                        CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_source_id,
                      supportingSourceUrl:
                        CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_source_url,
                      supportingSourceDefinitionHash:
                        CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.supporting_definition_hash,
                    }
                  : {}),
                activationAllowed: false,
              }),
            ]);
            const sourceId = String((await client.query(
              "select id::text from public.estimate_normative_source where source_key=$1",
              [PRIMARY_SOURCE_ID],
            )).rows[0].id);
            await client.query(`insert into public.estimate_normative_locator(
                id,source_id,locator_key,locator,excerpt_sha256)
              values($1,$2,$3,$4::jsonb,$5)
              on conflict(source_id,locator_key) do nothing`, [
              locator.locator_id,
              sourceId,
              plannedLocatorKey,
              JSON.stringify(plannedLocatorPayload),
              sha256(plannedLocatorPayload),
            ]);
            publisherPreflight = await preflightCanonicalDefinitionPublishPlans(
              client,
              plannedTargets.map((target) => target.plan),
            );
          }
          await client.query(`insert into public.estimate_definition_release(
              id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
              definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
              parameter_count,formula_count)
            select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
            from public.estimate_definition_release where id=$9`, [
            releaseId,
            releaseKey,
            head,
            tree,
            sha256(`${CONTRACT}:${fingerprint}:draft`),
            nextCounts.definitions,
            nextCounts.resources,
            JSON.stringify({
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              lifecycle: "DRAFT_FORWARD_ONLY",
              replacedDefinitionCount: TARGETS.length,
              activationAllowed: false,
              productionEligible: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
            PARENT_RELEASE_ID,
            sha256({ contract: CONTRACT, fingerprint, definitionSchemaSha256 }),
            nextCounts.parameters,
            nextCounts.formulas,
          ]);
          await client.query(`insert into public.estimate_cumulative_manifest_entry(
              release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
              publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
              definition_hash,entry_sha256,runtime_publication_state)
            select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
              publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
              encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
              runtime_publication_state
            from public.estimate_cumulative_manifest_entry where release_id=$3`, [
            releaseId, CONTRACT, PARENT_RELEASE_ID,
          ]);
          const perTargetAudit: Json[] = [];
          for (const planned of plannedTargets) {
            const persisted = await publishCanonicalDefinitionDraft(client, planned.plan);
            await client.query(`update public.estimate_cumulative_manifest_entry set
                definition_version_id=$3,source_batch=$4,source_release_id=$1,
                publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
                baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
                runtime_publication_state='CANDIDATE'
              where release_id=$1 and catalog_id=$2`, [
              releaseId,
              planned.target.catalogId,
              planned.definitionId,
              CONTRACT,
              planned.baselineId,
              planned.targetDefinitionSha256,
              sha256({
                contract: CONTRACT,
                releaseId,
                catalogId: planned.target.catalogId,
                definitionId: planned.definitionId,
                baselineId: planned.baselineId,
                targetDefinitionSha256: planned.targetDefinitionSha256,
              }),
            ]);
            perTargetAudit.push({
              catalogId: planned.target.catalogId,
              contextKey: planned.target.contextKey,
              predecessorDefinitionId: planned.old.definition_version_id,
              predecessorBaselineLeafId: planned.lineage.baselineId,
              definitionId: planned.definitionId,
              baselineId: planned.baselineId,
              definitionVersion: planned.nextDefinitionVersion,
              acceptanceEvidenceSha256: planned.acceptanceEvidenceSha256,
              publisherPersistedSelfAudit: persisted,
            });
          }
          const searchSnapshot = await cloneSearch(client, {
            releaseId, searchReleaseId, releaseKey, head, tree, fingerprint, definitionIds,
          });
          const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
          invariant(Number(audit.manifest.identities) === nextCounts.definitions
            && Number(audit.manifest.replaced) === TARGETS.length,
          `STOP_STRIP_CONCRETE_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
          invariant(audit.targets.length === TARGETS.length && audit.targets.every((target: Json) =>
            target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN"
            && target.decision?.quantityScope === "FULL" && target.decision?.priceState === "PARTIAL_NEEDS_PRICE"
            && Number(target.parameters) === PARAMETERS.length
            && Number(target.formulas) === FORMULAS.length
            && Number(target.resources) === RESOURCES.length
            && Number(target.bindings) === 1
            && Number(target.procurement_rows) === RESOURCES.filter(
              (resource) => resource.procurement_eligible,
            ).length
            && Number(target.forbidden_legacy_rows) === 0),
          `STOP_STRIP_CONCRETE_TARGET_AUDIT:${JSON.stringify(audit.targets)}`);
          invariant(Number(audit.search.targets) === TARGETS.length
            && Number(audit.search.valid) === TARGETS.length
            && Number(audit.search.documents) === 10_322
            && Number(audit.search.visible) === 10_322,
          `STOP_STRIP_CONCRETE_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
          const unrelated = (await client.query(`select count(*)::int changed
            from public.estimate_cumulative_manifest_entry parent
            join public.estimate_cumulative_manifest_entry successor using(catalog_id)
            where parent.release_id=$1 and successor.release_id=$2
              and parent.catalog_id<>all($3::text[])
              and (parent.definition_version_id<>successor.definition_version_id
                or parent.source_batch<>successor.source_batch
                or parent.source_release_id<>successor.source_release_id
                or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
                or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
            PARENT_RELEASE_ID, releaseId, TARGETS.map((target) => target.catalogId),
          ])).rows[0] as Json;
          invariant(Number(unrelated.changed) === 0,
            `STOP_STRIP_CONCRETE_UNRELATED_MANIFEST_DRIFT:${unrelated.changed}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId,
            audit.manifest.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: searchSnapshot.snapshot_sha256,
              [TARGET_COUNT_METADATA_KEY]: TARGETS.length,
              sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
              parameterCountPerTarget: PARAMETERS.length,
              formulaCountPerTarget: FORMULAS.length,
              resourceDefinitionCountPerTarget: RESOURCES.length,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          await client.query("commit");
          receipt = {
            status: `GREEN_${STATUS_FAMILY}_PREPARED_NOT_ACTIVE`,
            idempotent: false,
            mutationPerformed: true,
            predecessor: { releaseId: PARENT_RELEASE_ID, searchReleaseId: PARENT_SEARCH_RELEASE_ID },
            successor: {
              releaseId,
              searchReleaseId,
              releaseKey,
              nextCounts,
              targets: perTargetAudit,
            },
            coreAcceptance,
            parameterTruthPreflight,
            publisherPreflight,
            audit: { ...audit, unrelatedManifestChanges: Number(unrelated.changed) },
          };
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: EXPECTED_BRANCH,
      head,
      tree,
      dirtyOverlaySha256,
      fingerprint,
      sourceHashes,
    },
    masterSha256: MASTER_SHA256,
    targetCatalogIds: TARGETS.map((target) => target.catalogId),
    canonicalCompilerOwner: "compileCanonicalEstimateCore",
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, `${RECEIPT_FILE_PREFIX}_${head}.json`), sealed);
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: CURRENT_RELEASE_OWNER,
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
