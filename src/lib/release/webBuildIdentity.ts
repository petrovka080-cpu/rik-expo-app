import { getBuildIdentity } from "./buildIdentity";

export type WebBuildIdentity = {
  sourceSha256: string;
  webBuildSha256: string | null;
  source: "release-manifest" | "embedded-fingerprint";
};

type WebIdentityManifest = {
  source_sha256?: unknown;
  primary_bundle_sha256?: unknown;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const sha = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return SHA256.test(normalized) ? normalized : null;
};

export function embeddedWebBuildIdentity(): WebBuildIdentity {
  const identity = getBuildIdentity();
  return {
    sourceSha256: sha(identity.release.productSourceHash) ?? "unknown",
    webBuildSha256: sha(identity.release.jsBundleFingerprint),
    source: "embedded-fingerprint",
  };
}

export async function loadWebBuildIdentity(): Promise<WebBuildIdentity> {
  const embedded = embeddedWebBuildIdentity();
  if (typeof fetch !== "function") return embedded;
  try {
    const response = await fetch("/release-web-identity.json", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return embedded;
    const manifest = (await response.json()) as WebIdentityManifest;
    const sourceSha256 = sha(manifest.source_sha256);
    const webBuildSha256 = sha(manifest.primary_bundle_sha256);
    if (!sourceSha256 || !webBuildSha256) return embedded;
    if (embedded.sourceSha256 !== "unknown" && embedded.sourceSha256 !== sourceSha256) {
      return embedded;
    }
    return {
      sourceSha256,
      webBuildSha256,
      source: "release-manifest",
    };
  } catch {
    return embedded;
  }
}
