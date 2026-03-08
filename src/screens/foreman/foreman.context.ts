export type LocatorEntityKind =
  | "floor"
  | "section"
  | "area"
  | "block"
  | "node"
  | "route_segment"
  | "none";

export type SemanticSource =
  | "floor_like"
  | "section_like"
  | "area_like"
  | "block_like"
  | "technical_node_like"
  | "zone_indoor"
  | "zone_industrial"
  | "zone_outdoor"
  | "zone_campus"
  | "zone_technical"
  | "zone_generic";

export type ObjectClass =
  | "multilevel_building"
  | "industrial_hall"
  | "open_site"
  | "campus_block"
  | "technical_facility"
  | "warehouse_complex"
  | "transport_terminal"
  | "linear_infrastructure"
  | "service_building"
  | "generic_object";

export interface EmptyStatePolicy {
  locatorPlaceholder: string;
  zonePlaceholder: string;
  summaryEmptyText: string;
}

export interface ContextConfig {
  objectClass: ObjectClass;
  localizationMode: "floor_based" | "section_based" | "area_based" | "route_based" | "none";
  locatorEntityKind: LocatorEntityKind;
  locatorLabel: string;
  zoneLabel: string;
  locatorSource: SemanticSource;
  zoneSource: SemanticSource;
  locatorRequired: boolean;
  zoneRequired: boolean;
  empty: EmptyStatePolicy;
  systemPriorityTags: string[];
}

export type ContextResolutionResult = {
  config: ContextConfig;
  resolvedBy: "object_type" | "name_fallback" | "default";
  confidence: "high" | "medium" | "low";
  warnings?: string[];
};

const COMMON_EMPTY = "—";

export const CLASS_TEMPLATES: Record<ObjectClass, ContextConfig> = {
  multilevel_building: {
    objectClass: "multilevel_building",
    localizationMode: "floor_based",
    locatorEntityKind: "floor",
    locatorLabel: "Этаж / Уровень",
    zoneLabel: "Детальное место (помещение / узел)",
    locatorSource: "floor_like",
    zoneSource: "zone_indoor",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— По всему зданию —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["ОТДЕЛ", "ИНЖ", "ЭЛЕКТР", "ОВ", "ВК", "ОКНА", "ПЕРЕГ"],
  },
  industrial_hall: {
    objectClass: "industrial_hall",
    localizationMode: "section_based",
    locatorEntityKind: "section",
    locatorLabel: "Секция / Блок",
    zoneLabel: "Участок внутри секции",
    locatorSource: "section_like",
    zoneSource: "zone_industrial",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь корпус —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["ФУНД", "КАРКАС", "СЭНДВИЧ", "ПРОМ", "НАРУЖ"],
  },
  open_site: {
    objectClass: "open_site",
    localizationMode: "area_based",
    locatorEntityKind: "area",
    locatorLabel: "Зона / Участок",
    zoneLabel: "Детальный участок",
    locatorSource: "area_like",
    zoneSource: "zone_outdoor",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Вся площадка —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["БЛАГО", "ЗЕМЛ", "ДОРОГ", "СЕТИ", "НАРУЖ"],
  },
  campus_block: {
    objectClass: "campus_block",
    localizationMode: "section_based",
    locatorEntityKind: "block",
    locatorLabel: "Блок / Корпус",
    zoneLabel: "Зона внутри блока",
    locatorSource: "block_like",
    zoneSource: "zone_campus",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь блок —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["МОДУЛ", "БЛОК", "ИНЖ", "ОТДЕЛ"],
  },
  technical_facility: {
    objectClass: "technical_facility",
    localizationMode: "section_based",
    locatorEntityKind: "node",
    locatorLabel: "Секция / Узел",
    zoneLabel: "Технологическая зона",
    locatorSource: "technical_node_like",
    zoneSource: "zone_technical",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь объект —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["ИНЖ", "ТЕХ", "ЭЛЕКТР", "ВК", "ОВ"],
  },
  warehouse_complex: {
    objectClass: "warehouse_complex",
    localizationMode: "section_based",
    locatorEntityKind: "section",
    locatorLabel: "Секция / Зона склада",
    zoneLabel: "Участок внутри секции",
    locatorSource: "section_like",
    zoneSource: "zone_industrial",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь склад —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["СКЛАД", "ЛОГИСТ", "ПОЛЫ", "КАРКАС", "НАРУЖ"],
  },
  transport_terminal: {
    objectClass: "transport_terminal",
    localizationMode: "section_based",
    locatorEntityKind: "section",
    locatorLabel: "Секция / Терминал",
    zoneLabel: "Функциональная зона",
    locatorSource: "section_like",
    zoneSource: "zone_generic",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь терминал —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["ИНЖ", "ОТДЕЛ", "СЛАБОТ", "ЭЛЕКТР"],
  },
  linear_infrastructure: {
    objectClass: "linear_infrastructure",
    localizationMode: "route_based",
    locatorEntityKind: "route_segment",
    locatorLabel: "Участок трассы",
    zoneLabel: "Узел / Точка",
    locatorSource: "area_like",
    zoneSource: "zone_outdoor",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь маршрут —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["СЕТИ", "ТРАСС", "ДОРОГ", "НАРУЖ"],
  },
  service_building: {
    objectClass: "service_building",
    localizationMode: "section_based",
    locatorEntityKind: "section",
    locatorLabel: "Секция / Блок",
    zoneLabel: "Детальное место",
    locatorSource: "section_like",
    zoneSource: "zone_generic",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— Весь объект —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: ["ИНЖ", "ОТДЕЛ", "ЭЛЕКТР"],
  },
  generic_object: {
    objectClass: "generic_object",
    localizationMode: "none",
    locatorEntityKind: "none",
    locatorLabel: "Локатор",
    zoneLabel: "Детальное место",
    locatorSource: "section_like",
    zoneSource: "zone_generic",
    locatorRequired: false,
    zoneRequired: false,
    empty: {
      locatorPlaceholder: "— По всему объекту —",
      zonePlaceholder: "— Без детализации —",
      summaryEmptyText: COMMON_EMPTY,
    },
    systemPriorityTags: [],
  },
};

