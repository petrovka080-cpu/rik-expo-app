import { readFileSync } from "fs";
import { join } from "path";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { buildFallbackProposalHtmlClient } from "./buyerPdf";

describe("buyer silent catch hardening", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
  });

  it("keeps the proposal pdf fallback read path non-fatal while surfacing swallowed failures", async () => {
    const html = await buildFallbackProposalHtmlClient("proposal-wave16", {
      isWeb: true,
      buildProposalPdfHtml: async () => "<html />",
      proposalItems: async () => {
        throw new Error("items unavailable");
      },
      resolveProposalPrettyTitle: async () => {
        throw new Error("title unavailable");
      },
      getProposalMeta: async () => {
        throw new Error("meta unavailable");
      },
      exportProposalPdfNative: async () => {},
      alert: jest.fn(),
    });

    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(80);

    const events = getPlatformObservabilityEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "buyer",
          surface: "proposal_pdf_fallback",
          event: "fallback_items_load_failed",
          result: "error",
          fallbackUsed: true,
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "proposal_pdf_fallback",
          event: "fallback_title_resolve_failed",
          result: "error",
          fallbackUsed: true,
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "proposal_pdf_fallback",
          event: "fallback_meta_load_failed",
          result: "error",
          fallbackUsed: true,
        }),
      ]),
    );
  });

  it("removes anonymous buyer Tier-1 swallows from loading, alerts, and pdf paths", () => {
    const buyerPdfSource = readFileSync(join(__dirname, "buyerPdf.ts"), "utf8");
    const buyerAlertsSource = readFileSync(join(__dirname, "hooks", "useBuyerAlerts.ts"), "utf8");
    const buyerLoadingSource = readFileSync(join(__dirname, "hooks", "useBuyerLoadingController.ts"), "utf8");
    const attachmentUploaderSource = readFileSync(join(__dirname, "components", "AttachmentUploaderAny.tsx"), "utf8");
    const accountingModalSource = readFileSync(join(__dirname, "hooks", "useBuyerAccountingModal.ts"), "utf8");
    const buyerDocumentsSource = readFileSync(join(__dirname, "useBuyerDocuments.ts"), "utf8");
    const proposalAttachmentsSource = readFileSync(join(__dirname, "useBuyerProposalAttachments.ts"), "utf8");
    const rfqPrefillSource = readFileSync(join(__dirname, "hooks", "useBuyerRfqPrefill.ts"), "utf8");

    expect(buyerPdfSource).not.toContain("catch {}");
    expect(buyerAlertsSource).not.toContain("catch {}");
    expect(buyerLoadingSource).not.toContain("catch {}");
    expect(attachmentUploaderSource).not.toContain("catch {}");
    expect(accountingModalSource).not.toContain("catch {}");
    expect(rfqPrefillSource).not.toContain("catch {}");
    expect(buyerDocumentsSource).not.toContain("getRemoteUrl: () =>");
    expect(proposalAttachmentsSource).not.toContain("getRemoteUrl: () =>");

    expect(buyerPdfSource).toContain("primary_html_build_failed");
    expect(buyerAlertsSource).toContain("normalize_alert_part_failed");
    expect(buyerLoadingSource).toContain("preload_display_nos_failed");
    expect(buyerLoadingSource).toContain("preload_proposal_titles_failed");
    expect(attachmentUploaderSource).toContain("normalize_error_message_json_failed");
    expect(attachmentUploaderSource).toContain("picker_cleanup_failed");
    expect(accountingModalSource).toContain("proposal_document_attach_failed");
    expect(accountingModalSource).toContain("accounting_prefill_failed");
    expect(rfqPrefillSource).toContain("rfq_prefill_failed");
    expect(rfqPrefillSource).toContain("rfq_prefill_invalid_payload");
  });
});
