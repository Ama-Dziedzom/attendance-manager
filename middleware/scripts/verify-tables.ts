import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase.from('attendance_records').select('*').limit(1);

    if (error) {
        console.log('Error checking attendance_records:', error.message);
        const { data: data2, error: error2 } = await supabase.from('attendance').select('*').limit(1);
        if (error2) console.log('Error checking attendance:', error2.message);
        else console.log('Found attendance table');
    } else {
        console.log('Found attendance_records table');
    }
}
main();
