/**
 * Quick Test Script
 * 
 * Sends a single test attendance event via HTTP simulation endpoint.
 * Run with: npx ts-node scripts/quick-test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

interface SimulateRequest {
    empId: string;
    type: 'in' | 'out';
    verifyMethod: 'fingerprint' | 'face';
    terminalSerial?: string;
}

async function simulateAttendance(request: SimulateRequest): Promise<void> {
    console.log(`\n📤 Simulating ${request.type} for employee ${request.empId}...`);

    try {
        const response = await fetch(`${API_URL}/api/simulate/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Success!', data);
        } else {
            console.log('❌ Failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        console.log('🏥 Health check:', data);
        return data.status === 'ok';
    } catch (error) {
        console.error('❌ Middleware not running. Start with: npm run dev');
        return false;
    }
}

async function getStats(): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const data = await response.json();
        console.log('📊 Server stats:', data);
    } catch (error) {
        console.error('Error getting stats:', error);
    }
}

async function getTerminals(): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/api/terminals`);
        const data = await response.json();
        console.log('📡 Terminals:', data);
    } catch (error) {
        console.error('Error getting terminals:', error);
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           Middleware Quick Test                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    switch (command) {
        case 'health':
            await checkHealth();
            break;

        case 'stats':
            await getStats();
            break;

        case 'terminals':
            await getTerminals();
            break;

        case 'in': {
            const empId = args[1] || 'EMP001';
            const method = (args[2] as 'fingerprint' | 'face') || 'fingerprint';
            await simulateAttendance({ empId, type: 'in', verifyMethod: method });
            break;
        }

        case 'out': {
            const empId = args[1] || 'EMP001';
            const method = (args[2] as 'fingerprint' | 'face') || 'fingerprint';
            await simulateAttendance({ empId, type: 'out', verifyMethod: method });
            break;
        }

        case 'test': {
            // Full test sequence
            const empId = args[1] || 'EMP001';
            console.log(`\n🧪 Running full test for employee ${empId}...\n`);

            if (!await checkHealth()) return;

            console.log('\n--- Waiting 2 seconds ---\n');
            await new Promise(r => setTimeout(r, 2000));

            await simulateAttendance({ empId, type: 'in', verifyMethod: 'fingerprint' });

            console.log('\n--- Waiting 5 seconds ---\n');
            await new Promise(r => setTimeout(r, 5000));

            await simulateAttendance({ empId, type: 'out', verifyMethod: 'fingerprint' });

            console.log('\n✅ Test complete!\n');
            break;
        }

        default:
            console.log(`
Usage: npx ts-node scripts/quick-test.ts <command> [options]

Commands:
  health              Check if middleware is running
  stats               Get server statistics
  terminals           List registered terminals
  in <empId> [method] Simulate clock in
  out <empId> [method] Simulate clock out
  test <empId>        Run full clock in/out test

Examples:
  npx ts-node scripts/quick-test.ts health
  npx ts-node scripts/quick-test.ts in EMP001 fingerprint
  npx ts-node scripts/quick-test.ts out EMP001 face
  npx ts-node scripts/quick-test.ts test EMP001
`);
    }
}

main().catch(console.error);
