export const AI_GOLDEN_PROCUREMENT_DATA = {
  may2026Total: 14,
  statuses: {
    approved: 8,
    pending: 3,
    revision: 2,
    closed: 1,
  },
  byObject: {
    "Дом 1": 10,
    "Дом 2": 4,
  },
  byFloor: {
    "1": 7,
    "2": 3,
    unlinked: 4,
  },
  mainRequest: {
    id: "req_124",
    number: 124,
    authorRole: "прораб",
    objectId: "object_dom_1",
    objectRu: "Дом 1",
    floor: 1,
    workId: "work_31",
    workRu: "ГКЛ перегородки",
    materialId: "material_gkl_12_5",
    materialRu: "ГКЛ 12.5 мм",
    requiredSheets: 80,
    statusRu: "утверждена директором",
    approvedByRu: "директор",
  },
} as const;
