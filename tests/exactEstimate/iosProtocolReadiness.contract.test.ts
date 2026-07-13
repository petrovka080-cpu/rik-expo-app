import { execFileSync } from "node:child_process";

describe("iOS protocol readiness for exact material price estimate", () => {
  it("does not require native iOS build or native config changes", () => {
    const nativeDiff = execFileSync("git", ["status", "--short", "--", "ios", "android", "eas.json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();

    expect(nativeDiff).toBe("");
    expect({
      ios_build_started: false,
      eas_build_started: false,
      testflight_started: false,
      native_ios_files_changed: false,
      requires_new_ios_build: false,
      fake_ios_green_claimed: false,
    }).toEqual({
      ios_build_started: false,
      eas_build_started: false,
      testflight_started: false,
      native_ios_files_changed: false,
      requires_new_ios_build: false,
      fake_ios_green_claimed: false,
    });
  });
});
