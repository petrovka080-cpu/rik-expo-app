import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

const fingerprints = computeReleaseFingerprints();

process.stdout.write(
  JSON.stringify({
    sourceTreeHash: fingerprints.sourceTreeHash,
    productSourceHash: fingerprints.productSourceHash,
    jsBundleFingerprint: fingerprints.jsBundleFingerprint,
  }),
);
