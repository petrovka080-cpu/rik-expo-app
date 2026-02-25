const fs = require('fs');
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function run() {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const text = await res.text();
    fs.writeFileSync('openapi.json', text);
    console.log("Wrote openapi.json. Size:", text.length);
}

run().catch(console.error);
