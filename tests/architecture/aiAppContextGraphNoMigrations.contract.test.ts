import { listAiAppContextGraphFiles, readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no migrations", () => {
  it("does not add migration files or migration commands to the graph layer", () => {
    expect(listAiAppContextGraphFiles().some((file) => file.includes("migration"))).toBe(false);
    expect(readAiAppContextGraphSource()).not.toMatch(/supabase\/migrations|create table|alter table|create policy/i);
  });
});
