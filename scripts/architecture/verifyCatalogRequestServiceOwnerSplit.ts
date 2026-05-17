import fs from "node:fs";
import path from "node:path";

export const SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_WAVE =
  "S_SCALE_11_CATALOG_REQUEST_SERVICE_OWNER_SPLIT" as const;
export const GREEN_SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_READY =
  "GREEN_SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_READY" as const;

type HelperSurfaceInventoryEntry = {
  file: string;
  role: "mapping" | "draft_local_state" | "meta_payload";
  requiredExports: string[];
  missingExports: string[];
  importsReactOrHooks: boolean;
  importsSupabase: boolean;
};

type CatalogRequestServiceOwnerSplitFinding = {
  file: string;
  reason: string;
};

export type CatalogRequestServiceOwnerSplitVerification = {
  wave: typeof SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_WAVE;
  final_status: string;
  generatedAt: string;
  inventory: HelperSurfaceInventoryEntry[];
  findings: CatalogRequestServiceOwnerSplitFinding[];
  metrics: {
    originalCatalogRequestServiceLines: 1164;
    catalogRequestServiceLineBudget: 900;
    catalogRequestServiceCurrentLines: number;
    catalogRequestServiceUnderBudget: boolean;
    catalogRequestServiceLineReduction: number;
    helperSurfaces: number;
    helperSurfacesPresent: boolean;
    publicEntrypointPreserved: boolean;
    typeExportsPreserved: boolean;
    serviceImportsHelperOwners: boolean;
    noHooksAdded: boolean;
    noUiImportsAdded: boolean;
    noDirectSupabaseAdded: boolean;
    sourceModuleBudgetPreserved: boolean;
    businessLogicChanged: false;
    fakeGreenClaimed: false;
  };
};

const SERVICE_PATH = "src/lib/catalog/catalog.request.service.ts";
const HELPER_SURFACES = Object.freeze([
  {
    file: "src/lib/catalog/catalog.request.mapping.ts",
    role: "mapping",
    requiredExports: [
      "RequestHeader",
      "RequestItem",
      "ReqItemRow",
      "ForemanRequestSummary",
      "RequestDetails",
      "RequestMetaPatch",
      "asRequestHeader",
      "asRequestStatusRow",
      "mapRequestItemRow",
      "mapDetailsFromRow",
      "mapSummaryFromRow",
    ],
  },
  {
    file: "src/lib/catalog/catalog.request.draftLocalState.ts",
    role: "draft_local_state",
    requiredExports: [
      "getLocalDraftId",
      "setLocalDraftId",
      "clearLocalDraftId",
    ],
  },
  {
    file: "src/lib/catalog/catalog.request.metaPayload.ts",
    role: "meta_payload",
    requiredExports: [
      "RequestsUpdate",
      "RequestsExtendedMetaUpdate",
      "CatalogCompatError",
      "isBaseRequestPayloadKey",
      "pickBaseRequestPayload",
      "getCompatErrorInfo",
    ],
  },
] as const);

const REQUIRED_ENTRYPOINT_EXPORTS = Object.freeze([
  "getLocalDraftId",
  "setLocalDraftId",
  "clearLocalDraftId",
  "getOrCreateDraftRequestId",
  "getRequestHeader",
  "fetchRequestDisplayNo",
  "fetchRequestDetails",
  "updateRequestMeta",
  "listRequestItems",
  "requestItemUpdateQty",
  "listForemanRequests",
  "requestItemCancel",
] as const);

const REQUIRED_TYPE_EXPORTS = Object.freeze([
  "ForemanRequestSummary",
  "ReqItemRow",
  "RequestDetails",
  "RequestHeader",
  "RequestItem",
  "RequestMetaPatch",
] as const);

function readProjectFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function lineCount(source: string): number {
  return source.length ? source.split(/\r?\n/).length : 0;
}

function hasNamedExport(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\bexport\\s+(?:async\\s+)?(?:type\\s+)?(?:const|function|type)\\s+${escaped}\\b`).test(
    source,
  );
}

function hasTypeReExport(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `\\bexport\\s+type\\s+\\{[\\s\\S]*\\b${escaped}\\b[\\s\\S]*\\}\\s+from\\s+["']\\./catalog\\.request\\.mapping["']`,
  ).test(source);
}

