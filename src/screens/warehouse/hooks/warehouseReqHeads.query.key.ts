/**
 * warehouseReqHeads.query.key — query key factory for warehouse request heads.
 *
 * P6.1b: Centralizes query key construction for warehouse req heads.
 */

export const warehouseReqHeadsKeys = {
  all: ["warehouse", "reqHeads"] as const,
  page: (pageSize: number) =>
    ["warehouse", "reqHeads", pageSize] as const,
} as const;
