import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

type MatrixRow = {
  table: string;
  actual_risk_level: string;
  next_action: string;
};

type ShortlistRow = {
  relation: string;
  outcome: string;
};

type MatrixPayload = {
  wave: string;
  scope: {
    shortlist_strategy: string;
  };
  tables: MatrixRow[];
  shortlist: ShortlistRow[];
};

describe("RLS remaining tables verification matrix", () => {
  it("keeps hardened tables out of the stale shortlist and emits a current remaining-wave matrix", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rls-remaining-"));
    const outputPath = path.join(tempDir, "matrix.json");

    try {
      execFileSync(
        process.execPath,
        [
          path.join(process.cwd(), "scripts", "rlsCoveragePhase1.mjs"),
          "--strategy",
          "remaining",
          "--wave",
          "RLS_REMAINING_TABLES_VERIFICATION",
          "--output",
          outputPath,
        ],
        {
          cwd: process.cwd(),
          stdio: "pipe",
        },
      );

      const payload = JSON.parse(fs.readFileSync(outputPath, "utf8")) as MatrixPayload;
      const tableByName = new Map(payload.tables.map((row) => [row.table, row]));

      expect(payload.wave).toBe("RLS_REMAINING_TABLES_VERIFICATION");
      expect(payload.scope.shortlist_strategy).toBe("remaining");

      expect(tableByName.get("app_errors")).toMatchObject({
        actual_risk_level: "low",
        next_action: "verified_safe_after_hardening",
      });
      expect(tableByName.get("submit_jobs")).toMatchObject({
        actual_risk_level: "low",
        next_action: "verified_safe_after_hardening",
      });
      expect(tableByName.get("ai_configs")).toMatchObject({
        actual_risk_level: "low",
        next_action: "verified_safe_after_hardening",
      });
      expect(tableByName.get("ai_reports")).toMatchObject({
        actual_risk_level: "low",
        next_action: "verified_safe_after_hardening",
      });
      expect(tableByName.get("chat_messages")).toMatchObject({
        actual_risk_level: "low",
        next_action: "verified_safe_after_hardening",
      });
      expect(tableByName.get("company_invites")).toMatchObject({
        actual_risk_level: "low",
        next_action: "verified_safe_after_hardening",
      });

      for (const relation of [
        "app_errors",
        "submit_jobs",
        "ai_configs",
        "ai_reports",
        "chat_messages",
        "company_invites",
      ]) {
        expect(payload.shortlist).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ relation })]),
        );
      }

      expect(payload.shortlist).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            relation: "company_members",
            outcome: "chosen next hardening candidate",
          }),
          expect.objectContaining({
            relation:
              "notifications/proposal_payments/proposals/request_items/requests/warehouse_issues",
            outcome: "policy too broad / too wide",
          }),
          expect.objectContaining({
            outcome: "remaining high-risk candidate",
          }),
        ]),
      );

      for (const item of payload.shortlist) {
        if (item.outcome === "policy too broad / too wide") {
          continue;
        }
        const row = tableByName.get(item.relation);
        expect(row).toBeDefined();
        expect(row?.actual_risk_level).not.toBe("low");
        expect([
          "verify_live_db_or_prepare_single-table_hardening",
          "close_repo_evidence_gap",
        ]).toContain(row?.next_action);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
