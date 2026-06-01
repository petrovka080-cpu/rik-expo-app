import { read } from "../mobileRelease/iosTestFlightInternalQaTestHelpers";

describe("iOS TestFlight internal QA git hygiene", () => {
  it("does not encode broad git add or destructive worktree commands", () => {
    const source = [
      "scripts/release/iosTestFlightInternalQaCore.ts",
      "scripts/release/runIosTestFlightInternalQaPreflight.ts",
      "scripts/release/runIosTestFlightBuildNumberBump.ts",
      "scripts/release/runIosTestFlightInternalQaBuildProof.ts",
    ]
      .map(read)
      .join("\n");
    const noVerifyPattern = new RegExp("\\b--no-" + "verify\\b");

    expect(source).not.toMatch(/\bgit\s+add\s+\./);
    expect(source).not.toMatch(/\bgit\s+reset\b/);
    expect(source).not.toMatch(/\bgit\s+checkout\b/);
    expect(source).not.toMatch(noVerifyPattern);
  });
});
