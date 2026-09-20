import {
  ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS,
} from "../v4/anchorGroupConcretePlacementR1";
import {
  COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS,
} from "../v4/columnBaseConcretePlacementR1";
import { BELT_CONCRETE_PLACEMENT_TARGETS } from "../v4/beltConcretePlacementR1";
import {
  CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS,
} from "../v4/concreteSlabConcretePlacementR1";
import {
  CONCRETE_SLAB_VIBRATION_PARAMETERS,
  CONCRETE_SLAB_VIBRATION_TARGETS,
  SLAB_FOUNDATION_VIBRATION_TARGETS,
} from "../v4/concreteSlabVibrationR1";
import {
  CONCRETE_SLAB_CURING_PARAMETERS,
  CONCRETE_SLAB_CURING_TARGETS,
} from "../v4/concreteSlabCuringR1";
import {
  ANCHOR_GROUP_CURING_PARAMETERS,
  ANCHOR_GROUP_CURING_TARGETS,
} from "../v4/anchorGroupCuringR1";
import {
  BELT_CURING_PARAMETERS,
  BELT_CURING_TARGETS,
} from "../v4/beltCuringR1";
import {
  COLUMN_BASE_CURING_PARAMETERS,
  COLUMN_BASE_CURING_TARGETS,
} from "../v4/columnBaseCuringR1";
import {
  ANCHOR_GROUP_LEVELING_PARAMETERS,
  ANCHOR_GROUP_LEVELING_TARGETS,
} from "../v4/anchorGroupLevelingR1";
import {
  BELT_LEVELING_PARAMETERS,
  BELT_LEVELING_TARGETS,
} from "../v4/beltLevelingR1";
import {
  COLUMN_BASE_LEVELING_PARAMETERS,
  COLUMN_BASE_LEVELING_TARGETS,
} from "../v4/columnBaseLevelingR1";
import {
  PEDESTAL_LEVELING_PARAMETERS,
  PEDESTAL_LEVELING_TARGETS,
} from "../v4/pedestalLevelingR1";
import {
  PILE_CAP_LEVELING_PARAMETERS,
  PILE_CAP_LEVELING_TARGETS,
} from "../v4/pileCapLevelingR1";
import {
  ANCHOR_GROUP_VIBRATION_PARAMETERS,
  ANCHOR_GROUP_VIBRATION_TARGETS,
} from "../v4/anchorGroupVibrationR1";
import { BELT_VIBRATION_PARAMETERS, BELT_VIBRATION_TARGETS } from "../v4/beltVibrationR1";
import { COLUMN_BASE_VIBRATION_PARAMETERS, COLUMN_BASE_VIBRATION_TARGETS } from "../v4/columnBaseVibrationR1";
import {
  PEDESTAL_VIBRATION_PARAMETERS,
  PEDESTAL_VIBRATION_TARGETS,
} from "../v4/pedestalVibrationR1";
import {
  PILE_CAP_VIBRATION_PARAMETERS,
  PILE_CAP_VIBRATION_TARGETS,
} from "../v4/pileCapVibrationR1";
import {
  CONCRETE_SLAB_LEVELING_PARAMETERS,
  CONCRETE_SLAB_LEVELING_TARGETS,
} from "../v4/concreteSlabLevelingR1";
import {
  CONCRETE_SLAB_REPAIR_PARAMETERS,
  CONCRETE_SLAB_REPAIR_TARGETS,
} from "../v4/concreteSlabRepairR1";
import {
  ANCHOR_GROUP_REPAIR_PARAMETERS,
  ANCHOR_GROUP_REPAIR_TARGETS,
} from "../v4/anchorGroupRepairR1";
import {
  BELT_REPAIR_PARAMETERS,
  BELT_REPAIR_TARGETS,
} from "../v4/beltRepairR1";
import {
  COLUMN_BASE_REPAIR_PARAMETERS,
  COLUMN_BASE_REPAIR_TARGETS,
} from "../v4/columnBaseRepairR1";
import {
  PEDESTAL_REPAIR_PARAMETERS,
  PEDESTAL_REPAIR_TARGETS,
} from "../v4/pedestalRepairR1";
import {
  PILE_CAP_REPAIR_PARAMETERS,
  PILE_CAP_REPAIR_TARGETS,
} from "../v4/pileCapRepairR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS,
} from "../v4/concreteSlabEmbeddedItemsR1";
import {
  BELT_EMBEDDED_ITEMS_PARAMETERS,
  BELT_EMBEDDED_ITEMS_TARGETS,
} from "../v4/beltEmbeddedItemsR1";
import {
  COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS,
  COLUMN_BASE_EMBEDDED_ITEMS_TARGETS,
} from "../v4/columnBaseEmbeddedItemsR1";
import {
  PEDESTAL_EMBEDDED_ITEMS_PARAMETERS,
  PEDESTAL_EMBEDDED_ITEMS_TARGETS,
} from "../v4/pedestalEmbeddedItemsR1";
import {
  PILE_CAP_EMBEDDED_ITEMS_PARAMETERS,
  PILE_CAP_EMBEDDED_ITEMS_TARGETS,
} from "../v4/pileCapEmbeddedItemsR1";
import {
  FORMWORK_EMBEDDED_ITEMS_PARAMETERS,
  FORMWORK_EMBEDDED_ITEMS_TARGETS,
} from "../v4/formworkEmbeddedItemsR1";
import {
  PEDESTAL_CURING_PARAMETERS,
  PEDESTAL_CURING_TARGETS,
} from "../v4/pedestalCuringR1";
import {
  PILE_CAP_CURING_PARAMETERS,
  PILE_CAP_CURING_TARGETS,
} from "../v4/pileCapCuringR1";
import {
  CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS,
} from "../v4/concreteJointCompleteInstallationR1";
import {
  STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
  STAIRS_COMPLETE_INSTALLATION_TARGETS,
} from "../v4/stairsCompleteInstallationR1";
import { PILE_CAP_CONCRETE_PLACEMENT_TARGETS } from "../v4/pileCapConcretePlacementR1";
import { PEDESTAL_CONCRETE_PLACEMENT_TARGETS } from "../v4/pedestalConcretePlacementR1";
import { SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS } from "../v4/slabFoundationConcretePlacementR1";
import { STAIRS_CONCRETE_PLACEMENT_TARGETS } from "../v4/stairsConcretePlacementR1";
import {
  REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS,
} from "../v4/reinforcementFrameConcretePlacementR1";
import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
} from "../v4/stripFoundationConcretePlacementR1";

