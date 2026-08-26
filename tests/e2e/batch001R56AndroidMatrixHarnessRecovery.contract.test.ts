import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "scripts/e2e/runBatch002R52AndroidApi34Matrix50.ts"),
  "utf8",
);

describe("BATCH001 R5.6 Android matrix harness recoveries", () => {
  it("preserves the original ordinary-touch proof across one parameter input recovery", () => {
    expect(source).toContain("const preserveOpenedInteraction =");
    expect(source).toContain('activationMode: modes.includes("touch") ? "touch"');
    expect(source).toContain(
      "ordinaryTouchEvidence: opened.ordinaryTouchEvidence ?? next.ordinaryTouchEvidence",
    );
    expect(source).toContain("preserveOpenedInteraction(await openParameters(testCase))");
  });

  it("proves note insertion with an exact one-row count increase", () => {
    expect(source).toContain('findById(value, "request-estimate-items-total-count")');
    expect(source).toContain("itemCount(value) === beforeCount + 1");
    expect(source).toContain("rowCountIncreasedByOne: beforeCount !== null && afterCount === beforeCount + 1");
    expect(source).not.toContain("changed: snapshot.text !== before");
  });

  it("accepts only automatic return or an exact bounded MainActivity recovery after artifact viewing", () => {
    expect(source).toContain(
      "(evidence.returnedToMainActivity || evidence.environmentRecoveredToMainActivity)",
    );
    expect(source).toContain("release.includes(String(testCase.parentRevisionId))");
    expect(source).toContain("release.includes(String(testCase.releaseId))");
  });

  it("bounds missing native audit recovery to one new exact cold launch", () => {
    expect(source).toContain("missingNativeAudit.length > 0 && !auditRecoveryAttempted");
    expect(source).toContain(
      'launchExact(testCase, `${launchTag}-native-audit-recovery`, true)',
    );
    expect(source).toContain("nativeAuditRecovery: base.nativeAuditRecovery");
  });

  it("waits through one system-process ANR without closing the app", () => {
    expect(source).toContain('findById(current, "android:id/aerr_wait")');
    expect(source).toContain("const maximumSystemAnrWaitTaps = 4");
    expect(source).toContain(
      "systemAnrWaitTaps < maximumSystemAnrWaitTaps && waitNode?.clickable && tap(waitNode)",
    );
    expect(source).toContain('kind: "SYSTEM_PROCESS_ANR_WAIT"');
    expect(source).toContain("closeAppTapped: false");
    expect(source).not.toContain('findById(current, "android:id/aerr_close")');
  });

  it("proves row and parameter parity through an ordinary parameter-panel touch", () => {
    expect(source).toContain('includes("row_and_parameter_parity") === true');
    expect(source).toContain("? await openParameters(testCase)");
    expect(source).toContain('name: "row_and_parameter_parity_interaction"');
    expect(source).toContain('parameterParityProbe?.activationMode === "touch"');
    expect(source).toContain("parameterParityProbe: base.parameterParityProbe");
  });
});
