import type { requestCreateDraft } from "../../lib/catalog_api";

export type PickedRow = {
  rik_code: string;
  name: string;
  uom?: string | null;
  kind?: string | null;
  qty: string;
  app_code?: string | null;
  note: string;
  appsFromItem?: string[];
};

export type AppOption = { code: string; label: string };
export type RefOption = { code: string; name: string };

export type CalcRow = {
  rik_code: string;
  qty: number;
  uom_code?: string | null;
  name?: string | null;
  name_ru?: string | null;
  name_human?: string | null;
  item_name_ru?: string | null;
  work_type_code?: string | null;
  hint?: string | null;
};

export type RequestDraftMeta = Parameters<typeof requestCreateDraft>[0];
