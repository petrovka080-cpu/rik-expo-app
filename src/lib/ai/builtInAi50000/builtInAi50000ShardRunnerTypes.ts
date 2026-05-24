import type { BuiltInAi50000Phase1ExpectedTool, BuiltInAi50000Phase1Intent } from "./builtInAi50000CaseTypes";

export type BuiltInAi50000Phase2ShardCaseResult = {
  id: string;
  shardId: number;
  domainId: string;
  macroDomainId: string;
  intent: BuiltInAi50000Phase1Intent;
  expectedTool: BuiltInAi50000Phase1ExpectedTool;
  selectedTool: string | null;
  passed: boolean;
  failureCodes: string[];
};

export type BuiltInAi50000Phase2ShardMatrix = {
  wave: string;
  final_status: string;
  shard_id: number;
  total_shards: number;
  cases_total: number;
  cases_passed: number;
  cases_failed: number;
  estimate_cases_total: number;
  product_cases_total: number;
  domain_ids: string[];
  macro_domain_ids: string[];
  prompt_sent_through_built_in_ai_ingress: boolean;
  correct_intent_all_cases: boolean;
  correct_expected_tool_all_cases: boolean;
  calculate_global_estimate_called_for_estimates: boolean;
  global_estimate_result_used_all_estimate_cases: boolean;
  source_evidence_present_all_priced_rows: boolean;
  tax_status_or_warning_present_all_estimate_cases: boolean;
  pdf_action_present_all_estimate_cases: boolean;
  product_search_cases_have_no_fake_stock_supplier_availability: boolean;
  dangerous_work_has_no_diy_instructions: boolean;
  forbidden_fallback_rows_found: boolean;
  single_shard_green_claimed: false;
  fake_green_claimed: false;
};
