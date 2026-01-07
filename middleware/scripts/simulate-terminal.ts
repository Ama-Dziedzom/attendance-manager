/**
 * MB460 Terminal Simulator
 * 
 * Simulates an MB460 terminal for testing without actual hardware.
 * Run with: npx ts-node scripts/simulate-terminal.ts
 */

import net from 'net';
import readline from 'readline';

const MIDDLEWARE_HOST = process.env.MIDDLEWARE_HOST || 'localhost';
const MIDDLEWARE_PORT = parseInt(process.env.MIDDLEWARE_PORT || '4370');
const TERMINAL_SERIAL = process.env.TERMINAL_SERIAL || 'SIM-MB460-001';

// Verification types
const VERIFY_TYPES = {
    fingerprint: 1,
    face: 15,
    password: 0,
    card: 2
};

// In/Out states
const IN_OUT_STATES = {
    in: 0,
    out: 1
};

class MB460Simulator {
    private socket: net.Socket | null = null;
    private connected = false;

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to middleware at ${MIDDLEWARE_HOST}:${MIDDLEWARE_PORT}...`);

            this.socket = net.createConnection(MIDDLEWARE_PORT, MIDDLEWARE_HOST, () => {
                this.connected = true;
                console.log('✅ Connected to middleware server');

                // Send device registration/heartbeat
                this.sendHeartbeat();
                resolve();
            });

            this.socket.on('data', (data) => {
                console.log('📨 Received from server:', data.toString('hex'));
            });

            this.socket.on('close', () => {
                this.connected = false;
                console.log('❌ Disconnected from server');
            });

            this.socket.on('error', (err) => {
                console.error('Socket error:', err.message);
                reject(err);
            });
        });
    }

    sendHeartbeat(): void {
        if (!this.socket) return;

        // Send device serial as heartbeat
        const message = `SN=${TERMINAL_SERIAL}`;
        console.log(`💓 Sending heartbeat: ${message}`);
        this.socket.write(message);
    }

    /**
     * Simulate an attendance event
     */
    sendAttendance(
        userId: string,
        type: 'in' | 'out' = 'in',
        verifyMethod: 'fingerprint' | 'face' = 'fingerprint'
    ): void {
        if (!this.socket || !this.connected) {
            console.error('Not connected to server');
            return;
        }

        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
        const verifyType = VERIFY_TYPES[verifyMethod];
        const inOutState = IN_OUT_STATES[type];

        // ZKTeco Push format: USER_ID\tTIMESTAMP\tVERIFY_TYPE\tIN_OUT_STATE\tDEVICE_SERIAL
        const attendanceLog = `${userId}\t${timestamp}\t${verifyType}\t${inOutState}\t${TERMINAL_SERIAL}`;

        console.log(`📤 Sending attendance: ${attendanceLog}`);
        this.socket.write(attendanceLog);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.connected;
    }
}

// Interactive CLI
async function main() {
    const simulator = new MB460Simulator();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           MB460 Terminal Simulator                         ║');
    console.log('║                                                            ║');
    console.log('║  This simulates an MB460 terminal for testing              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        await simulator.connect();
    } catch (error) {
        console.error('Failed to connect. Make sure the middleware is running.');
        console.error('Start the middleware with: npm run dev');
        process.exit(1);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('');
    console.log('Commands:');
    console.log('  in <empId> [fingerprint|face]   - Simulate clock in');
    console.log('  out <empId> [fingerprint|face]  - Simulate clock out');
    console.log('  heartbeat                       - Send heartbeat');
    console.log('  quit                            - Exit');
    console.log('');

    const prompt = () => {
        rl.question('> ', (input) => {
            const [command, ...args] = input.trim().split(' ');

            switch (command.toLowerCase()) {
                case 'in':
                case 'clock-in':
                case 'clockin': {
                    const empId = args[0] || 'EMP001';
                    const method = (args[1] as 'fingerprint' | 'face') || 'fingerprint';
                    simulator.sendAttendance(empId, 'in', method);
                    break;
                }
                case 'out':
                case 'clock-out':
                case 'clockout': {
                    const empId = args[0] || 'EMP001';
                    const method = (args[1] as 'fingerprint' | 'face') || 'fingerprint';
                    simulator.sendAttendance(empId, 'out', method);
                    break;
                }
                case 'heartbeat':
                case 'hb':
                    simulator.sendHeartbeat();
                    break;
                case 'quit':
                case 'exit':
                case 'q':
                    simulator.disconnect();
                    rl.close();
                    process.exit(0);
                    break;
                case '':
                    break;
                default:
                    console.log('Unknown command. Type "help" for commands.');
            }

            prompt();
        });
    };

    prompt();
}

main().catch(console.error);
