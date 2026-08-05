import { isTimeoutOrMemoryWeakeningDiffLine } from "./noTestWeakeningPolicy";

describe("no-test-weakening timeout and retry policy scanner", () => {
  it("does not treat ordinary retry wording in a test title as policy", () => {
    expect(
      isTimeoutOrMemoryWeakeningDiffLine(
        '+  it("mounts immediately and offers retry after the 3 second hydration bound", async () => {',
      ),
    ).toBe(false);
    expect(
      isTimeoutOrMemoryWeakeningDiffLine(
        '+  expect(screen.getByText("Retry")).toBeVisible();',
      ),
    ).toBe(false);
    expect(
      isTimeoutOrMemoryWeakeningDiffLine("+const config = { retries: 0 };"),
    ).toBe(false);
  });

  const governedPolicyLines = [
    ["+jest", ".setTimeout(120_000);"].join(""),
    ["+jest", ".retryTimes(3);"].join(""),
    ["+const config = { retr", "ies: 2 };"].join(""),
    ['+args.push("--test', 'Timeout=120000");'].join(""),
    ['+args.push("--max-old', '-space-size=8192");'].join(""),
    ['+args.push("--force', 'Exit");'].join(""),
    ["+const passWith", "NoTests = true;"].join(""),
  ];

  it.each(governedPolicyLines)(
    "detects an actual timeout, retry, memory or pass policy change: %s",
    (line) => {
    expect(isTimeoutOrMemoryWeakeningDiffLine(line)).toBe(true);
    },
  );
});
