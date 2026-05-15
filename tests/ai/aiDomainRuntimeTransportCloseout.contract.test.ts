import {
  AI_DOMAIN_RUNTIME_GROUPS,
  buildAiDomainRuntimeTransportCloseoutMatrix,
} from "../../scripts/ai/verifyAiDomainRuntimeTransportCloseout";
import { listAiRuntimeTransportContracts } from "../../src/features/ai/tools/transport/aiToolTransportTypes";

describe("AI domain runtime transport closeout", () => {
  it("maps every post-domain BFF group to an explicit runtime transport", () => {
    const matrix = buildAiDomainRuntimeTransportCloseoutMatrix();

    expect(matrix.final_status).toBe("GREEN_AI_DOMAIN_RUNTIME_TRANSPORT_CLOSEOUT_READY");
    expect(matrix.no_command_center_fallback).toBe(true);
    expect(matrix.all_domain_routes_mounted).toBe(true);
    expect(matrix.all_domain_routes_explicit).toBe(true);
    expect(matrix.groups).toHaveLength(AI_DOMAIN_RUNTIME_GROUPS.length);

    for (const group of matrix.groups) {
      expect(group.routeCount).toBeGreaterThanOrEqual(group.minRouteCount);
      expect(group.commandCenterFallback).toBe(false);
      expect(group.explicitRuntimeTransport).toBe(true);
      expect(group.allRoutesMounted).toBe(true);
      expect(group.mutates).toBe(false);
      expect(group.executesTool).toBe(false);
      expect(group.directDatabaseAccess).toBe(false);
      expect(group.providerCalls).toBe(false);
      expect(group.rawRowsExposed).toBe(false);
      expect(group.rawProviderPayloadExposed).toBe(false);
    }
  });

  it("keeps explicit domain runtime transport contracts DTO-only and non-mutating", () => {
    const contracts = listAiRuntimeTransportContracts();
    const expectedRuntimeNames = AI_DOMAIN_RUNTIME_GROUPS.map((group) => group.expectedRuntimeName);

    for (const runtimeName of expectedRuntimeNames) {
      expect(contracts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            runtimeName,
            boundedRequest: true,
            dtoOnly: true,
            redactionRequired: true,
            evidenceRefsOrBlockedReasonRequired: true,
            uiImportAllowed: false,
            modelProviderImportAllowed: false,
            supabaseImportAllowedInTransport: false,
            mutationAllowedFromUi: false,
            rawRowsExposed: false,
            rawProviderPayloadExposed: false,
          }),
        ]),
      );
    }
  });
});
