import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Calling wh_report_issued_by_object_fast...");
    const { data: d1, error: e1 } = await supabase.rpc('wh_report_issued_by_object_fast', {
        p_from: '2020-01-01T00:00:00Z', p_to: '2030-01-01T00:00:00Z', p_object_id: null
    });
    console.log("Obj Report Error:", e1 ? e1.message : "OK");
    if (d1?.length) console.log("Obj Report first row:", JSON.stringify(d1[0]));

    console.log("\nCalling wh_report_issued_materials_fast...");
    const { data: d2, error: e2 } = await supabase.rpc('wh_report_issued_materials_fast', {
        p_from: '2020-01-01T00:00:00Z', p_to: '2030-01-01T00:00:00Z', p_object_id: null
    });
    console.log("Mat Report Error:", e2 ? e2.message : "OK");
    if (d2?.length) console.log("Mat Report first row:", JSON.stringify(d2[0]));
}
main();
