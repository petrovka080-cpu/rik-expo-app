import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readJson = <T>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;

type CurrentMasterRefresh = {
  final_status: string;
  head_equals_origin_main: boolean;
  full_50k_readiness_claimed: boolean;
  production_50k_capacity_claimed: boolean;
  capacity_claim_allowed: boolean;
  app_runtime_hardening_green: boolean;
  fake_green_claimed: boolean;
  component_scores: {
    app_query_safety: {
      status: string;
      remaining_unbounded_select_findings: number;
      remaining_unbounded_rpc_list_findings: number;
    };
    list_rendering: {
      status: string;
      remaining_untuned_flatlists: number;
      unbounded_scrollview_maps_remaining: number;
    };
    realtime_ownership: {
      status: string;
      direct_realtime_channels_remaining: number;
      unmanaged_subscriptions_remaining: number;
    };
    rpc_runtime_enforcement: {
      status: string;
      direct_rpc_bypass_remaining: number;
      runtime_enforcement_enabled: boolean;
    };
    rate_limit_synthetic_canary: {
      status: string;
      real_user_enforcement_enabled: boolean;
    };
    realtime_capacity: {
      realtime_50k_ready: boolean;
      enterprise_required_for_50k: boolean;
      bff_mediated_fanout_required: boolean;
    };
  };
  current_open_blockers: string[];
  safety: Record<string, boolean>;
};

describe("S-50K current-head master readiness refresh", () => {
  const matrix = readJson<CurrentMasterRefresh>(
    "artifacts/S_50K_READINESS_MASTER_MATRIX_REFRESH_7_matrix.json",
  );

  it("refreshes current app hardening truth without claiming 50K capacity", () => {
    expect(matrix.final_status).toBe("GREEN_50K_READINESS_MASTER_MATRIX_REFRESHED_CURRENT_HEAD");
    expect(matrix.head_equals_origin_main).toBe(true);
    expect(matrix.app_runtime_hardening_green).toBe(true);
    expect(matrix.full_50k_readiness_claimed).toBe(false);
    expect(matrix.production_50k_capacity_claimed).toBe(false);
    expect(matrix.capacity_claim_allowed).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });

  it("carries the closed Wave 3-5 scale evidence forward", () => {
    expect(matrix.component_scores.app_query_safety).toEqual(
      expect.objectContaining({
        status: "GREEN_SCALE_QUERY_SAFETY_AUDIT_REMAINING_READY",
        remaining_unbounded_select_findings: 0,
        remaining_unbounded_rpc_list_findings: 0,
      }),
    );
    expect(matrix.component_scores.list_rendering).toEqual(
      expect.objectContaining({
        status: "GREEN_PERF_FLATLIST_ENTERPRISE_TUNING_READY",
        remaining_untuned_flatlists: 0,
        unbounded_scrollview_maps_remaining: 0,
      }),
    );
    expect(matrix.component_scores.realtime_ownership).toEqual(
      expect.objectContaining({
        status: "GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY",
        direct_realtime_channels_remaining: 0,
        unmanaged_subscriptions_remaining: 0,
      }),
    );
    expect(matrix.component_scores.rpc_runtime_enforcement).toEqual(
      expect.objectContaining({
        status: "GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY",
        direct_rpc_bypass_remaining: 0,
        runtime_enforcement_enabled: true,
      }),
    );
  });

  it("keeps real-user and external capacity blockers explicit", () => {
    expect(matrix.component_scores.rate_limit_synthetic_canary).toEqual(
      expect.objectContaining({
        status: "GREEN_RATE_LIMIT_PRODUCTION_ENFORCEMENT_CANARY_READY",
        real_user_enforcement_enabled: false,
      }),
    );
    expect(matrix.component_scores.realtime_capacity).toEqual(
      expect.objectContaining({
        realtime_50k_ready: false,
        enterprise_required_for_50k: true,
        bff_mediated_fanout_required: true,
      }),
    );
    expect(matrix.current_open_blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("5K/10K staging readonly load proof"),
        expect.stringContaining("Render production scale apply"),
        expect.stringContaining("Supabase Realtime 50K"),
      ]),
    );
  });

  it("records the refresh as artifact-only and side-effect free", () => {
    expect(matrix.safety).toEqual(
      expect.objectContaining({
        refresh_is_artifact_only: true,
        app_source_changed: false,
        business_logic_changed: false,
        production_calls_run_this_wave: false,
        production_load_test_run_this_wave: false,
        staging_load_test_run_this_wave: false,
        production_db_touched: false,
        production_db_writes: false,
        production_business_calls_executed: false,
        production_traffic_changed_this_wave: false,
        production_deploy_triggered: false,
        render_redeploy_triggered_this_wave: false,
        ota_triggered: false,
        native_build_triggered: false,
        app_store_touched: false,
        play_market_touched: false,
        secrets_printed: false,
        env_values_printed: false,
        db_urls_printed: false,
        redis_urls_or_tokens_printed: false,
        raw_payloads_printed: false,
        raw_business_rows_printed: false,
      }),
    );
  });
});
