import {
  auditAiEstimateCircularImports,
  GREEN_AI_ESTIMATE_CIRCULAR_IMPORTS,
} from "../../scripts/architecture/auditAiEstimateCircularImports";
import {
  auditAiEstimateDependencyDirection,
  GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION,
} from "../../scripts/architecture/auditAiEstimateDependencyDirection";

describe("AI estimate dependency direction", () => {
  it("keeps UI, domain, adapter, and future module dependencies one-way", () => {
    const direction = auditAiEstimateDependencyDirection();
    const circular = auditAiEstimateCircularImports();

    expect(direction.final_status).toBe(GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION);
    expect(direction.ui_to_domain_internals_violations_count).toBe(0);
    expect(direction.domain_to_ui_or_adapter_violations_count).toBe(0);
    expect(direction.estimate_to_future_scope_violations_count).toBe(0);
    expect(circular.final_status).toBe(GREEN_AI_ESTIMATE_CIRCULAR_IMPORTS);
    expect(circular.circular_imports_count).toBe(0);
  });
});
