import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    console.log('--- Sample Employees ---');
    const { data, error } = await supabase.from('employees').select('emp_id, name').limit(10);
    if (error) {
        console.error('Error:', error.message);
    } else {
        data.forEach(emp => {
            console.log(`Name: ${emp.name}, emp_id: ${emp.emp_id}`);
        });
    }
}
main();
