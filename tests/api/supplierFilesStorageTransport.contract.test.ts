import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("supplier files storage transport boundary", () => {
  it("keeps supplier file storage and metadata provider calls behind the typed transport", () => {
    const serviceSource = read("src/lib/files.ts");
    const transportSource = read("src/lib/files.storage.transport.ts");

    expect(serviceSource).toContain('from "./files.storage.transport"');
    expect(serviceSource).toContain("uploadSupplierFileObject({");
    expect(serviceSource).toContain("getSupplierFilePublicUrl(path)");
    expect(serviceSource).toContain("insertSupplierFileMetadata({");
    expect(serviceSource).toContain("listSupplierFileMetadataRows({");
    expect(serviceSource).not.toContain('supabase.storage.from("supplier_files")');
    expect(serviceSource).not.toContain(".storage.from");
    expect(serviceSource).not.toContain(".upload(path, file");
    expect(serviceSource).not.toContain(".getPublicUrl(path)");
    expect(serviceSource).not.toContain('await supabase.from("supplier_files").insert');
    expect(serviceSource).not.toContain('.from("supplier_files")');

    expect(serviceSource).toContain('event: "supplier_metadata_insert_failed"');
    expect(serviceSource).toContain('event: "supplier_metadata_list_failed"');
    expect(serviceSource).toContain('sourceKind: "rest:supplier_files"');
    expect(serviceSource).toContain("return { url, path };");
    expect(serviceSource).toContain("normalizeSupplierFilesMetaLimit(opts?.limit)");
    expect(serviceSource).toContain("const path = `${id}/${Date.now()}_${cleanName}`");

    expect(transportSource).toContain('SUPPLIER_FILES_BUCKET = "supplier_files"');
    expect(transportSource).toContain('SUPPLIER_FILES_TABLE = "supplier_files"');
    expect(transportSource).toContain("export type SupplierFileUploadBody");
    expect(transportSource).toContain("export type SupplierFileMetadataInsert");
    expect(transportSource).toContain("export type SupplierFileMetadataRow");
    expect(transportSource).toContain("uploadSupplierFileObject");
    expect(transportSource).toContain("getSupplierFilePublicUrl");
    expect(transportSource).toContain("insertSupplierFileMetadata");
    expect(transportSource).toContain("listSupplierFileMetadataRows");
    expect(transportSource).toContain("supabase.storage.from(SUPPLIER_FILES_BUCKET)");
    expect(transportSource).toContain(".upload(params.storagePath, params.uploadBody");
    expect(transportSource).toContain("upsert: false");
    expect(transportSource).toContain('cacheControl: "3600"');
    expect(transportSource).toContain(".getPublicUrl(storagePath)");
    expect(transportSource).toContain(
      "supabase.from(SUPPLIER_FILES_TABLE).insert(row)",
    );
    expect(transportSource).toContain(".select(\"id,created_at,file_name,file_url,group_key\")");
    expect(transportSource).toContain('.eq("supplier_id", params.supplierId)');
    expect(transportSource).toContain('.order("created_at", { ascending: false })');
    expect(transportSource).toContain('.order("id", { ascending: false })');
    expect(transportSource).toContain('.eq("group_key", params.groupKey)');
    expect(transportSource).toContain(".limit(params.limit)");
    expect(transportSource).not.toContain("reportFilesBoundary");
    expect(transportSource).not.toContain("safeFileName");
  });
});
