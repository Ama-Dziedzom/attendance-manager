import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    console.log('--- Table Schema: employees ---');
    const { data: schema, error: schemaError } = await supabase.rpc('inspect_table', { table_name: 'employees' });

    if (schemaError) {
        // RPC might not exist, try another way
        console.log('inspect_table RPC failed, fetching one record instead...');
        const { data, error } = await supabase.from('employees').select('*').limit(1);
        if (error) {
            console.error('Error fetching employees:', error.message);
        } else {
            console.log('Sample record:', data[0]);
            console.log('Columns:', Object.keys(data[0] || {}));
        }
    } else {
        console.log(schema);
    }
}
main();
