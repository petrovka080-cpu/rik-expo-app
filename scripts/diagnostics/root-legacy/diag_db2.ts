import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data: issues } = await supabase.from('warehouse_issues').select('*').limit(1);
    const { data: items } = await supabase.from('warehouse_issue_items').select('*').limit(1);
    const outputPath = path.join(process.cwd(), 'diagnostics', 'root-legacy', 'diag_db.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ issues, items }, null, 2));
}

main();
