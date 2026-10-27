export const FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone" as const;
export const FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID =
  "standard-profile:doka-frami-xlife:foundation-project-kit:2023-11" as const;
export const FORMWORK_FRAMI_XLIFE_SOURCE_ID =
  "src_manufacturer_doka_frami_xlife_foundation_999810202_2023_11" as const;
export const FORMWORK_FRAMI_XLIFE_SOURCE_PACK_SHA256 =
  "f65a2f09b226bf662db7c9e046e27779bbb4fcbcc26e50c3eb1e7b50d91eadd7" as const;
export const FORMWORK_FRAMI_XLIFE_TITLE_RU =
  "Съёмная опалубка ростверка Doka Frami Xlife по утверждённой проектной раскладке" as const;

export const FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_standard",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_high_load",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_repair",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife на участке ремонта",
    contextRu: "участок ремонта",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_technical_room",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife в технической зоне",
    contextRu: "техническая зона",
  },
  {
    contextKey: "wet_zone",
    catalogId: FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID,
    titleRu: FORMWORK_FRAMI_XLIFE_TITLE_RU,
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifePileCapContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_standard",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_high_load",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_repair",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife при локальном ремонте основания",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_technical_room",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_wet_zone",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeStripFoundationContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_standard",
    titleRu: "Съёмная опалубка периметральных рёбер плитного фундамента Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_high_load",
    titleRu: "Съёмная опалубка периметральных рёбер плитного фундамента Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_repair",
    titleRu: "Съёмная опалубка периметральных рёбер плитного фундамента Doka Frami Xlife при локальном ремонте основания",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_technical_room",
    titleRu: "Съёмная опалубка периметральных рёбер плитного фундамента Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_wet_zone",
    titleRu: "Съёмная опалубка периметральных рёбер плитного фундамента Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeSlabFoundationContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
    titleRu: "Съёмная щитовая опалубка Doka Frami Xlife для фундаментных стен в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_high_load",
    titleRu: "Съёмная щитовая опалубка Doka Frami Xlife для фундаментных стен в зоне высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_repair",
    titleRu: "Съёмная щитовая опалубка Doka Frami Xlife для фундаментных стен при локальном ремонте",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_technical_room",
    titleRu: "Съёмная щитовая опалубка Doka Frami Xlife для фундаментных стен в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_wet_zone",
    titleRu: "Съёмная щитовая опалубка Doka Frami Xlife для фундаментных стен во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeGeneralFoundationContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_ANCHOR_GROUP_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_form_standard",
    titleRu: "Съёмная опалубка основания анкерной группы Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_form_high_load",
    titleRu: "Съёмная опалубка основания анкерной группы Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_form_repair",
    titleRu: "Съёмная опалубка основания анкерной группы Doka Frami Xlife на участке ремонта",
    contextRu: "участок ремонта",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_form_technical_room",
    titleRu: "Съёмная опалубка основания анкерной группы Doka Frami Xlife в технической зоне",
    contextRu: "техническая зона",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_form_wet_zone",
    titleRu: "Съёмная опалубка основания анкерной группы Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeAnchorGroupContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_ANCHOR_GROUP_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_BELT_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_standard",
    titleRu: "Съёмная опалубка монолитного пояса Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_high_load",
    titleRu: "Съёмная опалубка монолитного пояса Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_repair",
    titleRu: "Съёмная опалубка монолитного пояса Doka Frami Xlife при локальном ремонте",
    contextRu: "локальный ремонт",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_technical_room",
    titleRu: "Съёмная опалубка монолитного пояса Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_wet_zone",
    titleRu: "Съёмная опалубка монолитного пояса Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeBeltContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_BELT_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_COLUMN_BASE_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_form_standard",
    titleRu: "Съёмная опалубка столбчатого железобетонного основания Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_form_high_load",
    titleRu: "Съёмная опалубка столбчатого железобетонного основания Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_form_repair",
    titleRu: "Съёмная опалубка столбчатого железобетонного основания Doka Frami Xlife при локальном ремонте",
    contextRu: "локальный ремонт",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_form_technical_room",
    titleRu: "Съёмная опалубка столбчатого железобетонного основания Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_column_base_form_wet_zone",
    titleRu: "Съёмная опалубка столбчатого железобетонного основания Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeColumnBaseContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_COLUMN_BASE_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_PEDESTAL_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_form_standard",
    titleRu: "Съёмная щитовая опалубка монолитного железобетонного пьедестала Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_form_high_load",
    titleRu: "Съёмная щитовая опалубка монолитного железобетонного пьедестала Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_form_repair",
    titleRu: "Съёмная щитовая опалубка монолитного железобетонного пьедестала Doka Frami Xlife при локальном ремонте",
    contextRu: "локальный ремонт",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_form_technical_room",
    titleRu: "Съёмная щитовая опалубка монолитного железобетонного пьедестала Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_form_wet_zone",
    titleRu: "Съёмная щитовая опалубка монолитного железобетонного пьедестала Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifePedestalContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_PEDESTAL_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS = Object.freeze([
  ...FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_ANCHOR_GROUP_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_BELT_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_COLUMN_BASE_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_PEDESTAL_TARGETS,
] as const);

