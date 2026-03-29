import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function ignoreBrokenPipe(stream: NodeJS.WriteStream | undefined) {
  if (!stream) return;
  stream.on("error", (error: NodeJS.ErrnoException) => {
    if (error?.code === "EPIPE") return;
    throw error;
  });
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

ignoreBrokenPipe(process.stdout);
ignoreBrokenPipe(process.stderr);

async function main() {
  const { SERVER_SUPABASE_KEY_KIND } = await import("../src/lib/server/serverSupabaseEnv");

  console.info("[queue.runner] starting", {
    JOB_QUEUE_ENABLED:
      process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED ?? process.env.JOB_QUEUE_ENABLED ?? null,
    SUPABASE_KEY_KIND: SERVER_SUPABASE_KEY_KIND,
  });

  let handle: { stop: () => void } | null = null;

  const stop = () => {
    try {
      handle?.stop();
    } catch {}
  };

  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });

  while (true) {
    try {
      const { startServerQueueWorker } = await import("../src/workers/queueWorker.server");
      handle = startServerQueueWorker({
        workerId: `node:${Date.now().toString(36)}`,
      });

      await new Promise<void>(() => {
        // Keep process alive while the worker loop runs.
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : String(error ?? "unknown worker bootstrap error");
      console.error("[queue.runner] crashed, restarting", { message });
      await sleep(5000);
    }
  }
}

void main();
