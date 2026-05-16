import fs from "node:fs";
import path from "node:path";

import { buildAiRuntimeNoFallbackTransportRegistryMatrix } from "../../scripts/ai/verifyAiRuntimeNoFallbackTransportRegistry";

const projectRoot = path.resolve(__dirname, "../..");
const registryPath = path.join(
  projectRoot,
  "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
);

describe("AI runtime transport no-fallback architecture", () => {
  it("proves the transport registry has no generic fallback path", () => {
    const matrix = buildAiRuntimeNoFallbackTransportRegistryMatrix();

    expect(matrix.final_status).toBe("GREEN_AI_RUNTIME_TRANSPORT_NO_FALLBACK_READY");
    expect(matrix.no_fallback_entries).toBe(true);
    expect(matrix.no_route_uses_fallback).toBe(true);
    expect(matrix.no_command_center_route_fallback).toBe(true);
    expect(matrix.unknown_operation_fails_closed).toBe(true);
    expect(matrix.command_center_route_count).toBe(0);
    expect(matrix.tool_registry_route_count).toBe(3);
  });

  it("does not keep a command_center fallback entry or fallback return branch", () => {
    const source = fs.readFileSync(registryPath, "utf8");

    expect(source).not.toContain("command_center_fallback");
    expect(source).not.toMatch(/fallback:\s*true/);
    expect(source).not.toMatch(/return\s+fallbackEntry/);
    expect(source).toContain('entryId: "tool_registry"');
    expect(source).toContain('"agent.tools.list"');
    expect(source).toContain('"agent.tools.validate"');
    expect(source).toContain('"agent.tools.preview"');
    expect(source).toContain("Agent runtime transport is not registered");
  });
});
