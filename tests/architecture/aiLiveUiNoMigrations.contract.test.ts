import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no migrations", () => {
  it("does not reference migration paths or schema changes", () => {
    const source = readLiveUiSource();
    expect(source).not.toMatch(/supabase\/migrations|alter table|create table|drop table/i);
  });
});
