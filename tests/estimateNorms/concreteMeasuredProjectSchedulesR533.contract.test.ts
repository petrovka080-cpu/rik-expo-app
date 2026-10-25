import type { CanonicalEstimateCompileCoreResult } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { measuredConcreteProjectInputR533 } from "./fixtures/concreteMeasuredProjectInputsR533";
import * as module0 from "../../src/lib/estimate/v4/anchorGroupConcretePlacementR1";
import * as module1 from "../../src/lib/estimate/v4/anchorGroupCuringR1";
import * as module2 from "../../src/lib/estimate/v4/anchorGroupInstallationR1";
import * as module3 from "../../src/lib/estimate/v4/anchorGroupLevelingR1";
import * as module4 from "../../src/lib/estimate/v4/anchorGroupReinforcementR1";
import * as module5 from "../../src/lib/estimate/v4/anchorGroupRepairR1";
import * as module6 from "../../src/lib/estimate/v4/anchorGroupVibrationR1";
import * as module7 from "../../src/lib/estimate/v4/beltConcretePlacementR1";
import * as module8 from "../../src/lib/estimate/v4/beltCuringR1";
import * as module9 from "../../src/lib/estimate/v4/beltEmbeddedItemsR1";
import * as module10 from "../../src/lib/estimate/v4/beltLevelingR1";
import * as module11 from "../../src/lib/estimate/v4/beltReinforcementR1";
import * as module12 from "../../src/lib/estimate/v4/beltRepairR1";
import * as module13 from "../../src/lib/estimate/v4/beltVibrationR1";
import * as module14 from "../../src/lib/estimate/v4/columnBaseConcretePlacementR1";
import * as module15 from "../../src/lib/estimate/v4/columnBaseCuringR1";
import * as module16 from "../../src/lib/estimate/v4/columnBaseEmbeddedItemsR1";
import * as module17 from "../../src/lib/estimate/v4/columnBaseLevelingR1";
import * as module18 from "../../src/lib/estimate/v4/columnBaseReinforcementR1";
import * as module19 from "../../src/lib/estimate/v4/columnBaseRepairR1";
import * as module20 from "../../src/lib/estimate/v4/columnBaseVibrationR1";
import * as module21 from "../../src/lib/estimate/v4/concreteJointCompleteInstallationR1";
import * as module22 from "../../src/lib/estimate/v4/concreteSlabCompleteInstallationR1";
import * as module23 from "../../src/lib/estimate/v4/concreteSlabConcretePlacementR1";
import * as module24 from "../../src/lib/estimate/v4/concreteSlabCuringR1";
import * as module25 from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";
import * as module26 from "../../src/lib/estimate/v4/concreteSlabLevelingR1";
import * as module27 from "../../src/lib/estimate/v4/concreteSlabReinforcementR1";
import * as module28 from "../../src/lib/estimate/v4/concreteSlabRepairR1";
import * as module29 from "../../src/lib/estimate/v4/concreteSlabVibrationR1";
import * as module30 from "../../src/lib/estimate/v4/formworkDokaflexConcreteSlabR1";
import * as module31 from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import * as module32 from "../../src/lib/estimate/v4/formworkReinforcementR1";
import * as module33 from "../../src/lib/estimate/v4/jointReinforcementR1";
import * as module34 from "../../src/lib/estimate/v4/pedestalConcretePlacementR1";
import * as module35 from "../../src/lib/estimate/v4/pedestalCuringR1";
import * as module36 from "../../src/lib/estimate/v4/pedestalEmbeddedItemsR1";
import * as module37 from "../../src/lib/estimate/v4/pedestalReinforcementR1";
import * as module38 from "../../src/lib/estimate/v4/pileCapConcretePlacementR1";
import * as module39 from "../../src/lib/estimate/v4/pileCapReinforcementR1";
import * as module40 from "../../src/lib/estimate/v4/reinforcementFrameConcretePlacementR1";
import * as module41 from "../../src/lib/estimate/v4/reinforcementFrameReinforcementR1";
import * as module42 from "../../src/lib/estimate/v4/slabFoundationConcretePlacementR1";
import * as module43 from "../../src/lib/estimate/v4/slabFoundationReinforcementR1";
import * as module44 from "../../src/lib/estimate/v4/stairsCompleteInstallationR1";
import * as module45 from "../../src/lib/estimate/v4/stairsConcretePlacementR1";
import * as module46 from "../../src/lib/estimate/v4/stairsReinforcementR1";
import * as module47 from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import * as module48 from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";

