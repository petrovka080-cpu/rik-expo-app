import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG_VERSION = "catalog:11610";
const DEFAULT_ROOT = "dist";

function argValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function textEnv(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] ?? "").trim();
    if (value) return value;
  }
  return null;
}

function gitOutput(args) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

function sourceSha() {
  return textEnv(
    "RENDER_GIT_COMMIT",
    "RENDER_COMMIT",
    "EXPO_PUBLIC_BUILD_COMMIT",
    "SOURCE_SHA",
    "GIT_COMMIT",
  ) ?? gitOutput(["rev-parse", "HEAD"]) ?? "unknown";
}

function branchName() {
  return textEnv(
    "RENDER_GIT_BRANCH",
    "RENDER_BRANCH",
    "EXPO_PUBLIC_BUILD_BRANCH",
    "BRANCH",
    "GIT_BRANCH",
  ) ?? gitOutput(["branch", "--show-current"]) ?? "unknown";
}

function runtimeName() {
  return textEnv("RENDER", "RENDER_SERVICE_ID") ? "render" : "node-local";
}

function versionPayload() {
  return {
    source_sha: sourceSha(),
    branch: branchName(),
    catalog_version: CATALOG_VERSION,
    built_at: textEnv("RENDER_BUILD_TIME", "BUILD_TIME", "EXPO_PUBLIC_BUILD_TIME") ?? null,
    runtime: runtimeName(),
    service: textEnv("RENDER_SERVICE_NAME", "RENDER_APP_SERVICE_NAME") ?? "rik-expo-app-staging",
  };
}

function rootDir() {
  const raw = argValue("root") ?? process.env.RENDER_WEB_DIST_DIR ?? DEFAULT_ROOT;
  return path.resolve(process.cwd(), raw);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".avif": "image/avif",
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  }[ext] ?? "application/octet-stream";
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

function sendStatic(req, res, filePath) {
  const headers = {
    "Content-Type": contentType(filePath),
    "X-Content-Type-Options": "nosniff",
  };
  if (!filePath.endsWith("index.html")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "no-cache";
  }
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

function safeStaticPath(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const normalized = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.resolve(root, `.${path.sep}${normalized}`);
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) return null;
  return fullPath;
}

function resolveStaticFile(root, pathname) {
  const direct = safeStaticPath(root, pathname);
  if (direct && existsSync(direct) && statSync(direct).isFile()) return direct;

  const hasExtension = path.extname(pathname).length > 0;
  if (hasExtension) return null;

  const indexPath = path.join(root, "index.html");
  return existsSync(indexPath) ? indexPath : null;
}

const root = rootDir();
const indexPath = path.join(root, "index.html");
if (!existsSync(indexPath)) {
  console.error(`RENDER_WEB_DIST_MISSING:${indexPath}`);
  process.exit(1);
}

const server = createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method ?? "")) {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/health" || url.pathname === "/api/health") {
    sendJson(res, 200, { status: "ok", ...versionPayload() });
    return;
  }
  if (url.pathname === "/api/version" || url.pathname === "/__version") {
    sendJson(res, 200, versionPayload());
    return;
  }
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204, {
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    res.end();
    return;
  }

  const filePath = resolveStaticFile(root, url.pathname);
  if (!filePath) {
    sendJson(res, 404, { error: "not_found" });
    return;
  }
  sendStatic(req, res, filePath);
});

const port = Number(process.env.PORT ?? argValue("port") ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";
server.listen(port, host, () => {
  const scriptPath = fileURLToPath(import.meta.url);
  console.log(JSON.stringify({
    status: "ready",
    script: path.relative(process.cwd(), scriptPath),
    root,
    port,
    host,
    ...versionPayload(),
  }));
});