type Primitive = string | number | boolean;

const CATALOG_IDS: ReadonlySet<string> = new Set([
  ...STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...COLUMN_BASE_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...BELT_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_SLAB_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...PILE_CAP_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...PEDESTAL_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...SLAB_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...STAIRS_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...REINFORCEMENT_FRAME_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_SLAB_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...SLAB_FOUNDATION_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_SLAB_CURING_TARGETS.map((target) => target.catalogId),
  ...ANCHOR_GROUP_CURING_TARGETS.map((target) => target.catalogId),
  ...BELT_CURING_TARGETS.map((target) => target.catalogId),
  ...COLUMN_BASE_CURING_TARGETS.map((target) => target.catalogId),
  ...ANCHOR_GROUP_LEVELING_TARGETS.map((target) => target.catalogId),
  ...BELT_LEVELING_TARGETS.map((target) => target.catalogId),
  ...COLUMN_BASE_LEVELING_TARGETS.map((target) => target.catalogId),
  ...PEDESTAL_LEVELING_TARGETS.map((target) => target.catalogId),
  ...PILE_CAP_LEVELING_TARGETS.map((target) => target.catalogId),
  ...ANCHOR_GROUP_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...BELT_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...COLUMN_BASE_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...PEDESTAL_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...PILE_CAP_VIBRATION_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_SLAB_LEVELING_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_SLAB_REPAIR_TARGETS.map((target) => target.catalogId),
  ...ANCHOR_GROUP_REPAIR_TARGETS.map((target) => target.catalogId),
  ...BELT_REPAIR_TARGETS.map((target) => target.catalogId),
  ...COLUMN_BASE_REPAIR_TARGETS.map((target) => target.catalogId),
  ...PEDESTAL_REPAIR_TARGETS.map((target) => target.catalogId),
  ...PILE_CAP_REPAIR_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
  ...BELT_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
  ...COLUMN_BASE_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
  ...PEDESTAL_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
  ...PILE_CAP_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
  ...FORMWORK_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
  ...PEDESTAL_CURING_TARGETS.map((target) => target.catalogId),
  ...PILE_CAP_CURING_TARGETS.map((target) => target.catalogId),
  ...CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.map((target) => target.catalogId),
  ...STAIRS_COMPLETE_INSTALLATION_TARGETS.map((target) => target.catalogId),
]);

