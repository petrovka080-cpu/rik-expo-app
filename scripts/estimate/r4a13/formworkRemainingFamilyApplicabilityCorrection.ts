import {
  FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS,
} from "../../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import {
  FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS,
  FORMWORK_DOKAFLEX_SOURCE_ID,
} from "../../../src/lib/estimate/v4/formworkDokaflexConcreteSlabR1";
import {
  REINFORCEMENT_FRAME_ASSEMBLY_TARGETS,
} from "../../../src/lib/estimate/v4/reinforcementFrameReinforcementR1";
import { REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID } from "../../../src/lib/estimate/v4/domainFactory";
import {
  CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS,
} from "../../../src/lib/estimate/v4/concreteJointCompleteInstallationR1";
import {
  STAIRS_COMPLETE_INSTALLATION_TARGETS,
} from "../../../src/lib/estimate/v4/stairsCompleteInstallationR1";
import {
  ANCHOR_GROUP_CURING_SOURCE_ID,
  ANCHOR_GROUP_CURING_TARGETS,
} from "../../../src/lib/estimate/v4/anchorGroupCuringR1";
import {
  BELT_CURING_SOURCE_ID,
  BELT_CURING_TARGETS,
} from "../../../src/lib/estimate/v4/beltCuringR1";
import {
  COLUMN_BASE_CURING_SOURCE_ID,
  COLUMN_BASE_CURING_TARGETS,
} from "../../../src/lib/estimate/v4/columnBaseCuringR1";
import {
  ANCHOR_GROUP_LEVELING_SOURCE_ID,
  ANCHOR_GROUP_LEVELING_TARGETS,
} from "../../../src/lib/estimate/v4/anchorGroupLevelingR1";
import {
  BELT_LEVELING_SOURCE_ID,
  BELT_LEVELING_TARGETS,
} from "../../../src/lib/estimate/v4/beltLevelingR1";
import {
  COLUMN_BASE_LEVELING_SOURCE_ID,
  COLUMN_BASE_LEVELING_TARGETS,
} from "../../../src/lib/estimate/v4/columnBaseLevelingR1";
import {
  ANCHOR_GROUP_VIBRATION_SOURCE_ID,
  ANCHOR_GROUP_VIBRATION_TARGETS,
} from "../../../src/lib/estimate/v4/anchorGroupVibrationR1";
import { BELT_VIBRATION_SOURCE_ID, BELT_VIBRATION_TARGETS } from "../../../src/lib/estimate/v4/beltVibrationR1";
import { COLUMN_BASE_VIBRATION_SOURCE_ID, COLUMN_BASE_VIBRATION_TARGETS } from "../../../src/lib/estimate/v4/columnBaseVibrationR1";
import {
  PEDESTAL_VIBRATION_SOURCE_ID,
  PEDESTAL_VIBRATION_TARGETS,
} from "../../../src/lib/estimate/v4/pedestalVibrationR1";
import {
  PILE_CAP_VIBRATION_SOURCE_ID,
  PILE_CAP_VIBRATION_TARGETS,
} from "../../../src/lib/estimate/v4/pileCapVibrationR1";
import {
  ANCHOR_GROUP_REPAIR_SCOPE_MODES,
  ANCHOR_GROUP_REPAIR_SOURCE_ID,
  ANCHOR_GROUP_REPAIR_TARGETS,
} from "../../../src/lib/estimate/v4/anchorGroupRepairR1";
import {
  BELT_REPAIR_SOURCE_ID,
  BELT_REPAIR_TARGETS,
} from "../../../src/lib/estimate/v4/beltRepairR1";
import {
  COLUMN_BASE_REPAIR_SOURCE_ID,
  COLUMN_BASE_REPAIR_TARGETS,
} from "../../../src/lib/estimate/v4/columnBaseRepairR1";
import {
  PEDESTAL_REPAIR_SOURCE_ID,
  PEDESTAL_REPAIR_TARGETS,
} from "../../../src/lib/estimate/v4/pedestalRepairR1";
import {
  PILE_CAP_REPAIR_SOURCE_ID,
  PILE_CAP_REPAIR_TARGETS,
} from "../../../src/lib/estimate/v4/pileCapRepairR1";
import {
  BELT_EMBEDDED_ITEMS_SOURCE_ID,
  BELT_EMBEDDED_ITEMS_TARGETS,
} from "../../../src/lib/estimate/v4/beltEmbeddedItemsR1";
import {
  COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID,
  COLUMN_BASE_EMBEDDED_ITEMS_TARGETS,
} from "../../../src/lib/estimate/v4/columnBaseEmbeddedItemsR1";
import {
  PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID,
  PEDESTAL_EMBEDDED_ITEMS_TARGETS,
} from "../../../src/lib/estimate/v4/pedestalEmbeddedItemsR1";
import {
  PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID,
  PILE_CAP_EMBEDDED_ITEMS_TARGETS,
} from "../../../src/lib/estimate/v4/pileCapEmbeddedItemsR1";
import {
  FORMWORK_EMBEDDED_ITEMS_SOURCE_ID,
  FORMWORK_EMBEDDED_ITEMS_TARGETS,
} from "../../../src/lib/estimate/v4/formworkEmbeddedItemsR1";
import {
  PEDESTAL_CURING_SOURCE_ID,
  PEDESTAL_CURING_TARGETS,
} from "../../../src/lib/estimate/v4/pedestalCuringR1";
import {
  PILE_CAP_CURING_SOURCE_ID,
  PILE_CAP_CURING_TARGETS,
} from "../../../src/lib/estimate/v4/pileCapCuringR1";
import {
  PEDESTAL_LEVELING_SOURCE_ID,
  PEDESTAL_LEVELING_TARGETS,
} from "../../../src/lib/estimate/v4/pedestalLevelingR1";
import {
  PILE_CAP_LEVELING_SOURCE_ID,
  PILE_CAP_LEVELING_TARGETS,
} from "../../../src/lib/estimate/v4/pileCapLevelingR1";
import {
  RICS_NRM2_FORMWORK_SOURCE_ID,
} from "../../../src/lib/estimate/v4/domainFactory/formworkRicsNrm2PhysicalNormV1";

export const FORMWORK_REMAINING_FAMILY_CONTRACTS = Object.freeze([
  "rik-expo-app.r4-a13-6.formwork-frami-xlife-strip-foundation-family-complete-estimate.v1",
  "rik-expo-app.r4-a13-6.formwork-frami-xlife-slab-foundation-family-complete-estimate.v1",
  "rik-expo-app.r4-a13-6.formwork-frami-xlife-general-foundation-family-complete-estimate.v1",
] as const);

