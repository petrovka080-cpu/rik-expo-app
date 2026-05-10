import {
  collectSelectInventoryFromSource,
  type SelectInventoryEntry,
} from "../../scripts/data/unboundedSelectInventory";

function scanSource(text: string, file = "src/lib/api/example.ts"): SelectInventoryEntry[] {
  return collectSelectInventoryFromSource({ file, text }).entries;
}

describe("unbounded select repeatable inventory scanner", () => {
  it("ignores comments, string literals, and non-Supabase Platform.select calls", () => {
    const source = [
      'const literal = "supabase.from(\\"requests\\").select(\\"*\\")";',
      "// await supabase.from(\"requests\").select(\"*\");",
      "const style = Platform.select({ web: { cursor: \"pointer\" } });",
      "await supabase.from(\"requests\").select(\"id\").limit(1);",
    ].join("\n");

    const result = collectSelectInventoryFromSource({
      file: "src/lib/api/example.ts",
      text: source,
    });

    expect(result.excludedNonSupabaseSelectCalls).toBe(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual(
      expect.objectContaining({
        table: "requests",
        queryString: "id",
        hasLimit: true,
        action: "already_bounded",
      }),
    );
  });

  it("classifies direct limit, range, single, and maybeSingle chains as already bounded", () => {
    const entries = scanSource(
      [
        "await supabase.from(\"requests\").select(\"*\").limit(25);",
        "await supabase.from(\"request_items\").select(\"id\").range(0, 49);",
        "await supabase.from(\"profiles\").select(\"id, name\").single();",
        "await supabase.from(\"companies\").select(\"id\").maybeSingle();",
      ].join("\n"),
    );

    expect(entries).toHaveLength(4);
    expect(entries.map((entry) => entry.action)).toEqual([
      "already_bounded",
      "already_bounded",
      "already_bounded",
      "already_bounded",
    ]);
    expect(entries.map((entry) => entry.risk)).toEqual(["low", "low", "low", "low"]);
  });

  it("recognizes page-through helper and normalizePage/range contexts as indirect bounds", () => {
    const entries = scanSource(
      [
        "async function loadRequests() {",
        "  return loadPagedRowsWithCeiling(() =>",
        "    supabase.from(\"requests\").select(\"*\").order(\"created_at\"),",
        "  );",
        "}",
        "async function loadItems(pageInput: unknown) {",
        "  const page = normalizePage(pageInput);",
        "  return supabase",
        "    .from(\"request_items\")",
        "    .select(\"id, request_id\")",
        "    .range(page.from, page.to);",
        "}",
      ].join("\n"),
    );

    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.action === "already_bounded")).toBe(true);
    expect(entries.every((entry) => entry.hasIndirectBound || entry.hasRange)).toBe(true);
  });

  it("classifies mutation-returning selects as domain bounded", () => {
    const entries = scanSource(
      [
        "async function createRequest(payload: unknown) {",
        "  return supabase.from(\"requests\").insert(payload).select(\"*\");",
        "}",
      ].join("\n"),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        mutationReturning: true,
        action: "domain_bounded",
        risk: "low",
      }),
    );
  });

  it("keeps plain runtime list reads as fix_now candidates", () => {
    const entries = scanSource('await supabase.from("requests").select("id, title").order("created_at");');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        queryType: "list",
        action: "fix_now",
        risk: "high",
      }),
    );
  });

  it("keeps export/report reads on the export allowlist", () => {
    const entries = scanSource(
      'await supabase.from("request_items").select("*").order("position");',
      "src/lib/pdf/requestReportBuilder.ts",
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        queryType: "export",
        action: "export_allowlist",
        risk: "medium",
      }),
    );
  });
});