const CONCRETE_SLAB_VIBRATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  [
    ...CONCRETE_SLAB_VIBRATION_TARGETS,
    ...SLAB_FOUNDATION_VIBRATION_TARGETS,
  ].map((target) => target.catalogId),
);

const CONCRETE_SLAB_CURING_CATALOG_IDS: ReadonlySet<string> = new Set(
  CONCRETE_SLAB_CURING_TARGETS.map((target) => target.catalogId),
);

const ANCHOR_GROUP_CURING_CATALOG_IDS: ReadonlySet<string> = new Set(
  ANCHOR_GROUP_CURING_TARGETS.map((target) => target.catalogId),
);

const BELT_CURING_CATALOG_IDS: ReadonlySet<string> = new Set(
  BELT_CURING_TARGETS.map((target) => target.catalogId),
);

const COLUMN_BASE_CURING_CATALOG_IDS: ReadonlySet<string> = new Set(
  COLUMN_BASE_CURING_TARGETS.map((target) => target.catalogId),
);

const ANCHOR_GROUP_LEVELING_CATALOG_IDS: ReadonlySet<string> = new Set(
  ANCHOR_GROUP_LEVELING_TARGETS.map((target) => target.catalogId),
);

const BELT_LEVELING_CATALOG_IDS: ReadonlySet<string> = new Set(
  BELT_LEVELING_TARGETS.map((target) => target.catalogId),
);

const COLUMN_BASE_LEVELING_CATALOG_IDS: ReadonlySet<string> = new Set(
  COLUMN_BASE_LEVELING_TARGETS.map((target) => target.catalogId),
);

const PEDESTAL_LEVELING_CATALOG_IDS: ReadonlySet<string> = new Set(
  PEDESTAL_LEVELING_TARGETS.map((target) => target.catalogId),
);
const PILE_CAP_LEVELING_CATALOG_IDS: ReadonlySet<string> = new Set(
  PILE_CAP_LEVELING_TARGETS.map((target) => target.catalogId),
);

const ANCHOR_GROUP_VIBRATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  ANCHOR_GROUP_VIBRATION_TARGETS.map((target) => target.catalogId),
);
const BELT_VIBRATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  BELT_VIBRATION_TARGETS.map((target) => target.catalogId),
);
const COLUMN_BASE_VIBRATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  COLUMN_BASE_VIBRATION_TARGETS.map((target) => target.catalogId),
);
const PEDESTAL_VIBRATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  PEDESTAL_VIBRATION_TARGETS.map((target) => target.catalogId),
);
const PILE_CAP_VIBRATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  PILE_CAP_VIBRATION_TARGETS.map((target) => target.catalogId),
);

const CONCRETE_SLAB_LEVELING_CATALOG_IDS: ReadonlySet<string> = new Set(
  CONCRETE_SLAB_LEVELING_TARGETS.map((target) => target.catalogId),
);

const CONCRETE_SLAB_REPAIR_CATALOG_IDS: ReadonlySet<string> = new Set(
  CONCRETE_SLAB_REPAIR_TARGETS.map((target) => target.catalogId),
);

const ANCHOR_GROUP_REPAIR_CATALOG_IDS: ReadonlySet<string> = new Set(
  ANCHOR_GROUP_REPAIR_TARGETS.map((target) => target.catalogId),
);

