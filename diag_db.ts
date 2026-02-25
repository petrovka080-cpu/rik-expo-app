import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'c:/dev/rik-expo-app/.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Fetching 1 row from warehouse_issues...");
    const { data: issues, error: err1 } = await supabase
        .from('warehouse_issues')
        .select('*')
        .not('target_object_id', 'is', null) // get one with a project
        .limit(1);

    if (err1) console.error("Error issues:", err1);
    else console.log("Sample issue:", JSON.stringify(issues?.[0], null, 2));

    console.log("\nFetching 1 row from warehouse_issue_items...");
    const { data: items, error: err2 } = await supabase
        .from('warehouse_issue_items')
        .select('*')
        .limit(1);

    if (err2) console.error("Error items:", err2);
    else console.log("Sample item:", JSON.stringify(items?.[0], null, 2));
}

main();
