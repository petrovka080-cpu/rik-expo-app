import fs from "node:fs";
import path from "node:path";

import { buildAiRuntimeGatewayExecutionPolicyMatrix } from "../../scripts/ai/verifyAiRuntimeGatewayExecutionPolicy";

const projectRoot = path.resolve(__dirname, "../..");
const gatewayPath = path.join(
  projectRoot,
  "src/features/ai/agent/agentRuntimeGateway.ts",
);

describe("AI runtime gateway execution policy architecture", () => {
  it("does not infer approved execution gates from operation name heuristics", () => {
    const source = fs.readFileSync(gatewayPath, "utf8");

    expect(source).toContain("approvedGatewayRequired: budget.approvedGatewayRequired");
    expect(source).toContain('executionPolicySource: "explicit_route_policy_registry"');
    expect(source).not.toMatch(/operation\.includes\s*\(/);
    expect(source).not.toMatch(/operation\.startsWith\s*\(/);
    expect(source).not.toMatch(/operation\.endsWith\s*\(/);
    expect(source).not.toContain('includes("execute_approved")');
    expect(source).not.toContain("includes('execute_approved')");
  });

  it("keeps the S07 proof green for all mounted routes", () => {
    const matrix = buildAiRuntimeGatewayExecutionPolicyMatrix();

    expect(matrix.final_status).toBe("GREEN_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_READY");
    expect(matrix.approved_gateway_route_count).toBe(2);
    expect(matrix.approved_executor_policy_count).toBe(2);
    expect(matrix.approved_gateway_matches_policy).toBe(true);
    expect(matrix.no_gateway_operation_name_heuristics).toBe(true);
  });
});
