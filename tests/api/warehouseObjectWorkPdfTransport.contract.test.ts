import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse object-work PDF transport boundary", () => {
  it("keeps pdf_warehouse_object_work_source_v1 behind the typed transport boundary", () => {
    const serviceSource = read("src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts");
    const transportSource = read("src/screens/warehouse/warehouse.objectWorkReport.pdf.transport.ts");

    expect(serviceSource).toContain('from "./warehouse.objectWorkReport.pdf.transport"');
    expect(serviceSource).toContain("callWarehouseObjectWorkReportPdfSourceRpc");
    expect(serviceSource).not.toContain('params.supabase.rpc("pdf_warehouse_object_work_source_v1"');
    expect(serviceSource).not.toContain('.rpc("pdf_warehouse_object_work_source_v1"');
    expect(serviceSource).toContain("validateWarehouseObjectWorkPdfSourceV1");
    expect(serviceSource).toContain("WarehouseObjectWorkPdfSourceRpcError");
    expect(serviceSource).toContain("shouldDisableWarehouseObjectWorkPdfRpcForSession");
    expect(serviceSource).toContain("normalizeWarehouseObjectWorkReportRow");
    expect(serviceSource).toContain("p_object_id: params.objectId ?? null");
    expect(serviceSource).toContain('source: "rpc:pdf_warehouse_object_work_source_v1"');
    expect(serviceSource).toContain('payloadShapeVersion: "v1"');

    expect(transportSource).toContain('PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">');
    expect(transportSource).toContain('supabase.rpc(');
    expect(transportSource).toContain('"pdf_warehouse_object_work_source_v1"');
    expect(transportSource).not.toContain("validateWarehouseObjectWorkPdfSourceV1");
    expect(transportSource).not.toContain("WarehouseObjectWorkPdfSourceRpcError");
    expect(transportSource).not.toContain("shouldDisableWarehouseObjectWorkPdfRpcForSession");
    expect(transportSource).not.toContain("normalizeWarehouseObjectWorkReportRow");
    expect(transportSource).not.toContain("payloadShapeVersion");
  });
});
