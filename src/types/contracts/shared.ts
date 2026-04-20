import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../../lib/database.types";

export type AppDatabase = Database;
export type AppSupabaseClient = SupabaseClient<Database>;
export type DbJson = Json;

type PublicSchema = Database["public"];
type PublicTables = PublicSchema["Tables"];
type PublicViews = PublicSchema["Views"];
type PublicFunctions = PublicSchema["Functions"];

export type PublicTableName = keyof PublicTables;
export type PublicViewName = keyof PublicViews;
export type PublicFunctionName = keyof PublicFunctions;

export type PublicTableRow<TableName extends PublicTableName> =
  PublicTables[TableName] extends { Row: infer Row } ? Row : never;

export type PublicTableInsert<TableName extends PublicTableName> =
  PublicTables[TableName] extends { Insert: infer Insert } ? Insert : never;

export type PublicTableUpdate<TableName extends PublicTableName> =
  PublicTables[TableName] extends { Update: infer Update } ? Update : never;

export type PublicViewRow<ViewName extends PublicViewName> =
  PublicViews[ViewName] extends { Row: infer Row } ? Row : never;

export type PublicFunctionArgs<FunctionName extends PublicFunctionName> =
  PublicFunctions[FunctionName] extends { Args: infer Args } ? Args : never;

export type PublicFunctionReturns<FunctionName extends PublicFunctionName> =
  PublicFunctions[FunctionName] extends { Returns: infer Returns } ? Returns : never;
