type R45WebRuntimeManifest = {
  schemaVersion: "p0-estimate-truth-remediation-r4.5-web-runtime-manifest.v1";
  runtimeRole: "ACTIVE_CONSUMER_WEB";
  pageOrigin: string;
  workingDirectory: string;
  sourceHead: string;
  sourceTree: string;
  specSha256: string;
  backendUrl: string;
  installedAt: string;
  bundleUrl: string | null;
  bundleSha256: string | null;
  bundleHashStatus: "PENDING" | "READY" | "UNAVAILABLE";
  backendManifest?: unknown;
  backendManifestStatus: "PENDING" | "READY" | "UNAVAILABLE";
};

type R45RuntimeGlobal = typeof globalThis & {
  __RIK_R45_RUNTIME_MANIFEST__?: R45WebRuntimeManifest;
  __RIK_R45_RUNTIME_MANIFEST_READY__?: Promise<R45WebRuntimeManifest>;
};

function configuredBackendUrl(): string {
  return String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL ?? "").replace(/\/+$/, "");
}

async function sha256Response(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`BUNDLE_FETCH_${response.status}`);
  const digest = await crypto.subtle.digest("SHA-256", await response.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function installR45RuntimeManifest(): void {
  if (process.env.EXPO_PUBLIC_R45_RUNTIME_PROOF !== "true") return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const root = globalThis as R45RuntimeGlobal;
  if (root.__RIK_R45_RUNTIME_MANIFEST_READY__) return;
  const bundleUrl = Array.from(document.scripts)
    .map((script) => script.src)
    .find((source) => /\.bundle(?:\?|$)/u.test(source)) ?? null;
  const backendUrl = configuredBackendUrl();
  const manifest: R45WebRuntimeManifest = {
    schemaVersion: "p0-estimate-truth-remediation-r4.5-web-runtime-manifest.v1",
    runtimeRole: "ACTIVE_CONSUMER_WEB",
    pageOrigin: window.location.origin,
    workingDirectory: String(process.env.EXPO_PUBLIC_R45_RUNTIME_WORKTREE ?? "UNSET"),
    sourceHead: String(process.env.EXPO_PUBLIC_R45_RUNTIME_SOURCE_HEAD ?? "UNSET"),
    sourceTree: String(process.env.EXPO_PUBLIC_R45_RUNTIME_SOURCE_TREE ?? "UNSET"),
    specSha256: String(process.env.EXPO_PUBLIC_R45_RUNTIME_SPEC_SHA256 ?? "UNSET"),
    backendUrl,
    installedAt: new Date().toISOString(),
    bundleUrl,
    bundleSha256: null,
    bundleHashStatus: "PENDING",
    backendManifestStatus: "PENDING",
  };
  root.__RIK_R45_RUNTIME_MANIFEST__ = manifest;
  root.__RIK_R45_RUNTIME_MANIFEST_READY__ = Promise.allSettled([
    bundleUrl ? sha256Response(bundleUrl) : Promise.reject(new Error("BUNDLE_URL_NOT_FOUND")),
    backendUrl ? fetch(`${backendUrl}/runtime-manifest`, {
      headers: { Authorization: "Bearer local-r45-web-manifest" },
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error(`BACKEND_MANIFEST_${response.status}`);
      return response.json();
    }) : Promise.reject(new Error("BACKEND_URL_NOT_CONFIGURED")),
  ]).then(([bundle, backend]) => {
    if (bundle.status === "fulfilled") {
      manifest.bundleSha256 = bundle.value;
      manifest.bundleHashStatus = "READY";
    } else {
      manifest.bundleHashStatus = "UNAVAILABLE";
    }
    if (backend.status === "fulfilled") {
      manifest.backendManifest = backend.value;
      manifest.backendManifestStatus = "READY";
    } else {
      manifest.backendManifestStatus = "UNAVAILABLE";
    }
    return manifest;
  });
}
