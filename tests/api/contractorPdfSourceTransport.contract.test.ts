import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("contractor PDF source transport boundary", () => {
  it("keeps pdf_contractor_work_source_v1 behind the typed transport boundary", () => {
    const serviceSource = read("src/screens/contractor/contractorPdfSource.service.ts");
    const transportSource = read("src/screens/contractor/contractorPdfSource.transport.ts");

    expect(serviceSource).toContain('from "./contractorPdfSource.transport"');
    expect(serviceSource).toContain("callContractorWorkPdfSourceRpc");
    expect(serviceSource).not.toContain('supabaseClient.rpc("pdf_contractor_work_source_v1"');
    expect(serviceSource).not.toContain('.rpc("pdf_contractor_work_source_v1"');
    expect(serviceSource).toContain("ContractorWorkPdfSourceError");
    expect(serviceSource).toContain("pdf_contractor_work_source_v1 returned invalid envelope");
    expect(serviceSource).toContain("pdf_contractor_work_source_v1 returned invalid mode");
    expect(serviceSource).toContain("pdf_contractor_work_source_v1 missing work.progress_id");
    expect(serviceSource).toContain("pdf_contractor_work_source_v1 missing history log payload");
    expect(serviceSource).toContain("p_log_id: logId ?? null");

    expect(transportSource).toContain('PublicFunctionArgs<"pdf_contractor_work_source_v1">');
    expect(transportSource).toContain('supabase.rpc("pdf_contractor_work_source_v1"');
    expect(transportSource).not.toContain("ContractorWorkPdfSourceError");
    expect(transportSource).not.toContain("returned invalid envelope");
    expect(transportSource).not.toContain("returned invalid mode");
    expect(transportSource).not.toContain("missing work.progress_id");
    expect(transportSource).not.toContain("missing history log payload");
  });
});
