import fs from "fs";
import path from "path";

const readProfileFile = (fileName: string): string =>
  fs.readFileSync(path.join(__dirname, fileName), "utf8");

const readProfileComponentFile = (fileName: string): string =>
  fs.readFileSync(path.join(__dirname, "components", fileName), "utf8");

describe("ProfileContent decomposition", () => {
  it("keeps the load-error shell in a render-only component", () => {
    const profileContentSource = readProfileFile("ProfileContent.tsx");
    const loadStateSource = readProfileComponentFile("ProfileContentLoadState.tsx");

    expect(profileContentSource).toContain("ProfileLoadErrorState");
    expect(profileContentSource).toContain("./components/ProfileContentLoadState");
    expect(profileContentSource).not.toContain("ProfileOtaDiagnosticsCard");
    expect(profileContentSource).not.toContain("profile-ota-diagnostics-fallback");
    expect(profileContentSource.split("\n").length).toBeLessThanOrEqual(447 - 20);

    expect(loadStateSource).toContain("export function ProfileLoadErrorState");
    expect(loadStateSource).toContain("profile-load-error-shell");
    expect(loadStateSource).toContain("profile-load-retry");
    expect(loadStateSource).toContain("profile-ota-diagnostics-fallback");
    expect(loadStateSource).toContain("ProfileOtaDiagnosticsCard");

    expect(loadStateSource).not.toContain("loadProfileScreenData");
    expect(loadStateSource).not.toContain("saveProfileDetails");
    expect(loadStateSource).not.toContain("signOutProfileSession");
    expect(loadStateSource).not.toContain("useRouter");
    expect(loadStateSource).not.toContain("ImagePicker");

    expect(profileContentSource).toContain("loadProfileScreenData");
    expect(profileContentSource).toContain("saveProfileDetails");
    expect(profileContentSource).toContain("signOutProfileSession");
    expect(profileContentSource).toContain("useRouter");
    expect(profileContentSource).toContain("ImagePicker");
  });
});