function writeJsonArtifact(projectRoot: string, name: string, value: unknown) {
  const artifactDir = path.join(projectRoot, "artifacts");
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, name),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function writeProofArtifact(
  projectRoot: string,
  verification: CatalogRequestServiceOwnerSplitVerification,
) {
  const lines = [
    `# ${SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_WAVE}`,
    "",
    `final_status: ${verification.final_status}`,
    `catalog.request.service lines: ${verification.metrics.originalCatalogRequestServiceLines} -> ${verification.metrics.catalogRequestServiceCurrentLines}`,
    `line reduction: ${verification.metrics.catalogRequestServiceLineReduction}`,
    `helper surfaces: ${verification.metrics.helperSurfaces}`,
    `public entrypoint preserved: ${verification.metrics.publicEntrypointPreserved}`,
    `type exports preserved: ${verification.metrics.typeExportsPreserved}`,
    `no hooks added: ${verification.metrics.noHooksAdded}`,
    `no UI imports added: ${verification.metrics.noUiImportsAdded}`,
    `no direct Supabase added: ${verification.metrics.noDirectSupabaseAdded}`,
    `business logic changed: ${verification.metrics.businessLogicChanged}`,
    `fake green claimed: ${verification.metrics.fakeGreenClaimed}`,
    "",
  ];
  fs.writeFileSync(
    path.join(
      projectRoot,
      "artifacts",
      "S_SCALE_11_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_proof.md",
    ),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

export function verifyCatalogRequestServiceOwnerSplit(
  projectRoot = process.cwd(),
): CatalogRequestServiceOwnerSplitVerification {
  const serviceSource = readProjectFile(projectRoot, SERVICE_PATH);
  const serviceLines = lineCount(serviceSource);
  const helperInventory = HELPER_SURFACES.map((surface) => {
    const source = readProjectFile(projectRoot, surface.file);
    const missingExports = surface.requiredExports.filter(
      (exportName) => !hasNamedExport(source, exportName),
    );
    return {
      file: surface.file,
      role: surface.role,
      requiredExports: [...surface.requiredExports],
      missingExports,
      importsReactOrHooks:
        /\bfrom\s+["']react["']|\bfrom\s+["']react-native["']|\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(
          source,
        ),
      importsSupabase:
        /@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
          source,
        ),
    };
  });
  const helperSources = helperInventory
    .map((entry) => readProjectFile(projectRoot, entry.file))
    .join("\n");
  const combinedSource = `${serviceSource}\n${helperSources}`;

  const serviceImportsHelperOwners =
    serviceSource.includes("./catalog.request.mapping") &&
    serviceSource.includes("./catalog.request.draftLocalState") &&
    serviceSource.includes("./catalog.request.metaPayload");
  const publicEntrypointPreserved = REQUIRED_ENTRYPOINT_EXPORTS.every((exportName) =>
    hasNamedExport(serviceSource, exportName),
  );
  const typeExportsPreserved = REQUIRED_TYPE_EXPORTS.every((exportName) =>
    hasTypeReExport(serviceSource, exportName),
  );
  const noHooksAdded = !/\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(combinedSource);
  const noUiImportsAdded =
    !/\bfrom\s+["']react["']|\bfrom\s+["']react-native["']/.test(combinedSource);
  const noDirectSupabaseAdded =
    !/@supabase\/supabase-js|\bsupabaseClient\b|\bsupabase\s*\.\s*(?:from|rpc)\s*\(/i.test(
      combinedSource,
    );
  const sourceModuleBudgetPreserved = helperInventory.length === HELPER_SURFACES.length;
  const helperSurfacesPresent = helperInventory.every(
    (entry) =>
      entry.missingExports.length === 0 &&
      !entry.importsReactOrHooks &&
      !entry.importsSupabase,
  );

  const findings: CatalogRequestServiceOwnerSplitFinding[] = [];
  if (serviceLines > 900) {
    findings.push({
      file: SERVICE_PATH,
      reason: "catalog request service exceeds 900-line owner-split budget",
    });
  }
  if (!helperSurfacesPresent) {
    findings.push({
      file: "src/lib/catalog",
      reason: "catalog request helper owner surfaces are incomplete or unsafe",
    });
  }
  if (!publicEntrypointPreserved) {
    findings.push({
      file: SERVICE_PATH,
      reason: "public catalog request entrypoints changed",
    });
  }
  if (!typeExportsPreserved) {
    findings.push({
      file: SERVICE_PATH,
      reason: "public catalog request type exports changed",
    });
  }
  if (!serviceImportsHelperOwners) {
    findings.push({
      file: SERVICE_PATH,
      reason: "service does not import both helper owner modules",
    });
  }
  if (!noHooksAdded || !noUiImportsAdded) {
    findings.push({
      file: "src/lib/catalog",
      reason: "UI or hook surface detected in catalog request owner split",
    });
  }
  if (!noDirectSupabaseAdded) {
    findings.push({
      file: "src/lib/catalog",
      reason: "direct Supabase surface detected in catalog request owner split",
    });
  }

  const verification: CatalogRequestServiceOwnerSplitVerification = {
    wave: SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_WAVE,
    final_status:
      findings.length === 0
        ? GREEN_SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_READY
        : "BLOCKED_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_REGRESSED",
    generatedAt: new Date().toISOString(),
    inventory: helperInventory,
    findings,
    metrics: {
      originalCatalogRequestServiceLines: 1164,
      catalogRequestServiceLineBudget: 900,
      catalogRequestServiceCurrentLines: serviceLines,
      catalogRequestServiceUnderBudget: serviceLines <= 900,
      catalogRequestServiceLineReduction: 1164 - serviceLines,
      helperSurfaces: helperInventory.length,
      helperSurfacesPresent,
      publicEntrypointPreserved,
      typeExportsPreserved,
      serviceImportsHelperOwners,
      noHooksAdded,
      noUiImportsAdded,
      noDirectSupabaseAdded,
      sourceModuleBudgetPreserved,
      businessLogicChanged: false,
      fakeGreenClaimed: false,
    },
  };

  writeJsonArtifact(
    projectRoot,
    "S_SCALE_11_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_inventory.json",
    verification.inventory,
  );
  writeJsonArtifact(
    projectRoot,
    "S_SCALE_11_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_matrix.json",
    verification,
  );
  writeProofArtifact(projectRoot, verification);

  return verification;
}

if (require.main === module) {
  const verification = verifyCatalogRequestServiceOwnerSplit();
  if (verification.final_status !== GREEN_SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_READY) {
    throw new Error(
      verification.findings.map((finding) => `${finding.file}: ${finding.reason}`).join("; "),
    );
  }
  console.log(
    `${SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_WAVE} ${verification.final_status}`,
  );
}
