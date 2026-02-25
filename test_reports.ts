import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function run() {
    const { data, error } = await supabase.rpc("rpc_wh_report_issued_by_req_context_v2", {
        p_from: "2026-01-24T00:00:00.000Z",
        p_to: "2026-02-23T23:59:59.999Z",
        p_object_name: null,
        p_level_code: null,
        p_system_code: null,
        p_zone_code: null,
    });
    if (error) {
        console.error(error);
    } else {
        const payload = data as any;
        console.log("kpi:", payload?.kpi);
        console.log("First row:", JSON.stringify(payload?.rows?.[0], null, 2));
    }
} run();
