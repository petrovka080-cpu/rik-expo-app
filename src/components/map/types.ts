export type Side = "offer" | "demand";
export type Kind = "all" | "material" | "work" | "service";

export type CatalogItem = {
  id: string;           // uuid
  rik_code: string;
  kind: "material" | "work" | "service";
  name_human: string;
  uom_code?: string | null;
  tags?: string | null;
  sector_code?: string | null;
};

export type Filters = {
  side: Side | "all";
  kind: Kind;
  city: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  catalogItem?: CatalogItem | null;
};
