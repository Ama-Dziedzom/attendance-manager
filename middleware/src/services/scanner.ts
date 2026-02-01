/**
 * ZKTeco SLK20R Scanner Service
 * 
 * In a real-world scenario, this service would interface with the 
 * libzkfp.dll using a native Node.js wrapper or a child process.
 * 
 * Since native modules depend on local build tools (node-gyp),
 * this service provides the logic structure and a simulated enrollment 
 * for development when the physical device is not accessible.
 */

import { logger } from '../utils/logger';

export interface ScanResult {
    success: boolean;
    template?: string;
    error?: string;
    quality?: number;
}

export class ScannerService {
    private isBusy: boolean = false;

    /**
     * Start fingerprint enrollment
     * This waits for the physical scanner to capture a finger
     */
    /**
     * Start fingerprint enrollment using the PowerShell bridge
     * This waits for the physical scanner to capture a finger
     */
    async enrollFingerprint(): Promise<ScanResult> {
        if (this.isBusy) {
            return { success: false, error: 'Scanner is already in use' };
        }

        this.isBusy = true;
        logger.info('[Scanner] Starting fingerprint enrollment via PowerShell bridge...');

        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const path = require('path');

            const scriptPath = path.resolve(__dirname, '../../scripts/capture.ps1');
            const ps = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]);

            let output = '';
            let errorOutput = '';

            ps.stdout.on('data', (data: any) => {
                const text = data.toString();
                output += text;
                // Log status updates but don't spam
                if (text.includes('STATUS:')) {
                    logger.info(`[Scanner Bridge] ${text.trim()}`);
                }
            });

            ps.stderr.on('data', (data: any) => {
                errorOutput += data.toString();
                logger.error(`[Scanner Bridge Error] ${data.toString()}`);
            });

            ps.on('close', (code: number) => {
                this.isBusy = false;

                // Parse output for SUCCESS: <BASE64>
                const successMatch = output.match(/SUCCESS:\s*([A-Za-z0-9+/=]+)/);
                if (successMatch && successMatch[1]) {
                    logger.info('[Scanner] Fingerprint captured successfully (Real Hardware)');
                    resolve({
                        success: true,
                        template: successMatch[1],
                        quality: 100 // DLL doesn't easily give quality in simple capture, assuming good
                    });
                } else {
                    // Check for specific error
                    const errorMatch = output.match(/ERROR:\s*(.+)/);
                    const msg = errorMatch ? errorMatch[1] : (errorOutput || 'Unknown capture error');

                    logger.warn(`[Scanner] Capture failed: ${msg}`);
                    resolve({ success: false, error: msg.trim() });
                }
            });

            // Safety timeout (script has its own 15s timeout, but just in case)
            setTimeout(() => {
                if (this.isBusy) {
                    ps.kill();
                    this.isBusy = false;
                    resolve({ success: false, error: 'Capture process timed out' });
                }
            }, 20000);
        });
    }
}

export const scannerService = new ScannerService();
