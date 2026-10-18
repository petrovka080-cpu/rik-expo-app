import { resolveMasterRuntimeAdmissionMetadataR1 as project } from "./prepareMasterSingleDefinitionSuccessorR1";

const note = (count: number) => `11610 is the immutable historical source-identity reconciliation (10322 canonical owners plus 1288 redirects); the current cumulative runtime also preserves ${count} separately identified inherited admissions.`;
const current = () => ({ identities: 11610, visibleCanonicalDefinitions: 10322, aliasesRedirects: 1288,
  currentRuntimeDefinitions: 10469, runtimeAdditionalAdmissions: 11,
  currentInventoryRowsIncludingAliases: 11621, denominatorNote: note(11), owner: "UNCHANGED_OWNER" });

describe("local runtime admission counters", () => {
  it("advances exactly the three append metadata fields without mutating the historical basis", () => {
    const value = Object.freeze(current());
    expect(project(value, 10469, 10470)).toEqual({runtimeAdditionalAdmissions: 12,
      currentInventoryRowsIncludingAliases: 11622, denominatorNote: note(12)});
    expect(value).toEqual(current());
  });
  it("keeps replacement and legacy pointer metadata unchanged", () => {
    expect(project(current(), 10469, 10469)).toEqual({});
    expect(project({currentRuntimeDefinitions: 10469}, 10469, 10470)).toEqual({});
  });
  it.each(["runtimeAdditionalAdmissions", "currentInventoryRowsIncludingAliases", "denominatorNote"])(
    "rejects a partially present bundle before publication: %s", key => {
      const value: Record<string, unknown> = {...current()};delete value[key];
      expect(() => project(value, 10469, 10470)).toThrow("MASTER_POINTER_ADMISSION_PARTIAL_METADATA");
    });
  it.each([
    {currentRuntimeDefinitions: 10468}, {runtimeAdditionalAdmissions: -1},
    {currentInventoryRowsIncludingAliases: 11620}, {identities: 11611},
    {visibleCanonicalDefinitions: "10322"}, {aliasesRedirects: null},
    {denominatorNote: note(10)},
  ])("rejects inconsistent counters, provenance or prose: %j", patch => {
    expect(() => project({...current(), ...patch}, 10469, 10470)).toThrow("MASTER_POINTER_ADMISSION_");
  });
  it.each([[10469, 10471], [10469, 10468], [NaN, 10470], [10469, Number.MAX_SAFE_INTEGER + 1]])(
    "rejects invalid or multi-definition count changes: %s -> %s", (parent, next) => {
      expect(() => project(current(), parent, next)).toThrow("MASTER_POINTER_ADMISSION_");
    });
  it("validates neither an increment nor metadata for a replacement of a legacy pointer", () => {
    expect(project({denominatorNote: "historical legacy text"}, 500, 500)).toEqual({});
  });
});
