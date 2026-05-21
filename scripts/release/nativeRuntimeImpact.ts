export type NativeImpactFileKind =
  | "ota_runtime"
  | "backend_or_server"
  | "proof_or_test"
  | "release_tooling"
  | "asset_ota"
  | "native_runtime"
  | "app_config_native"
  | "eas_release_host"
  | "package_dependency"
  | "unknown_native_risk";

export type NativeImpactFileClassification = {
  file: string;
  kind: NativeImpactFileKind;
  nativeImpact: boolean;
  otaSafe: boolean;
  backendMigration: boolean;
  reason: string;
};

export type NativeImpactPackageJsonMutationKind =
  | "none"
  | "scripts-only"
  | "non-runtime"
  | "dependencies-or-native-risk";

export type NativeRuntimeImpactClassification = {
  nativeImpact: boolean;
  iosBuildRequired: boolean;
  otaAllowed: boolean;
  otaRequired: boolean;
  backendMigrationPresent: boolean;
  runtimeVersionChanged: boolean;
  channelChanged: boolean;
  files: string[];
  otaSafeFiles: string[];
  nativeBuildRequiredFiles: string[];
  backendMigrationFiles: string[];
  proofOrTestFiles: string[];
  classifications: NativeImpactFileClassification[];
  reasons: string[];
};

export const IOS_EAS_UPDATE_FAST_QA_POLICY = {
  wave: "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_GATE_POINT_OF_NO_RETURN",
  nativeImpactFalse: "OTA update path is allowed and an iOS build is forbidden for JS/UI/backend-only changes.",
  nativeImpactTrue: "A new iOS build is required only when native runtime impact is proven.",
  backendMigration: "Backend migrations do not require an iOS build by themselves.",
} as const;

const OTA_RUNTIME_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".scss"] as const;
const ASSET_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".json",
  ".lottie",
  ".ttf",
  ".otf",
  ".mp3",
  ".mp4",
  ".wav",
] as const;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function hasExtension(filePath: string, extensions: readonly string[]): boolean {
  const lower = filePath.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

function isAppRuntimePath(filePath: string): boolean {
  return (
    (filePath.startsWith("app/") || filePath.startsWith("src/")) &&
    hasExtension(filePath, OTA_RUNTIME_EXTENSIONS) &&
    !filePath.includes(".native.") &&
    !filePath.includes(".ios.") &&
    !filePath.includes(".android.")
  );
}

function isProofOrTestPath(filePath: string): boolean {
  return (
    filePath.startsWith("tests/") ||
    filePath.startsWith("__tests__/") ||
    filePath.startsWith("artifacts/") ||
    filePath.startsWith("maestro/") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".contract.test.ts") ||
    filePath.endsWith(".md")
  );
}

function isBackendOrServerPath(filePath: string): boolean {
  return (
    filePath.startsWith("supabase/") ||
    filePath.startsWith("server/") ||
    filePath.startsWith("api/") ||
    filePath.startsWith("functions/") ||
    filePath.startsWith("migrations/")
  );
}

function isReleaseToolingPath(filePath: string): boolean {
  return (
    filePath.startsWith("scripts/") ||
    filePath.startsWith("docs/") ||
    filePath.startsWith(".github/") ||
    filePath.startsWith("diagnostics/") ||
    filePath.startsWith("src/shared/release/")
  );
}

function isNativeRuntimePath(filePath: string): boolean {
  return (
    filePath.startsWith("ios/") ||
    filePath.startsWith("android/") ||
    filePath.endsWith(".podspec") ||
    filePath.endsWith("Podfile") ||
    filePath.includes("Info.plist") ||
    filePath.includes("AndroidManifest.xml") ||
    filePath.includes("build.gradle") ||
    filePath.includes("gradle.properties")
  );
}

function isAppConfigPath(filePath: string): boolean {
  return (
    filePath === "app.json" ||
    filePath === "app.config.js" ||
    filePath === "app.config.ts" ||
    filePath === "app.config.mjs" ||
    filePath === "app.config.cjs"
  );
}

function isEasHostPath(filePath: string): boolean {
  return filePath === "eas.json";
}

