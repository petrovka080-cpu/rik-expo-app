import * as fs from "fs";
import * as path from "path";

describe("consumer repair backend wiring contract", () => {
  it("wires /request through services for approve, PDF open, and marketplace send", () => {
    const root = process.cwd();
    const screen = fs.readFileSync(path.join(root, "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const marketplaceService = fs.readFileSync(path.join(root, "src/lib/consumerRequests/consumerRequestMarketplaceService.ts"), "utf8");
    const validationService = fs.readFileSync(path.join(root, "src/lib/consumerRequests/consumerRequestValidationService.ts"), "utf8");

    expect(screen).toContain("../../lib/consumerRequests");
    expect(screen).toContain("approveConsumerRepairRequestDraft(");
    expect(screen).toContain("sendConsumerRepairRequestToMarketplace(");
    expect(screen).toContain("getConsumerRepairRequestPdf(");
    expect(screen).toContain("window.open(pdf.signedUrl");
    expect(screen).toContain("Linking.openURL(pdf.signedUrl");
    expect(marketplaceService).toContain("validateConsumerRepairRequestForMarketplace(input.requestDraftId, input.userId)");
    expect(validationService).toContain("CONTACT_REQUIRED");
    expect(validationService).toContain("PDF_FILE_MISSING");
    expect(screen).not.toMatch(/\bsupabase\b|\.from\s*\(|\.(?:insert|update|upsert|delete)\s*\(/i);
  });
});
