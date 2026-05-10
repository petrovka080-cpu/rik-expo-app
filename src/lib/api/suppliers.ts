import {
  client,
  createGuardedPagedQuery,
  loadPagedRowsWithCeiling,
  normStr,
  parseErr,
  type PagedQuery,
} from "./_core";
import type { Supplier } from "./types";

const SUPPLIER_LIST_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};
const SUPPLIER_ROW_SELECT =
  "id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes";

type PagedSupplierResult<T> = {
  data: T[] | null;
  error: unknown;
};

export type SupplierFileRow = {
  id: string;
  created_at: string | null;
  file_name: string | null;
  file_url: string | null;
  group_key: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOptionalStringField = (
  row: Record<string, unknown>,
  field: string,
): boolean => row[field] == null || typeof row[field] === "string";

export const isSupplierRow = (value: unknown): value is Supplier =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  hasOptionalStringField(value, "inn") &&
  hasOptionalStringField(value, "bank_account") &&
  hasOptionalStringField(value, "specialization") &&
  hasOptionalStringField(value, "phone") &&
  hasOptionalStringField(value, "email") &&
  hasOptionalStringField(value, "website") &&
  hasOptionalStringField(value, "address") &&
  hasOptionalStringField(value, "contact_name") &&
  hasOptionalStringField(value, "notes");

export const isSupplierFileRow = (value: unknown): value is SupplierFileRow =>
  isRecord(value) &&
  typeof value.id === "string" &&
  hasOptionalStringField(value, "created_at") &&
  hasOptionalStringField(value, "file_name") &&
  hasOptionalStringField(value, "file_url") &&
  hasOptionalStringField(value, "group_key");

const loadPagedSupplierRows = async <T>(
  queryFactory: () => PagedQuery<T>,
): Promise<PagedSupplierResult<T>> => {
  const result = await loadPagedRowsWithCeiling<T>(
    queryFactory,
    SUPPLIER_LIST_PAGE_DEFAULTS,
  );
  return { data: result.data, error: result.error };
};

export async function listSuppliers(q?: string): Promise<Supplier[]> {
  try {
    const r = await loadPagedSupplierRows<Supplier>(
      () =>
        createGuardedPagedQuery(
          client
            .from("suppliers")
            .select(SUPPLIER_ROW_SELECT)
            .order("name", { ascending: true })
            .order("id", {
              ascending: true,
            }),
          isSupplierRow,
          "suppliers.listSuppliers.suppliers",
        ),
    );

    if (r.error) throw r.error;
    const list = (r.data || []) as Supplier[];
    if (!q || !q.trim()) return list;

    const n = normStr(q);
    return list.filter(
      (s) =>
        normStr(s.name).includes(n) ||
        normStr(s.inn).includes(n) ||
        normStr(s.specialization).includes(n),
    );
  } catch (e) {
    if (__DEV__) {
      console.warn("[listSuppliers]", parseErr(e));
    }
    return [];
  }
}

export async function upsertSupplier(
  draft: Partial<Supplier>,
): Promise<Supplier> {
  const payload: any = {
    name: (draft.name || "").trim(),
    inn: (draft.inn ?? "").trim() || null,
    bank_account: (draft.bank_account ?? "").trim() || null,
    specialization: (draft.specialization ?? "").trim() || null,
    contact_name: (draft.contact_name ?? "").trim() || null,
    phone: (draft.phone ?? "").trim() || null,
    email: (draft.email ?? "").trim() || null,
    website: (draft.website ?? "").trim() || null,
    address: (draft.address ?? "").trim() || null,
    notes: (draft.notes ?? "").trim() || null,
  };

  if (!payload.name) throw new Error("Укажите название поставщика");

  // если id есть — обновляем
  if (draft.id) {
    const { data, error } = await client
      .from("suppliers")
      .update(payload)
      .eq("id", draft.id)
      .select(SUPPLIER_ROW_SELECT)
      .maybeSingle();

    if (error) throw error;
    return data as Supplier;
  }

  // если нет — вставляем
  const { data, error } = await client
    .from("suppliers")
    .insert([payload])
    .select(SUPPLIER_ROW_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data as Supplier;
}

export async function listSupplierFiles(supplierId: string) {
  try {
    const r = await loadPagedSupplierRows<SupplierFileRow>(
      () =>
        createGuardedPagedQuery(
          client
            .from("supplier_files")
            .select("id,created_at,file_name,file_url,group_key")
            .eq("supplier_id", supplierId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false }),
          isSupplierFileRow,
          "suppliers.listSupplierFiles.supplier_files",
        ),
    );
    if (r.error) throw r.error;
    return r.data || [];
  } catch (e) {
    if (__DEV__) {
      console.warn("[listSupplierFiles]", parseErr(e));
    }
    return [];
  }
}
