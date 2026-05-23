import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { buildBuiltInAiLiveAcceptanceBaselineArtifacts } from "../../scripts/e2e/runBuiltInAiLiveAcceptanceBaselineProof";

describe("built-in AI live acceptance baseline", () => {
  it("proves the current real-screen baseline without changing product logic", () => {
    const artifacts = buildBuiltInAiLiveAcceptanceBaselineArtifacts();

    expect(artifacts.matrix).toMatchObject({
      final_status: "GREEN_BUILT_IN_AI_LIVE_ACCEPTANCE_BASELINE_READY",
      previous_green_claim_checked: true,
      built_in_ai_architecture_status: "GREEN_BUILT_IN_AI_REAL_TOOL_ARCHITECTURE_READY",
      request_tile_15sqm_live_passed: true,
      request_generic_draft_found: false,
      foreman_tile_174sqm_live_passed: true,
      role_context_overrode_estimate: false,
      tile_resolved_to_parquet_or_laminate: false,
      roof_100sqm_live_passed: true,
      brick_74sqm_live_passed: true,
      asphalt_10000sqm_live_passed: true,
      product_search_rebar_live_passed: true,
      fake_stock_found: false,
      fake_availability_found: false,
      calculate_global_estimate_called: true,
      source_evidence_present: true,
      make_pdf_action_visible: true,
      pdf_opened: true,
      pdf_contains_source_evidence: true,
      marketplace_plus_preserved: true,
      runtime_proof_passed: true,
      fake_green_claimed: false,
    });

    expect(artifacts.requestTrace.screenAdapter.genericDraftFound).toBe(false);
    expect(["ceramic_tile_laying", "tile_laying"]).toContain(artifacts.foremanTrace.workKey);
    expect(artifacts.foremanTrace.tileResolvedToParquetOrLaminate).toBe(false);
    expect(artifacts.pdfTrace).toMatchObject({
      structuredPayloadUsed: true,
      markdownParsingAsTruth: false,
      pdf_opened: true,
      pdf_contains_source_evidence: true,
    });
    expect(artifacts.bottomNavTrace).toMatchObject({
      marketplace_plus_preserved: true,
      no_duplicate_plus: true,
      no_request_index_label: true,
      no_add_index_label: true,
    });
  });

  it("keeps the live acceptance proof in release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "built-in-ai-live-acceptance-baseline-proof",
      command: "npx tsx scripts/e2e/runBuiltInAiLiveAcceptanceBaselineProof.ts",
    });
  });
});
