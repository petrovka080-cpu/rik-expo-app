import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const FIXTURE_DIR = path.join(process.cwd(), "tests", "fixtures", "aiPromptPacks");

const packs = [
  {
    fixture: "ai_2000_real_work_prompts.json",
    source: "ai_2000_real_work_prompts.source.json",
    script: "scripts/e2e/runAi2000RealWorkEstimateAcceptanceProof.ts",
    expectedTotal: 2000,
    expectedDomains: 50,
    expectedFirstId: "W01-01-01",
    expectedLastId: "W50-08-05",
    expectedDuplicatePromptCount: 2,
  },
  {
    fixture: "ai_3000_additional_real_work_prompts.json",
    source: "ai_3000_additional_real_work_prompts.source.json",
    script: "scripts/e2e/runAi3000AdditionalRealWorkEstimateAcceptanceProof.ts",
    expectedTotal: 3000,
    expectedDomains: 60,
    expectedFirstId: "W051-01-01",
    expectedLastId: "W110-10-05",
    expectedDuplicatePromptCount: 0,
  },
  {
    fixture: "ai_5000_next_real_work_prompts.json",
    source: "ai_5000_next_real_work_prompts.source.json",
    script: "scripts/e2e/runAi5000NextRealWorkEstimateAcceptanceProof.ts",
    expectedTotal: 5000,
    expectedDomains: 100,
    expectedFirstId: "W111-01-01",
    expectedLastId: "W210-10-05",
    expectedDuplicatePromptCount: 0,
  },
];

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("exact AI prompt pack fixture fidelity", () => {
  it.each(packs)("loads exact attached fixture $fixture and not generated REAL_DIVERSE corpus", (config) => {
    const fixturePath = path.join(FIXTURE_DIR, config.fixture);
    const sourcePath = path.join(FIXTURE_DIR, config.source);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as { id: string; domain: string; prompt: string }[];
    const source = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as {
      repaired_json_sha256: string;
      total_prompts: number;
      domains_total: number;
      first_id: string;
      last_id: string;
      duplicate_prompt_count?: number;
    };

    expect(sha256(fixturePath)).toBe(source.repaired_json_sha256);
    expect(fixture).toHaveLength(config.expectedTotal);
    expect(new Set(fixture.map((item) => item.domain)).size).toBe(config.expectedDomains);
    expect(new Set(fixture.map((item) => item.id)).size).toBe(config.expectedTotal);
    expect(fixture[0].id).toBe(config.expectedFirstId);
    expect(fixture[fixture.length - 1].id).toBe(config.expectedLastId);
    expect(source.total_prompts).toBe(config.expectedTotal);
    expect(source.domains_total).toBe(config.expectedDomains);
    expect(source.first_id).toBe(config.expectedFirstId);
    expect(source.last_id).toBe(config.expectedLastId);
    expect(source.duplicate_prompt_count ?? 0).toBe(config.expectedDuplicatePromptCount);

    const script = fs.readFileSync(path.join(process.cwd(), config.script), "utf8");
    expect(script).toContain(config.fixture);
    expect(script).not.toContain("REAL_DIVERSE_10000_CONSTRUCTION_WORKS");
    expect(script).not.toContain("selectCoverageDomains");
  });
});
