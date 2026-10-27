import AsyncStorage from "@react-native-async-storage/async-storage";
import { canonicalEstimateSha256HexText } from "./canonicalEstimateSha256";
import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import { canonicalPreliminaryNeedEvidenceFromStorage } from "./canonicalEstimatePreliminaryNeedTransport";
import { cacheCanonicalPreliminaryNeedEvidence, readCachedCanonicalPreliminaryNeedEvidence } from "./canonicalEstimatePreliminaryNeedEvidenceCache";

const fixture = async () => {
  const basis = { row_id: "rc09:need:material", title_ru: "Материал", quantity: "72", calculation_trace: { formula: "length" }, normative_trace: [] };
  const hash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
  return canonicalPreliminaryNeedEvidenceFromStorage({ id: "11111111-1111-4111-8111-111111111111", release_id: "22222222-2222-4222-8222-222222222222",
    definition_version_id: null, checksum_sha256: "a".repeat(64), amendment_contract: { parameterSources: {
      preliminaryNeeds: [{ ...basis, need_sha256: hash(basis) }] } } }, basis.row_id, hash);
};
describe("separate private preliminary evidence cache", () => {
  beforeEach(async () => AsyncStorage.clear());
  it("retains one immutable copy for offline disclosure and separates account/checksum scopes", async () => {
    const evidence = await fixture();
    await cacheCanonicalPreliminaryNeedEvidence("owner-a", evidence);
    await cacheCanonicalPreliminaryNeedEvidence("owner-a", evidence);
    expect(await readCachedCanonicalPreliminaryNeedEvidence("owner-a", evidence.reference)).toEqual(evidence);
    expect(await readCachedCanonicalPreliminaryNeedEvidence("owner-b", evidence.reference)).toBeNull();
    expect(await readCachedCanonicalPreliminaryNeedEvidence("owner-a", { ...evidence.reference, checksumSha256: "b".repeat(64) })).toBeNull();
    expect(JSON.parse(await AsyncStorage.getItem("@estimate-platform/preliminary-evidence/v1") ?? "{}").entries).toHaveLength(1);
  });
  it("ignores malformed and hash-corrupt cache entries so online loading can proceed", async () => {
    const evidence = await fixture();
    await AsyncStorage.setItem("@estimate-platform/preliminary-evidence/v1", JSON.stringify({ version: 1, entries: [null,
      { ownerUserId: "owner-a" }, { ownerUserId: "owner-a", evidence: { ...evidence, rawNeed: { ...evidence.rawNeed, quantity: "0" } } }] }));
    expect(await readCachedCanonicalPreliminaryNeedEvidence("owner-a", evidence.reference)).toBeNull();
    await expect(cacheCanonicalPreliminaryNeedEvidence("owner-a", { ...evidence, rawNeed: {} })).rejects.toThrow("INTEGRITY_FAILED");
  });
});
