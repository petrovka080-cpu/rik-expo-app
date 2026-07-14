import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const AI_PLATFORM_KERNEL_ROOT = path.join(".release-runtime", "ai-platform-model-agnostic-runtime-kernel-v1");

export function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walkTs(full);
    return stat.isFile() && /\.(ts|tsx)$/.test(entry) ? [full.replace(/\\/g, "/")] : [];
  });
}

export function read(file: string): string {
  return readFileSync(file, "utf8");
}

export function gitOutput(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 20_000,
  }).trim();
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"&|<>^]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function resolveCommand(command: string, args: string[]): { command: string; args: string[] } {
  if (process.platform !== "win32" || !/^(?:npm|npx|pnpm|yarn)$/.test(command)) return { command, args };
  const commandLine = [command, ...args].map(quoteWindowsArg).join(" ");
  return {
    command: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
  };
}

export function runCommand(command: string, args: string[]) {
  try {
    const resolved = resolveCommand(command, args);
    const output = execFileSync(resolved.command, resolved.args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 900_000,
    });
    return { passed: true, output };
  } catch (error) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    return {
      passed: false,
      output: `${String(err.stdout ?? "")}\n${String(err.stderr ?? "")}\n${String(err.message ?? "")}`,
    };
  }
}

export function timestampForPath(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function newestSummary<T>(dir: string, predicate: (summary: T) => boolean): { path: string; summary: T } | null {
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .map((entry) => path.join(dir, entry, "summary.json"))
    .filter((file) => existsSync(file))
    .sort()
    .reverse();
  for (const file of candidates) {
    try {
      const summary = JSON.parse(readFileSync(file, "utf8")) as T;
      if (predicate(summary)) return { path: file, summary };
    } catch {
      continue;
    }
  }
  return null;
}

export function currentGitState() {
  return {
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
  };
}

export function gitStatusShort(): string {
  try {
    return gitOutput(["status", "--short"]);
  } catch {
    return "GIT_STATUS_FAILED";
  }
}

export function touchedFilesInHead(): string[] {
  try {
    return execFileSync("git", ["show", "--name-only", "--pretty=format:", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 20_000,
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
