import { normalizeConstructionWorkAlias } from "./normalizeConstructionWorkAlias";
import type {
  ConstructionWorkAlias,
  ConstructionWorkCatalogLink,
  ConstructionWorkDefinition,
  ConstructionWorkQueryBuilder,
  ConstructionWorkQueryError,
  ConstructionWorkReadClient,
  ConstructionWorkRecipeRow,
  ConstructionWorkResolverCandidate,
  ConstructionWorkResolverMatchKind,
  ConstructionWorkResolverResult,
} from "./constructionWorkTypes";

const CONSTRUCTION_WORK_READ_MAX_ROWS = 500;
const DEFAULT_RESOLVER_CANDIDATE_LIMIT = 5;
const DEFAULT_RESOLVER_MIN_SCORE = 0.62;
const CLEAR_RESOLVER_WIN_MARGIN = 0.08;

const STRUCTURAL_RESOLVER_TOKENS = new Set([
  "work",
  "works",
  "construction",
  "installation",
  "application",
  "pour",
  "casting",
  "preparation",
  "testing",
]);

const QUANTITY_RESOLVER_TOKENS = new Set([
  "m",
  "m2",
  "m3",
  "sqm",
  "pcs",
  "pc",
  "kg",
  "\u043c",
  "\u043c2",
  "\u043c3",
  "\u0448\u0442",
  "\u043a\u0433",
]);

let defaultClientPromise: Promise<ConstructionWorkReadClient> | null = null;

async function getDefaultClient(): Promise<ConstructionWorkReadClient> {
  defaultClientPromise ??= import("./constructionWork.transport").then(
    (module) => module.constructionWorkSupabaseReadClient,
  );
  return defaultClientPromise;
}

async function resolveClient(client?: ConstructionWorkReadClient): Promise<ConstructionWorkReadClient> {
  return client ?? await getDefaultClient();
}

function isSearchMeaningfulToken(token: string): boolean {
  return !STRUCTURAL_RESOLVER_TOKENS.has(token) && !QUANTITY_RESOLVER_TOKENS.has(token);
}

function uniqueResolverTokens(value: string): string[] {
  const normalized = normalizeConstructionWorkAlias(value);
  return [...new Set(normalized.split(" ").filter((token) => token.length > 1 && !/^\d+$/.test(token)))];
}

function searchableWorkText(work: ConstructionWorkDefinition): string {
  return [
    work.work_key.replace(/[._]/g, " "),
    work.domain_key,
    work.system_key,
    work.element_key,
    work.operation_key,
    work.title_ru,
    work.title_en,
    work.default_unit,
    work.measurement_kind,
    work.complexity_level,
  ]
    .filter(Boolean)
    .join(" ");
}

function aliasesForWork(aliasesByWorkId: Map<string, ConstructionWorkAlias[]>, workId: string) {
  return aliasesByWorkId.get(workId) ?? [];
}

function strongestExactResolverMatch(params: {
  work: ConstructionWorkDefinition;
  aliases: ConstructionWorkAlias[];
  normalizedInput: string;
}): { matchKind: ConstructionWorkResolverMatchKind; score: number } | null {
  if (normalizeConstructionWorkAlias(params.work.work_key.replace(/[._]/g, " ")) === params.normalizedInput) {
    return { matchKind: "exact_work_key", score: 0.99 };
  }
  if (normalizeConstructionWorkAlias(params.work.title_ru) === params.normalizedInput) {
    return { matchKind: "exact_title", score: 0.98 };
  }
  if (params.work.title_en && normalizeConstructionWorkAlias(params.work.title_en) === params.normalizedInput) {
    return { matchKind: "exact_title", score: 0.98 };
  }

  const alias = params.aliases.find(
    (item) =>
      item.normalized_alias === params.normalizedInput ||
      normalizeConstructionWorkAlias(item.alias_text) === params.normalizedInput,
  );
  return alias ? { matchKind: "exact_alias", score: Math.min(1, Math.max(0.97, alias.confidence_weight)) } : null;
}

