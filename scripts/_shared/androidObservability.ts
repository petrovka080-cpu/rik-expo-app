import { execFileSync } from "node:child_process";

export type AndroidObservabilityEvent = {
  screen: string | null;
  surface: string | null;
  event: string | null;
  result: string | null;
  durationMs: number | null;
  rowCount: number | null;
  sourceKind: string | null;
  raw: string;
};

function adbLogcat(args: string[]) {
  return execFileSync("adb", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: 30_000,
  });
}

function readField(block: string, field: string) {
  const match = block.match(new RegExp(`${field}: ('([^']*)'|null|(-?\\d+))`, "i"));
  if (!match) return null;
  if (match[2] != null) return match[2];
  if (match[3] != null) {
    const parsed = Number(match[3]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function clearAndroidReactNativeLogcat() {
  adbLogcat(["logcat", "-c"]);
}

export function readAndroidReactNativeLogcat() {
  return adbLogcat(["logcat", "-d", "-v", "brief", "ReactNativeJS:I", "*:S"]);
}

export function parseAndroidObservabilityEvents(logText: string): AndroidObservabilityEvent[] {
  const lines = String(logText ?? "").split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] | null = null;

  const flush = () => {
    if (current && current.length > 0) {
      blocks.push(current.join("\n"));
    }
    current = null;
  };

  for (const line of lines) {
    if (!line.includes("ReactNativeJS")) {
      flush();
      continue;
    }
    if (line.includes("[platform.observability]")) {
      flush();
      current = [line];
      continue;
    }
    if (!current) continue;
    current.push(line);
    if (line.includes("errorStage:")) {
      flush();
    }
  }
  flush();

  return blocks.map((block) => ({
    screen: typeof readField(block, "screen") === "string" ? (readField(block, "screen") as string) : null,
    surface: typeof readField(block, "surface") === "string" ? (readField(block, "surface") as string) : null,
    event: typeof readField(block, "event") === "string" ? (readField(block, "event") as string) : null,
    result: typeof readField(block, "result") === "string" ? (readField(block, "result") as string) : null,
    durationMs: typeof readField(block, "durationMs") === "number" ? (readField(block, "durationMs") as number) : null,
    rowCount: typeof readField(block, "rowCount") === "number" ? (readField(block, "rowCount") as number) : null,
    sourceKind:
      typeof readField(block, "sourceKind") === "string" ? (readField(block, "sourceKind") as string) : null,
    raw: block,
  }));
}

export function findAndroidObservabilityEvent(
  events: AndroidObservabilityEvent[],
  predicate: (event: AndroidObservabilityEvent) => boolean,
) {
  return events.find(predicate) ?? null;
}

export function countAndroidObservabilityEvents(
  events: AndroidObservabilityEvent[],
  predicate: (event: AndroidObservabilityEvent) => boolean,
) {
  return events.filter(predicate).length;
}
