import fs from "node:fs";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT } from "../../src/features/ai/workday/aiWorkdayLiveEvidenceBridge";

const files = [
  "src/features/ai/workday/aiWorkdayLiveEvidenceBridge.ts",
  "src/features/ai/agent/agentWorkdayLiveEvidenceContracts.ts",
  "src/features/ai/agent/agentWorkdayLiveEvidenceRoutes.ts",
  "scripts/e2e/runAiWorkdayLiveEvidenceBridge.ts",
];

describe("AI workday live evidence architecture", () => {
  it("keeps the live evidence bridge backend-first and non-mutating", () => {
    expect(AI_WORKDAY_LIVE_EVIDENCE_BRIDGE_CONTRACT).toMatchObject({
      backendFirst: true,
      safeReadOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      uncontrolledExternalFetch: false,
      rawRowsReturned: false,
      fakeCards: false,
    });
  });

  it("registers the live evidence BFF route as auth-required and read-only", () => {
    expect(AGENT_BFF_ROUTE_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "agent.workday.live_evidence.read",
          endpoint: "GET /agent/workday/live-evidence-tasks",
          authRequired: true,
          roleFiltered: true,
          mutates: false,
          callsDatabaseDirectly: false,
          callsModelProvider: false,
          responseEnvelope: "AgentWorkdayLiveEvidenceEnvelope",
        }),
      ]),
    );
  });

  it("does not add UI hooks, direct UI mutation, provider changes, or raw payload exposure", () => {
    const combined = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(combined).not.toMatch(/useEffect|useState|useMemo|useCallback/);
    expect(combined).not.toMatch(/SUPABASE_SERVICE_ROLE|serviceRoleKey|service_role_key/i);
    expect(combined).not.toMatch(/listUsers|auth\.admin/i);
    expect(combined).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|LegacyGeminiModelProvider)[^"']*["']|gpt-|openai_api_key/i);
    expect(combined).not.toMatch(/rawProviderPayload\s*:\s*true|rawRowsReturned\s*:\s*true/);
    expect(combined).toContain("mutationCount: 0");
    expect(combined).toContain("dbWrites: 0");
  });
});
