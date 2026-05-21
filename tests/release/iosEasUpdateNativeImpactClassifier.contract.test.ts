import {
  classifyNativeRuntimeImpact,
  classifyNativeRuntimeImpactFile,
} from "../../scripts/release/nativeRuntimeImpact";

describe("iOS EAS Update native runtime impact classifier", () => {
  it("allows JS/UI/layout changes through OTA without requiring a new iOS build", () => {
    const result = classifyNativeRuntimeImpact({
      changedFiles: [
        "src/screens/foreman/ForemanEditorSection.tsx",
        "app/(tabs)/_layout.tsx",
        "app/global.css",
      ],
    });

    expect(result.nativeImpact).toBe(false);
    expect(result.iosBuildRequired).toBe(false);
    expect(result.otaAllowed).toBe(true);
    expect(result.otaRequired).toBe(true);
    expect(result.nativeBuildRequiredFiles).toEqual([]);
  });

  it("treats backend migrations as OTA-safe for iOS runtime decisions", () => {
    const result = classifyNativeRuntimeImpact({
      changedFiles: ["supabase/migrations/20260521120000_media_storage_upload_processing_core.sql"],
    });

    expect(result.nativeImpact).toBe(false);
    expect(result.iosBuildRequired).toBe(false);
    expect(result.otaAllowed).toBe(true);
    expect(result.backendMigrationPresent).toBe(true);
    expect(result.backendMigrationFiles).toEqual([
      "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql",
    ]);
  });

  it("requires a new iOS build for native runtime and app config changes", () => {
    const result = classifyNativeRuntimeImpact({
      changedFiles: ["ios/RikExpoApp/Info.plist", "android/app/src/main/AndroidManifest.xml", "app.json", "eas.json"],
    });

    expect(result.nativeImpact).toBe(true);
    expect(result.iosBuildRequired).toBe(true);
    expect(result.otaAllowed).toBe(false);
    expect(result.runtimeVersionChanged).toBe(true);
    expect(result.channelChanged).toBe(true);
    expect(result.nativeBuildRequiredFiles).toEqual(
      expect.arrayContaining(["ios/RikExpoApp/Info.plist", "android/app/src/main/AndroidManifest.xml", "app.json", "eas.json"]),
    );
  });

  it("does not turn proof/test/artifact changes into iOS build requirements", () => {
    const result = classifyNativeRuntimeImpact({
      changedFiles: [
        "scripts/release/runIosOtaChannelProof.ts",
        "tests/release/iosEasUpdateNativeImpactClassifier.contract.test.ts",
        "artifacts/S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_matrix.json",
      ],
    });

    expect(result.nativeImpact).toBe(false);
    expect(result.iosBuildRequired).toBe(false);
    expect(result.proofOrTestFiles).toContain("tests/release/iosEasUpdateNativeImpactClassifier.contract.test.ts");
  });

  it("blocks dependency mutations unless package.json is known to be tooling-only", () => {
    expect(classifyNativeRuntimeImpactFile("package.json").nativeImpact).toBe(true);
    expect(
      classifyNativeRuntimeImpactFile("package.json", {
        packageJsonMutationKind: "scripts-only",
      }).nativeImpact,
    ).toBe(false);
  });
});
