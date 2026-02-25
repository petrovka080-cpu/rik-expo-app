import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

// We cannot use pg_get_functiondef via REST without execute_sql.
// We cannot use raw SQL via REST without execute_sql.
// BUT we can use the standard REST API to query `information_schema.columns`!

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    // Querying views or tables related to issues
    const { data: tables, error: tableErr } = await supabase
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
        .ilike('table_name', '%wh_%');

    console.log("TABLES/VIEWS:", tables?.map(t => t.table_name));

    // Also look for `acc_`
    const { data: accTables } = await supabase
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
        .ilike('table_name', '%acc_%');
    console.log("ACC TABLES:", accTables?.map(t => t.table_name));
}
main();
