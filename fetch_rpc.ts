import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
    const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT pg_get_functiondef('public.wh_report_issued_by_object_fast(timestamptz,timestamptz,uuid)'::regprocedure);" });
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}
main();
