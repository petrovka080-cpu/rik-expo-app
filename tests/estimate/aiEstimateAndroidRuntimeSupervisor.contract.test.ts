import fs from "node:fs";
import path from "node:path";

describe("AI estimate Android runtime supervisor", () => {
  it("requires owned server readiness and a single Android proof runtime", () => {
    const webSupervisor = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runProductionGradeEstimateWebSmoke.ts"),
      "utf8",
    );
    const lock = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/androidProofRuntimeLock.ts"),
      "utf8",
    );
    const naturalRunner = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimate11610AndroidApi34NaturalLanguageProof.ts"),
      "utf8",
    );
    const sessionSoakRunner = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimate11610AndroidApi34SessionSoak.ts"),
      "utf8",
    );

    expect(webSupervisor).toContain("probeProductionGradeWebServer");
    expect(webSupervisor).toContain("body.trim().length > 0");
    expect(webSupervisor).toContain("marker_found");
    expect(webSupervisor).toContain("WEB_SERVER_READINESS_FAILED");
    expect(webSupervisor).toContain("WEB_SERVER_EARLY_EXIT");
    expect(webSupervisor).toContain("WEB_SERVER_PORT_OWNERSHIP_CONFLICT");
    expect(webSupervisor).toContain("State -eq 'Listen'");
    expect(webSupervisor).toContain("OwningProcess -ne 0");
    expect(webSupervisor).toContain("server-supervisor.json");
    expect(webSupervisor).toContain("readiness-probes.json");
    expect(webSupervisor).toContain("owned_by_current_run");
    expect(webSupervisor).toContain("EXPO_PUBLIC_PROOF_RUNNER_DISABLE_SUPABASE_AUTH_PERSISTENCE");
    expect(webSupervisor).toContain("proof_runner_supabase_auth_persistence_flag");

    expect(lock).toContain("android-api34-proof-runtime.lock.json");
    expect(lock).toContain("ANDROID_PROOF_RUNTIME_LOCK_HELD");
    expect(lock).toContain("process.kill(pid, 0)");

    expect(naturalRunner).toContain("acquireAndroidProofRuntimeLock");
    expect(naturalRunner).toContain("requireOwned: true");
    expect(naturalRunner).toContain("WEB_SERVER_EMPTY_RESPONSE");
    expect(naturalRunner).toContain("ANDROID_INGRESS_FAILED");
    expect(naturalRunner).toContain("server_crash_count");
    expect(naturalRunner).toContain("ingress_failure_count");
    expect(naturalRunner).toContain("orphan_process_count");

    expect(sessionSoakRunner).toContain("acquireAndroidProofRuntimeLock");
    expect(sessionSoakRunner).toContain("requireOwned: true");
    expect(sessionSoakRunner).toContain("WEB_SERVER_EMPTY_RESPONSE");
    expect(sessionSoakRunner).toContain("ANDROID_INGRESS_FAILED");
    expect(sessionSoakRunner).toContain("server_crash_count");
    expect(sessionSoakRunner).toContain("ingress_failure_count");
    expect(sessionSoakRunner).toContain("orphan_process_count");
    expect(sessionSoakRunner).toContain("withDiagnosticTimeout");
  });
});
