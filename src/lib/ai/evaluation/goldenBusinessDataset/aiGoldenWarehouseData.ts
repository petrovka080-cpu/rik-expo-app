export const AI_GOLDEN_WAREHOUSE_DATA = {
  positionsTotal: 52,
  deficitsTotal: 4,
  firstFloorIssues: 8,
  gkl: {
    materialId: "material_gkl_12_5",
    nameRu: "ГКЛ 12.5 мм",
    requiredSheets: 80,
    issuedSheets: 20,
    remainingSheets: 0,
    shortageSheets: 60,
    issueId: "warehouse_issue_88",
    stockId: "warehouse_stock_gkl",
    receiverRu: "прораб",
  },
  profile: {
    issuedMeters: 80,
    remainingMeters: 40,
  },
  screws: {
    shortagePacks: 5,
  },
  tape: {
    shortageRolls: 10,
  },
} as const;
