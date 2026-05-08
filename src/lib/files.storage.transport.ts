import { supabase } from "./supabaseClient";

export const SUPPLIER_FILES_BUCKET = "supplier_files";

type SupplierFilesBucket = ReturnType<typeof supabase.storage.from>;
export type SupplierFileUploadBody = Parameters<SupplierFilesBucket["upload"]>[1];

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
