import { spawn } from "node:child_process";
import fs from "node:fs";

const HANDSHAKE_TIMEOUT_MS = 30_000;
const POLL_MS = 25;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForMonitorHandshake(readyPath) {
  const deadline = Date.now() + HANDSHAKE_TIMEOUT_MS;
  while (Date.now() <= deadline) {
    if (fs.existsSync(readyPath)) {
      try {
        return JSON.parse(fs.readFileSync(readyPath, "utf8"));
      } catch {
        return {
          blocker: "MEMORY_MONITOR_HANDSHAKE_INVALID_JSON",
          locked: false,
        };
      }
    }
    await delay(POLL_MS);
  }
  return {
    blocker: "MEMORY_MONITOR_HANDSHAKE_TIMEOUT",
    locked: false,
  };
}

async function main() {
  const [readyPath, jestEntrypoint, ...jestArguments] = process.argv.slice(2);
  if (!readyPath || !jestEntrypoint || jestArguments.length === 0) {
    console.error("CURRENT_CORE_JEST_ROOT_ARGUMENTS_INVALID");
    process.exitCode = 85;
    return;
  }

  const handshake = await waitForMonitorHandshake(readyPath);
  if (
    handshake?.locked !== true ||
    typeof handshake.root_creation_time !== "string" ||
    !handshake.root_creation_time
  ) {
    console.error(
      `CURRENT_CORE_MEMORY_MONITOR_NOT_LOCKED:${String(
        handshake?.blocker ?? "UNKNOWN",
      )}`,
    );
    process.exitCode = 86;
    return;
  }

  const jest = spawn(process.execPath, [jestEntrypoint, ...jestArguments], {
    stdio: "inherit",
    windowsHide: true,
  });
  await new Promise((resolve, reject) => {
    jest.once("error", reject);
    jest.once("close", (code, signal) => {
      if (signal) {
        console.error(`CURRENT_CORE_JEST_SIGNAL:${signal}`);
        resolve(87);
        return;
      }
      resolve(code ?? 1);
    });
  }).then((exitCode) => {
    process.exitCode = exitCode;
  });
}

main().catch((error) => {
  console.error(
    `CURRENT_CORE_JEST_ROOT_EXCEPTION:${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 88;
});
