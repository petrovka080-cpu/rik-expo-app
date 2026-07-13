export const AI_ESTIMATE_PILOT_KPI_METRICS = [
  "estimate_created_count",
  "estimate_approved_count",
  "pdf_generated_count",
  "buyer_handoff_created_count",
  "history_reload_success_count",
  "web_error_count",
  "android_error_count",
  "p0_defect_count",
  "p1_defect_count",
  "fake_final_total_count",
  "raw_dump_ui_count",
  "missing_price_visible_count",
  "contract_total_claimed_count",
] as const;

export type AiEstimatePilotKpiMetric = typeof AI_ESTIMATE_PILOT_KPI_METRICS[number];

export type AiEstimatePilotKpiSlo = {
  metric: AiEstimatePilotKpiMetric;
  rule: "equals_zero" | "rate_at_least";
  threshold: number;
};

export type AiEstimatePilotKpiReadinessValidation = {
  pilot_kpi_contract_created: true;
  p0_slo_defined: boolean;
  pdf_buyer_slo_defined: boolean;
  history_reload_slo_defined: boolean;
  fake_final_total_slo_defined: boolean;
  contract_total_claimed_slo_defined: boolean;
  raw_dump_ui_slo_defined: boolean;
  all_required_metrics_defined: boolean;
  passed: boolean;
  failures: string[];
};

export const AI_ESTIMATE_PILOT_KPI_SLOS: AiEstimatePilotKpiSlo[] = [
  { metric: "p0_defect_count", rule: "equals_zero", threshold: 0 },
  { metric: "fake_final_total_count", rule: "equals_zero", threshold: 0 },
  { metric: "contract_total_claimed_count", rule: "equals_zero", threshold: 0 },
  { metric: "raw_dump_ui_count", rule: "equals_zero", threshold: 0 },
  { metric: "history_reload_success_count", rule: "rate_at_least", threshold: 0.99 },
  { metric: "pdf_generated_count", rule: "rate_at_least", threshold: 0.99 },
  { metric: "buyer_handoff_created_count", rule: "rate_at_least", threshold: 0.99 },
];

export function validateAiEstimatePilotKpiReadiness(input: {
  metrics?: readonly AiEstimatePilotKpiMetric[];
  slos?: readonly AiEstimatePilotKpiSlo[];
} = {}): AiEstimatePilotKpiReadinessValidation {
  const metrics = input.metrics ?? AI_ESTIMATE_PILOT_KPI_METRICS;
  const slos = input.slos ?? AI_ESTIMATE_PILOT_KPI_SLOS;
  const metricSet = new Set(metrics);
  const sloFor = (metric: AiEstimatePilotKpiMetric) => slos.some((item) => item.metric === metric);
  const allMetrics = AI_ESTIMATE_PILOT_KPI_METRICS.every((metric) => metricSet.has(metric));
  const pdfBuyer = sloFor("pdf_generated_count") && sloFor("buyer_handoff_created_count");
  const failures = [
    allMetrics ? "" : "pilot_kpi_required_metric_missing",
    sloFor("p0_defect_count") ? "" : "p0_slo_missing",
    pdfBuyer ? "" : "pdf_buyer_slo_missing",
    sloFor("history_reload_success_count") ? "" : "history_reload_slo_missing",
    sloFor("fake_final_total_count") ? "" : "fake_final_total_slo_missing",
    sloFor("contract_total_claimed_count") ? "" : "contract_total_claimed_slo_missing",
    sloFor("raw_dump_ui_count") ? "" : "raw_dump_ui_slo_missing",
  ].filter(Boolean);
  return {
    pilot_kpi_contract_created: true,
    p0_slo_defined: sloFor("p0_defect_count"),
    pdf_buyer_slo_defined: pdfBuyer,
    history_reload_slo_defined: sloFor("history_reload_success_count"),
    fake_final_total_slo_defined: sloFor("fake_final_total_count"),
    contract_total_claimed_slo_defined: sloFor("contract_total_claimed_count"),
    raw_dump_ui_slo_defined: sloFor("raw_dump_ui_count"),
    all_required_metrics_defined: allMetrics,
    passed: failures.length === 0,
    failures,
  };
}
