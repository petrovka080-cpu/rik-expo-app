import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Fetching real statuses from DB...");
    const { data: reqs } = await supabase.from('requests').select('status').limit(10);
    console.log("Current statuses in 'requests':", Array.from(new Set(reqs?.map(r => r.status))));

    const { data: props } = await supabase.from('proposals').select('status').limit(10);
    console.log("Current statuses in 'proposals':", Array.from(new Set(props?.map(p => p.status))));
}

main();