export type FormworkRemainingFamilyKey = "strip_foundation" | "slab_foundation" | "foundation_walls";

const FAMILY_SCOPE_RU: Readonly<Record<FormworkRemainingFamilyKey, string>> = Object.freeze({
  strip_foundation: "ленточный фундамент",
  slab_foundation: "плитный фундамент",
  foundation_walls: "фундаментные стены",
});

const CONTEXT_EVIDENCE_RU = Object.freeze({
  standard: {
    conditions: ["геометрия и стороны обмера", "давление бетонной смеси", "схема стяжек"],
    requiredProject: ["утверждённая раскладка", "ведомость комплекта", "график оборота"],
  },
  high_load: {
    conditions: ["давление свежего бетона", "темп бетонирования", "временные нагрузки"],
    requiredProject: ["расчёт временной опалубочной системы", "раскладка по расчёту"],
  },
  large_area: {
    conditions: ["разбивка на захватки", "пиковая потребность комплекта", "перестановки"],
    requiredProject: ["календарно-захваточный план", "ведомость пикового комплекта", "транспортный план"],
  },
  repair: {
    conditions: ["существующая конструкция", "узлы сопряжения", "границы демонтажа"],
    requiredProject: ["обследование", "ремонтная раскладка", "узлы крепления"],
  },
  small_area: {
    conditions: ["габариты рабочей зоны", "способ подачи", "минимальный комплект"],
    requiredProject: ["план доступа", "отдельная раскладка", "условия малой поставки"],
  },
  technical_room: {
    conditions: ["проёмы и габариты доступа", "масса элементов", "способ подачи"],
    requiredProject: ["план доступа и механизации", "проверка допустимых элементов", "раскладка стеснённой зоны"],
  },
  wet_zone: {
    conditions: ["режим влажной зоны", "герметизация стыков", "защита и очистка щитов"],
    requiredProject: ["узлы герметизации", "ведомость расходников", "раскладка влажной зоны"],
  },
} as const);

function familyTargets(
  familyKey: FormworkRemainingFamilyKey,
  targets: readonly Readonly<{ contextKey: keyof typeof CONTEXT_EVIDENCE_RU; catalogId: string }>[],
) {
  return targets.map((target) => ({ ...target, familyKey }));
}

export const FORMWORK_REMAINING_FAMILY_TARGETS = Object.freeze([
  ...familyTargets("strip_foundation", FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS),
  ...familyTargets("slab_foundation", FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS),
  ...familyTargets("foundation_walls", FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS),
]);

export const FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX = Object.freeze(
  FORMWORK_REMAINING_FAMILY_TARGETS.map((target) => {
    const evidence = CONTEXT_EVIDENCE_RU[target.contextKey];
    return Object.freeze({
      familyKey: target.familyKey,
      contextKey: target.contextKey,
      catalogId: target.catalogId,
      sourceScope: `${FAMILY_SCOPE_RU[target.familyKey]}: ${target.contextKey}`,
      selectedSystem: "Doka Frami Xlife не подтверждена отдельным проектом для этого catalog ID",
      conditions: [...evidence.conditions],
      requiredProject: [...evidence.requiredProject],
      includedStages: ["измерение площади контакта опалубки по RICS NRM 2"],
      missingEvidence:
        "Семейный fixture менял только название и ссылки. Отдельные расчёт, раскладка, ведомость комплекта, график и логистика не предъявлены.",
      evidence: Object.freeze({
        clonedFixtureRejectedAsPerIdEvidence: true,
        measurementOnlyFallbackRequired: true,
      }),
      status: "OPEN_MEASUREMENT_ONLY_RESTORED" as const,
    });
  }),
);

export function assertFormworkRemainingFamilyApplicabilityMatrix(): void {
  const catalogIds = FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.map((row) => row.catalogId);
  if (catalogIds.length !== 21) throw new Error(`FORMWORK_REMAINING_TARGET_COUNT:${catalogIds.length}`);
  if (new Set(catalogIds).size !== catalogIds.length) throw new Error("FORMWORK_REMAINING_TARGET_DUPLICATE");
  if (catalogIds.some((catalogId) => catalogId.includes("pile_cap"))) {
    throw new Error("FORMWORK_REMAINING_TARGET_PILE_CAP_LEAK");
  }
}

const CONCRETE_SLAB_FULL_WORK_CONTEXTS = Object.freeze([
  ["standard", "устройство бетонной плиты в стандартной зоне"],
  ["small_area", "устройство бетонной плиты на малой площади"],
  ["large_area", "устройство бетонной плиты на большой площади"],
  ["wet_zone", "устройство бетонной плиты во влажной зоне"],
  ["technical_room", "устройство бетонной плиты в техническом помещении"],
  ["high_load", "устройство бетонной плиты для высокой нагрузки"],
  ["repair", "устройство бетонной плиты с локальным ремонтом основания"],
] as const);

/**
 * I8 catalog-scope audit. The `_form_` token belongs to the generated catalog
 * key and must not be interpreted as proof that the identity is a standalone
 * formwork operation. These records promise a complete concrete-slab work in
 * m3 and remain owned by the shared concrete calculator.
 */
export const CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT = Object.freeze(
  CONCRETE_SLAB_FULL_WORK_CONTEXTS.map(([contextKey, titleRu]) => Object.freeze({
    contextKey,
    catalogId: `canonical-work:base:concrete_foundation_interior_concrete_slab_form_${contextKey}`,
    titleRu,
    promisedOperation: "COMPLETE_CONCRETE_SLAB_INSTALLATION" as const,
    primaryUnitId: "m3" as const,
    domainOwner: "calc_family_concrete_v1" as const,
    requiredStages: [
      "подготовка и геометрия",
      "опалубка — только по выбранному конструктивному типу плиты",
      "армирование по проектной ведомости",
      "бетонная смесь и укладка",
      "уход, контроль, демонтаж и применимая логистика",
    ],
    dokaflexApplicability: {
      sourceId: FORMWORK_DOKAFLEX_SOURCE_ID,
      status: "CONDITIONAL_COMPONENT_ONLY" as const,
      requiredSlabSupportCondition: "SUSPENDED_ELEVATED_FLOOR_SLAB" as const,
      requiresApprovedLayoutAndStructuralCheck: true,
      forbiddenForSlabOnGradeByDefault: true,
      doesNotSupplyConcreteReinforcementLaborNormsOrPrices: true,
    },
    remainingGap:
      "Требуется единый полный descriptor плиты с явным типом конструкции; Dokaflex нельзя публиковать вместо всей работы.",
    status: "OPEN_COMPLETE_WORK_COMPOSITION_REQUIRED" as const,
  })),
);

