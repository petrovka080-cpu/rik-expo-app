import {
  FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS,
} from "../../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";

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
