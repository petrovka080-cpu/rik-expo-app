import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase, DbJson } from "../types/contracts/shared";

// Keep the generated schema pinned to DB-adjacent boundaries.
// Screen/hook/runtime layers should prefer these narrow aliases or
// domain-scoped `*.db.ts` facades instead of importing `database.types.ts`.
export type AppSupabaseClient = SupabaseClient<AppDatabase>;
export type { DbJson };
