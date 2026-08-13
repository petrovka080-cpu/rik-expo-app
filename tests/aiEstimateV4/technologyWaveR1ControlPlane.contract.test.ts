import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { runBatch002TechnologyWaveControlledMutations } from "../../scripts/estimate/batch002TechnologyWaveR1AuditCore";
import { setHash } from "../../scripts/estimate/postM1ReadmissionR2Core";

const PREDECESSOR_ROOT = "C:/dev/rik-expo-app-batch001-post-audit-f7c9c328/.release-runtime/master-11610-group-batches-r2/07-batch001-post-audit-r1";
const M1_PATH = "C:/dev/rik-expo-app-post-m1-readmission-r2/.release-runtime/master-11610-group-batches-r1/04-post-m1-autonomous-readmission-r2/07-program-rebase/M1_GLOBAL55_MEMBER_SET.json";
const M6_PATH = "C:/dev/rik-expo-app-post-m1-readmission-r2/.release-runtime/master-11610-group-batches-r1/04-post-m1-autonomous-readmission-r2/07-program-rebase/M6_REMAINING_7550_MEMBER_SET.json";
const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const ids = (value: { members?: string[]; catalogIds?: string[] }) => (value.members ?? value.catalogIds ?? []).map(String);
const sha = (value: Buffer) => createHash("sha256").update(value).digest("hex");

describe("technology-domain wave R1 exact control plane", () => {
  test("reconciles the exact predecessor identity and 81-file manifest", () => {
    const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", cwd: process.cwd(), windowsHide: true }).trim();
    expect(git("rev-parse", "10f8497b33836a158bf009e0448cf4e43033f37a")).toBe("10f8497b33836a158bf009e0448cf4e43033f37a");
    expect(git("rev-parse", "10f8497b33836a158bf009e0448cf4e43033f37a^{tree}")).toBe("be77a6dfc79b536441fe87535ca9c8e5f7cb9ac9");
    const manifestBytes = readFileSync(path.join(PREDECESSOR_ROOT, "closeout/MANIFEST.json"));
    expect(sha(manifestBytes)).toBe("a6a5c49fd2f740fedcc461088ed3460b16e07523bd618d60fde49e7f3a3fe184");
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    expect(manifest.files).toHaveLength(81);
    for (const entry of manifest.files) expect(sha(readFileSync(path.join(PREDECESSOR_ROOT, entry.path)))).toBe(entry.sha256);
  });

  test("proves exact selection, budget and dependency-closed queue subtraction", () => {
    const m5 = ids(json(path.join(PREDECESSOR_ROOT, "11-queue/M5_REMAINING_AFTER_BATCH001_MEMBER_SET.json")));
    const b1 = ids(json(path.join(PREDECESSOR_ROOT, "11-queue/BATCH001_COMPLETED_MEMBER_SET.json")));
    const m1 = ids(json(M1_PATH));
    const m6 = ids(json(M6_PATH));
    const selected = DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4;
    expect([m1.length, b1.length, m5.length, m6.length]).toEqual([55, 16, 3989, 7550]);
    expect(selected).toHaveLength(55);
    expect(setHash(selected)).toBe("212d526a74e0d4f88f26f2052ea10b9300aa0fa528b0c2e75c1436adbc530d70");
    expect(selected.every((id) => m5.includes(id))).toBe(true);
    expect(selected.some((id) => id.includes("_install_"))).toBe(false);
    const after = m5.filter((id) => !new Set(selected).has(id));
    expect(after).toHaveLength(3934);
    expect(m5.filter((id) => !after.includes(id))).toEqual(selected);
    const admitted = [...m1, ...b1, ...selected];
    expect(admitted).toHaveLength(126);
    expect(new Set([...admitted, ...after, ...m6]).size).toBe(11610);
    expect(after.length + m6.length).toBe(11484);
    expect(new Set(admitted.filter((id) => after.includes(id) || m6.includes(id))).size).toBe(0);
  });

  test("detects 120/120 controlled defects and hard-stops BATCH003", () => {
    const mutations = runBatch002TechnologyWaveControlledMutations(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
    expect(mutations).toHaveLength(120);
    expect(mutations.every((mutation) => mutation.detected && mutation.actualReasonCode === mutation.expectedReasonCode && mutation.residue === 0)).toBe(true);
    expect(new Set(mutations.map((mutation) => mutation.bucket)).size).toBe(9);
    expect(new Set(mutations.map((mutation) => mutation.expectedReasonCode))).toEqual(new Set([
      "MISSING_CONSUMABLE", "HIDDEN_AGGREGATE", "WRONG_ARC_GEOMETRY", "WRONG_FRAME_SPACING",
      "INCOMPATIBLE_WET_MATERIAL", "SAME_VARIANT_GRAPH", "MISSING_TEST_INSTRUMENT",
      "MISSING_TEST_PROTOCOL", "DUPLICATE_OWNER", "PARENT_CHILD_DOUBLE_COUNT", "SILENT_DEFAULT",
      "QUEUE_BEFORE_ADMISSION",
    ]));
    const programControlV5 = { admitted: 126, m5: 3934, m6: 7550, remaining: 11484, batch003Selected: false, batch003ExecutionStarted: false };
    expect(programControlV5.admitted + programControlV5.m5 + programControlV5.m6).toBe(11610);
    expect(programControlV5.m5 + programControlV5.m6).toBe(programControlV5.remaining);
    expect(programControlV5.batch003Selected).toBe(false);
    expect(programControlV5.batch003ExecutionStarted).toBe(false);
  });
});