export function assertConcreteSlabFullWorkCatalogScopeAudit(): void {
  const catalogIds = CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  const componentIds = new Set<string>(
    FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS.map((target) => target.catalogId),
  );
  if (catalogIds.length !== 7 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`CONCRETE_SLAB_FULL_WORK_TARGET_SHAPE:${catalogIds.length}`);
  }
  if (catalogIds.some((catalogId) => componentIds.has(catalogId))) {
    throw new Error("CONCRETE_SLAB_FULL_WORK_DOKAFLEX_COMPONENT_ID_COLLISION");
  }
}

export type ConcreteSlabCatalogManifestRow = Readonly<{
  template_id: string;
  work_key: string;
  calculator_family_id: string;
  norm_pack_id: string;
  unit_policy_id: string;
  work_type: string;
  category: string;
  localized_name_ru: string;
}>;

/**
 * Binds the I8 decision to the actual generated catalog manifest. This keeps a
 * later title/unit/owner regeneration from silently making the hard-coded
 * semantic ledger stale before a successor is prepared.
 */
export function assertConcreteSlabFullWorkCatalogScopeAgainstManifest(
  manifestRows: readonly ConcreteSlabCatalogManifestRow[],
): void {
  assertConcreteSlabFullWorkCatalogScopeAudit();
  for (const auditRow of CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT) {
    const workKey = auditRow.catalogId.replace("canonical-work:base:", "");
    const templateId = `${workKey}_professional_expanded_v1`;
    const matches = manifestRows.filter((row) => row.template_id === templateId);
    if (matches.length !== 1) {
      throw new Error(`CONCRETE_SLAB_CATALOG_MANIFEST_IDENTITY:${templateId}:${matches.length}`);
    }
    const [manifestRow] = matches;
    const expected = {
      work_key: workKey,
      calculator_family_id: auditRow.domainOwner,
      norm_pack_id: "norm_pack_concrete_v1",
      unit_policy_id: "unit_policy_concrete_m3_v1",
      work_type: "form",
      category: "concrete_foundation",
      localized_name_ru: auditRow.titleRu,
    } as const;
    for (const [field, expectedValue] of Object.entries(expected)) {
      const actualValue = manifestRow[field as keyof typeof expected];
      if (actualValue !== expectedValue) {
        throw new Error(
          `CONCRETE_SLAB_CATALOG_MANIFEST_PROMISE:${templateId}:${field}:${actualValue}:${expectedValue}`,
        );
      }
    }
  }
}

const sevenContextCatalogIds = (workKey: string) => [
  "standard", "high_load", "large_area", "repair", "small_area", "technical_room", "wet_zone",
].map((contextKey) => `canonical-work:base:concrete_foundation_interior_${workKey}_${contextKey}`);

/**
 * Short I8 decision ledger for the four remaining legacy `_form_` groups.
 * The token is audited only after the public catalog promise, unit and owner;
 * it is never used as proof of formwork technology.
 */
export const REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER = Object.freeze([
  Object.freeze({
    familyKey: "concrete_slab_form",
    catalogIds: CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId),
    promisedOperation: "COMPLETE_CONCRETE_SLAB_INSTALLATION",
    currentPrimaryUnitId: "m3",
    selectedSystemOrCondition: "SLAB_SUPPORT_CONDITION_REQUIRED",
    applicableSourceIds: [FORMWORK_DOKAFLEX_SOURCE_ID],
    requiredProjectInputs: ["тип опирания плиты", "геометрия", "армирование", "бетон", "применимая раскладка опалубки"],
    domainOwner: "calc_family_concrete_v1",
    remainingGap: "Полный состав зависит от типа плиты; Dokaflex допустим только как условный компонент подвесной плиты.",
    status: "OPEN_COMPLETE_WORK_COMPOSITION_REQUIRED",
  }),
  Object.freeze({
    familyKey: "reinforcement_frame_form",
    catalogIds: REINFORCEMENT_FRAME_ASSEMBLY_TARGETS.map((target) => target.catalogId),
    promisedOperation: "REINFORCEMENT_CAGE_ASSEMBLY",
    currentPrimaryUnitId: "m3",
    correctedPrimaryUnitId: "kg",
    selectedSystemOrCondition: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
    applicableSourceIds: [REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID],
    requiredProjectInputs: ["утверждённая ведомость стержней", "чертёж и ревизия", "способ изготовления", "план монтажа и доставки"],
    domainOwner: "reinforcement-frame-reinforcement",
    remainingGap: null,
    status: "READY_SHARED_REINFORCEMENT_PIPELINE",
  }),
  Object.freeze({
    familyKey: "joint_form",
    catalogIds: CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.map(
      (target) => target.catalogId,
    ),
    promisedOperation: "DEFORMATION_JOINT_INSTALLATION",
    currentPrimaryUnitId: "m3",
    correctedPrimaryUnitId: "m",
    selectedSystemOrCondition: "PROJECT_JOINT_TYPE_REQUIRED",
    applicableSourceIds: [CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID],
    requiredProjectInputs: ["тип и профиль шва", "длина", "ширина", "герметизация", "узлы примыкания"],
    domainOwner: "concrete-joint-complete-installation",
    remainingGap: null,
    status: "READY_PROJECT_JOINT_DESCRIPTOR",
  }),
  Object.freeze({
    familyKey: "stairs_concrete_form",
    catalogIds: STAIRS_COMPLETE_INSTALLATION_TARGETS.map((target) => target.catalogId),
    promisedOperation: "COMPLETE_CONCRETE_STAIRS_INSTALLATION",
    currentPrimaryUnitId: "m3",
    selectedSystemOrCondition: "STAIR_GEOMETRY_AND_SUPPORT_SYSTEM_REQUIRED",
    applicableSourceIds: [
      "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1",
      REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      RICS_NRM2_FORMWORK_SOURCE_ID,
    ],
    requiredProjectInputs: ["геометрия марша и площадок", "опирание", "армирование", "бетон", "проект опалубки"],
    domainOwner: "stairs-complete-installation",
    remainingGap: null,
    status: "READY_COMPLETE_WORK_COMPOSITION",
  }),
] as const);

export function assertRemainingFormTokenFamilySemanticLedger(): void {
  const catalogIds = REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER.flatMap((row) => row.catalogIds);
  if (REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER.length !== 4) {
    throw new Error("REMAINING_FORM_TOKEN_FAMILY_COUNT");
  }
  if (catalogIds.length !== 28 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`REMAINING_FORM_TOKEN_CATALOG_SHAPE:${catalogIds.length}`);
  }
}

