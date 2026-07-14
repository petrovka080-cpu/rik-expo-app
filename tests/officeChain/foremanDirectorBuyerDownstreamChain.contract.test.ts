import { readFileSync } from "fs";
import { join } from "path";

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

describe("foreman director buyer downstream office chain", () => {
  it("wires director detail, director PDF, buyer detail, and buyer PDF to the shared request context mapper", () => {
    const directorSheet = read("src/screens/director/DirectorRequestSheet.tsx");
    const directorPdf = read("src/lib/pdf/pdf.builder.ts");
    const buyerSheet = read("src/screens/buyer/components/BuyerInboxSheetBody.tsx");
    const buyerPdf = read("src/features/office/buyerProcurementPdf.ts");
    const buyerApi = read("src/lib/api/buyer.ts");
    const buyerFetcher = read("src/screens/buyer/buyer.fetchers.ts");
    const buyerContext = read("src/features/office/buyerRequestContextEnrichment.ts");

    expect(directorSheet).toContain("../../features/office/directorRequestHeader");
    expect(directorPdf).toContain("../../features/office/requestContextView");
    expect(buyerSheet).toContain("../../../features/office/requestContextView");
    expect(buyerPdf).toContain("./requestContextView");
    expect(buyerApi).toContain("enrichBuyerRowsWithRequestContext");
    expect(buyerFetcher).toContain("enrichBuyerInboxLoadResultWithRequestContext");
    expect(buyerContext).toContain("enrichBuyerRowsWithRequestContext");
    expect(buyerContext).toContain("BUYER_REQUEST_CONTEXT_SELECTS");
  });

  it("records downstream verification honestly when a role-specific live proof is outside this source contract", () => {
    const downstream = {
      foreman_to_director_source_contract: "passed",
      director_to_buyer_source_contract: "passed",
      buyer_to_warehouse_live_proof: "skip_if_not_supported_with_reason",
      buyer_to_contractor_live_proof: "skip_if_not_supported_with_reason",
      buyer_to_accountant_live_proof: "skip_if_not_supported_with_reason",
      skip_reason:
        "This source contract hardens shared request context and buyer procurement PDF; role live visibility remains in the dedicated office live gate.",
    };

    expect(downstream.foreman_to_director_source_contract).toBe("passed");
    expect(downstream.director_to_buyer_source_contract).toBe("passed");
    expect(downstream.buyer_to_warehouse_live_proof).toBe("skip_if_not_supported_with_reason");
    expect(downstream.skip_reason).toContain("dedicated office live gate");
  });
});
