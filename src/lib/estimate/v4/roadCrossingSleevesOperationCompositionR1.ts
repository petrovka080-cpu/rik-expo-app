import type { CanonicalEstimateOperationReference } from "../backendPlatform/canonicalEstimateOperationComposition";
import { ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1 } from "./roadCrossingSleevesComponentsR1";

const completion: Readonly<Record<string, string>> = {
  preparation: "Площадка подготовлена, доступ и выбранная организация движения обеспечены; разбивка подтверждена.",
  installation: "Котлованы, крепление и упор выполнены по подтверждённому решению; футляр установлен выбранным методом.",
  bedding: "Применимое основание выполнено выбранным материалом с подтверждённой толщиной и уплотнением.",
  casing: "Футляр собран, стыки выполнены и проверены; предусмотренное покрытие восстановлено.",
  carrier_and_supports: "Рабочая труба соединена и установлена с совместимыми опорами и концевыми узлами; предусмотренное испытание выполнено.",
  internal_fill: "Применимое внутреннее заполнение размещено с предусмотренными удержанием, выдержкой и контролем.",
  backfill: "Применимая обратная засыпка выполнена и уплотнена по подтверждённой конструкции.",
  completion: "Предусмотренное восстановление завершено; техника, пригодные остатки и отходы переданы по подтверждённым границам.",
};

/** Exact existing stage/resource IDs, never title matching or a new resource norm. */
export const ROAD_CROSSING_SLEEVES_OPERATION_BY_ROW_R1: ReadonlyMap<string, CanonicalEstimateOperationReference> = new Map(
  ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1.flatMap(stage => stage.ownResourceIds.map(rowId => [rowId, {
    contractVersion: "canonical-operation-resource/v1" as const, groupId: "road-crossing-sleeves",
    groupTitleRu: "Строительство перехода продавливанием", operationId: stage.stageId,
    operationTitleRu: stage.titleRu, completionCriterionRu: completion[stage.stageId],
  }] as const)),
);