/**
 * The generated legacy pack attached ready-mix, reinforcement and formwork to
 * these `cure` identities. The catalog promise is only external curing of the
 * already placed concrete, so those components must not leak into this family.
 */
export const ANCHOR_GROUP_CURING_CATALOG_SCOPE_AUDIT = Object.freeze(
  ANCHOR_GROUP_CURING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "EXTERNAL_CURING_OF_ANCHOR_GROUP_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [ANCHOR_GROUP_CURING_SOURCE_ID],
    calculationInputs: [
      "объём и открытая площадь в границе ухода",
      "утверждённый способ ухода",
      "прямые количества материалов, труда, техники, контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь",
      "технологическая карта",
      "обозначение материала",
      "план контроля",
      "маршрут мобилизации",
    ],
    excludedLegacyComponents: [
      "новая поставка и укладка товарного бетона",
      "арматура",
      "опалубка",
    ],
    domainOwner: "anchor-group-curing",
    remainingGap: null,
    status: "READY_SHARED_ACI_308_CURING_GRAPH" as const,
  })),
);

export function assertAnchorGroupCuringCatalogScopeAudit(): void {
  const catalogIds = ANCHOR_GROUP_CURING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 6 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`ANCHOR_GROUP_CURING_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (ANCHOR_GROUP_CURING_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_anchor_group_cure_"),
  )) throw new Error("ANCHOR_GROUP_CURING_CATALOG_SCOPE_LEAK");
}

/**
 * `belt_cure_*` promises curing of concrete already placed in a monolithic
 * belt. Ready-mix, reinforcement and formwork from the generated legacy pack
 * are outside that promise and remain excluded.
 */
export const BELT_CURING_CATALOG_SCOPE_AUDIT = Object.freeze(
  BELT_CURING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "EXTERNAL_CURING_OF_MONOLITHIC_BELT_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [BELT_CURING_SOURCE_ID],
    calculationInputs: [
      "объём и открытая площадь в границе ухода",
      "утверждённый способ ухода",
      "прямые количества материалов, труда, техники, контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь",
      "технологическая карта",
      "обозначение материала",
      "план контроля",
      "маршрут мобилизации",
    ],
    excludedLegacyComponents: [
      "новая поставка и укладка товарного бетона",
      "арматура",
      "опалубка",
    ],
    domainOwner: "belt-curing",
    remainingGap: null,
    status: "READY_SHARED_ACI_308_CURING_GRAPH" as const,
  })),
);

export function assertBeltCuringCatalogScopeAudit(): void {
  const catalogIds = BELT_CURING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 6 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`BELT_CURING_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (BELT_CURING_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_belt_cure_"),
  )) throw new Error("BELT_CURING_CATALOG_SCOPE_LEAK");
}

/**
 * `column_base_cure_*` promises curing of concrete already placed in a
 * column base. New ready-mix, reinforcement and formwork remain excluded.
 */
export const COLUMN_BASE_CURING_CATALOG_SCOPE_AUDIT = Object.freeze(
  COLUMN_BASE_CURING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "EXTERNAL_CURING_OF_COLUMN_BASE_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [COLUMN_BASE_CURING_SOURCE_ID],
    calculationInputs: [
      "объём и открытая площадь в границе ухода",
      "утверждённый способ ухода",
      "прямые количества материалов, труда, техники, контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь",
      "технологическая карта",
      "обозначение материала",
      "план контроля",
      "маршрут мобилизации",
    ],
    excludedLegacyComponents: [
      "новая поставка и укладка товарного бетона",
      "арматура",
      "опалубка",
    ],
    domainOwner: "column-base-curing",
    remainingGap: null,
    status: "READY_SHARED_ACI_308_CURING_GRAPH" as const,
  })),
);

export function assertColumnBaseCuringCatalogScopeAudit(): void {
  const catalogIds = COLUMN_BASE_CURING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 6 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`COLUMN_BASE_CURING_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (COLUMN_BASE_CURING_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_column_base_cure_"),
  )) throw new Error("COLUMN_BASE_CURING_CATALOG_SCOPE_LEAK");
}

export const ANCHOR_GROUP_LEVELING_CATALOG_SCOPE_AUDIT = Object.freeze(
  ANCHOR_GROUP_LEVELING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "LEVEL_AND_STRIKE_OFF_ANCHOR_GROUP_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [ANCHOR_GROUP_LEVELING_SOURCE_ID],
    calculationInputs: [
      "объём и площадь поверхности",
      "прямые трудозатраты",
      "применимость и количество направляющих",
      "применимость и машино-время оборудования",
      "контроль и логистика",
    ],
    optionalDocumentaryInputs: [
      "ссылки на смесь, отметки, уклоны и ровность",
      "название способа и технологическая карта",
      "обозначения направляющих и оборудования",
      "план контроля и маршрут мобилизации",
    ],
    excludedLegacyComponents: ["товарный бетон", "арматура", "опалубка"],
    domainOwner: "anchor-group-leveling",
    remainingGap: null,
    status: "READY_SHARED_ACI_302_LEVELING_GRAPH" as const,
  })),
);

export function assertAnchorGroupLevelingCatalogScopeAudit(): void {
  const catalogIds = ANCHOR_GROUP_LEVELING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 7 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`ANCHOR_GROUP_LEVELING_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (ANCHOR_GROUP_LEVELING_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_anchor_group_level_"),
  )) throw new Error("ANCHOR_GROUP_LEVELING_CATALOG_SCOPE_LEAK");
}

export const BELT_LEVELING_CATALOG_SCOPE_AUDIT = Object.freeze(
  BELT_LEVELING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "LEVEL_AND_STRIKE_OFF_MONOLITHIC_BELT_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [BELT_LEVELING_SOURCE_ID],
    calculationInputs: [
      "объём и площадь поверхности",
      "прямые трудозатраты",
      "применимость и количество направляющих",
      "применимость и машино-время оборудования",
      "контроль и логистика",
    ],
    optionalDocumentaryInputs: [
      "ссылки на смесь, отметки, уклоны и ровность",
      "название способа и технологическая карта",
      "обозначения направляющих и оборудования",
      "план контроля и маршрут мобилизации",
    ],
    excludedLegacyComponents: ["товарный бетон", "арматура", "опалубка"],
    domainOwner: "belt-leveling",
    remainingGap: null,
    status: "READY_SHARED_ACI_302_LEVELING_GRAPH" as const,
  })),
);

