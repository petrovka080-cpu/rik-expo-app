import fs from "node:fs";
import path from "node:path";

describe("AI operational truth ledger architecture", () => {
  const resolverSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "aiLiveOperationalTruthLedger.ts"),
    "utf8",
  );
  const runnerSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiLiveOperationalTruthLedger.ts"),
    "utf8",
  );

  it("is a read-only artifact reconciliation layer, not a runtime or UI mutation path", () => {
    const combined = `${resolverSource}\n${runnerSource}`;
    expect(combined).toContain("GREEN_AI_LIVE_OPERATIONAL_TRUTH_LEDGER_READY");
    expect(combined).toContain("BLOCKED_AI_LIVE_OPERATIONAL_STALE_BLOCKER_UNSUPERSEDED");
    expect(combined).toContain("AI_OPERATIONAL_STALE_BLOCKER_RULES");
    expect(combined).not.toMatch(/use[A-Z][A-Za-z0-9]*\(|onPress=|navigation\.navigate|from\s+["']react["']/);
    expect(combined).not.toMatch(/insert\s+into|update\s+public\.|delete\s+from|truncate\s+table|drop\s+table/i);
    expect(combined).not.toMatch(/createClient|\.rpc\(|fetch\(|XMLHttpRequest/i);
  });

  it("keeps provider, secret, and fake-green invariants explicit", () => {
    const combined = `${resolverSource}\n${runnerSource}`;
    expect(combined).toContain("model_provider_changed: false");
    expect(combined).toContain("gpt_enabled: false");
    expect(combined).toContain("gemini_removed: false");
    expect(combined).toContain("auth_admin_used: false");
    expect(combined).toContain("list_users_used: false");
    expect(combined).toContain("service_role_used: false");
    expect(combined).toContain("fake_green_claimed: false");
    expect(combined).toContain("secrets_printed: false");
    expect(combined).not.toMatch(/rawProviderPayload|raw_prompt\s*:/i);
  });
});
