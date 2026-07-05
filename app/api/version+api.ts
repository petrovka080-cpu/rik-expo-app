function envText(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function firstEnv(names: readonly string[]): string {
  for (const name of names) {
    const value = envText(name);
    if (value) return value;
  }
  return "";
}

export function GET() {
  const sourceSha = firstEnv([
    "RENDER_GIT_COMMIT",
    "RENDER_COMMIT",
    "EXPO_PUBLIC_BUILD_COMMIT",
    "GIT_COMMIT",
    "SOURCE_VERSION",
  ]);
  const branch = firstEnv([
    "RENDER_GIT_BRANCH",
    "EXPO_PUBLIC_BUILD_BRANCH",
    "GIT_BRANCH",
    "BRANCH",
  ]);
  const builtAt = firstEnv([
    "EXPO_PUBLIC_BUILD_TIME",
    "BUILD_TIME",
    "RENDER_BUILD_TIME",
  ]) || new Date().toISOString();
  const runtime = envText("RENDER") || envText("RENDER_SERVICE_ID") ? "render" : "unknown";

  return Response.json({
    source_sha: sourceSha || "unknown",
    branch: branch || "unknown",
    catalog_version: "catalog:11610",
    built_at: builtAt,
    runtime,
  });
}
