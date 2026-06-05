import {
  resolveConstructionWorkClassification,
  resolveConstructionWorkClassificationFromRows,
} from "../../src/lib/constructionWork/constructionWorkRepository";
import type {
  ConstructionWorkAlias,
  ConstructionWorkDefinition,
  ConstructionWorkQueryBuilder,
  ConstructionWorkReadClient,
  ConstructionWorkSelectRequest,
} from "../../src/lib/constructionWork/constructionWorkTypes";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Result<T> = { data: T[] | T | null; error: null };

const timestamp = "2026-06-05T00:00:00.000Z";

function work(overrides: Partial<ConstructionWorkDefinition>): ConstructionWorkDefinition {
  return {
    id: "missing",
    work_key: "missing.work",
    domain_key: "missing",
    system_key: null,
    element_key: null,
    operation_key: "work",
    title_ru: "Missing work",
    title_en: "Missing work",
    description_ru: null,
    default_unit: "m2",
    measurement_kind: "area",
    complexity_level: "standard",
    is_active: true,
    source_kind: "internal_custom",
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function alias(overrides: Partial<ConstructionWorkAlias>): ConstructionWorkAlias {
  return {
    id: "alias-missing",
    work_id: "work-missing",
    alias_text: "missing alias",
    normalized_alias: "missing alias",
    language: "en",
    alias_kind: "user_phrase",
    confidence_weight: 1,
    is_active: true,
    created_at: timestamp,
    ...overrides,
  };
}

const works = [
  work({
    id: "work-asphalt",
    work_key: "roadworks.asphalt_pavement_installation",
    domain_key: "roadworks",
    system_key: "pavement",
    element_key: "asphalt_pavement",
    operation_key: "installation",
    title_ru: "Asphalt pavement installation",
    title_en: "Asphalt pavement installation",
  }),
  work({
    id: "work-curb",
    work_key: "roadworks.concrete_curb_installation",
    domain_key: "roadworks",
    system_key: "road_edge",
    element_key: "concrete_curb",
    operation_key: "installation",
    title_ru: "Concrete curb installation",
    title_en: "Concrete curb installation",
    default_unit: "m",
    measurement_kind: "length",
  }),
  work({
    id: "work-grade-beam",
    work_key: "concrete.grade_beam_installation",
    domain_key: "concrete",
    system_key: "structural",
    element_key: "grade_beam",
    operation_key: "installation",
    title_ru: "Grade beam concrete installation",
    title_en: "Grade beam concrete installation",
    default_unit: "m3",
    measurement_kind: "volume",
  }),
];

const aliases = [
  alias({
    id: "alias-asphalt-title",
    work_id: "work-asphalt",
    alias_text: "Asphalt pavement installation",
    normalized_alias: "asphalt pavement installation",
    alias_kind: "canonical_title",
  }),
  alias({
    id: "alias-asphalt-key",
    work_id: "work-asphalt",
    alias_text: "roadworks asphalt pavement installation",
    normalized_alias: "roadworks asphalt pavement installation",
    alias_kind: "work_key_phrase",
    confidence_weight: 0.95,
  }),
  alias({
    id: "alias-curb-title",
    work_id: "work-curb",
    alias_text: "Concrete curb installation",
    normalized_alias: "concrete curb installation",
    alias_kind: "canonical_title",
  }),
  alias({
    id: "alias-grade-beam-title",
    work_id: "work-grade-beam",
    alias_text: "Grade beam concrete installation",
    normalized_alias: "grade beam concrete installation",
    alias_kind: "canonical_title",
  }),
];

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
      this.filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value),
    );
    if (this.maxRows != null) rows = rows.slice(0, this.maxRows);
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }
}

function fakeClient(selectedTables: string[]): ConstructionWorkReadClient {
  return {
    select<T = unknown>(request: ConstructionWorkSelectRequest): ConstructionWorkQueryBuilder<T> {
      selectedTables.push(request.table);
      const rowsByTable: Record<string, unknown[]> = {
        construction_work_definitions: works,
        construction_work_aliases: aliases,
      };
      return new FakeBuilder<T>((rowsByTable[request.table] ?? []).map((row) => row as T)).limit(request.limit);
    },
  };
}

describe("construction work classification resolver hybrid retrieval", () => {
  it("prefers exact ontology aliases before token-overlap candidates", () => {
    const exact = resolveConstructionWorkClassificationFromRows({
      input: "roadworks asphalt pavement installation",
      works,
      aliases,
    });

    expect(exact.bestMatch?.work.work_key).toBe("roadworks.asphalt_pavement_installation");
    expect(exact.bestMatch?.matchKind).toBe("exact_work_key");
    expect(exact.exactMatch).toBe(true);
    expect(exact.ambiguous).toBe(false);
  });

  it("returns a deterministic token-overlap match without falling back to a generic construction bucket", () => {
    const result = resolveConstructionWorkClassificationFromRows({
      input: "asphalt pavement 250 m2",
      works,
      aliases,
    });

    expect(result.bestMatch?.work.work_key).toBe("roadworks.asphalt_pavement_installation");
    expect(result.bestMatch?.matchKind).toBe("token_overlap");
    expect(result.bestMatch?.matchedTokens).toEqual(["asphalt", "pavement"]);
    expect(result.candidates.map((candidate) => candidate.work.work_key)).toContain(
      "roadworks.asphalt_pavement_installation",
    );
    expect(result.bestMatch?.work.work_key).not.toBe("construction.work");
  });

  it("marks broad overlapping input as ambiguous instead of guessing", () => {
    const result = resolveConstructionWorkClassificationFromRows({
      input: "concrete installation",
      works,
      aliases,
    });

    expect(result.ambiguous).toBe(true);
    expect(result.bestMatch).toBeNull();
    expect(result.candidates.map((candidate) => candidate.work.work_key)).toEqual([
      "concrete.grade_beam_installation",
      "roadworks.concrete_curb_installation",
    ]);
  });

  it("reads only ontology definition and alias tables through the async wrapper", async () => {
    const selectedTables: string[] = [];
    const result = await resolveConstructionWorkClassification({
      input: "asphalt pavement",
      client: fakeClient(selectedTables),
    });

    expect(result.bestMatch?.work.work_key).toBe("roadworks.asphalt_pavement_installation");
    expect(selectedTables).toEqual(["construction_work_definitions", "construction_work_aliases"]);
  });

  it("keeps the resolver deterministic and free of external retrieval or mutation boundaries", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/constructionWork/constructionWorkRepository.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/openai|anthropic|embedding|opensearch|llm/i);
    expect(source).not.toMatch(/catalog_items|insert\(|update\(|delete\(|upsert\(|from\(/i);
    expect(source).not.toMatch(/prompt[_\s-]*lookup|lookup[_\s-]*prompt|hardcoded[_\s-]*answer/i);
  });
});
