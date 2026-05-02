import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

type ProbeResult = {
  wave: string;
  generatedAt: string;
  repoRoot: string;
  filesChecked: string[];
  pdfEntrypoints: Array<{
    file: string;
    prepareAndPreviewCalls: number;
  }>;
  rootPdfViewerFullScreenModal: boolean;
  accountingDismissesLocalModalBeforePdfRoute: boolean;
  instantCacheServicePresent: boolean;
  persistentDiskCacheEnabled: boolean;
  localFileUriUsedOnCacheHit: boolean;
  immediateRootViewerBeforeSourceReady: boolean;
  nativePdfViewerModuleWarmupAttempted: boolean;
  rawSignedUrlConsoleLogPresent: boolean;
  contractBudgets: {
    cachedTapToModalVisibleP95Ms: number;
    cachedTapToFirstPageP95Ms: number;
    coldTapToProgressVisibleP95Ms: number;
  };
};

const repoRoot = resolve(__dirname, "..", "..");
const wave = "S-PDF-INSTANT-FIRST-OPEN-AND-TOP-LAYER-FIX-1";

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function indexOfAfter(source: string, marker: string, start = 0) {
  return source.indexOf(marker, Math.max(0, start));
}

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

function buildResult(): ProbeResult {
  const files = [
    "app/_layout.tsx",
    "app/pdf-viewer.tsx",
    "src/lib/documents/pdfDocumentActions.ts",
    "src/lib/documents/pdfDocumentPreviewAction.ts",
    "src/lib/documents/pdfDocumentSessions.ts",
    "src/lib/pdf/pdfInstantCache.ts",
    "src/screens/accountant/AccountantScreen.tsx",
    "src/screens/accountant/useAccountantDocuments.ts",
    "src/screens/buyer/buyerPdf.ts",
    "src/screens/buyer/useBuyerDocuments.ts",
    "src/screens/buyer/useBuyerProposalAttachments.ts",
    "src/screens/warehouse/warehouse.pdf.boundary.ts",
    "src/screens/contractor/contractorPdf.execute.ts",
  ].filter((file) => existsSync(join(repoRoot, file)));

  const layout = read("app/_layout.tsx");
  const viewer = read("app/pdf-viewer.tsx");
  const actions = read("src/lib/documents/pdfDocumentActions.ts");
  const sessions = read("src/lib/documents/pdfDocumentSessions.ts");
  const cache = read("src/lib/pdf/pdfInstantCache.ts");
  const accountant = read("src/screens/accountant/AccountantScreen.tsx");
  const accountantDocs = read("src/screens/accountant/useAccountantDocuments.ts");

  const routePush = indexOfAfter(actions, "pushPdfDocumentViewerRouteSafely");
  const prepare = indexOfAfter(actions, "preparePdfDocument({", routePush);
  const materialize = indexOfAfter(actions, "materializePreparingPdfDocumentViewerSession", prepare);

  return {
    wave,
    generatedAt: new Date().toISOString(),
    repoRoot: relative(process.cwd(), repoRoot) || ".",
    filesChecked: files,
    pdfEntrypoints: files
      .map((file) => ({
        file,
        prepareAndPreviewCalls: countMatches(read(file), /prepareAndPreviewPdfDocument\(/g),
      }))
      .filter((entry) => entry.prepareAndPreviewCalls > 0),
    rootPdfViewerFullScreenModal:
      layout.includes('name="pdf-viewer"') &&
      layout.includes('presentation: "fullScreenModal"'),
    accountingDismissesLocalModalBeforePdfRoute:
      accountant.includes("onBeforeNavigate: closeCard") &&
      accountantDocs.includes("onBeforeNavigate"),
    instantCacheServicePresent:
      cache.includes("ensurePdfInstantCacheAsset") &&
      cache.includes("getPdfInstantCacheStatus"),
    persistentDiskCacheEnabled:
      cache.includes("getFileSystemPaths") &&
      cache.includes("cacheDir") &&
      cache.includes("downloadAsync"),
    localFileUriUsedOnCacheHit:
      sessions.includes('cacheStatus.status === "ready"') &&
      sessions.includes("createAssetForLocalUri"),
    immediateRootViewerBeforeSourceReady:
      routePush >= 0 && prepare > routePush && materialize > prepare,
    nativePdfViewerModuleWarmupAttempted:
      layout.includes("InteractionManager.runAfterInteractions") &&
      layout.includes('import("./pdf-viewer")'),
    rawSignedUrlConsoleLogPresent:
      viewer.includes("signedUrl") && viewer.includes("console.info"),
    contractBudgets: {
      cachedTapToModalVisibleP95Ms: 150,
      cachedTapToFirstPageP95Ms: 500,
      coldTapToProgressVisibleP95Ms: 150,
    },
  };
}

function parseOutPath() {
  const outIndex = process.argv.indexOf("--out");
  if (outIndex < 0) return null;
  return process.argv[outIndex + 1] || null;
}

const result = buildResult();
const payload = `${JSON.stringify(result, null, 2)}\n`;
const outPath = parseOutPath();
if (outPath) {
  const resolved = resolve(process.cwd(), outPath);
  if (!existsSync(dirname(resolved))) {
    throw new Error(`Output directory does not exist: ${dirname(resolved)}`);
  }
  writeFileSync(resolved, payload);
}
process.stdout.write(payload);
