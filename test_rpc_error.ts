import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Calling wh_report_issued_by_object_fast...");
    const { data, error } = await supabase.rpc('wh_report_issued_by_object_fast', {
        p_from: '2020-01-01T00:00:00Z',
        p_to: '2030-01-01T00:00:00Z',
        p_object_id: null
    });

    if (error) {
        console.error("RPC Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Success! Returned rows count:", data?.length);
    }
}
main();
