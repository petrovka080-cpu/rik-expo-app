import { computeFrontendReleaseFingerprintPayloads } from "../release/computeReleaseFingerprints";

const fingerprints = computeFrontendReleaseFingerprintPayloads();

process.stdout.write(
  JSON.stringify({
    sourceTreeHash: fingerprints.productSourceHash.hash,
    productSourceHash: fingerprints.productSourceHash.hash,
    jsBundleFingerprint: fingerprints.jsBundleFingerprint.hash,
  }),
);
