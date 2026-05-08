import { supabase } from "./supabaseClient";
import type { Database } from "./database.types";

export const SUPPLIER_FILES_BUCKET = "supplier_files";
export const SUPPLIER_FILES_TABLE = "supplier_files";

type SupplierFilesBucket = ReturnType<typeof supabase.storage.from>;
export type SupplierFileUploadBody = Parameters<SupplierFilesBucket["upload"]>[1];
type SupplierFilesTable = Database["public"]["Tables"]["supplier_files"];
export type SupplierFileMetadataInsert = {
  supplier_id: string;
  file_name: string;
  file_url: string;
  group_key: string;
};
export type SupplierFileMetadataRow = Pick<
  SupplierFilesTable["Row"],
  "id" | "created_at" | "file_name" | "file_url" | "group_key"
>;

const getSupplierFilesBucket = () => supabase.storage.from(SUPPLIER_FILES_BUCKET);

export async function uploadSupplierFileObject(params: {
  storagePath: string;
  uploadBody: SupplierFileUploadBody;
}) {
  return await getSupplierFilesBucket().upload(params.storagePath, params.uploadBody, {
    upsert: false,
    cacheControl: "3600",
  });
}

export function getSupplierFilePublicUrl(storagePath: string) {
  return getSupplierFilesBucket().getPublicUrl(storagePath);
}

export async function insertSupplierFileMetadata(row: SupplierFileMetadataInsert) {
  return await supabase.from(SUPPLIER_FILES_TABLE).insert(row);
}

export async function listSupplierFileMetadataRows(params: {
  supplierId: string;
  groupKey?: string;
  limit: number;
}) {
  let query = supabase
    .from(SUPPLIER_FILES_TABLE)
    .select("id,created_at,file_name,file_url,group_key")
    .eq("supplier_id", params.supplierId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (params.groupKey) query = query.eq("group_key", params.groupKey);
  return await query.limit(params.limit);
}