export function assertBeltLevelingCatalogScopeAudit(): void {
  const catalogIds = BELT_LEVELING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 7 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`BELT_LEVELING_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (BELT_LEVELING_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_belt_level_"),
  )) throw new Error("BELT_LEVELING_CATALOG_SCOPE_LEAK");
}

export const COLUMN_BASE_LEVELING_CATALOG_SCOPE_AUDIT = Object.freeze(
  COLUMN_BASE_LEVELING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "LEVEL_AND_STRIKE_OFF_COLUMN_BASE_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [COLUMN_BASE_LEVELING_SOURCE_ID],
    excludedLegacyComponents: ["новая поставка бетона", "арматура", "опалубка"],
    domainOwner: "column-base-leveling",
    status: "READY_SHARED_ACI_302_LEVELING_GRAPH" as const,
  })),
);

export function assertColumnBaseLevelingCatalogScopeAudit(): void {
  const ids = COLUMN_BASE_LEVELING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`COLUMN_BASE_LEVELING_CATALOG_SHAPE:${ids.length}`);
  }
  if (COLUMN_BASE_LEVELING_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_column_base_level_"),
  )) throw new Error("COLUMN_BASE_LEVELING_CATALOG_SCOPE_LEAK");
}

/** `pedestal_level_*` is leveling of already placed fresh pedestal concrete. */
export const PEDESTAL_LEVELING_CATALOG_SCOPE_AUDIT = Object.freeze(
  PEDESTAL_LEVELING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "LEVEL_AND_STRIKE_OFF_FRESH_PEDESTAL_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PEDESTAL_LEVELING_SOURCE_ID],
    calculationInputs: [
      "объём и площадь выравниваемой поверхности",
      "прямые трудозатраты и машино-время выбранной проектом технологии",
      "прямые количества направляющих, контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь", "место работ", "обозначение технологической карты",
      "план контроля", "обозначение оборудования", "маршрут мобилизации",
    ],
    excludedLegacyComponents: ["новая поставка бетона", "арматура", "опалубка"],
    domainOwner: "pedestal-leveling",
    remainingGap: null,
    status: "READY_SHARED_ACI_302_LEVELING_GRAPH" as const,
  })),
);

export function assertPedestalLevelingCatalogScopeAudit(): void {
  const ids = PEDESTAL_LEVELING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`PEDESTAL_LEVELING_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pedestal_level_"))) {
    throw new Error("PEDESTAL_LEVELING_CATALOG_SCOPE_LEAK");
  }
}

/** `pile_cap_level_*` levels already placed fresh pile-cap concrete. */
export const PILE_CAP_LEVELING_CATALOG_SCOPE_AUDIT = Object.freeze(
  PILE_CAP_LEVELING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "LEVEL_AND_STRIKE_OFF_FRESH_PILE_CAP_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PILE_CAP_LEVELING_SOURCE_ID],
    calculationInputs: [
      "direct leveled volume and surface area",
      "selected leveling method and direct labor and equipment time",
      "direct selected guide, survey and logistics quantities",
    ],
    optionalDocumentaryInputs: [
      "mix, elevation, flatness, method-statement and quality-plan references",
    ],
    excludedLegacyComponents: ["new ready-mix delivery", "reinforcement", "formwork"],
    domainOwner: "pile-cap-leveling",
    remainingGap: null,
    status: "READY_SHARED_ACI_302_LEVELING_GRAPH" as const,
  })),
);

export function assertPileCapLevelingCatalogScopeAudit(): void {
  const ids = PILE_CAP_LEVELING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`PILE_CAP_LEVELING_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pile_cap_level_"))) {
    throw new Error("PILE_CAP_LEVELING_CATALOG_SCOPE_LEAK");
  }
}

export const ANCHOR_GROUP_VIBRATION_CATALOG_SCOPE_AUDIT = Object.freeze(
  ANCHOR_GROUP_VIBRATION_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "INTERNAL_VIBRATION_OF_FRESH_ANCHOR_GROUP_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [ANCHOR_GROUP_VIBRATION_SOURCE_ID],
    calculationInputs: [
      "объём уплотняемой смеси",
      "трудозатраты",
      "машино-время глубинного вибратора",
      "контроль и применимая мобилизация",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь и место укладки",
      "технологическая карта и ведомость оборудования",
      "план контроля и маршрут мобилизации",
    ],
    excludedLegacyComponents: ["поставка бетона", "арматура", "опалубка"],
    domainOwner: "anchor-group-vibration",
    remainingGap: null,
    status: "READY_SHARED_ACI_309_VIBRATION_GRAPH" as const,
  })),
);

export function assertAnchorGroupVibrationCatalogScopeAudit(): void {
  const catalogIds = ANCHOR_GROUP_VIBRATION_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 7 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`ANCHOR_GROUP_VIBRATION_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (ANCHOR_GROUP_VIBRATION_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_anchor_group_vibrate_"),
  )) throw new Error("ANCHOR_GROUP_VIBRATION_CATALOG_SCOPE_LEAK");
}

export const BELT_VIBRATION_CATALOG_SCOPE_AUDIT = Object.freeze(
  BELT_VIBRATION_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "INTERNAL_VIBRATION_OF_FRESH_MONOLITHIC_BELT_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [BELT_VIBRATION_SOURCE_ID],
    excludedLegacyComponents: ["товарный бетон", "арматура", "опалубка"],
    domainOwner: "belt-vibration",
    remainingGap: null,
    status: "READY_SHARED_ACI_309_VIBRATION_GRAPH" as const,
  })),
);

export function assertBeltVibrationCatalogScopeAudit(): void {
  const ids = BELT_VIBRATION_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) throw new Error(`BELT_VIBRATION_CATALOG_SHAPE:${ids.length}`);
  if (ids.some((id) => !id.includes("_belt_vibrate_"))) throw new Error("BELT_VIBRATION_CATALOG_SCOPE_LEAK");
}

export const COLUMN_BASE_VIBRATION_CATALOG_SCOPE_AUDIT = Object.freeze(
  COLUMN_BASE_VIBRATION_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId, contextKey: target.contextKey, titleRu: target.titleRu,
    promisedOperation: "INTERNAL_VIBRATION_OF_FRESH_COLUMN_BASE_CONCRETE" as const,
    primaryUnitId: "m3" as const, applicableSourceIds: [COLUMN_BASE_VIBRATION_SOURCE_ID],
    excludedLegacyComponents: ["новая поставка бетона", "арматура", "опалубка"],
    domainOwner: "column-base-vibration", status: "READY_SHARED_ACI_309_VIBRATION_GRAPH" as const,
  })),
);
export function assertColumnBaseVibrationCatalogScopeAudit(): void {
  const ids = COLUMN_BASE_VIBRATION_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) throw new Error(`COLUMN_BASE_VIBRATION_CATALOG_SHAPE:${ids.length}`);
  if (ids.some((id) => !id.includes("_column_base_vibrate_"))) throw new Error("COLUMN_BASE_VIBRATION_CATALOG_SCOPE_LEAK");
}

