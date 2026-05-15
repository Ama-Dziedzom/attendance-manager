/**
 * Script to list employees from Supabase and sync them to the ZKTeco device
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching employees from Supabase...\n');

    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, emp_id, name, is_active')
        .eq('is_active', true)
        .limit(20);

    if (error) {
        console.error('Error fetching employees:', error);
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('ACTIVE EMPLOYEES IN SUPABASE');
    console.log('='.repeat(60));
    console.log();

    if (!employees || employees.length === 0) {
        console.log('No active employees found.');
    } else {
        console.log(`Found ${employees.length} active employees:\n`);
        employees.forEach((emp, i) => {
            console.log(`${i + 1}. emp_id: ${emp.emp_id}`);
            console.log(`   Name: ${emp.name}`);
            console.log(`   UUID: ${emp.id}`);
            console.log();
        });
    }

    console.log('='.repeat(60));
    console.log('\nTo add these employees to your MB460 device:');
    console.log('1. Go to the device menu');
    console.log('2. Navigate to User Mgt -> New User');
    console.log('3. Enter the emp_id (e.g., "ID-00001" or the number portion)');
    console.log('4. Enter the name');
    console.log('5. Enroll fingerprint/face');
    console.log('\nThe emp_id on the device MUST match the emp_id in Supabase!');
}

main().catch(console.error);
