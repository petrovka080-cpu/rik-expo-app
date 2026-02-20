import { client, normStr, parseErr } from "./_core";
import type { Supplier } from "./types";

export async function listSuppliers(q?: string): Promise<Supplier[]> {
  try {
    const r = await client
      .from("suppliers")
      .select("id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes")
      .order("name", { ascending: true });

    if (r.error) throw r.error;
    const list = (r.data || []) as Supplier[];
    if (!q || !q.trim()) return list;

    const n = normStr(q);
    return list.filter(
      (s) =>
        normStr(s.name).includes(n) ||
        normStr(s.inn).includes(n) ||
        normStr(s.specialization).includes(n)
    );
  } catch (e) {
    console.warn("[listSuppliers]", parseErr(e));
    return [];
  }
}

export async function upsertSupplier(draft: Partial<Supplier>): Promise<Supplier> {
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
    const r = await client
      .from("supplier_files")
      .select("id,created_at,file_name,file_url,group_key")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (r.error) throw r.error;
    return r.data || [];
  } catch (e) {
    console.warn("[listSupplierFiles]", parseErr(e));
    return [];
  }
}
