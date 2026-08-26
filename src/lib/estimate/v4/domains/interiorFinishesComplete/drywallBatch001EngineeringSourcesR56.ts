import {
  BATCH002_ENGINEERING_SOURCES_R4,
  type Batch002EngineeringSourceR4,
} from "./drywallBatch002EngineeringSourcesR4";
import type {
  DrywallCeilingBulkheadProfessionalGroupV3,
  DrywallCeilingBulkheadProfessionalVariantV3,
} from "./drywallCeilingBulkheadProfessionalV3";

export type Batch001EngineeringSourceR56 = Omit<Batch002EngineeringSourceR4, "checkedAt"> & {
  checkedAt: "2026-08-19" | "2026-08-20";
};

const KRER_10_05_011: Batch001EngineeringSourceR56 = Object.freeze({
  sourceId: "KG_KRER_10_05_011",
  title: "КРЕР 10-05-011 — подвесные потолки и облицовочные системы",
  publisher: "Уполномоченный орган сметного нормирования Кыргызской Республики",
  editionOrDate: "действующая редакция, связанная с исходным нормативным паспортом BATCH-001",
  url: null,
  exactLocator: "таблица 10-05-011-01/02; индивидуальный точный локатор хранится у каждой ресурсной строки",
  confirms: [
    "ресурсный состав потолочной системы",
    "измеритель и состав физических монтажных операций",
    "раздельную трассировку материалов, работ и доставки",
  ],
  checkedAt: "2026-08-20",
  applicabilityRu: "Используется только вместе с точным локатором ресурсной строки; проектные типы, раскладка и нормы производителя не подменяются усреднённым значением.",
  authoritativeReplayRequired: false,
});

const SHARED_SOURCE_BY_ID = new Map<string, Batch001EngineeringSourceR56>(
  BATCH002_ENGINEERING_SOURCES_R4.map((source) => [source.sourceId, source]),
);
SHARED_SOURCE_BY_ID.set(KRER_10_05_011.sourceId, KRER_10_05_011);

export function batch001EngineeringSourceIdsR56(input: {
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  variant: DrywallCeilingBulkheadProfessionalVariantV3;
  normativeSourceId?: string;
}): readonly string[] {
  const ids = new Set<string>([
    "KG_SP_KR_65_101_2025",
    "KG_KRER_10_05_011",
    "KNAUF_SYSTEMS_PLUS_PLASTERBOARD_2024",
  ]);
  if (input.normativeSourceId) ids.add(input.normativeSourceId);
  if (input.group === "CLAD") ids.add("KNAUF_PAPER_TAPE_JOINTING_2025");
  if (input.variant === "wet_zone") ids.add("KNAUF_MOISTURE_RESISTANT_BOARD_TDS_2023");
  return [...ids];
}

export function resolveBatch001EngineeringSourcesR56(
  sourceIds: readonly string[],
): readonly Batch001EngineeringSourceR56[] {
  return sourceIds.map((sourceId) => {
    const source = SHARED_SOURCE_BY_ID.get(sourceId);
    if (!source) throw new Error(`BATCH001_R56_ENGINEERING_SOURCE_MISSING:${sourceId}`);
    return source;
  });
}
