import fs from "node:fs";
import path from "node:path";

import { buildAiRuntimeExplicitTransportBindingsMatrix } from "../../scripts/ai/verifyAiRuntimeExplicitTransportBindings";

const projectRoot = path.resolve(__dirname, "../..");
const registryPath = path.join(
  projectRoot,
  "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
);

describe("AI runtime transport explicit binding architecture", () => {
  it("does not select runtime transports through prefix or includes matchers", () => {
    const source = fs.readFileSync(registryPath, "utf8");

    expect(source).toContain("operations:");
    expect(source).not.toContain("AgentRuntimeTransportMatcher");
    expect(source).not.toContain("matchers:");
    expect(source).not.toContain("matcherApplies");
    expect(source).not.toMatch(/kind:\s*"prefix"/);
    expect(source).not.toMatch(/kind:\s*"includes"/);
    expect(source).not.toMatch(/operation\.startsWith\s*\(/);
    expect(source).not.toMatch(/operation\.includes\s*\(/);
  });

  it("fails the wave proof if any mounted route lacks an explicit binding", () => {
    const matrix = buildAiRuntimeExplicitTransportBindingsMatrix();

    expect(matrix.final_status).toBe("GREEN_AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_READY");
    expect(matrix.all_routes_bound_once).toBe(true);
    expect(matrix.no_pattern_matchers).toBe(true);
    expect(matrix.unknown_operation_fails_closed).toBe(true);
    expect(matrix.no_fallback_entries).toBe(true);
    expect(matrix.no_command_center_routes).toBe(true);
  });
});
