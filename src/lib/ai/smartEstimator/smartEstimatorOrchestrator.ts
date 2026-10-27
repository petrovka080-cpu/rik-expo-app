import { analyzeSmartEstimatorInput } from "./smartEstimatorInputAnalyzer";
import { buildSmartEstimatorClarification } from "./smartEstimatorClarificationPolicy";
import { resolveSmartEstimatorWork } from "./smartEstimatorWorkResolver";
import { executeSmartEstimatorTemplate } from "./smartEstimatorTemplateExecutor";
import { auditSmartEstimatorMaterials } from "./smartEstimatorMaterialResolver";
import { auditSmartEstimatorPrices } from "./smartEstimatorPriceResolver";
import { buildSmartEstimatorSnapshot } from "./smartEstimatorSnapshotBuilder";
import { explainSmartEstimatorResult } from "./smartEstimatorExplainability";
import { validateSmartEstimatorNoDesync } from "./smartEstimatorNoDesyncGuard";
import {
  SMART_ESTIMATOR_PROTOCOL_VERSION,
  type SmartEstimatorResult,
  type SmartEstimatorInput,
  type SmartEstimatorWorkResolution,
} from "./smartEstimatorTypes";

const EMPTY_WORK_RESOLUTION: SmartEstimatorWorkResolution = {
  status: "WORK_NOT_SUPPORTED",
  selected_work_key: null,
  visible_work_name_ru: null,
  group_key: null,
  confidence: 0,
  candidates: [],
  resolver_used: "none",
  fake_green_claimed: false,
};

export function runSmartEstimatorOrchestrator(input: SmartEstimatorInput): SmartEstimatorResult {
  const analysis = analyzeSmartEstimatorInput(input);
  if (!analysis.region) {
    const clarification = buildSmartEstimatorClarification({
      reason: "MISSING_REGION",
      analysis,
      workResolution: EMPTY_WORK_RESOLUTION,
    });
    return {
      protocol_version: SMART_ESTIMATOR_PROTOCOL_VERSION,
      status: "NEEDS_CLARIFICATION",
      analysis,
      work_resolution: EMPTY_WORK_RESOLUTION,
      clarification,
      snapshot: null,
      material_audit: null,
      price_audit: null,
      no_desync_audit: null,
      explanation: explainSmartEstimatorResult({ analysis, workResolution: EMPTY_WORK_RESOLUTION }),
      fake_green_claimed: false,
    };
  }

  const workResolution = resolveSmartEstimatorWork(analysis);
  if (workResolution.status !== "RESOLVED" || !workResolution.selected_work_key) {
    const reason = workResolution.status === "WORK_NOT_SUPPORTED" ? "WORK_NOT_SUPPORTED" : "AMBIGUOUS_WORK_INPUT";
    const clarification = buildSmartEstimatorClarification({
      reason,
      analysis,
      workResolution,
    });
    return {
      protocol_version: SMART_ESTIMATOR_PROTOCOL_VERSION,
      status: reason === "WORK_NOT_SUPPORTED" ? "WORK_NOT_SUPPORTED" : "NEEDS_CLARIFICATION",
      analysis,
      work_resolution: workResolution,
      clarification,
      snapshot: null,
      material_audit: null,
      price_audit: null,
      no_desync_audit: null,
      explanation: explainSmartEstimatorResult({ analysis, workResolution }),
      fake_green_claimed: false,
    };
  }

  if (!analysis.quantity || !analysis.unit) {
    const clarification = buildSmartEstimatorClarification({
      reason: "MISSING_QUANTITY",
      analysis,
      workResolution,
    });
    return {
      protocol_version: SMART_ESTIMATOR_PROTOCOL_VERSION,
      status: "NEEDS_CLARIFICATION",
      analysis,
      work_resolution: workResolution,
      clarification,
      snapshot: null,
      material_audit: null,
      price_audit: null,
      no_desync_audit: null,
      explanation: explainSmartEstimatorResult({ analysis, workResolution }),
      fake_green_claimed: false,
    };
  }

  const professionalSnapshot = executeSmartEstimatorTemplate({
    selected_work_key: workResolution.selected_work_key,
    quantity: analysis.quantity,
    unit: analysis.unit,
    region: analysis.region,
  });
  const snapshot = buildSmartEstimatorSnapshot(professionalSnapshot);
  const materialAudit = auditSmartEstimatorMaterials(professionalSnapshot);
  const priceAudit = auditSmartEstimatorPrices(professionalSnapshot);
  const noDesyncAudit = validateSmartEstimatorNoDesync(snapshot);
  return {
    protocol_version: SMART_ESTIMATOR_PROTOCOL_VERSION,
    status: snapshot.status,
    analysis,
    work_resolution: workResolution,
    clarification: null,
    snapshot,
    material_audit: materialAudit,
    price_audit: priceAudit,
    no_desync_audit: noDesyncAudit,
    explanation: explainSmartEstimatorResult({ analysis, workResolution, snapshot }),
    fake_green_claimed: false,
  };
}
