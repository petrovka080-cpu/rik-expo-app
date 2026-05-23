import fs from "node:fs";
import path from "node:path";

const files = [
  ["warehouse recipient modal", "src/screens/warehouse/components/WarehouseRecipientModal.tsx"],
  ["buyer rework sheet body", "src/screens/buyer/components/BuyerReworkSheetBody.tsx"],
  ["accountant active payment form", "src/screens/accountant/components/ActivePaymentForm.tsx"],
  ["accountant invoice form", "src/screens/accountant/useAccountantInvoiceForm.ts"],
  ["buyer status mutation", "src/screens/buyer/buyer.status.mutation.ts"],
  ["foreman requests", "src/screens/foreman/foreman.requests.ts"],
  ["contractor screen controller", "src/screens/contractor/useContractorScreenController.ts"],
  ["request submit api", "src/lib/api/requests.ts"],
  ["director pdf data", "src/lib/api/pdf_director.data.ts"],
  ["director reports context", "src/lib/api/director_reports.context.ts"],
  ["director pdf source service", "src/lib/api/directorPdfSource.service.ts"],
  ["submit job queue", "src/lib/infra/jobQueue.ts"],
  ["pdf runner", "src/lib/pdfRunner.ts"],
] as const;

describe("UI unused variable suppression discipline", () => {
  it.each(files)("does not suppress unused vars in %s", (_label, relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

    expect(source).not.toContain("@typescript-eslint/no-unused-vars");
    expect(source).not.toContain("eslint-disable-next-line @typescript-eslint/no-unused-vars");
  });
});
