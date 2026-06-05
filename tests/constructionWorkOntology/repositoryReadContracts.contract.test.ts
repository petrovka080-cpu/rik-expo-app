import {
  findWorkByAlias,
  findWorkByKey,
  listAliasesForWork,
  listCatalogLinksForWork,
  listRecipeRowsForWork,
  listWorksByDomain,
} from "../../src/lib/constructionWork/constructionWorkRepository";
import type { ConstructionWorkReadClient } from "../../src/lib/constructionWork/constructionWorkTypes";
import { readArtifactJson, readText } from "./constructionWorkOntologyTestHelpers";

type Result<T> = { data: T[] | T | null; error: null };

function readFakeColumn<T>(row: T, column: string): unknown {
  if (row == null || typeof row !== "object") return undefined;
  return (row as Record<string, unknown>)[column];
}

class FakeBuilder<T> implements PromiseLike<Result<T>> {
  private filters: Array<[string, unknown]> = [];
  private maxRows: number | null = null;
  private single = false;

  constructor(private rows: T[]) {}

  eq(column: string, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }

  order(): this {
    return this;
  }

  limit(count: number): this {
    this.maxRows = count;
    return this;
  }

  maybeSingle(): PromiseLike<Result<T>> {
    this.single = true;
    return this;
  }

  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }

  private resolve(): Result<T> {
    let rows = this.rows.filter((row) =>
      this.filters.every(([column, value]) => readFakeColumn(row, column) === value),
    );
    if (this.maxRows != null) rows = rows.slice(0, this.maxRows);
    return {
      data: this.single ? rows[0] ?? null : rows,
      error: null,
    };
  }
}

const work = {
  id: "work-1",
  work_key: "concrete.grade_beam_installation",
  domain_key: "concrete",
  system_key: "structural",
  element_key: "grade_beam",
  operation_key: "installation",
  title_ru: "Grade beam concrete installation",
  title_en: "Grade beam concrete installation",
  description_ru: "Internal custom work definition.",
  default_unit: "m3",
  measurement_kind: "volume",
  complexity_level: "standard",
  is_active: true,
  source_kind: "internal_custom",
  created_at: "2026-06-05T00:00:00.000Z",
  updated_at: "2026-06-05T00:00:00.000Z",
};

const fakeClient: ConstructionWorkReadClient = {
  from<T = unknown>(table: string) {
    const rowsByTable: Record<string, Record<string, unknown>[]> = {
      construction_work_definitions: [work],
      construction_work_aliases: [
        {
          id: "alias-1",
          work_id: "work-1",
          alias_text: "Ж/Б балка 2 м³",
          normalized_alias: "жб балка 2 м3",
          language: "ru",
          alias_kind: "user_phrase",
          confidence_weight: 1,
          is_active: true,
          created_at: "2026-06-05T00:00:00.000Z",
        },
      ],
      construction_work_catalog_links: [],
      construction_work_recipe_rows: [
        {
          id: "recipe-1",
          work_id: "work-1",
          row_kind: "material",
          title_ru: "Base recipe row",
          unit: "m3",
          quantity_formula: "volume_m3",
          unit_price_source: "catalog_or_reference",
          sort_order: 10,
          is_required: true,
          created_at: "2026-06-05T00:00:00.000Z",
        },
      ],
    };

    return {
      select: () => new FakeBuilder<T>((rowsByTable[table] ?? []).map((row) => row as T)),
    };
  },
};

it("exposes read-only repository primitives without semantic search, OpenSearch, or LLM resolver behavior", async () => {
  const source = readText("src/lib/constructionWork/constructionWorkRepository.ts");
  const matrix = readArtifactJson<Record<string, unknown>>("repository_contract_matrix.json");

  await expect(findWorkByKey("concrete.grade_beam_installation", fakeClient)).resolves.toMatchObject({
    work_key: "concrete.grade_beam_installation",
  });
  await expect(findWorkByAlias("Ж/Б балка 2 м³", fakeClient)).resolves.toMatchObject({
    work_key: "concrete.grade_beam_installation",
  });
  await expect(listWorksByDomain("concrete", fakeClient)).resolves.toHaveLength(1);
  await expect(listAliasesForWork("concrete.grade_beam_installation", fakeClient)).resolves.toHaveLength(1);
  await expect(listCatalogLinksForWork("concrete.grade_beam_installation", fakeClient)).resolves.toHaveLength(0);
  await expect(listRecipeRowsForWork("concrete.grade_beam_installation", fakeClient)).resolves.toHaveLength(1);

  expect(source).not.toMatch(/semantic|opensearch|embedding|llm|prompt/i);
  expect(matrix).toEqual(
    expect.objectContaining({
      repository_read_contracts_green: true,
      semantic_search_implemented: false,
      opensearch_query_implemented: false,
      llm_resolver_implemented: false,
      fake_green_claimed: false,
    }),
  );
});