export function classifyNativeRuntimeImpactFile(
  filePath: string,
  options: {
    packageJsonMutationKind?: NativeImpactPackageJsonMutationKind;
  } = {},
): NativeImpactFileClassification {
  const file = normalizePath(filePath);
  const packageJsonMutationKind = options.packageJsonMutationKind ?? "dependencies-or-native-risk";

  if (!file) {
    return {
      file,
      kind: "unknown_native_risk",
      nativeImpact: true,
      otaSafe: false,
      backendMigration: false,
      reason: "Empty file path cannot be safely classified.",
    };
  }

  if (file === "package.json" || file.endsWith("package-lock.json") || file.endsWith("yarn.lock") || file.endsWith("pnpm-lock.yaml")) {
    if (file === "package.json" && (packageJsonMutationKind === "scripts-only" || packageJsonMutationKind === "non-runtime")) {
      return {
        file,
        kind: "release_tooling",
        nativeImpact: false,
        otaSafe: true,
        backendMigration: false,
        reason: "package.json changed only in release-safe tooling keys.",
      };
    }

    return {
      file,
      kind: "package_dependency",
      nativeImpact: true,
      otaSafe: false,
      backendMigration: false,
      reason: "Dependency or lockfile changes can add native modules and require a new iOS runtime review.",
    };
  }

  if (isNativeRuntimePath(file)) {
    return {
      file,
      kind: "native_runtime",
      nativeImpact: true,
      otaSafe: false,
      backendMigration: false,
      reason: "File is inside native iOS/Android runtime or native build metadata.",
    };
  }

  if (isAppConfigPath(file)) {
    return {
      file,
      kind: "app_config_native",
      nativeImpact: true,
      otaSafe: false,
      backendMigration: false,
      reason: "App config can change runtimeVersion, plugins, permissions, bundle identity, or update channel behavior.",
    };
  }

  if (isEasHostPath(file)) {
    return {
      file,
      kind: "eas_release_host",
      nativeImpact: true,
      otaSafe: false,
      backendMigration: false,
      reason: "EAS build profile/channel changes affect the native build/update host contract.",
    };
  }

  if (isBackendOrServerPath(file)) {
    return {
      file,
      kind: "backend_or_server",
      nativeImpact: false,
      otaSafe: true,
      backendMigration: file.startsWith("supabase/migrations/") || file.startsWith("migrations/"),
      reason: "Backend/server changes do not change the iOS native runtime; deploy backend separately and ship frontend by OTA if needed.",
    };
  }

  if (isProofOrTestPath(file)) {
    return {
      file,
      kind: "proof_or_test",
      nativeImpact: false,
      otaSafe: true,
      backendMigration: false,
      reason: "Proof, artifact, documentation, or test changes do not require a new iOS binary.",
    };
  }

  if (isReleaseToolingPath(file)) {
    return {
      file,
      kind: "release_tooling",
      nativeImpact: false,
      otaSafe: true,
      backendMigration: false,
      reason: "Release tooling changes do not change the installed iOS native runtime.",
    };
  }

  if (file.startsWith("assets/") && hasExtension(file, ASSET_EXTENSIONS)) {
    return {
      file,
      kind: "asset_ota",
      nativeImpact: false,
      otaSafe: true,
      backendMigration: false,
      reason: "Static assets can be delivered with an OTA update when app config/native asset wiring is unchanged.",
    };
  }

  if (isAppRuntimePath(file)) {
    return {
      file,
      kind: "ota_runtime",
      nativeImpact: false,
      otaSafe: true,
      backendMigration: false,
      reason: "JS/TS/UI runtime code is OTA-safe when native dependencies and app config are unchanged.",
    };
  }

  return {
    file,
    kind: "unknown_native_risk",
    nativeImpact: true,
    otaSafe: false,
    backendMigration: false,
    reason: "File is outside the known OTA-safe map, so an owner must review native runtime impact before iPhone QA.",
  };
}

export function classifyNativeRuntimeImpact(params: {
  changedFiles: readonly string[];
  packageJsonMutationKind?: NativeImpactPackageJsonMutationKind;
}): NativeRuntimeImpactClassification {
  const files = [...new Set(params.changedFiles.map(normalizePath).filter(Boolean))].sort();
  const classifications = files.map((file) =>
    classifyNativeRuntimeImpactFile(file, {
      packageJsonMutationKind: params.packageJsonMutationKind,
    }),
  );
  const nativeBuildRequiredFiles = classifications
    .filter((classification) => classification.nativeImpact)
    .map((classification) => classification.file);
  const otaSafeFiles = classifications
    .filter((classification) => classification.otaSafe)
    .map((classification) => classification.file);
  const backendMigrationFiles = classifications
    .filter((classification) => classification.backendMigration)
    .map((classification) => classification.file);
  const proofOrTestFiles = classifications
    .filter((classification) => classification.kind === "proof_or_test")
    .map((classification) => classification.file);
  const runtimeVersionChanged = classifications.some((classification) => classification.kind === "app_config_native");
  const channelChanged = classifications.some((classification) => classification.kind === "eas_release_host");
  const nativeImpact = nativeBuildRequiredFiles.length > 0;
  const otaRequired = !nativeImpact && classifications.some((classification) => classification.kind === "ota_runtime");
  const backendMigrationPresent = backendMigrationFiles.length > 0;
  const reasons = [...new Set(classifications.map((classification) => classification.reason))];

  return {
    nativeImpact,
    iosBuildRequired: nativeImpact,
    otaAllowed: !nativeImpact,
    otaRequired,
    backendMigrationPresent,
    runtimeVersionChanged,
    channelChanged,
    files,
    otaSafeFiles,
    nativeBuildRequiredFiles,
    backendMigrationFiles,
    proofOrTestFiles,
    classifications,
    reasons:
      reasons.length > 0
        ? reasons
        : ["No file changes were found; neither OTA nor iOS build is required."],
  };
}
