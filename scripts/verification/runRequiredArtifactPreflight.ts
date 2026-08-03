import path from "node:path";

import { prepareRequiredArtifacts } from "./requiredArtifactPreflight";

function value(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

const root = process.cwd();
const manifestPath = path.resolve(value("manifest") ?? "verification/v1/required-artifacts.manifest.json");
const cacheRoot = path.resolve(
  value("cache-root") ??
    process.env.VERIFICATION_EVIDENCE_CACHE_ROOT ??
    path.join(root, "..", "rik-expo-t8-r5-evidence", "content-cache"),
);
const reportPath = path.resolve(
  value("report") ?? path.join(root, ".release-runtime", "verification-v1", "required-artifact-preflight.json"),
);

try {
  const report = prepareRequiredArtifacts({
    root,
    manifestPath,
    cacheRoot,
    reportPath,
    generateOnMiss: process.argv.includes("--generate-on-miss"),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
