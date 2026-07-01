import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office market live web E2E harness contract", () => {
  const runnerSource = read("scripts/e2e/runOfficeMarketLiveWebE2E.ts");
  const docsSource = read("docs/office-market-live-e2e.md");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  it("exposes the dedicated no-build live web command", () => {
    expect(packageJson.scripts?.["e2e:office-market-live-web"]).toBe(
      "tsx scripts/e2e/runOfficeMarketLiveWebE2E.ts",
    );
    expect(docsSource).toContain("npm run e2e:office-market-live-web");
    expect(docsSource).toContain("GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS");
  });

  it("keeps the runner gated to explicit staging live E2E", () => {
    expect(runnerSource).toContain('String(process.env.LIVE_E2E || "") !== "1"');
    expect(runnerSource).toContain("STOP_LIVE_E2E_ENV_REQUIRED");
    expect(runnerSource).toContain("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
    expect(runnerSource).toContain(".release-runtime\", \"office-ai-market-live-e2e");
    expect(runnerSource).toContain("nxrnjywzxxfdpqmzjorh");
    expect(runnerSource).toContain("ensureAuthReachable");
    expect(runnerSource).toContain("ensureWebAppReachable");
    expect(runnerSource).toContain("GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS");
    expect(runnerSource).not.toContain("GREEN_OFFICE_AI_ESTIMATE_MARKET_MEDIA_WEB_HARDENING_NO_BUILDS");
  });

  it("requires separate role fixtures and writes only sanitized role proof", () => {
    for (const role of ["FOREMAN", "DIRECTOR", "BUYER", "WAREHOUSE", "CONTRACTOR", "ACCOUNTANT"]) {
      expect(runnerSource).toContain(`key: "${role}"`);
    }
    expect(runnerSource).toContain("process.env[`E2E_${roleKey}_EMAIL`]");
    expect(runnerSource).toContain("process.env[`E2E_${roleKey}_PASSWORD`]");
    expect(runnerSource).toContain("missing E2E_${roleKey}_EMAIL or E2E_${roleKey}_PASSWORD");

    expect(runnerSource).toContain("distinct_user");
    expect(runnerSource).toContain("profile_exists");
    expect(runnerSource).toContain("membership_exists");
    expect(runnerSource).toContain("sanitized_matrix");
    expect(runnerSource).toContain("company_id_hash");
    expect(runnerSource).toContain("hashValue");
    expect(runnerSource).toContain("developer_full_access_used_as_proof: false");
  });

  it("covers live office, buyer, role-surface, and marketplace invariants", () => {
    expect(runnerSource).toContain("createForemanEstimate");
    expect(runnerSource).toContain("loadRequestContextProof");
    expect(runnerSource).toContain("assertTextContainsRequestContext");
    expect(runnerSource).toContain("STOP_REQUEST_CONTEXT_NOT_VISIBLE");
    expect(runnerSource).toContain("readPdfViewerDocumentText");
    expect(runnerSource).toContain("pdf_viewer_document_text_extracted");
    expect(runnerSource).toContain("clickDirectorPdfAndReturn");
    expect(runnerSource).toContain("inspectDirectorPdfBody");
    expect(runnerSource).toContain("director-request-pdf-");
    expect(runnerSource).toContain("director_pdf_context_complete");
    expect(runnerSource).toContain("buyerRequestItemCount");
    expect(runnerSource).toContain("buyerCanReadRequestMarker");
    expect(runnerSource).toContain("buyer-procurement-pdf-open");
    expect(runnerSource).toContain("openBuyerProcurementPdfAndReturn");
    expect(runnerSource).toContain("STOP_BUYER_PROCUREMENT_PDF_TITLE_MISSING");
    expect(runnerSource).toContain("STOP_BUYER_PDF_ITEM_COUNT_OR_CONTENT_MISMATCH");
    expect(runnerSource).toContain("STOP_BUYER_UNKNOWN_FIELDS_RENDERED_AS_QUESTION_MARKS");
    expect(runnerSource).toContain("STOP_BUYER_UNKNOWN_PRICE_RENDERED_AS_ZERO_SUM");
    expect(runnerSource).toContain("buyer_pdf_items_count_matches");
    expect(runnerSource).toContain("live_gate_request_context_propagation_passed");
    expect(runnerSource).toContain("live_gate_director_pdf_context_passed");
    expect(runnerSource).toContain("live_gate_buyer_pdf_passed");
    expect(runnerSource).toContain("live_gate_buyer_unknown_fields_ux_passed");
    expect(runnerSource).toContain("office_chain_success_console_errors");
    expect(runnerSource).toContain("office_chain_success_console_warnings");
    expect(runnerSource).toContain("KNOWN_FRAMEWORK_WARNING_POLICIES");
    expect(runnerSource).toContain("react_native_web_pointer_events_prop_deprecation");
    expect(runnerSource).toContain("props.pointerEvents is deprecated. Use style.pointerEvents");
    expect(runnerSource).toContain("console_actionable_warnings");
    expect(runnerSource).toContain("console_known_framework_warnings");
    expect(runnerSource).toContain("result.console_actionable_warnings.length === 0");
    expect(runnerSource).toContain("runBackOfficeRoleSurfaces");
    expect(runnerSource).toContain("warehouse-tab-stock");
    expect(runnerSource).toContain("contractor-work-card-");
    expect(runnerSource).toContain("contractor work card visible");
    expect(runnerSource).toContain("DO_NOT_GREEN_ROUTE_ONLY: contractor route visible but no business work card");
    expect(runnerSource).toContain("result.office.contractor_request_visible &&");
    expect(runnerSource).toContain("accountant-card-amount");
    expect(runnerSource).toContain("accountant payable proposal row visible");
    expect(runnerSource).toContain("DO_NOT_GREEN_ROUTE_ONLY: accountant route visible but no payable proposal row");
    expect(runnerSource).toContain("result.office.accountant_amounts_visible &&");
    expect(runnerSource).not.toContain("missing_staging_contractor_work_fixture");
    expect(runnerSource).not.toContain("missing_staging_accountant_payment_fixture");
    expect(docsSource).toContain("Route visibility alone is not a green signal.");
    expect(docsSource).toContain("DO_NOT_GREEN_ROUTE_ONLY");
    expect(runnerSource).toContain("marketplace_item_scope_detail_v1");
    expect(runnerSource).toContain("erp_items_json");
    expect(runnerSource).toContain("marketplace.media.entrypoints.suggestion.change");
    expect(runnerSource).toContain("marketplace.media.entrypoints.suggestion.remove");
    expect(runnerSource).toContain('const readdPhotoButton = byTestId(page, "marketplace.media.entrypoints.gallery_photo_button").first();');
    expect(runnerSource).not.toContain("openMarketplaceMediaPicker");
    expect(runnerSource).toContain("/add?returnTo=market-my-listings");
    expect(runnerSource).toContain("market-my-listings-screen");
    expect(runnerSource).toContain("market-my-listings-card_");
    expect(runnerSource).toContain("market_my_listing_image_");
    expect(runnerSource).toContain("result.market.my_listing_after_relogin_visible");
    expect(runnerSource).toContain("result.market_my_listings_screen_visible");
    expect(runnerSource).toContain("result.market_my_listing_visible");
    expect(runnerSource).toContain("result.market_my_listing_media_visible");
    expect(runnerSource).toContain("result.market_my_listing_after_refresh_visible");
    expect(runnerSource).toContain("result.market_my_listing_after_relogin_visible");
    expect(runnerSource).toContain("live_gate_extended_with_my_listings");
    expect(runnerSource).toContain("live_gate_my_listings_owner_only");
    expect(runnerSource).toContain("live_gate_my_listings_media_persistent");
    expect(runnerSource).toContain("live_gate_public_market_unaffected");
    expect(runnerSource).toContain("market_product_add_to_request");
    expect(docsSource).toContain("Marketplace owner-only My Listings");
  });

  it("does not weaken the harness with skips, service role proof, or release/build actions", () => {
    expect(runnerSource).not.toMatch(/\btest\.skip\b/);
    expect(runnerSource).not.toMatch(/process[.]exit[(]0[)]/);
    expect(runnerSource).not.toMatch(/SERVICE_ROLE|service_role/i);
    expect(runnerSource).not.toMatch(/eas\s+(build|submit|update)/i);
    expect(runnerSource).not.toMatch(/release:verify|release:freeze|release_started\s*:\s*true/);
    expect(runnerSource).not.toMatch(/native_build_started\s*:\s*true|eas_started\s*:\s*true/);
  });
});