/** `pedestal_vibrate_*` is internal vibration of already placed fresh pedestal concrete. */
export const PEDESTAL_VIBRATION_CATALOG_SCOPE_AUDIT = Object.freeze(
  PEDESTAL_VIBRATION_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "INTERNAL_VIBRATION_OF_FRESH_PEDESTAL_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PEDESTAL_VIBRATION_SOURCE_ID],
    calculationInputs: [
      "объём уплотняемого бетона",
      "прямые трудозатраты и машино-время глубинного вибратора",
      "прямые количества контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь", "место работ", "обозначение технологической карты",
      "план контроля", "ведомость оборудования", "маршрут мобилизации",
    ],
    excludedLegacyComponents: ["новая поставка бетона", "арматура", "опалубка"],
    domainOwner: "pedestal-vibration",
    remainingGap: null,
    status: "READY_SHARED_ACI_309_VIBRATION_GRAPH" as const,
  })),
);

export function assertPedestalVibrationCatalogScopeAudit(): void {
  const ids = PEDESTAL_VIBRATION_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`PEDESTAL_VIBRATION_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pedestal_vibrate_"))) {
    throw new Error("PEDESTAL_VIBRATION_CATALOG_SCOPE_LEAK");
  }
}

/** `pile_cap_vibrate_*` is internal vibration of fresh pile-cap concrete. */
export const PILE_CAP_VIBRATION_CATALOG_SCOPE_AUDIT = Object.freeze(
  PILE_CAP_VIBRATION_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "INTERNAL_VIBRATION_OF_FRESH_PILE_CAP_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PILE_CAP_VIBRATION_SOURCE_ID],
    calculationInputs: [
      "direct concrete volume for internal vibration",
      "approved consolidation method and direct labor and machine hours",
      "direct quality-control and equipment-logistics quantities",
    ],
    optionalDocumentaryInputs: [
      "mix, method-statement, equipment-schedule and quality-plan references",
    ],
    excludedLegacyComponents: ["ready-mix concrete", "reinforcement", "formwork"],
    domainOwner: "pile-cap-vibration",
    remainingGap: null,
    status: "READY_SHARED_ACI_309_INTERNAL_VIBRATION_GRAPH" as const,
  })),
);

export function assertPileCapVibrationCatalogScopeAudit(): void {
  const ids = PILE_CAP_VIBRATION_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`PILE_CAP_VIBRATION_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pile_cap_vibrate_"))) {
    throw new Error("PILE_CAP_VIBRATION_CATALOG_SCOPE_LEAK");
  }
}

/**
 * `anchor_group_repair_*` does not prove that every record is only a concrete
 * patch or only a hardware replacement. The selected repair scope therefore
 * gates both branches while shared assessment remains present for every ID.
 */
export const ANCHOR_GROUP_REPAIR_CATALOG_SCOPE_AUDIT = Object.freeze(
  ANCHOR_GROUP_REPAIR_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "ASSESS_AND_REPAIR_EXISTING_ANCHOR_GROUP_SYSTEM" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [ANCHOR_GROUP_REPAIR_SOURCE_ID],
    requiredScopeSelector: {
      parameterId: "anchor_group_repair_scope_mode",
      allowedValues: [...ANCHOR_GROUP_REPAIR_SCOPE_MODES],
    },
    calculationInputs: [
      "объём основания анкерной группы в границе ремонта",
      "обследование и фиксация границ ремонта",
      "прямые проектные количества только для выбранной бетонной ветви",
      "прямые проектные количества только для выбранной анкерной ветви",
    ],
    optionalDocumentaryInputs: [
      "ссылки на обследование, проект и технологическую карту",
      "обозначения ремонтных материалов и анкерных компонентов",
      "планы контроля и маршруты обращения с отходами",
    ],
    excludedLegacyComponents: [
      "автоматическая поставка нового товарного бетона на весь объём",
      "автоматическая арматура",
      "автоматическая опалубка",
      "неподтверждённая универсальная производительность ремонта анкеров",
    ],
    domainOwner: "anchor-group-repair",
    remainingGap: null,
    status: "READY_SCOPE_GATED_ACI_562_REPAIR_GRAPH" as const,
  })),
);

export function assertAnchorGroupRepairCatalogScopeAudit(): void {
  const catalogIds = ANCHOR_GROUP_REPAIR_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 7 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`ANCHOR_GROUP_REPAIR_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (ANCHOR_GROUP_REPAIR_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_anchor_group_repair_"),
  )) throw new Error("ANCHOR_GROUP_REPAIR_CATALOG_SCOPE_LEAK");
}

export const BELT_REPAIR_CATALOG_SCOPE_AUDIT = Object.freeze(
  BELT_REPAIR_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "REPAIR_EXISTING_MONOLITHIC_BELT_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [BELT_REPAIR_SOURCE_ID],
    calculationInputs: [
      "объём и площадь подтверждённой границы ремонта",
      "прямые количества ремонтных материалов",
      "прямые трудозатраты и машино-время",
      "прямые количества контроля, доставки и отходов",
    ],
    optionalDocumentaryInputs: [
      "ссылки на обследование, проект и технологическую карту",
      "обозначения ремонтных материалов и оборудования",
      "план контроля и маршрут обращения с отходами",
    ],
    excludedLegacyComponents: [
      "автоматическая поставка нового товарного бетона на весь объём",
      "автоматическая арматура",
      "автоматическая опалубка",
      "неподтверждённые универсальные нормы расхода и производительности",
    ],
    domainOwner: "belt-repair",
    remainingGap: null,
    status: "READY_SHARED_ACI_562_546_REPAIR_GRAPH" as const,
  })),
);

export function assertBeltRepairCatalogScopeAudit(): void {
  const catalogIds = BELT_REPAIR_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 7 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`BELT_REPAIR_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (BELT_REPAIR_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_belt_repair_"),
  )) throw new Error("BELT_REPAIR_CATALOG_SCOPE_LEAK");
}

export const COLUMN_BASE_REPAIR_CATALOG_SCOPE_AUDIT = Object.freeze(
  COLUMN_BASE_REPAIR_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "ASSESSMENT_LED_REPAIR_OF_EXISTING_COLUMN_BASE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [COLUMN_BASE_REPAIR_SOURCE_ID],
    excludedLegacyComponents: ["новая поставка товарного бетона", "опалубка полного элемента"],
    domainOwner: "column-base-repair",
    status: "READY_SHARED_ACI_562_546_REPAIR_GRAPH" as const,
  })),
);

