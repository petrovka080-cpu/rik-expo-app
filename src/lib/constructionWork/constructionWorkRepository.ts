import { normalizeConstructionWorkAlias } from "./normalizeConstructionWorkAlias";
import type {
  ConstructionWorkAlias,
  ConstructionWorkCatalogLink,
  ConstructionWorkDefinition,
  ConstructionWorkQueryBuilder,
  ConstructionWorkQueryError,
  ConstructionWorkReadClient,
  ConstructionWorkRecipeRow,
} from "./constructionWorkTypes";

const CONSTRUCTION_WORK_READ_MAX_ROWS = 100;

type SupabaseReadFrom = <T = unknown>(relation: string) => {
  select(columns: string): {
    limit(count: number): ConstructionWorkQueryBuilder<T>;
  };
};

let defaultClientPromise: Promise<ConstructionWorkReadClient> | null = null;

async function getDefaultClient(): Promise<ConstructionWorkReadClient> {
  defaultClientPromise ??= import("../supabaseClient").then((module: object) => {
    const supabaseClient = Reflect.get(module, "supabase") as { from: SupabaseReadFrom };
    return {
      from<T = unknown>(table: string) {
        return {
          select(columns: string) {
            return supabaseClient.from<T>(table).select(columns).limit(CONSTRUCTION_WORK_READ_MAX_ROWS);
          },
        };
      },
    };
  });
  return defaultClientPromise;
}

async function resolveClient(client?: ConstructionWorkReadClient): Promise<ConstructionWorkReadClient> {
  return client ?? await getDefaultClient();
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
  const query = build(client.from<T>(table).select(columns).limit(CONSTRUCTION_WORK_READ_MAX_ROWS));
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
  const query = build(client.from<T>(table).select(columns).limit(1));
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
