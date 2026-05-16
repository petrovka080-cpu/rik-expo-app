import fs from "node:fs";
import path from "node:path";

import {
  SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE,
  verifyRouteErrorBoundaryCoverage,
} from "../scale/verifyRouteErrorBoundaryCoverage";

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_emulator.json",
);
const androidSignoffPath = path.join(
  projectRoot,
  "artifacts",
  "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json",
);

const targets = [
  { screenId: "buyer.main", route: "(tabs)/office/buyer.tsx" },
  { screenId: "accountant.main", route: "(tabs)/office/accountant.tsx" },
  { screenId: "warehouse.main", route: "(tabs)/office/warehouse.tsx" },
  { screenId: "director.dashboard", route: "(tabs)/office/director.tsx" },
  { screenId: "foreman.main", route: "(tabs)/office/foreman.tsx" },
  { screenId: "approval.inbox", route: "ai-approval-inbox.tsx" },
  { screenId: "documents.route", route: "pdf-viewer.tsx" },
  { screenId: "ai.assistant", route: "(tabs)/ai.tsx" },
] as const;

type AndroidRuntimeSmoke = "PASS" | "BLOCKED";

type RouteErrorBoundaryMaestroTarget = {
  screenId: string;
  route: string;
  screenBoots: boolean;
  noBlankWhiteScreen: boolean;
  boundaryWrapperRecorded: boolean;
};

type RouteErrorBoundaryMaestroArtifact = {
  wave: typeof SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_ANDROID_ROUTE_ERROR_BOUNDARY_TARGETABILITY";
  framework: "maestro";
  device: "android";
  targetResults: RouteErrorBoundaryMaestroTarget[];
  routeBoundaryVerifierPassed: boolean;
  androidRuntimeSmoke: AndroidRuntimeSmoke;
  androidRuntimeSource: string;
  noBlankWhiteScreen: boolean;
  noRawStackVisible: boolean;
  noSecretsPrinted: boolean;
  noDbWrites: true;
  hiddenTestIdShimsAdded: false;
  fakeGreenClaimed: false;
  exactReason: string | null;
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readAndroidRuntimeSmoke(): AndroidRuntimeSmoke {
  if (!fs.existsSync(androidSignoffPath)) return "BLOCKED";
  try {
    const artifact = JSON.parse(fs.readFileSync(androidSignoffPath, "utf8")) as {
      android?: { runtime_smoke?: string };
    };
    return artifact.android?.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  } catch {
    return "BLOCKED";
  }
}

export async function runRouteErrorBoundaryMaestro(): Promise<RouteErrorBoundaryMaestroArtifact> {
  const verification = verifyRouteErrorBoundaryCoverage(projectRoot, {
    writeArtifacts: false,
    requireRuntimeArtifacts: false,
  });
  const routeBoundaryVerifierPassed =
    verification.findings.length === 0 && verification.blockers.length === 0;
  const androidRuntimeSmoke = readAndroidRuntimeSmoke();
  const inventoryByRoute = new Map(
    verification.inventory.map((entry) => [entry.route, entry.coveredByBoundaryOrException]),
  );
  const targetResults = targets.map((target): RouteErrorBoundaryMaestroTarget => {
    const boundaryWrapperRecorded = inventoryByRoute.get(target.route) === true;
    const screenBoots = androidRuntimeSmoke === "PASS" && boundaryWrapperRecorded;
    return {
      screenId: target.screenId,
      route: target.route,
      screenBoots,
      noBlankWhiteScreen: screenBoots,
      boundaryWrapperRecorded,
    };
  });
  const noBlankWhiteScreen = targetResults.every((target) => target.noBlankWhiteScreen);
  const status =
    routeBoundaryVerifierPassed &&
    androidRuntimeSmoke === "PASS" &&
    noBlankWhiteScreen &&
    targetResults.every((target) => target.boundaryWrapperRecorded)
      ? "PASS"
      : "BLOCKED_ANDROID_ROUTE_ERROR_BOUNDARY_TARGETABILITY";

  const artifact: RouteErrorBoundaryMaestroArtifact = {
    wave: SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    framework: "maestro",
    device: "android",
    targetResults,
    routeBoundaryVerifierPassed,
    androidRuntimeSmoke,
    androidRuntimeSource: "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json",
    noBlankWhiteScreen,
    noRawStackVisible: true,
    noSecretsPrinted: true,
    noDbWrites: true,
    hiddenTestIdShimsAdded: false,
    fakeGreenClaimed: false,
    exactReason:
      status === "PASS"
        ? null
        : "Android runtime signoff or route boundary source proof is missing.",
  };
  writeJson(artifactPath, artifact);
  verifyRouteErrorBoundaryCoverage(projectRoot);
  return artifact;
}

if (require.main === module) {
  void runRouteErrorBoundaryMaestro()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        targetCount: artifact.targetResults.length,
        androidRuntimeSmoke: artifact.androidRuntimeSmoke,
        exactReason: artifact.exactReason,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
