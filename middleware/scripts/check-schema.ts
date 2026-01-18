import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    });

    if (error) {
        // Fallback if execute_sql RPC doesn't exist
        const { data: tables, error: err2 } = await supabase.from('terminals').select('*').limit(1);
        if (err2) console.log('Could not list tables:', err2.message);
        else console.log('Found terminals table, database is accessible.');
    } else {
        console.log('Tables:', data);
    }
}
main();
