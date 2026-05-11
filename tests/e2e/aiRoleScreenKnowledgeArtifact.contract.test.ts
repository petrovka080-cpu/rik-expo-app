import fs from "fs";
import path from "path";

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_CORE_03A_EMULATOR_ROLE_SCREEN_KNOWLEDGE_emulator.json",
);
const REQUIRED_ROLES = ["director", "foreman", "buyer", "accountant", "contractor"] as const;
const ALLOWED_BLOCKED = new Set([
  "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD",
  "BLOCKED_AI_KNOWLEDGE_NOT_EXPOSED_TO_RUNTIME_SURFACE",
  "BLOCKED_E2E_ROLE_AUTH_HARNESS_NOT_AVAILABLE",
]);

describe("AI role-screen knowledge emulator artifact", () => {
  it("cannot claim fake green and must encode all role-flow invariants", () => {
    expect(fs.existsSync(ARTIFACT_PATH)).toBe(true);
    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8")) as {
      final_status?: string;
      flows?: Record<string, string>;
      mutationsCreated?: number;
      approvalRequiredObserved?: boolean;
      roleLeakageObserved?: boolean;
      fakePassClaimed?: boolean;
      exactReason?: string | null;
    };

    expect(artifact.fakePassClaimed).toBe(false);
    for (const role of REQUIRED_ROLES) {
      expect(typeof artifact.flows?.[role]).toBe("string");
    }

    if (artifact.final_status === "GREEN_AI_ROLE_SCREEN_KNOWLEDGE_EMULATOR_CLOSEOUT") {
      for (const role of REQUIRED_ROLES) {
        expect(artifact.flows?.[role]).toBe("PASS");
      }
      expect(artifact.mutationsCreated).toBe(0);
      expect(artifact.approvalRequiredObserved).toBe(true);
      expect(artifact.roleLeakageObserved).toBe(false);
      return;
    }

    expect(ALLOWED_BLOCKED.has(String(artifact.final_status))).toBe(true);
    expect(typeof artifact.exactReason).toBe("string");
    expect(String(artifact.exactReason).length).toBeGreaterThan(0);
  });
});
