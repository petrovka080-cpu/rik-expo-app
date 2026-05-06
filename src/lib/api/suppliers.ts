import {
  client,
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

type PagedSupplierResult<T> = {
  data: T[] | null;
  error: unknown;
};

type PagedSupplierQuery<T> = {
  range: (from: number, to: number) => Promise<PagedSupplierResult<T>>;
};

const loadPagedSupplierRows = async <T>(
  queryFactory: () => PagedSupplierQuery<T>,
): Promise<PagedSupplierResult<T>> => {
  const result = await loadPagedRowsWithCeiling<T>(
    () => queryFactory() as unknown as PagedQuery<T>,
    SUPPLIER_LIST_PAGE_DEFAULTS,
  );
  return { data: result.data, error: result.error };
};

export async function listSuppliers(q?: string): Promise<Supplier[]> {
  try {
    const r = await loadPagedSupplierRows<Supplier>(
      () =>
        client
          .from("suppliers")
          .select(
            "id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes",
          )
          .order("name", { ascending: true })
          .order("id", {
            ascending: true,
          }) as unknown as PagedSupplierQuery<Supplier>,
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
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data as Supplier;
  }

  // если нет — вставляем
  const { data, error } = await client
    .from("suppliers")
    .insert([payload])
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as Supplier;
}

export async function listSupplierFiles(supplierId: string) {
  try {
    const r = await loadPagedSupplierRows<{
      id: string;
      created_at: string | null;
      file_name: string | null;
      file_url: string | null;
      group_key: string | null;
    }>(
      () =>
        client
          .from("supplier_files")
          .select("id,created_at,file_name,file_url,group_key")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false }) as unknown as PagedSupplierQuery<{
          id: string;
          created_at: string | null;
          file_name: string | null;
          file_url: string | null;
          group_key: string | null;
        }>,
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
