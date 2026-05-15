const API_URL = process.env.API_URL || 'http://localhost:3001';

async function checkHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data: any = await response.json();
        console.log('🏥 Health check:', data);
        return data.status === 'ok';
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

async function getStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const data = await response.json();
        console.log('📊 Server stats:', data);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

async function getTerminals() {
    try {
        const response = await fetch(`${API_URL}/api/terminals`);
        const data = await response.json();
        console.log('📡 Terminals:', data);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

async function simulateAttendance(empId: string, type: 'in' | 'out', method: string) {
    console.log(`\n📤 Simulating ${type} for employee ${empId}...`);
    try {
        const response = await fetch(`${API_URL}/api/simulate/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empId,
                type,
                verifyMethod: method
            })
        });
        const data: any = await response.json();
        if (data.success) {
            console.log('✅ Success!', data);
        } else {
            console.log('❌ Failed:', data.error);
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

async function main() {
    const command = process.argv[2] || 'help';
    const empId = process.argv[3] || 'EMP001';
    const method = process.argv[4] || 'fingerprint';

    console.log('╔════════════════════════════════════════╗');
    console.log('║     Middleware Quick Test              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Using: ${API_URL}\n`);

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
        case 'in':
            await simulateAttendance(empId, 'in', method);
            break;
        case 'out':
            await simulateAttendance(empId, 'out', method);
            break;
        case 'test':
            await checkHealth();
            await getStats();
            await getTerminals();
            break;
        default:
            console.log('Commands: health, stats, terminals, in, out, test');
            console.log('Usage: npx ts-node quick-test.ts [command] [empId] [method]');
    }
}

main().catch(console.error);