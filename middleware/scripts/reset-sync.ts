import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env from current directory or parent
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetSync() {
    console.log('Resetting sync status for all employees...');

    // Delete all records in employee_terminal_sync to force a full re-sync
    const { error, count } = await supabase
        .from('employee_terminal_sync')
        .delete()
        .neq('status', 'impossible_val_to_delete_all'); // This trick deletes all rows if filter matches all (which it doesn't). 
    // Wait, delete() without filter is risky. Better to use a valid filter that covers everything.

    // Safer approach: Delete where ID is not null (i.e., all rows)
    const { error: delError } = await supabase
        .from('employee_terminal_sync')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Assuming UUIDs

    if (delError) {
        // If 'id' column doesn't exist, try deleting by terminal_sn match (wildcard)
        const { error: delError2 } = await supabase
            .from('employee_terminal_sync')
            .delete()
            .like('terminal_sn', '%');

        if (delError2) {
            console.error('Error clearing sync table:', delError2);
        } else {
            console.log('Successfully cleared employee_terminal_sync table.');
        }
    } else {
        console.log('Successfully cleared employee_terminal_sync table.');
    }

    console.log('Done. The middleware should now perceive all employees as "unsynced" and push them to the terminal again.');
}

resetSync();
