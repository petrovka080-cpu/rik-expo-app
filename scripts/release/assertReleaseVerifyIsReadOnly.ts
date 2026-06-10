import { spawnSync } from "node:child_process";

function gitStatus(): string {
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git status failed");
  }
  return result.stdout.replace(/\r\n/g, "\n");
}

function runReleaseVerify(): { status: number; stderr: string } {
  const result = spawnSync("npm", ["run", "release:verify"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  return {
    status: result.status ?? 1,
    stderr: result.stderr ?? "",
  };
}

function main(): void {
  const before = gitStatus();
  const first = runReleaseVerify();
  const afterFirst = gitStatus();
  const second = runReleaseVerify();
  const afterSecond = gitStatus();
  const readOnly = before === afterFirst && afterFirst === afterSecond;

  const report = {
    final_status: readOnly ? "GREEN_RELEASE_VERIFY_READ_ONLY" : "BLOCKED_RELEASE_VERIFY_DIRTY_TREE",
    first_exit_code: first.status,
    second_exit_code: second.status,
    stderr_has_blockers: /BLOCKED|failed|required|error/i.test(`${first.stderr}\n${second.stderr}`),
    before,
    after_first: afterFirst,
    after_second: afterSecond,
    fake_green_claimed: false,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!readOnly || first.status !== 0 || second.status !== 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("assertReleaseVerifyIsReadOnly.ts")) {
  main();
}
