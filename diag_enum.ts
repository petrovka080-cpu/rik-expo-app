import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    // Check enum values
    const query = await supabase.rpc('execute_sql_query', { query_text: "SELECT enum_range(null::request_status_enum);" });
    console.log("Enum from execute_sql_query:", query?.data);

    // If no generic rpc, let's just create one or use a known table insert to trigger it safely
    // Or we can just check what the actual tables use by querying a few rows
    const { data: reqs } = await supabase.from('requests').select('status').limit(10);
    console.log("Current statuses in requests table:", new Set(reqs?.map(r => r.status)));
}

main();