function scoreTokenOverlap(params: {
  inputTokens: string[];
  work: ConstructionWorkDefinition;
  aliases: ConstructionWorkAlias[];
}): ConstructionWorkResolverCandidate | null {
  const workTokens = new Set(
    [
      ...uniqueResolverTokens(searchableWorkText(params.work)),
      ...params.aliases.flatMap((alias) => uniqueResolverTokens(`${alias.alias_text} ${alias.normalized_alias}`)),
    ].filter(isSearchMeaningfulToken),
  );
  const meaningfulInputTokens = params.inputTokens.filter(isSearchMeaningfulToken);
  const matchedTokens = meaningfulInputTokens.filter((token) => workTokens.has(token));
  if (matchedTokens.length === 0) return null;

  const requiredMatches = meaningfulInputTokens.length <= 2 ? meaningfulInputTokens.length : 2;
  const coverage = matchedTokens.length / Math.max(meaningfulInputTokens.length, 1);
  if (matchedTokens.length < requiredMatches || coverage < 0.6) return null;

  const specificity = matchedTokens.length / Math.max(workTokens.size, matchedTokens.length);
  const score = Math.min(0.94, 0.55 + coverage * 0.3 + specificity * 0.15);
  return {
    work: params.work,
    aliases: params.aliases,
    score,
    matchKind: "token_overlap",
    matchedTokens,
  };
}

function compareResolverCandidates(
  a: ConstructionWorkResolverCandidate,
  b: ConstructionWorkResolverCandidate,
): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.matchedTokens.length !== a.matchedTokens.length) return b.matchedTokens.length - a.matchedTokens.length;
  return a.work.work_key.localeCompare(b.work.work_key);
}

function assertReadOk(error: ConstructionWorkQueryError | null, table: string) {
  if (!error) return;
  throw new Error(`Failed to read ${table}: ${error.message ?? "unknown error"}`);
}

async function readMany<T>(
  client: ConstructionWorkReadClient,
  table: string,
  columns: string,
  build: (query: ConstructionWorkQueryBuilder<T>) => ConstructionWorkQueryBuilder<T>,
): Promise<T[]> {
  const query = build(client.select<T>({ table, columns, limit: CONSTRUCTION_WORK_READ_MAX_ROWS }));
  const result = await query;
  assertReadOk(result.error, table);
  return Array.isArray(result.data) ? result.data : result.data ? [result.data as T] : [];
}

async function readOne<T>(
  client: ConstructionWorkReadClient,
  table: string,
  columns: string,
  build: (query: ConstructionWorkQueryBuilder<T>) => ConstructionWorkQueryBuilder<T>,
): Promise<T | null> {
  const query = build(client.select<T>({ table, columns, limit: 1 }));
  const result = await query.maybeSingle();
  assertReadOk(result.error, table);
  return (Array.isArray(result.data) ? result.data[0] : result.data) ?? null;
}

