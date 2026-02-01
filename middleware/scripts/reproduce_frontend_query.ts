import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

async function testQuery() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testing Frontend Query...');

    // Exact query from db.ts
    const { data, error } = await supabase
        .from('employees')
        .select(`
        *,
        department:departments(id, name),
        agency:agencies(id, name),
        employee_fingerprints(*)
      `)
        .limit(5);

    if (error) {
        console.error('❌ Query Failed:', error);
    } else {
        console.log('✅ Query Success! Fetched', data?.length || 0, 'records.');
        if (data && data.length > 0) {
            console.log('Sample Record:', JSON.stringify(data[0], null, 2));
        }
    }
}

testQuery();
