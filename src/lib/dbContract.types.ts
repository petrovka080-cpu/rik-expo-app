import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "./database.types";

// Keep the generated schema pinned to DB-adjacent boundaries.
// Screen/hook/runtime layers should prefer these narrow aliases or
// domain-scoped `*.db.ts` facades instead of importing `database.types.ts`.
export type AppSupabaseClient = SupabaseClient<Database>;
export type DbJson = Json;
