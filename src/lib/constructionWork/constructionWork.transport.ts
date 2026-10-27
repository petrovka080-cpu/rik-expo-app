import * as supabaseModule from "../supabaseClient";
import type {
  ConstructionWorkQueryBuilder,
  ConstructionWorkReadClient,
  ConstructionWorkSelectRequest,
} from "./constructionWorkTypes";

type SupabaseReadFrom = <T = unknown>(relation: string) => {
  select(columns: string): {
    limit(count: number): ConstructionWorkQueryBuilder<T>;
  };
};

function getSupabaseClient(): object {
  return Reflect.get(supabaseModule as object, "supabase") as object;
}

export const constructionWorkSupabaseReadClient: ConstructionWorkReadClient = {
  select<T = unknown>(request: ConstructionWorkSelectRequest): ConstructionWorkQueryBuilder<T> {
    const client = getSupabaseClient();
    const from = Reflect.get(client, "from") as SupabaseReadFrom;
    return from.call(client, request.table).select(request.columns).limit(request.limit) as ConstructionWorkQueryBuilder<T>;
  },
};
