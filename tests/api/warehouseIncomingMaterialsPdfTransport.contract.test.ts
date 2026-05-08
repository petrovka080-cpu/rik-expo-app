import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse incoming materials PDF transport boundary", () => {
  it("keeps pdf_warehouse_incoming_materials_source_v1 behind the typed transport boundary", () => {
    const serviceSource = read("src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts");
    const transportSource = read("src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.transport.ts");

    expect(serviceSource).toContain('from "./warehouse.incomingMaterialsReport.pdf.transport"');
    expect(serviceSource).toContain("callWarehouseIncomingMaterialsReportPdfSourceRpc");
    expect(serviceSource).not.toContain('params.supabase.rpc("pdf_warehouse_incoming_materials_source_v1"');
    expect(serviceSource).not.toContain('.rpc("pdf_warehouse_incoming_materials_source_v1"');
    expect(serviceSource).toContain("validateWarehouseIncomingMaterialsPdfSourceV1");
    expect(serviceSource).toContain("WarehouseIncomingMaterialsPdfSourceRpcError");
    expect(serviceSource).toContain("shouldDisableWarehouseIncomingMaterialsPdfRpcForSession");
    expect(serviceSource).toContain("normalizeWarehouseIncomingMaterialsReportRow");
    expect(serviceSource).toContain('source: "rpc:pdf_warehouse_incoming_materials_source_v1"');
    expect(serviceSource).toContain('payloadShapeVersion: "v1"');

    expect(transportSource).toContain('PublicFunctionArgs<"pdf_warehouse_incoming_materials_source_v1">');
    expect(transportSource).toContain('supabase.rpc("pdf_warehouse_incoming_materials_source_v1"');
    expect(transportSource).not.toContain("validateWarehouseIncomingMaterialsPdfSourceV1");
    expect(transportSource).not.toContain("WarehouseIncomingMaterialsPdfSourceRpcError");
    expect(transportSource).not.toContain("shouldDisableWarehouseIncomingMaterialsPdfRpcForSession");
    expect(transportSource).not.toContain("normalizeWarehouseIncomingMaterialsReportRow");
    expect(transportSource).not.toContain("payloadShapeVersion");
  });
});
