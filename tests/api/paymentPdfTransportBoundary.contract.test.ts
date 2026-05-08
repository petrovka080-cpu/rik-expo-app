import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S_AUDIT_BATTLE_105_PAYMENT_PDF_TRANSPORT_BOUNDARY", () => {
  it("keeps payment PDF validation and shaping in service while routing RPC through transport", () => {
    const service = read("src/lib/api/paymentPdf.service.ts");
    const transport = read("src/lib/api/paymentPdf.transport.ts");

    expect(service).toContain('from "./paymentPdf.transport"');
    expect(service).toContain("callPaymentPdfSourceRpc(pid)");
    expect(service).toContain("validatePaymentPdfSourceV1");
    expect(service).toContain("shapePaymentOrderPdfPayload");
    expect(service).not.toContain("../supabaseClient");
    expect(service).not.toMatch(/\bsupabase\s*\./);

    expect(transport).toContain('from "../supabaseClient"');
    expect(transport).toContain('supabase.rpc("pdf_payment_source_v1"');
    expect(transport).toContain("p_payment_id: paymentId");
  });
});