const BELT_REPAIR_CATALOG_IDS: ReadonlySet<string> = new Set(
  BELT_REPAIR_TARGETS.map((target) => target.catalogId),
);

const COLUMN_BASE_REPAIR_CATALOG_IDS: ReadonlySet<string> = new Set(
  COLUMN_BASE_REPAIR_TARGETS.map((target) => target.catalogId),
);
const PEDESTAL_REPAIR_CATALOG_IDS: ReadonlySet<string> = new Set(
  PEDESTAL_REPAIR_TARGETS.map((target) => target.catalogId),
);
const PILE_CAP_REPAIR_CATALOG_IDS: ReadonlySet<string> = new Set(
  PILE_CAP_REPAIR_TARGETS.map((target) => target.catalogId),
);

const CONCRETE_SLAB_EMBEDDED_ITEMS_CATALOG_IDS: ReadonlySet<string> = new Set(
  CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
);

const BELT_EMBEDDED_ITEMS_CATALOG_IDS: ReadonlySet<string> = new Set(
  BELT_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
);
const COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_IDS: ReadonlySet<string> = new Set(
  COLUMN_BASE_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
);
const PEDESTAL_EMBEDDED_ITEMS_CATALOG_IDS: ReadonlySet<string> = new Set(
  PEDESTAL_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
);
const PILE_CAP_EMBEDDED_ITEMS_CATALOG_IDS: ReadonlySet<string> = new Set(
  PILE_CAP_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
);
const FORMWORK_EMBEDDED_ITEMS_CATALOG_IDS: ReadonlySet<string> = new Set(
  FORMWORK_EMBEDDED_ITEMS_TARGETS.map((target) => target.catalogId),
);
const PEDESTAL_CURING_CATALOG_IDS: ReadonlySet<string> = new Set(
  PEDESTAL_CURING_TARGETS.map((target) => target.catalogId),
);
const PILE_CAP_CURING_CATALOG_IDS: ReadonlySet<string> = new Set(
  PILE_CAP_CURING_TARGETS.map((target) => target.catalogId),
);

const CONCRETE_JOINT_COMPLETE_INSTALLATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.map((target) => target.catalogId),
);

const STAIRS_COMPLETE_INSTALLATION_CATALOG_IDS: ReadonlySet<string> = new Set(
  STAIRS_COMPLETE_INSTALLATION_TARGETS.map((target) => target.catalogId),
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function parameterLabelPattern(
  parameters: ReadonlyArray<{ title_ru: string }>,
): string {
  return parameters.map((parameter) => escapeRegExp(parameter.title_ru)).join("|");
}

function labeledValue(text: string, titleRu: string, labelPattern: string): string | null {
  return text.match(new RegExp(
    `${escapeRegExp(titleRu)}\\s*[:=]\\s*([\\s\\S]*?)(?=\\s+(?:${labelPattern})\\s*[:=]|$)`,
    "iu",
  ))?.[1]?.trim() || null;
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLocaleLowerCase("ru-RU");
  if (["да", "true", "1"].includes(normalized)) return true;
  if (["нет", "false", "0"].includes(normalized)) return false;
  return null;
}

export function concretePlacementPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
    "CONCRETE_PLACEMENT_PROMPT_VALUE_MISSING", true);
}

export function concreteSlabVibrationPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, CONCRETE_SLAB_VIBRATION_PARAMETERS,
    "CONCRETE_SLAB_VIBRATION_PROMPT_VALUE_MISSING");
}

export function concreteSlabCuringPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, CONCRETE_SLAB_CURING_PARAMETERS,
    "CONCRETE_SLAB_CURING_PROMPT_VALUE_MISSING", true);
}

export function anchorGroupCuringPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, ANCHOR_GROUP_CURING_PARAMETERS,
    "ANCHOR_GROUP_CURING_PROMPT_VALUE_MISSING", true);
}

export function beltCuringPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, BELT_CURING_PARAMETERS,
    "BELT_CURING_PROMPT_VALUE_MISSING", true);
}

export function columnBaseCuringPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, COLUMN_BASE_CURING_PARAMETERS,
    "COLUMN_BASE_CURING_PROMPT_VALUE_MISSING", true);
}

