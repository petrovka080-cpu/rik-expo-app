import type { PublicTableRow, PublicTableUpdate } from "./shared";

export type ForemanRequestRow = PublicTableRow<"requests">;
export type ForemanRequestUpdate = PublicTableUpdate<"requests">;

export type ForemanRequestItemRow = PublicTableRow<"request_items">;

export type ForemanRefObjectTypeRow = PublicTableRow<"ref_object_types">;
export type ForemanRefLevelRow = PublicTableRow<"ref_levels">;
export type ForemanRefSystemRow = PublicTableRow<"ref_systems">;
export type ForemanRefZoneRow = PublicTableRow<"ref_zones">;
