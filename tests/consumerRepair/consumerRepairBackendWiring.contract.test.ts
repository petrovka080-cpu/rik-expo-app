import * as fs from "fs";
import * as path from "path";

describe("consumer repair backend wiring contract", () => {
  it("wires /request through services for approve, PDF open, and history marketplace send", () => {
    const root = process.cwd();
    const screen = fs.readFileSync(path.join(root, "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const actions = fs.readFileSync(path.join(root, "src/features/consumerRepair/requestEstimateScreenActions.ts"), "utf8");
    const marketplaceService = fs.readFileSync(path.join(root, "src/lib/consumerRequests/consumerRequestMarketplaceService.ts"), "utf8");
    const validationService = fs.readFileSync(path.join(root, "src/lib/consumerRequests/consumerRequestValidationService.ts"), "utf8");

    expect(screen).toContain("../../lib/consumerRequests");
    expect(screen).toContain("approveConsumerRepairRequestDraft(");
    expect(screen).not.toContain("sendConsumerRepairRequestToMarketplace(");
    expect(actions).toContain("sendConsumerRepairHistoryToMarketplaceFromScreen");
    expect(actions).toContain("sendConsumerRepairRequestToMarketplace(");
    expect(screen).toContain("buildCanonicalEstimateArtifact({");
    expect(screen).toContain('kind: "pdf"');
    expect(actions).not.toContain("getConsumerRepairRequestPdf(");
    expect(actions).not.toContain("ensureConsumerRepairRequestPdfAvailable(");
    expect(screen).not.toContain("window.open(pdf.signedUrl");
    expect(screen).not.toContain("Linking.openURL(pdf.signedUrl");
    expect(marketplaceService).toContain("validateConsumerRepairRequestForMarketplace(");
    expect(marketplaceService).toContain("input.canonicalArtifact");
    expect(validationService).toContain("CONTACT_REQUIRED");
    expect(validationService).toContain("PDF_FILE_MISSING");
    expect(screen).not.toMatch(/\bsupabase\b|\.from\s*\(|\.(?:insert|update|upsert|delete)\s*\(/i);
  });
});
