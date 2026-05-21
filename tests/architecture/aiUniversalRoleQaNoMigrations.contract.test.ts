import { listAiUniversalRoleQaFiles, readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no migrations", () => {
  it("does not add schema or migration behavior", () => {
    const source = readAiUniversalRoleQaSource();
    expect(listAiUniversalRoleQaFiles().some((file) => file.includes("migration"))).toBe(false);
    expect(source).not.toMatch(/create table|alter table|drop table|migration/i);
  });
});
