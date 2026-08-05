const fs = require("node:fs");
const path = require("node:path");

const outputPath = process.env.RIK_JEST_PEAK_MEMORY_PATH;
const startedAt = new Date().toISOString();
let peakRssBytes = 0;
let peakHeapUsedBytes = 0;
let samples = 0;

function sample() {
  const usage = process.memoryUsage();
  peakRssBytes = Math.max(peakRssBytes, usage.rss);
  peakHeapUsedBytes = Math.max(peakHeapUsedBytes, usage.heapUsed);
  samples += 1;
}

sample();
const timer = setInterval(sample, 250);
timer.unref();

process.once("exit", (exitCode) => {
  sample();
  if (!outputPath) return;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    pid: process.pid,
    subject_sha: process.env.RIK_JEST_SHARD_SUBJECT_SHA ?? null,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    exit_code: exitCode,
    samples,
    peak_rss_bytes: peakRssBytes,
    peak_heap_used_bytes: peakHeapUsedBytes,
  }, null, 2)}\n`, "utf8");
});