type FamilyModule = Record<string, unknown>;
const modules: Record<string, FamilyModule> = { module0, module1, module2, module3, module4, module5, module6, module7, module8, module9, module10, module11, module12, module13, module14, module15, module16, module17, module18, module19, module20, module21, module22, module23, module24, module25, module26, module27, module28, module29, module30, module31, module32, module33, module34, module35, module36, module37, module38, module39, module40, module41, module42, module43, module44, module45, module46, module47, module48 };
const cases = [
  {
    "module": "module0",
    "factory": "anchorGroupConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupConcretePlacementR1",
    "targets": "ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module0",
    "factory": "anchorGroupConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupConcretePlacementR1",
    "targets": "ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module1",
    "factory": "anchorGroupCuringAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupCuringR1",
    "targets": "ANCHOR_GROUP_CURING_TARGETS"
  },
  {
    "module": "module1",
    "factory": "anchorGroupCuringAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupCuringR1",
    "targets": "ANCHOR_GROUP_CURING_TARGETS"
  },
  {
    "module": "module2",
    "factory": "anchorGroupInstallationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupInstallationR1",
    "targets": "ANCHOR_GROUP_INSTALLATION_TARGETS",
    "expectedRows": 18,
    "expectedProcurementRows": 12
  },
  {
    "module": "module2",
    "factory": "anchorGroupInstallationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupInstallationR1",
    "targets": "ANCHOR_GROUP_INSTALLATION_TARGETS",
    "expectedRows": 21,
    "expectedProcurementRows": 15
  },
  {
    "module": "module3",
    "factory": "anchorGroupLevelingAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupLevelingR1",
    "targets": "ANCHOR_GROUP_LEVELING_TARGETS"
  },
  {
    "module": "module3",
    "factory": "anchorGroupLevelingAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupLevelingR1",
    "targets": "ANCHOR_GROUP_LEVELING_TARGETS"
  },
  {
    "module": "module4",
    "factory": "anchorGroupReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupReinforcementR1",
    "targets": "ANCHOR_GROUP_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module4",
    "factory": "anchorGroupReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupReinforcementR1",
    "targets": "ANCHOR_GROUP_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module5",
    "factory": "anchorGroupRepairAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupRepairR1",
    "targets": "ANCHOR_GROUP_REPAIR_TARGETS"
  },
  {
    "module": "module5",
    "factory": "anchorGroupRepairAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupRepairR1",
    "targets": "ANCHOR_GROUP_REPAIR_TARGETS"
  },
  {
    "module": "module6",
    "factory": "anchorGroupVibrationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileAnchorGroupVibrationR1",
    "targets": "ANCHOR_GROUP_VIBRATION_TARGETS"
  },
  {
    "module": "module6",
    "factory": "anchorGroupVibrationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileAnchorGroupVibrationR1",
    "targets": "ANCHOR_GROUP_VIBRATION_TARGETS"
  },
  {
    "module": "module7",
    "factory": "beltConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltConcretePlacementR1",
    "targets": "BELT_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module7",
    "factory": "beltConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltConcretePlacementR1",
    "targets": "BELT_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module8",
    "factory": "beltCuringAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltCuringR1",
    "targets": "BELT_CURING_TARGETS"
  },
  {
    "module": "module8",
    "factory": "beltCuringAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltCuringR1",
    "targets": "BELT_CURING_TARGETS"
  },
  {
    "module": "module9",
    "factory": "beltEmbeddedItemsAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltEmbeddedItemsR1",
    "targets": "BELT_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module9",
    "factory": "beltEmbeddedItemsAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltEmbeddedItemsR1",
    "targets": "BELT_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module10",
    "factory": "beltLevelingAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltLevelingR1",
    "targets": "BELT_LEVELING_TARGETS"
  },
  {
    "module": "module10",
    "factory": "beltLevelingAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltLevelingR1",
    "targets": "BELT_LEVELING_TARGETS"
  },
  {
    "module": "module11",
    "factory": "beltReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltReinforcementR1",
    "targets": "BELT_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module11",
    "factory": "beltReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltReinforcementR1",
    "targets": "BELT_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module12",
    "factory": "beltRepairAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltRepairR1",
    "targets": "BELT_REPAIR_TARGETS"
  },
  {
    "module": "module12",
    "factory": "beltRepairAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltRepairR1",
    "targets": "BELT_REPAIR_TARGETS"
  },
  {
    "module": "module13",
    "factory": "beltVibrationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileBeltVibrationR1",
    "targets": "BELT_VIBRATION_TARGETS"
  },
  {
    "module": "module13",
    "factory": "beltVibrationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileBeltVibrationR1",
    "targets": "BELT_VIBRATION_TARGETS"
  },
  {
    "module": "module14",
    "factory": "columnBaseConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseConcretePlacementR1",
    "targets": "COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module14",
    "factory": "columnBaseConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseConcretePlacementR1",
    "targets": "COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module15",
    "factory": "columnBaseCuringAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseCuringR1",
    "targets": "COLUMN_BASE_CURING_TARGETS"
  },
  {
    "module": "module15",
    "factory": "columnBaseCuringAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseCuringR1",
    "targets": "COLUMN_BASE_CURING_TARGETS"
  },
  {
    "module": "module16",
    "factory": "columnBaseEmbeddedItemsAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseEmbeddedItemsR1",
    "targets": "COLUMN_BASE_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module16",
    "factory": "columnBaseEmbeddedItemsAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseEmbeddedItemsR1",
    "targets": "COLUMN_BASE_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module17",
    "factory": "columnBaseLevelingAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseLevelingR1",
    "targets": "COLUMN_BASE_LEVELING_TARGETS"
  },
  {
    "module": "module17",
    "factory": "columnBaseLevelingAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseLevelingR1",
    "targets": "COLUMN_BASE_LEVELING_TARGETS"
  },
  {
    "module": "module18",
    "factory": "columnBaseReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseReinforcementR1",
    "targets": "COLUMN_BASE_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module18",
    "factory": "columnBaseReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseReinforcementR1",
    "targets": "COLUMN_BASE_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module19",
    "factory": "columnBaseRepairAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseRepairR1",
    "targets": "COLUMN_BASE_REPAIR_TARGETS"
  },
  {
    "module": "module19",
    "factory": "columnBaseRepairAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseRepairR1",
    "targets": "COLUMN_BASE_REPAIR_TARGETS"
  },
  {
    "module": "module20",
    "factory": "columnBaseVibrationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileColumnBaseVibrationR1",
    "targets": "COLUMN_BASE_VIBRATION_TARGETS"
  },
  {
    "module": "module20",
    "factory": "columnBaseVibrationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileColumnBaseVibrationR1",
    "targets": "COLUMN_BASE_VIBRATION_TARGETS"
  },
  {
    "module": "module21",
    "factory": "concreteJointCompleteInstallationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteJointCompleteInstallationR1",
    "targets": "CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS"
  },
  {
    "module": "module21",
    "factory": "concreteJointCompleteInstallationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteJointCompleteInstallationR1",
    "targets": "CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS"
  },
  {
    "module": "module22",
    "factory": "concreteSlabCompleteInstallationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabCompleteInstallationR1",
    "targets": "CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS"
  },
  {
    "module": "module22",
    "factory": "concreteSlabCompleteInstallationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabCompleteInstallationR1",
    "targets": "CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS"
  },
  {
    "module": "module23",
    "factory": "concreteSlabConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabConcretePlacementR1",
    "targets": "CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module23",
    "factory": "concreteSlabConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabConcretePlacementR1",
    "targets": "CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module24",
    "factory": "concreteSlabCuringAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabCuringR1",
    "targets": "CONCRETE_SLAB_CURING_TARGETS"
  },
  {
    "module": "module24",
    "factory": "concreteSlabCuringAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabCuringR1",
    "targets": "CONCRETE_SLAB_CURING_TARGETS"
  },
  {
    "module": "module25",
    "factory": "concreteSlabEmbeddedItemsAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabEmbeddedItemsR1",
    "targets": "CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module25",
    "factory": "concreteSlabEmbeddedItemsAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabEmbeddedItemsR1",
    "targets": "CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module26",
    "factory": "concreteSlabLevelingAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabLevelingR1",
    "targets": "CONCRETE_SLAB_LEVELING_TARGETS"
  },
  {
    "module": "module26",
    "factory": "concreteSlabLevelingAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabLevelingR1",
    "targets": "CONCRETE_SLAB_LEVELING_TARGETS"
  },
  {
    "module": "module27",
    "factory": "concreteSlabReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabReinforcementR1",
    "targets": "CONCRETE_SLAB_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module27",
    "factory": "concreteSlabReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabReinforcementR1",
    "targets": "CONCRETE_SLAB_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module28",
    "factory": "concreteSlabRepairAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabRepairR1",
    "targets": "CONCRETE_SLAB_REPAIR_TARGETS"
  },
  {
    "module": "module28",
    "factory": "concreteSlabRepairAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabRepairR1",
    "targets": "CONCRETE_SLAB_REPAIR_TARGETS"
  },
  {
    "module": "module29",
    "factory": "concreteSlabVibrationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileConcreteSlabVibrationR1",
    "targets": "CONCRETE_SLAB_VIBRATION_TARGETS"
  },
  {
    "module": "module29",
    "factory": "concreteSlabVibrationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileConcreteSlabVibrationR1",
    "targets": "CONCRETE_SLAB_VIBRATION_TARGETS"
  },
  {
    "module": "module30",
    "factory": "formworkDokaflexConcreteSlabAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkDokaflexConcreteSlabR1",
    "targets": "FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS"
  },
  {
    "module": "module30",
    "factory": "formworkDokaflexConcreteSlabAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkDokaflexConcreteSlabR1",
    "targets": "FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifePileCapAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifePileCapAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeStripFoundationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeStripFoundationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeSlabFoundationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeSlabFoundationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeGeneralFoundationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeGeneralFoundationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeAnchorGroupAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_ANCHOR_GROUP_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeAnchorGroupAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_ANCHOR_GROUP_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeBeltAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_BELT_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeBeltAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_BELT_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeColumnBaseAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_COLUMN_BASE_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifeColumnBaseAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_COLUMN_BASE_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifePedestalAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_PEDESTAL_TARGETS"
  },
  {
    "module": "module31",
    "factory": "formworkFramiXlifePedestalAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkFramiXlifeProjectKitR1",
    "targets": "FORMWORK_FRAMI_XLIFE_PEDESTAL_TARGETS"
  },
  {
    "module": "module32",
    "factory": "formworkReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileFormworkReinforcementR1",
    "targets": "FORMWORK_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module32",
    "factory": "formworkReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileFormworkReinforcementR1",
    "targets": "FORMWORK_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module33",
    "factory": "jointReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileJointReinforcementR1",
    "targets": "JOINT_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module33",
    "factory": "jointReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileJointReinforcementR1",
    "targets": "JOINT_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module34",
    "factory": "pedestalConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compilePedestalConcretePlacementR1",
    "targets": "PEDESTAL_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module34",
    "factory": "pedestalConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compilePedestalConcretePlacementR1",
    "targets": "PEDESTAL_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module35",
    "factory": "pedestalCuringAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compilePedestalCuringR1",
    "targets": "PEDESTAL_CURING_TARGETS"
  },
  {
    "module": "module35",
    "factory": "pedestalCuringAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compilePedestalCuringR1",
    "targets": "PEDESTAL_CURING_TARGETS"
  },
  {
    "module": "module36",
    "factory": "pedestalEmbeddedItemsAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compilePedestalEmbeddedItemsR1",
    "targets": "PEDESTAL_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module36",
    "factory": "pedestalEmbeddedItemsAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compilePedestalEmbeddedItemsR1",
    "targets": "PEDESTAL_EMBEDDED_ITEMS_TARGETS"
  },
  {
    "module": "module37",
    "factory": "pedestalReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compilePedestalReinforcementR1",
    "targets": "PEDESTAL_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module37",
    "factory": "pedestalReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compilePedestalReinforcementR1",
    "targets": "PEDESTAL_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module38",
    "factory": "pileCapConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compilePileCapConcretePlacementR1",
    "targets": "PILE_CAP_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module38",
    "factory": "pileCapConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compilePileCapConcretePlacementR1",
    "targets": "PILE_CAP_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module39",
    "factory": "pileCapReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compilePileCapReinforcementR1",
    "targets": "PILE_CAP_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module39",
    "factory": "pileCapReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compilePileCapReinforcementR1",
    "targets": "PILE_CAP_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module40",
    "factory": "reinforcementFrameConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileReinforcementFrameConcretePlacementR1",
    "targets": "REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module40",
    "factory": "reinforcementFrameConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileReinforcementFrameConcretePlacementR1",
    "targets": "REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module41",
    "factory": "reinforcementFrameReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileReinforcementFrameReinforcementR1",
    "targets": "REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module41",
    "factory": "reinforcementFrameReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileReinforcementFrameReinforcementR1",
    "targets": "REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module41",
    "factory": "reinforcementFrameAssemblyAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileReinforcementFrameAssemblyR1",
    "targets": "REINFORCEMENT_FRAME_ASSEMBLY_TARGETS"
  },
  {
    "module": "module41",
    "factory": "reinforcementFrameAssemblyAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileReinforcementFrameAssemblyR1",
    "targets": "REINFORCEMENT_FRAME_ASSEMBLY_TARGETS"
  },
  {
    "module": "module42",
    "factory": "slabFoundationConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileSlabFoundationConcretePlacementR1",
    "targets": "SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module42",
    "factory": "slabFoundationConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileSlabFoundationConcretePlacementR1",
    "targets": "SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module43",
    "factory": "slabFoundationReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileSlabFoundationReinforcementR1",
    "targets": "SLAB_FOUNDATION_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module43",
    "factory": "slabFoundationReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileSlabFoundationReinforcementR1",
    "targets": "SLAB_FOUNDATION_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module44",
    "factory": "stairsCompleteInstallationAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileStairsCompleteInstallationR1",
    "targets": "STAIRS_COMPLETE_INSTALLATION_TARGETS"
  },
  {
    "module": "module44",
    "factory": "stairsCompleteInstallationAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileStairsCompleteInstallationR1",
    "targets": "STAIRS_COMPLETE_INSTALLATION_TARGETS"
  },
  {
    "module": "module45",
    "factory": "stairsConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileStairsConcretePlacementR1",
    "targets": "STAIRS_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module45",
    "factory": "stairsConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileStairsConcretePlacementR1",
    "targets": "STAIRS_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module46",
    "factory": "stairsReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileStairsReinforcementR1",
    "targets": "STAIRS_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module46",
    "factory": "stairsReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileStairsReinforcementR1",
    "targets": "STAIRS_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  },
  {
    "module": "module47",
    "factory": "stripFoundationConcretePlacementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileStripFoundationConcretePlacementR1",
    "targets": "STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module47",
    "factory": "stripFoundationConcretePlacementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileStripFoundationConcretePlacementR1",
    "targets": "STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS"
  },
  {
    "module": "module48",
    "factory": "stripFoundationReinforcementAcceptanceInputR1",
    "schedule": "compact",
    "compiler": "compileStripFoundationReinforcementR1",
    "targets": "STRIP_FOUNDATION_REINFORCEMENT_TARGETS",
    "expectedRows": 9,
    "expectedProcurementRows": 6
  },
  {
    "module": "module48",
    "factory": "stripFoundationReinforcementAcceptanceInputR1",
    "schedule": "extended",
    "compiler": "compileStripFoundationReinforcementR1",
    "targets": "STRIP_FOUNDATION_REINFORCEMENT_TARGETS",
    "expectedRows": 15,
    "expectedProcurementRows": 9
  }
] as const;

describe("concrete measured project schedules after area identity removal", () => {
  it.each(cases)("retains $factory $schedule physical quantities on the surviving standard work", async (testCase) => {
    const family = modules[testCase.module];
    const targets = family[testCase.targets] as readonly { contextKey: string; catalogId: string }[];
    const standard = targets.find((target) => target.contextKey === "standard")!;
    const compile = family[testCase.compiler] as (input: Record<string, unknown>, options: { catalogId: string }) => Promise<CanonicalEstimateCompileCoreResult>;
    const input = measuredConcreteProjectInputR533(testCase.factory, testCase.schedule);
    const result = await compile(input, { catalogId: standard.catalogId });
    expect(result.revisionProjection.catalogId).toBe(standard.catalogId);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const [parameterId, value] of Object.entries(input)) {
      if (typeof value === "number") expect(Number(result.parameters[parameterId])).toBe(value);
    }
    if ("expectedRows" in testCase) {
      expect(result.rows).toHaveLength(testCase.expectedRows);
      expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(testCase.expectedProcurementRows);
    }
  });

  it.each(cases)("rejects the removed area identity for $factory $schedule", async (testCase) => {
    const family = modules[testCase.module];
    const targets = family[testCase.targets] as readonly { contextKey: string; catalogId: string }[];
    expect(targets.some((target) => /^(?:small|medium|large)_area$/u.test(target.contextKey))).toBe(false);
    const standard = targets.find((target) => target.contextKey === "standard")!;
    const retired = standard.catalogId.replace(/standard$/u, testCase.schedule === "compact" ? "small_area" : "large_area");
    const compile = family[testCase.compiler] as (input: Record<string, unknown>, options: { catalogId: string }) => Promise<CanonicalEstimateCompileCoreResult>;
    await expect(compile(measuredConcreteProjectInputR533(testCase.factory, testCase.schedule), { catalogId: retired })).rejects.toThrow();
  });
});
