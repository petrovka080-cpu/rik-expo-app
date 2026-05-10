import fs from "node:fs";
import path from "node:path";

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const sliceBetween = (source: string, startNeedle: string, endNeedle: string): string => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe("S_NIGHT_DATA_04_CALC_FIELDS_DICTIONARY_PAGE_THROUGH", () => {
  const sourcePath = "src/components/foreman/useCalcFields.ts";

  it("keeps calc-field dictionary reads on guarded page-through ceilings", () => {
    const source = readSource(sourcePath);
    const fetchScope = sliceBetween(
      source,
      "async function fetchCalcFieldRows",
      "export function useCalcFields",
    );

    expect(source).toContain(
      [
        "const CALC_FIELDS_PAGE_DEFAULTS = {",
        "  pageSize: 100,",
        "  maxPageSize: 100,",
        "  maxRows: 5000,",
        "};",
      ].join("\n"),
    );
    expect(fetchScope).toContain("loadPagedRowsWithCeiling<Record<string, unknown>>");
    expect(fetchScope).toContain("createGuardedPagedQuery(");
    expect(fetchScope).toContain("isRecordRow");
    expect(fetchScope).toContain("`useCalcFields.${viewName}`");
    expect(fetchScope).toContain("CALC_FIELDS_PAGE_DEFAULTS");
    expect(fetchScope).toContain(".from(viewName)");
    expect(fetchScope).toContain(".eq(\"work_type_code\", workTypeCode)");
    expect(fetchScope).toContain(".order(\"sort_order\", { ascending: true })");
    expect(fetchScope).toContain(".order(\"basis_key\", {");
    expect(fetchScope).toContain("ascending: true");

    for (const column of [
      "basis_key,",
      "label_ru,",
      "uom_code,",
      "is_required,",
      "hint_ru,",
      "default_value,",
      "sort_order,",
      "used_in_norms",
    ]) {
      expect(fetchScope).toContain(column);
    }

    expect(source).not.toContain('.select("*")');
    expect(source).not.toContain(".select('*')");
  });

  it("keeps empty/short-page exit and max-row fail-closed behavior in the shared helper", () => {
    const core = readSource("src/lib/api/_core.ts");
    const helperScope = sliceBetween(
      core,
      "export async function loadPagedRowsWithCeiling",
      "const errorMessageLower",
    );

    expect(helperScope).toContain("const maxRows = Math.max(1, toInt(defaults.maxRows, 5000));");
    expect(helperScope).toContain("const maxPages = deriveMaxPages(defaults, maxRows);");
    expect(helperScope).toContain("for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1)");
    expect(helperScope).toContain("queryFactory().range(page.from, Math.min(page.to, maxRows - 1))");
    expect(helperScope).toContain("if (rows.length + pageRows.length > maxRows)");
    expect(helperScope).toContain("return { data: null, error: buildPageCeilingError(maxRows) };");
    expect(helperScope).toContain("if (pageRows.length < page.pageSize) return { data: rows, error: null };");
    expect(helperScope).toContain("const probe = await queryFactory().range(maxRows, maxRows);");
  });

  it("keeps family lookup bounded and UI filtering behavior unchanged", () => {
    const source = readSource(sourcePath);
    const lookupScope = sliceBetween(source, "let familyCode: string | null = null;", "const rawList");

    expect(lookupScope).toContain(".from(\"v_work_types_picker\")");
    expect(lookupScope).toContain(".select(\"family_code\")");
    expect(lookupScope).toContain(".eq(\"code\", rawWorkTypeCode)");
    expect(lookupScope).toContain(".maybeSingle()");
    expect(source).toContain("setFields(list.filter((f) => f.hiddenInUi !== true));");
    expect(source).not.toContain("catch {");
    expect(source).toContain("catch (_familyCodeError)");
    expect(source).toContain("catch (_calcFieldsError)");
  });
});
