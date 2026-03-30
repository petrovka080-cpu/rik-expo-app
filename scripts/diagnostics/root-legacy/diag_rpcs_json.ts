import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data: d1, error: e1 } = await supabase.rpc('wh_report_issued_by_object_fast', {
        p_from: '2020-01-01T00:00:00Z', p_to: '2030-01-01T00:00:00Z', p_object_id: null
    });

    const { data: d2, error: e2 } = await supabase.rpc('wh_report_issued_materials_fast', {
        p_from: '2020-01-01T00:00:00Z', p_to: '2030-01-01T00:00:00Z', p_object_id: null
    });

    const outputPath = path.join(process.cwd(), 'diagnostics', 'root-legacy', 'diag_rpcs.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ obj: d1, mat: d2, e1, e2 }, null, 2));
}

main();
