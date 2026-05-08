import { supabase } from "../supabaseClient";
import type { JobQueueSupabaseClient } from "./jobQueue";

export const jobQueueSupabaseClient: JobQueueSupabaseClient = supabase;
