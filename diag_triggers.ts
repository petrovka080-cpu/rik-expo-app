import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Fetching triggers and functions...");

    // Check triggers on proposals
    const queryRes = await supabase.rpc('execute_sql_query', {
        query_text: `SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_table = 'proposals';`
    });
    const { data: triggerData, error: tgErr } = queryRes;

    if (triggerData) {
        console.log("Triggers via RPC:", triggerData);
    } else {
        // Fallback: Use direct postgres connection if available, or just read the local `db/` sql files to see what triggers exist.
        console.log("Could not use execute_sql_query.");
    }
}

main();
