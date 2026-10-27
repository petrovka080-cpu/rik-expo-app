import {
  createGuardedPagedQuery,
  isRecordRow,
  loadPagedRowsWithCeiling,
  type PagedQuery,
} from "../../lib/api/_core";
import { supabase } from "../../lib/supabaseClient";

export type ForemanDictRow = { code: string; name?: string | null; name_ru?: string | null };
export type ForemanAppRow = { app_code: string; name_human?: string | null };
export type ForemanItemAppRow = { app_code: string | null };
export type ForemanDictTable = "ref_object_types" | "ref_levels" | "ref_systems" | "ref_zones";
export type ForemanPagedSelectResult<T> = {
  data: T[] | null;
  error: { message?: string | null } | null;
};

const FOREMAN_DICT_LIST_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};

const isDictRow = (value: unknown): value is ForemanDictRow =>
  isRecordRow(value) &&
  typeof value.code === "string" &&
  (value.name == null || typeof value.name === "string") &&
  (value.name_ru == null || typeof value.name_ru === "string");

const isAppRow = (value: unknown): value is ForemanAppRow =>
  isRecordRow(value) &&
  typeof value.app_code === "string" &&
  (value.name_human == null || typeof value.name_human === "string");

const isItemAppRow = (value: unknown): value is ForemanItemAppRow =>
  isRecordRow(value) &&
  (value.app_code == null || typeof value.app_code === "string");

const loadPagedForemanRows = async <T>(
  queryFactory: () => PagedQuery<T>,
): Promise<ForemanPagedSelectResult<T>> => {
  const result = await loadPagedRowsWithCeiling<T>(queryFactory, FOREMAN_DICT_LIST_PAGE_DEFAULTS);
  if (result.error) {
    return {
      data: null,
      error: { message: String((result.error as { message?: unknown })?.message ?? result.error) },
    };
  }
  return { data: result.data ?? [], error: null };
};

export const selectForemanDictRows = async (
  table: ForemanDictTable,
  columns: string,
  orderColumn: string,
): Promise<ForemanPagedSelectResult<ForemanDictRow>> => {
  switch (table) {
    case "ref_object_types":
      return await loadPagedForemanRows<ForemanDictRow>(() =>
        createGuardedPagedQuery(
          supabase.from("ref_object_types").select(columns)
            .order(orderColumn, { ascending: true }).order("code", { ascending: true }),
          isDictRow,
          "foreman.dicts.ref_object_types",
        ));
    case "ref_levels":
      return await loadPagedForemanRows<ForemanDictRow>(() =>
        createGuardedPagedQuery(
          supabase.from("ref_levels").select(columns)
            .order(orderColumn, { ascending: true }).order("code", { ascending: true }),
          isDictRow,
          "foreman.dicts.ref_levels",
        ));
    case "ref_systems":
      return await loadPagedForemanRows<ForemanDictRow>(() =>
        createGuardedPagedQuery(
          supabase.from("ref_systems").select(columns)
            .order(orderColumn, { ascending: true }).order("code", { ascending: true }),
          isDictRow,
          "foreman.dicts.ref_systems",
        ));
    case "ref_zones":
      return await loadPagedForemanRows<ForemanDictRow>(() =>
        createGuardedPagedQuery(
          supabase.from("ref_zones").select(columns)
            .order(orderColumn, { ascending: true }).order("code", { ascending: true }),
          isDictRow,
          "foreman.dicts.ref_zones",
        ));
  }
};

export const selectForemanAppRows = async (): Promise<ForemanPagedSelectResult<ForemanAppRow>> =>
  await loadPagedForemanRows<ForemanAppRow>(() =>
    createGuardedPagedQuery(
      supabase.from("rik_apps").select("app_code, name_human")
        .order("app_code", { ascending: true }),
      isAppRow,
      "foreman.dicts.rik_apps",
    ));

export const selectForemanItemAppRows = async (): Promise<ForemanPagedSelectResult<ForemanItemAppRow>> =>
  await loadPagedForemanRows<ForemanItemAppRow>(() =>
    createGuardedPagedQuery(
      supabase.from("rik_item_apps").select("app_code")
        .not("app_code", "is", null).order("app_code", { ascending: true }),
      isItemAppRow,
      "foreman.dicts.rik_item_apps",
    ));

export const selectForemanProfileName = async (
  userId: string,
): Promise<{ full_name?: unknown } | null> => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { full_name?: unknown } | null;
};