async function findWorkById(
  workId: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkDefinition | null> {
  const readClient = await resolveClient(client);
  return await readOne<ConstructionWorkDefinition>(
    readClient,
    "construction_work_definitions",
    "*",
    (query) => query.eq("id", workId).eq("is_active", true),
  );
}

export async function findWorkByKey(
  workKey: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkDefinition | null> {
  const readClient = await resolveClient(client);
  return await readOne<ConstructionWorkDefinition>(
    readClient,
    "construction_work_definitions",
    "*",
    (query) => query.eq("work_key", workKey.trim()).eq("is_active", true),
  );
}

export async function findWorkByAlias(
  aliasText: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkDefinition | null> {
  const normalizedAlias = normalizeConstructionWorkAlias(aliasText);
  if (!normalizedAlias) return null;

  const readClient = await resolveClient(client);
  const alias = await readOne<ConstructionWorkAlias>(
    readClient,
    "construction_work_aliases",
    "*",
    (query) =>
      query
        .eq("normalized_alias", normalizedAlias)
        .eq("is_active", true)
        .order("confidence_weight", { ascending: false })
        .limit(1),
  );

  return alias ? await findWorkById(alias.work_id, readClient) : null;
}

export async function listWorksByDomain(
  domainKey: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkDefinition[]> {
  const readClient = await resolveClient(client);
  return await readMany<ConstructionWorkDefinition>(
    readClient,
    "construction_work_definitions",
    "*",
    (query) =>
      query
        .eq("domain_key", domainKey.trim())
        .eq("is_active", true)
        .order("work_key", { ascending: true }),
  );
}

export async function listActiveConstructionWorks(
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkDefinition[]> {
  const readClient = await resolveClient(client);
  return await readMany<ConstructionWorkDefinition>(
    readClient,
    "construction_work_definitions",
    "*",
    (query) => query.eq("is_active", true).order("work_key", { ascending: true }),
  );
}

export async function listActiveConstructionWorkAliases(
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkAlias[]> {
  const readClient = await resolveClient(client);
  return await readMany<ConstructionWorkAlias>(
    readClient,
    "construction_work_aliases",
    "*",
    (query) =>
      query
        .eq("is_active", true)
        .order("confidence_weight", { ascending: false })
        .order("normalized_alias", { ascending: true }),
  );
}

export function resolveConstructionWorkClassificationFromRows(params: {
  input: string;
  works: ConstructionWorkDefinition[];
  aliases: ConstructionWorkAlias[];
  limit?: number;
  minScore?: number;
}): ConstructionWorkResolverResult {
  const normalizedInput = normalizeConstructionWorkAlias(params.input);
  const inputTokens = uniqueResolverTokens(params.input);
  const limit = params.limit ?? DEFAULT_RESOLVER_CANDIDATE_LIMIT;
  const minScore = params.minScore ?? DEFAULT_RESOLVER_MIN_SCORE;
  const aliasesByWorkId = params.aliases.reduce((acc, alias) => {
    const aliases = acc.get(alias.work_id) ?? [];
    aliases.push(alias);
    acc.set(alias.work_id, aliases);
    return acc;
  }, new Map<string, ConstructionWorkAlias[]>());

  const candidates = params.works
    .filter((work) => work.is_active)
    .map((work): ConstructionWorkResolverCandidate | null => {
      const aliases = aliasesForWork(aliasesByWorkId, work.id).filter((alias) => alias.is_active);
      const exact = strongestExactResolverMatch({ work, aliases, normalizedInput });
      if (exact) {
        return {
          work,
          aliases,
          score: exact.score,
          matchKind: exact.matchKind,
          matchedTokens: inputTokens,
        };
      }
      return scoreTokenOverlap({ inputTokens, work, aliases });
    })
    .filter((candidate): candidate is ConstructionWorkResolverCandidate => candidate !== null)
    .filter((candidate) => candidate.score >= minScore)
    .sort(compareResolverCandidates)
    .slice(0, limit);

  const best = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const exactMatch = best?.matchKind.startsWith("exact_") === true;
  const ambiguous = Boolean(best && second && !exactMatch && best.score - second.score < CLEAR_RESOLVER_WIN_MARGIN);

  return {
    input: params.input,
    normalizedInput,
    candidates,
    bestMatch: ambiguous ? null : best,
    exactMatch,
    ambiguous,
    source: "construction_work_ontology",
  };
}

export async function resolveConstructionWorkClassification(params: {
  input: string;
  client?: ConstructionWorkReadClient;
  limit?: number;
  minScore?: number;
}): Promise<ConstructionWorkResolverResult> {
  const [works, aliases] = await Promise.all([
    listActiveConstructionWorks(params.client),
    listActiveConstructionWorkAliases(params.client),
  ]);

  return resolveConstructionWorkClassificationFromRows({
    input: params.input,
    works,
    aliases,
    limit: params.limit,
    minScore: params.minScore,
  });
}

export async function listAliasesForWork(
  workKey: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkAlias[]> {
  const readClient = await resolveClient(client);
  const work = await findWorkByKey(workKey, readClient);
  if (!work) return [];

  return await readMany<ConstructionWorkAlias>(
    readClient,
    "construction_work_aliases",
    "*",
    (query) =>
      query
        .eq("work_id", work.id)
        .eq("is_active", true)
        .order("confidence_weight", { ascending: false })
        .order("alias_text", { ascending: true }),
  );
}

export async function listCatalogLinksForWork(
  workKey: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkCatalogLink[]> {
  const readClient = await resolveClient(client);
  const work = await findWorkByKey(workKey, readClient);
  if (!work) return [];

  return await readMany<ConstructionWorkCatalogLink>(
    readClient,
    "construction_work_catalog_links",
    "*",
    (query) => query.eq("work_id", work.id).order("sort_order", { ascending: true }),
  );
}

export async function listRecipeRowsForWork(
  workKey: string,
  client?: ConstructionWorkReadClient,
): Promise<ConstructionWorkRecipeRow[]> {
  const readClient = await resolveClient(client);
  const work = await findWorkByKey(workKey, readClient);
  if (!work) return [];

  return await readMany<ConstructionWorkRecipeRow>(
    readClient,
    "construction_work_recipe_rows",
    "*",
    (query) => query.eq("work_id", work.id).order("sort_order", { ascending: true }),
  );
}
