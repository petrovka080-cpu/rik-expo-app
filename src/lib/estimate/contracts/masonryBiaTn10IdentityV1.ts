export const BIA_TN10_MASONRY_PRODUCT_PROFILE_ID = "standard-profile:bia-tn10:selected-table-4-fired-clay-brick:v1" as const;

export const MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID =
  "canonical-work:base:masonry_interior_brick_wall_lay_standard" as const;
export const MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS = Object.freeze([
  MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID,
  "canonical-work:base:masonry_interior_brick_wall_lay_technical_room",
] as const);
