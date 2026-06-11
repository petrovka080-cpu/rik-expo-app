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

describe("Android app root ready marker unblock wave: no product logic change", () => {
  it("allows only dev-only route marker edits in app route files", () => {
    const forbidden = changedFiles().filter((file) => {
      if (isAllowedRouteMarkerFile(file)) return false;
      if (isApprovedGreenCloseoutCurrentWavePatch(file)) return false;
      return /^(src\/features|app\/\(tabs\)|app\/request|app\/ai|app\/_layout|src\/lib\/navigation)\//.test(file);
    });

    expect(forbidden).toEqual([]);
  });
});