export function assertColumnBaseRepairCatalogScopeAudit(): void {
  const ids = COLUMN_BASE_REPAIR_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`COLUMN_BASE_REPAIR_CATALOG_SHAPE:${ids.length}`);
  }
  if (COLUMN_BASE_REPAIR_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_column_base_repair_"),
  )) throw new Error("COLUMN_BASE_REPAIR_CATALOG_SCOPE_LEAK");
}

/** `pedestal_repair_*` is repair of existing pedestal concrete, not anchor hardware. */
export const PEDESTAL_REPAIR_CATALOG_SCOPE_AUDIT = Object.freeze(
  PEDESTAL_REPAIR_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "ASSESSMENT_LED_REPAIR_OF_EXISTING_CONCRETE_PEDESTAL" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PEDESTAL_REPAIR_SOURCE_ID],
    calculationInputs: [
      "границы и объём ремонта",
      "утверждённая технология и ремонтный материал",
      "прямые количества материалов, труда, оборудования, контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на обследование", "ссылка на проект", "технологическая карта",
      "план контроля качества",
    ],
    excludedLegacyComponents: [
      "новая поставка товарного бетона", "опалубка полного элемента", "ремонт анкерной оснастки",
    ],
    domainOwner: "pedestal-repair",
    remainingGap: null,
    status: "READY_SHARED_ACI_562_546_REPAIR_GRAPH" as const,
  })),
);

export function assertPedestalRepairCatalogScopeAudit(): void {
  const ids = PEDESTAL_REPAIR_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`PEDESTAL_REPAIR_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pedestal_repair_"))) {
    throw new Error("PEDESTAL_REPAIR_CATALOG_SCOPE_LEAK");
  }
}

/** `pile_cap_repair_*` repairs existing structural concrete, not anchor hardware. */
export const PILE_CAP_REPAIR_CATALOG_SCOPE_AUDIT = Object.freeze(
  PILE_CAP_REPAIR_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "REPAIR_EXISTING_CONCRETE_PILE_CAP" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PILE_CAP_REPAIR_SOURCE_ID],
    calculationInputs: [
      "condition-defined concrete repair volume and area",
      "selected repair method and material system",
      "direct preparation, placement, equipment, quality and logistics quantities",
    ],
    optionalDocumentaryInputs: [
      "condition assessment, repair design, method statement and quality plan references",
    ],
    excludedLegacyComponents: ["ready-mix placement", "anchor hardware repair", "formwork"],
    domainOwner: "pile-cap-repair",
    remainingGap: null,
    status: "READY_SHARED_ACI_562_546_REPAIR_GRAPH" as const,
  })),
);

export function assertPileCapRepairCatalogScopeAudit(): void {
  const ids = PILE_CAP_REPAIR_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 7 || new Set(ids).size !== ids.length) {
    throw new Error(`PILE_CAP_REPAIR_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pile_cap_repair_"))) {
    throw new Error("PILE_CAP_REPAIR_CATALOG_SCOPE_LEAK");
  }
}

export const BELT_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT = Object.freeze(
  BELT_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "PLACE_AND_FIX_PROJECT_SPECIFIED_BELT_EMBEDDED_ITEMS_BEFORE_CONCRETING" as const,
    primaryUnitId: "piece" as const,
    applicableSourceIds: [BELT_EMBEDDED_ITEMS_SOURCE_ID],
    calculationInputs: [
      "количество и масса закладных по проектной ведомости",
      "прямые трудозатраты разбивки, установки и фиксации",
      "прямые количества только явно применимых сварки, опор, подъёма, геодезии и покрытия",
      "освидетельствование и логистика по прямой ведомости",
    ],
    optionalDocumentaryInputs: [
      "ссылки на проект, ведомость, план расположения и допуски",
      "обозначения изделий, сварочных материалов, опор, техники и покрытия",
      "технологическая карта и маршрут мобилизации",
    ],
    excludedLegacyComponents: ["товарный бетон", "арматура", "опалубка"],
    domainOwner: "belt-embedded-items",
    remainingGap: null,
    status: "READY_SHARED_ACI_301_117_EMBEDDED_ITEMS_GRAPH" as const,
  })),
);

export function assertBeltEmbeddedItemsCatalogScopeAudit(): void {
  const catalogIds = BELT_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (catalogIds.length !== 6 || new Set(catalogIds).size !== catalogIds.length) {
    throw new Error(`BELT_EMBEDDED_ITEMS_CATALOG_SHAPE:${catalogIds.length}`);
  }
  if (BELT_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT.some(
    (row) => !row.catalogId.includes("_belt_anchor_"),
  )) throw new Error("BELT_EMBEDDED_ITEMS_CATALOG_SCOPE_LEAK");
}

export const COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT = Object.freeze(
  COLUMN_BASE_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "PLACE_AND_FIX_PROJECT_SPECIFIED_COLUMN_BASE_EMBEDDED_ITEMS_BEFORE_CONCRETING" as const,
    primaryUnitId: "piece" as const,
    applicableSourceIds: [COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID],
    calculationInputs: [
      "количество и масса закладных по проектной ведомости",
      "прямые трудозатраты разбивки, установки и фиксации",
      "прямые количества применимых сварки, опор, подъёма, геодезии и покрытия",
      "контроль и логистика по прямой ведомости",
    ],
    optionalDocumentaryInputs: [
      "ссылки на проект, ведомость, план расположения и допуски",
      "обозначения изделий, материалов и оборудования",
      "технологическая карта и маршрут мобилизации",
    ],
    excludedLegacyComponents: ["товарный бетон", "арматура", "опалубка"],
    domainOwner: "column-base-embedded-items",
    remainingGap: null,
    status: "READY_SHARED_ACI_301_117_EMBEDDED_ITEMS_GRAPH" as const,
  })),
);

