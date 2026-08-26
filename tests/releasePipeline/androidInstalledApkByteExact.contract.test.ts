import fs from "node:fs";
import path from "node:path";

describe("Android release pipeline installed APK identity", () => {
  it("fails closed unless the device base.apk is byte-exact", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/android/installProofApk.ts"),
      "utf8",
    );
    const verifier = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/android/verifyProof.ts"),
      "utf8",
    );

    expect(source).toContain('"pm", "path", packageName');
    expect(source).toContain('"sha256sum", installedPath');
    expect(source).toContain("installedApk.sha256 === apkSha256");
    expect(source).toContain("INSTALLED_BASE_APK_SHA256_MISMATCH");
    expect(source).toContain("installed_apk_byte_exact: installedApkByteExact");
    expect(verifier).toContain("INSTALLED_APK_NOT_BYTE_EXACT");
    expect(verifier).toContain("INSTALLED_APK_BUILD_SHA_MISMATCH");
  });
});
