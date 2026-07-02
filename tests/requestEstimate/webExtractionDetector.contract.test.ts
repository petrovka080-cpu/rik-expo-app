import fs from "node:fs";
import path from "node:path";

describe("web request estimate extraction detector", () => {
  it("opens /request, extracts UI rows, trace fields, and fails on fake rows", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimateContinuousDetectGate.ts"),
      "utf8",
    );

    expect(source).toContain("/request?autoPrepare=1&prompt=");
    expect(source).toContain("extractUiRows");
    expect(source).toContain("consumer-repair-item-");
    expect(source).toContain("consumer-repair-item-calculation-trace-");
    expect(source).toContain("formula_id");
    expect(source).toContain("template_version");
    expect(source).toContain("detectEstimateFakeRows({ rows, promptArea: 54 })");
    expect(source).toContain("web_rows_extracted_from_ui");
    expect(source).toContain("web_no_fake_rows_detected_after_fix");
    expect(source).toContain("console_error_count");
  });
});
