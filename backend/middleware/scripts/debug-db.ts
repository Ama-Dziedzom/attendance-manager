import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

async function debug() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Terminals ---');
    const { data: terminals, error: tError } = await supabase.from('terminals').select('*');
    if (tError) console.error('Error fetching terminals:', tError);
    else console.log(JSON.stringify(terminals, null, 2));

    console.log('\n--- Terminal Agencies ---');
    const { data: agencies, error: aError } = await supabase.from('terminal_agencies').select('*');
    if (aError) console.error('Error fetching terminal_agencies:', aError);
    else console.log(JSON.stringify(agencies, null, 2));

    console.log('\n--- Agencies ---');
    const { data: allAgencies, error: agError } = await supabase.from('agencies').select('*');
    if (agError) console.error('Error fetching agencies:', agError);
    else console.log(JSON.stringify(allAgencies, null, 2));

    console.log('\n--- Employees (ID and Emp_ID) ---');
    const { data: emps } = await supabase.from('employees').select('id, emp_id, name');
    console.log(JSON.stringify(emps, null, 2));

    console.log('\n--- Employee Fingerprints ---');
    const { data: fps, error: fError } = await supabase.from('employee_fingerprints').select('employee_id, template');
    if (fError) console.error('Error fetching fingerprints:', fError);
    else {
        fps.forEach(fp => {
            console.log(`Emp: ${fp.employee_id}, Template Start: ${fp.template.substring(0, 20)}...`);
        });
    }
}

debug();
