require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function resetSyncForRebuild() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const terminalSN = 'QWC5234701115';

    console.log(`Resetting sync statuses for ${terminalSN} to trigger fresh rebuild...`);

    const { error } = await supabase
        .from('employee_terminal_sync')
        .update({
            status: 'pending',
            last_sync_at: new Date().toISOString()
        })
        .eq('terminal_sn', terminalSN);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Successfully reset all employees to pending. Re-sync will begin on next terminal heartbeats.');
    }
}

resetSyncForRebuild();
