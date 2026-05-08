import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type PdfRunnerAuthSessionClient = Pick<SupabaseClient<Database>, "auth">;

export type PdfRunnerAuthSessionResult = Awaited<
  ReturnType<PdfRunnerAuthSessionClient["auth"]["getSession"]>
>;

export async function readPdfRunnerAuthSession(
  supabase: PdfRunnerAuthSessionClient,
): Promise<PdfRunnerAuthSessionResult> {
  return await supabase.auth.getSession();
}
