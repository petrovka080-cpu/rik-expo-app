import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse incoming form PDF transport boundary", () => {
  it("keeps pdf_warehouse_incoming_source_v1 behind the typed transport boundary", () => {
    const serviceSource = read("src/screens/warehouse/warehouse.incomingForm.pdf.service.ts");
    const transportSource = read("src/screens/warehouse/warehouse.incomingForm.pdf.transport.ts");

    expect(serviceSource).toContain('from "./warehouse.incomingForm.pdf.transport"');
    expect(serviceSource).toContain("callWarehouseIncomingFormPdfSourceRpc");
    expect(serviceSource).not.toContain('params.supabase.rpc("pdf_warehouse_incoming_source_v1"');
    expect(serviceSource).not.toContain('.rpc("pdf_warehouse_incoming_source_v1"');
    expect(serviceSource).toContain("validateWarehouseIncomingFormPdfSourceV1");
    expect(serviceSource).toContain("WarehouseIncomingPdfSourceRpcError");
    expect(serviceSource).toContain("shouldDisableWarehouseIncomingPdfRpcForSession");
    expect(serviceSource).toContain('source: "rpc:pdf_warehouse_incoming_source_v1"');
    expect(serviceSource).toContain('payloadShapeVersion: "v1"');

    expect(transportSource).toContain('PublicFunctionArgs<"pdf_warehouse_incoming_source_v1">');
    expect(transportSource).toContain('supabase.rpc("pdf_warehouse_incoming_source_v1"');
    expect(transportSource).not.toContain("validateWarehouseIncomingFormPdfSourceV1");
    expect(transportSource).not.toContain("WarehouseIncomingPdfSourceRpcError");
    expect(transportSource).not.toContain("shouldDisableWarehouseIncomingPdfRpcForSession");
    expect(transportSource).not.toContain("payloadShapeVersion");
  });
});
