import { execFileSync } from "node:child_process";
import { isApprovedGreenCloseoutCurrentWavePatch } from "../greenCloseoutCurrentWaveAllowlist";

function changedFiles(): string[] {
  const tracked = execFileSync("git", ["diff", "--name-only"], { cwd: process.cwd(), encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  return Array.from(new Set([...tracked, ...untracked])).map((file) => file.replace(/\\/g, "/"));
}

function isAllowedRouteMarkerFile(file: string): boolean {
  return [
    "src/lib/testing/routeReadyMarkers.tsx",
    "app/_layout.tsx",
    "app/(tabs)/request/index.tsx",
    "app/(tabs)/ai.tsx",
  ].includes(file);
}

describe("Android route bootstrap wave: no product logic change", () => {
  it("keeps the wave scoped to harness, tests, release guard, and artifacts", () => {
    const forbidden = changedFiles().filter((file) =>
      !isAllowedRouteMarkerFile(file) &&
      !isApprovedGreenCloseoutCurrentWavePatch(file) &&
      /^(src\/features|app\/\(tabs\)|app\/request|app\/ai|app\/_layout|src\/lib\/navigation)\//.test(file),
    );

    expect(forbidden).toEqual([]);
  });
});