export function anchorGroupLevelingPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, ANCHOR_GROUP_LEVELING_PARAMETERS,
    "ANCHOR_GROUP_LEVELING_PROMPT_VALUE_MISSING", true);
}

export function beltLevelingPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, BELT_LEVELING_PARAMETERS,
    "BELT_LEVELING_PROMPT_VALUE_MISSING", true);
}

export function columnBaseLevelingPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, COLUMN_BASE_LEVELING_PARAMETERS,
    "COLUMN_BASE_LEVELING_PROMPT_VALUE_MISSING", true);
}

export function pedestalLevelingPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PEDESTAL_LEVELING_PARAMETERS,
    "PEDESTAL_LEVELING_PROMPT_VALUE_MISSING", true);
}

export function pileCapLevelingPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PILE_CAP_LEVELING_PARAMETERS,
    "PILE_CAP_LEVELING_PROMPT_VALUE_MISSING", true);
}

export function anchorGroupVibrationPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, ANCHOR_GROUP_VIBRATION_PARAMETERS,
    "ANCHOR_GROUP_VIBRATION_PROMPT_VALUE_MISSING", true);
}
export function beltVibrationPromptDetailsR1(values: Readonly<Record<string, Primitive>>): string[] {
  return promptDetails(values, BELT_VIBRATION_PARAMETERS, "BELT_VIBRATION_PROMPT_VALUE_MISSING", true);
}

export function columnBaseVibrationPromptDetailsR1(values: Readonly<Record<string, Primitive>>): string[] {
  return promptDetails(values, COLUMN_BASE_VIBRATION_PARAMETERS,
    "COLUMN_BASE_VIBRATION_PROMPT_VALUE_MISSING", true);
}

export function pedestalVibrationPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PEDESTAL_VIBRATION_PARAMETERS,
    "PEDESTAL_VIBRATION_PROMPT_VALUE_MISSING", true);
}

export function pileCapVibrationPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PILE_CAP_VIBRATION_PARAMETERS,
    "PILE_CAP_VIBRATION_PROMPT_VALUE_MISSING", true);
}

export function concreteSlabLevelingPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, CONCRETE_SLAB_LEVELING_PARAMETERS,
    "CONCRETE_SLAB_LEVELING_PROMPT_VALUE_MISSING", true);
}

export function concreteSlabRepairPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, CONCRETE_SLAB_REPAIR_PARAMETERS,
    "CONCRETE_SLAB_REPAIR_PROMPT_VALUE_MISSING", true);
}

export function anchorGroupRepairPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, ANCHOR_GROUP_REPAIR_PARAMETERS,
    "ANCHOR_GROUP_REPAIR_PROMPT_VALUE_MISSING", true);
}

export function beltRepairPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, BELT_REPAIR_PARAMETERS,
    "BELT_REPAIR_PROMPT_VALUE_MISSING", true);
}

export function columnBaseRepairPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, COLUMN_BASE_REPAIR_PARAMETERS,
    "COLUMN_BASE_REPAIR_PROMPT_VALUE_MISSING", true);
}

export function pedestalRepairPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PEDESTAL_REPAIR_PARAMETERS,
    "PEDESTAL_REPAIR_PROMPT_VALUE_MISSING", true);
}

export function pileCapRepairPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PILE_CAP_REPAIR_PARAMETERS,
    "PILE_CAP_REPAIR_PROMPT_VALUE_MISSING", true);
}

export function concreteSlabEmbeddedItemsPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
    "CONCRETE_SLAB_EMBEDDED_ITEMS_PROMPT_VALUE_MISSING", true);
}

export function beltEmbeddedItemsPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, BELT_EMBEDDED_ITEMS_PARAMETERS,
    "BELT_EMBEDDED_ITEMS_PROMPT_VALUE_MISSING", true);
}
export function columnBaseEmbeddedItemsPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS,
    "COLUMN_BASE_EMBEDDED_ITEMS_PROMPT_VALUE_MISSING", true);
}

export function pedestalEmbeddedItemsPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PEDESTAL_EMBEDDED_ITEMS_PARAMETERS,
    "PEDESTAL_EMBEDDED_ITEMS_PROMPT_VALUE_MISSING", true);
}

export function pileCapEmbeddedItemsPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PILE_CAP_EMBEDDED_ITEMS_PARAMETERS,
    "PILE_CAP_EMBEDDED_ITEMS_PROMPT_VALUE_MISSING", true);
}

export function formworkEmbeddedItemsPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, FORMWORK_EMBEDDED_ITEMS_PARAMETERS,
    "FORMWORK_EMBEDDED_ITEMS_PROMPT_VALUE_MISSING", true);
}

export function pedestalCuringPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PEDESTAL_CURING_PARAMETERS,
    "PEDESTAL_CURING_PROMPT_VALUE_MISSING", true);
}

export function pileCapCuringPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, PILE_CAP_CURING_PARAMETERS,
    "PILE_CAP_CURING_PROMPT_VALUE_MISSING", true);
}

export function concreteJointCompleteInstallationPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS,
    "CONCRETE_JOINT_COMPLETE_PROMPT_VALUE_MISSING", true);
}

export function stairsCompleteInstallationPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return promptDetails(values, STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
    "STAIRS_COMPLETE_PROMPT_VALUE_MISSING", true);
}

function promptDetails(
  values: Readonly<Record<string, Primitive>>,
  parameters: ReadonlyArray<{ parameter_id: string; title_ru: string; required?: boolean }>,
  errorPrefix: string,
  skipMissingOptional = false,
): string[] {
  return parameters.flatMap((parameter) => {
    const value = values[parameter.parameter_id];
    if (value == null && skipMissingOptional && parameter.required === false) return [];
    if (value == null) throw new Error(
      `${errorPrefix}:${parameter.parameter_id}`,
    );
    const rendered = typeof value === "boolean" ? (value ? "да" : "нет") : String(value);
    return [`${parameter.title_ru}: ${rendered}`];
  });
}

