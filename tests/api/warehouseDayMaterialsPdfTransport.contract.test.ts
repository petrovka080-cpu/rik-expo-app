import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse day materials PDF transport boundary", () => {
  it("keeps pdf_warehouse_day_materials_source_v1 behind the typed transport boundary", () => {
    const serviceSource = read("src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts");
    const transportSource = read("src/screens/warehouse/warehouse.dayMaterialsReport.pdf.transport.ts");

    expect(serviceSource).toContain('from "./warehouse.dayMaterialsReport.pdf.transport"');
    expect(serviceSource).toContain("callWarehouseDayMaterialsReportPdfSourceRpc");
    expect(serviceSource).not.toContain('params.supabase.rpc("pdf_warehouse_day_materials_source_v1"');
    expect(serviceSource).not.toContain('.rpc("pdf_warehouse_day_materials_source_v1"');
    expect(serviceSource).toContain("validateWarehouseDayMaterialsPdfSourceV1");
    expect(serviceSource).toContain("WarehouseDayMaterialsPdfSourceRpcError");
    expect(serviceSource).toContain("shouldDisableWarehouseDayMaterialsPdfRpcForSession");
    expect(serviceSource).toContain('source: "rpc:pdf_warehouse_day_materials_source_v1"');
    expect(serviceSource).toContain('payloadShapeVersion: "v1"');

    expect(transportSource).toContain('PublicFunctionArgs<"pdf_warehouse_day_materials_source_v1">');
    expect(transportSource).toContain('supabase.rpc("pdf_warehouse_day_materials_source_v1"');
    expect(transportSource).not.toContain("validateWarehouseDayMaterialsPdfSourceV1");
    expect(transportSource).not.toContain("WarehouseDayMaterialsPdfSourceRpcError");
    expect(transportSource).not.toContain("shouldDisableWarehouseDayMaterialsPdfRpcForSession");
    expect(transportSource).not.toContain("payloadShapeVersion");
  });
});