export function assertColumnBaseEmbeddedItemsCatalogScopeAudit(): void {
  const ids = COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 6 || new Set(ids).size !== ids.length) {
    throw new Error(`COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_column_base_anchor_"))) {
    throw new Error("COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_SCOPE_LEAK");
  }
}

export const PEDESTAL_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT = Object.freeze(
  PEDESTAL_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId, contextKey: target.contextKey, titleRu: target.titleRu,
    promisedOperation: "PLACE_AND_FIX_PEDESTAL_EMBEDDED_ITEMS_BEFORE_CONCRETING" as const,
    primaryUnitId: "piece" as const, applicableSourceIds: [PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID],
    excludedLegacyComponents: ["товарный бетон", "арматура", "опалубка"],
    domainOwner: "pedestal-embedded-items", status: "READY_SHARED_ACI_301_117_EMBEDDED_ITEMS_GRAPH" as const,
  })),
);
export function assertPedestalEmbeddedItemsCatalogScopeAudit(): void {
  const ids = PEDESTAL_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 6 || new Set(ids).size !== ids.length) throw new Error(`PEDESTAL_EMBEDDED_ITEMS_CATALOG_SHAPE:${ids.length}`);
  if (ids.some((id) => !id.includes("_pedestal_anchor_"))) throw new Error("PEDESTAL_EMBEDDED_ITEMS_CATALOG_SCOPE_LEAK");
}

/** `pile_cap_anchor_*` positions project-specified pile-cap embedded items before concreting. */
export const PILE_CAP_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT = Object.freeze(
  PILE_CAP_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "PLACE_AND_FIX_PROJECT_SPECIFIED_PILE_CAP_EMBEDDED_ITEMS_BEFORE_CONCRETING" as const,
    primaryUnitId: "piece" as const,
    applicableSourceIds: [PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID],
    calculationInputs: [
      "project embedded-item count and mass",
      "direct positioning, installation and fixing labor",
      "direct selected welding, temporary support, lifting, survey and coating quantities",
      "direct inspection and logistics quantities",
    ],
    optionalDocumentaryInputs: [
      "approved design, schedule, placement drawing, tolerance and method-statement references",
    ],
    excludedLegacyComponents: ["ready-mix concrete", "reinforcement", "formwork"],
    domainOwner: "pile-cap-embedded-items",
    remainingGap: null,
    status: "READY_SHARED_ACI_301_117_EMBEDDED_ITEMS_GRAPH" as const,
  })),
);

export function assertPileCapEmbeddedItemsCatalogScopeAudit(): void {
  const ids = PILE_CAP_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 6 || new Set(ids).size !== ids.length) {
    throw new Error(`PILE_CAP_EMBEDDED_ITEMS_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pile_cap_anchor_"))) {
    throw new Error("PILE_CAP_EMBEDDED_ITEMS_CATALOG_SCOPE_LEAK");
  }
}

/** `formwork_anchor_*` positions project-specified embedded items associated with formwork. */
export const FORMWORK_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT = Object.freeze(
  FORMWORK_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation:
      "PLACE_AND_FIX_PROJECT_SPECIFIED_FORMWORK_EMBEDDED_ITEMS_BEFORE_CONCRETING" as const,
    primaryUnitId: "piece" as const,
    applicableSourceIds: [FORMWORK_EMBEDDED_ITEMS_SOURCE_ID],
    calculationInputs: [
      "количество и масса закладных по проектной ведомости",
      "прямые трудозатраты разбивки, установки и фиксации",
      "прямые количества выбранных сварки, опор, подъёма, геодезии и покрытия",
      "прямые количества освидетельствования и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылки на проект, ведомость, план расположения, допуски и технологическую карту",
    ],
    excludedLegacyComponents: [
      "товарный бетон",
      "арматура",
      "полный комплект монтажа опалубочной системы",
    ],
    domainOwner: "formwork-embedded-items",
    remainingGap: null,
    status: "READY_SHARED_ACI_301_117_EMBEDDED_ITEMS_GRAPH" as const,
  })),
);

export function assertFormworkEmbeddedItemsCatalogScopeAudit(): void {
  const ids = FORMWORK_EMBEDDED_ITEMS_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 6 || new Set(ids).size !== ids.length) {
    throw new Error(`FORMWORK_EMBEDDED_ITEMS_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_formwork_anchor_"))) {
    throw new Error("FORMWORK_EMBEDDED_ITEMS_CATALOG_SCOPE_LEAK");
  }
}

/** `pile_cap_cure_*` is curing of already placed pile-cap concrete. */
export const PILE_CAP_CURING_CATALOG_SCOPE_AUDIT = Object.freeze(
  PILE_CAP_CURING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "EXTERNAL_CURING_OF_PILE_CAP_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PILE_CAP_CURING_SOURCE_ID],
    calculationInputs: [
      "direct cured concrete volume and exposed surface area",
      "selected curing method and direct duration and labor",
      "selected curing materials and equipment with direct quantities",
      "direct inspection and equipment logistics quantities",
    ],
    optionalDocumentaryInputs: [
      "concrete mix, curing method statement and quality plan references",
    ],
    excludedLegacyComponents: ["ready-mix concrete", "reinforcement", "formwork"],
    domainOwner: "pile-cap-curing",
    remainingGap: null,
    status: "READY_SHARED_ACI_308_CURING_GRAPH" as const,
  })),
);

export function assertPileCapCuringCatalogScopeAudit(): void {
  const ids = PILE_CAP_CURING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 6 || new Set(ids).size !== ids.length) {
    throw new Error(`PILE_CAP_CURING_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pile_cap_cure_"))) {
    throw new Error("PILE_CAP_CURING_CATALOG_SCOPE_LEAK");
  }
}

/** `pedestal_cure_*` is curing of already placed pedestal concrete. */
export const PEDESTAL_CURING_CATALOG_SCOPE_AUDIT = Object.freeze(
  PEDESTAL_CURING_TARGETS.map((target) => Object.freeze({
    catalogId: target.catalogId,
    contextKey: target.contextKey,
    titleRu: target.titleRu,
    promisedOperation: "EXTERNAL_CURING_OF_PEDESTAL_CONCRETE" as const,
    primaryUnitId: "m3" as const,
    applicableSourceIds: [PEDESTAL_CURING_SOURCE_ID],
    calculationInputs: [
      "объём и открытая площадь в границе ухода",
      "утверждённый способ ухода",
      "прямые количества материалов, труда, техники, контроля и логистики",
    ],
    optionalDocumentaryInputs: [
      "ссылка на смесь", "технологическая карта", "обозначение материала",
      "план контроля", "маршрут мобилизации",
    ],
    excludedLegacyComponents: ["новая поставка и укладка товарного бетона", "арматура", "опалубка"],
    domainOwner: "pedestal-curing",
    remainingGap: null,
    status: "READY_SHARED_ACI_308_CURING_GRAPH" as const,
  })),
);

export function assertPedestalCuringCatalogScopeAudit(): void {
  const ids = PEDESTAL_CURING_CATALOG_SCOPE_AUDIT.map((row) => row.catalogId);
  if (ids.length !== 6 || new Set(ids).size !== ids.length) {
    throw new Error(`PEDESTAL_CURING_CATALOG_SHAPE:${ids.length}`);
  }
  if (ids.some((id) => !id.includes("_pedestal_cure_"))) {
    throw new Error("PEDESTAL_CURING_CATALOG_SCOPE_LEAK");
  }
}