export function extractConcretePlacementCanonicalParametersR1(input: {
  catalogId: string;
  text: string;
}): Readonly<Record<string, Primitive>> | null {
  if (!CATALOG_IDS.has(input.catalogId)) return null;
  const parameters = CONCRETE_SLAB_VIBRATION_CATALOG_IDS.has(input.catalogId)
    ? CONCRETE_SLAB_VIBRATION_PARAMETERS
    : CONCRETE_SLAB_CURING_CATALOG_IDS.has(input.catalogId)
      ? CONCRETE_SLAB_CURING_PARAMETERS
      : ANCHOR_GROUP_CURING_CATALOG_IDS.has(input.catalogId)
        ? ANCHOR_GROUP_CURING_PARAMETERS
        : BELT_CURING_CATALOG_IDS.has(input.catalogId)
          ? BELT_CURING_PARAMETERS
          : COLUMN_BASE_CURING_CATALOG_IDS.has(input.catalogId)
            ? COLUMN_BASE_CURING_PARAMETERS
            : ANCHOR_GROUP_LEVELING_CATALOG_IDS.has(input.catalogId)
              ? ANCHOR_GROUP_LEVELING_PARAMETERS
              : BELT_LEVELING_CATALOG_IDS.has(input.catalogId)
                ? BELT_LEVELING_PARAMETERS
                : COLUMN_BASE_LEVELING_CATALOG_IDS.has(input.catalogId)
                  ? COLUMN_BASE_LEVELING_PARAMETERS
                  : PEDESTAL_LEVELING_CATALOG_IDS.has(input.catalogId)
                    ? PEDESTAL_LEVELING_PARAMETERS
                  : PILE_CAP_LEVELING_CATALOG_IDS.has(input.catalogId)
                    ? PILE_CAP_LEVELING_PARAMETERS
                : ANCHOR_GROUP_VIBRATION_CATALOG_IDS.has(input.catalogId)
                  ? ANCHOR_GROUP_VIBRATION_PARAMETERS
                  : BELT_VIBRATION_CATALOG_IDS.has(input.catalogId)
                    ? BELT_VIBRATION_PARAMETERS
                    : COLUMN_BASE_VIBRATION_CATALOG_IDS.has(input.catalogId)
                      ? COLUMN_BASE_VIBRATION_PARAMETERS
                      : PEDESTAL_VIBRATION_CATALOG_IDS.has(input.catalogId)
                        ? PEDESTAL_VIBRATION_PARAMETERS
                      : PILE_CAP_VIBRATION_CATALOG_IDS.has(input.catalogId)
                        ? PILE_CAP_VIBRATION_PARAMETERS
      : CONCRETE_SLAB_LEVELING_CATALOG_IDS.has(input.catalogId)
        ? CONCRETE_SLAB_LEVELING_PARAMETERS
        : CONCRETE_SLAB_REPAIR_CATALOG_IDS.has(input.catalogId)
          ? CONCRETE_SLAB_REPAIR_PARAMETERS
          : ANCHOR_GROUP_REPAIR_CATALOG_IDS.has(input.catalogId)
            ? ANCHOR_GROUP_REPAIR_PARAMETERS
            : BELT_REPAIR_CATALOG_IDS.has(input.catalogId)
              ? BELT_REPAIR_PARAMETERS
              : COLUMN_BASE_REPAIR_CATALOG_IDS.has(input.catalogId)
                ? COLUMN_BASE_REPAIR_PARAMETERS
                : PEDESTAL_REPAIR_CATALOG_IDS.has(input.catalogId)
                  ? PEDESTAL_REPAIR_PARAMETERS
                : PILE_CAP_REPAIR_CATALOG_IDS.has(input.catalogId)
                  ? PILE_CAP_REPAIR_PARAMETERS
              : CONCRETE_SLAB_EMBEDDED_ITEMS_CATALOG_IDS.has(input.catalogId)
                ? CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS
              : BELT_EMBEDDED_ITEMS_CATALOG_IDS.has(input.catalogId)
                ? BELT_EMBEDDED_ITEMS_PARAMETERS
                : COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_IDS.has(input.catalogId)
                  ? COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS
                : PEDESTAL_EMBEDDED_ITEMS_CATALOG_IDS.has(input.catalogId)
                  ? PEDESTAL_EMBEDDED_ITEMS_PARAMETERS
                : PILE_CAP_EMBEDDED_ITEMS_CATALOG_IDS.has(input.catalogId)
                  ? PILE_CAP_EMBEDDED_ITEMS_PARAMETERS
                : FORMWORK_EMBEDDED_ITEMS_CATALOG_IDS.has(input.catalogId)
                  ? FORMWORK_EMBEDDED_ITEMS_PARAMETERS
                : PEDESTAL_CURING_CATALOG_IDS.has(input.catalogId)
                  ? PEDESTAL_CURING_PARAMETERS
                : PILE_CAP_CURING_CATALOG_IDS.has(input.catalogId)
                  ? PILE_CAP_CURING_PARAMETERS
                : CONCRETE_JOINT_COMPLETE_INSTALLATION_CATALOG_IDS.has(input.catalogId)
                  ? CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS
              : STAIRS_COMPLETE_INSTALLATION_CATALOG_IDS.has(input.catalogId)
                ? STAIRS_COMPLETE_INSTALLATION_PARAMETERS
      : STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS;
  const labelPattern = parameterLabelPattern(parameters);
  const result: Record<string, Primitive> = {};
  for (const parameter of parameters) {
    const raw = labeledValue(input.text, parameter.title_ru, labelPattern);
    if (raw == null) continue;
    if (parameter.value_type === "decimal" || parameter.value_type === "integer") {
      const value = Number(raw.replace(/\s+/gu, "").replace(",", "."));
      if (Number.isFinite(value)) result[parameter.parameter_id] = value;
      continue;
    }
    if (parameter.value_type === "boolean") {
      const value = parseBoolean(raw);
      if (value != null) result[parameter.parameter_id] = value;
      continue;
    }
    result[parameter.parameter_id] = raw;
  }
  return Object.keys(result).length > 0 ? result : null;
}
