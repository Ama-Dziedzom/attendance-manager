import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    console.log('--- Table Schema: attendance_records ---');
    const { data, error } = await supabase.from('attendance_records').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Sample record:', data[0]);
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}
main();
