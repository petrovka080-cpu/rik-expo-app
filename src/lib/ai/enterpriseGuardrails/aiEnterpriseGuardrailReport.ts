import fs from "node:fs";
import path from "node:path";

import {
  AI_ENTERPRISE_ALLOWED_LAYERS,
  AI_ENTERPRISE_GRANDFATHERED_LEGACY_LAYERS,
  getAiEnterpriseApprovedLayerRoots,
} from "./aiEnterpriseAllowedLayers";
import {
  AI_ENTERPRISE_ARCHITECTURE_POLICY,
  type AiEnterpriseForbiddenPattern,
} from "./aiEnterpriseArchitecturePolicy";
import { AI_ENTERPRISE_ENTRYPOINT_REGISTRY } from "./aiEnterpriseEntrypointRegistry";
import { AI_ENTERPRISE_PROVIDER_REGISTRY } from "./aiEnterpriseProviderRegistry";
import { AI_ENTERPRISE_SCREEN_ADAPTER_POLICY } from "./aiEnterpriseScreenAdapterPolicy";
import type { AiEnterpriseScanResult } from "./aiEnterpriseForbiddenPatterns";
import { normalizeAiEnterprisePath } from "./aiEnterpriseForbiddenPatterns";
import { scanAiHooks } from "./scanners/scanAiHooks";
import { scanAiUseEffectHacks } from "./scanners/scanAiUseEffectHacks";
import { scanSecondAiFramework } from "./scanners/scanSecondAiFramework";
import { scanAiDbWrites } from "./scanners/scanAiDbWrites";
import { scanAiDangerousMutations } from "./scanners/scanAiDangerousMutations";
import { scanApprovalBypass } from "./scanners/scanApprovalBypass";
import { scanUnboundedAiQueries } from "./scanners/scanUnboundedAiQueries";
import { scanFakeData } from "./scanners/scanFakeData";
import { scanRuntimeDebugLeaks } from "./scanners/scanRuntimeDebugLeaks";
import { scanEnglishUserFacingAiCopy } from "./scanners/scanEnglishUserFacingAiCopy";
import { scanAiScreenLocalAiLogic } from "./scanners/scanAiScreenLocalAiLogic";

export type AiEnterpriseLayerInventory = {
  approvedLayerRoots: string[];
  grandfatheredLegacyRoots: string[];
  discoveredAiLayerRoots: string[];
  unexpectedAiLayerRoots: string[];
};

export type AiEnterpriseGuardrailReport = {
  policy: typeof AI_ENTERPRISE_ARCHITECTURE_POLICY;
  allowedLayers: typeof AI_ENTERPRISE_ALLOWED_LAYERS;
  entrypoints: typeof AI_ENTERPRISE_ENTRYPOINT_REGISTRY;
  providers: typeof AI_ENTERPRISE_PROVIDER_REGISTRY;
  screenAdapterPolicy: typeof AI_ENTERPRISE_SCREEN_ADAPTER_POLICY;
  forbiddenPatterns: AiEnterpriseForbiddenPattern[];
  inventory: AiEnterpriseLayerInventory;
  scans: {
    hooks: AiEnterpriseScanResult;
    useEffect: AiEnterpriseScanResult;
    secondFramework: AiEnterpriseScanResult;
    screenLocalAiLogic: AiEnterpriseScanResult;
    dbWrites: AiEnterpriseScanResult;
    dangerousMutations: AiEnterpriseScanResult;
    approvalBypass: AiEnterpriseScanResult;
    unboundedQueries: AiEnterpriseScanResult;
    fakeData: AiEnterpriseScanResult;
    runtimeDebugLeaks: AiEnterpriseScanResult;
    englishAiCopy: AiEnterpriseScanResult;
  };
};

function directoryExists(rootDir: string, relativePath: string): boolean {
  try {
    return fs.statSync(path.join(rootDir, relativePath)).isDirectory();
  } catch {
    return false;
  }
}

export function buildAiEnterpriseLayerInventory(rootDir = process.cwd()): AiEnterpriseLayerInventory {
  const aiRoot = path.join(rootDir, "src", "lib", "ai");
  const discoveredAiLayerRoots = fs.existsSync(aiRoot)
    ? fs.readdirSync(aiRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => normalizeAiEnterprisePath(path.join("src", "lib", "ai", entry.name)))
    : [];
  const approvedLayerRoots = getAiEnterpriseApprovedLayerRoots().filter((root) => directoryExists(rootDir, root));
  const grandfatheredLegacyRoots = AI_ENTERPRISE_GRANDFATHERED_LEGACY_LAYERS
    .map((entry) => entry.root)
    .filter((root) => directoryExists(rootDir, root));
  const allowedOrGrandfathered = new Set([...approvedLayerRoots, ...grandfatheredLegacyRoots]);
  return {
    approvedLayerRoots,
    grandfatheredLegacyRoots,
    discoveredAiLayerRoots,
    unexpectedAiLayerRoots: discoveredAiLayerRoots.filter((root) => !allowedOrGrandfathered.has(root)),
  };
}

export function buildAiEnterpriseGuardrailReport(rootDir = process.cwd()): AiEnterpriseGuardrailReport {
  return {
    policy: AI_ENTERPRISE_ARCHITECTURE_POLICY,
    allowedLayers: AI_ENTERPRISE_ALLOWED_LAYERS,
    entrypoints: AI_ENTERPRISE_ENTRYPOINT_REGISTRY,
    providers: AI_ENTERPRISE_PROVIDER_REGISTRY,
    screenAdapterPolicy: AI_ENTERPRISE_SCREEN_ADAPTER_POLICY,
    forbiddenPatterns: AI_ENTERPRISE_ARCHITECTURE_POLICY.forbiddenPatterns,
    inventory: buildAiEnterpriseLayerInventory(rootDir),
    scans: {
      hooks: scanAiHooks(rootDir),
      useEffect: scanAiUseEffectHacks(rootDir),
      secondFramework: scanSecondAiFramework(rootDir),
      screenLocalAiLogic: scanAiScreenLocalAiLogic(rootDir),
      dbWrites: scanAiDbWrites(rootDir),
      dangerousMutations: scanAiDangerousMutations(rootDir),
      approvalBypass: scanApprovalBypass(rootDir),
      unboundedQueries: scanUnboundedAiQueries(rootDir),
      fakeData: scanFakeData(rootDir),
      runtimeDebugLeaks: scanRuntimeDebugLeaks(),
      englishAiCopy: scanEnglishUserFacingAiCopy(),
    },
  };
}

export function listAiEnterpriseGuardrailBlockers(report: AiEnterpriseGuardrailReport): string[] {
  const scanBlockers = Object.values(report.scans)
    .filter((scan) => !scan.passed)
    .flatMap((scan) => scan.findings.map((finding) => `${scan.scanner}:${finding.file}:${finding.line}:${finding.reason}`));
  return [
    ...scanBlockers,
    ...report.inventory.unexpectedAiLayerRoots.map((root) => `unexpected AI layer: ${root}`),
  ];
}
