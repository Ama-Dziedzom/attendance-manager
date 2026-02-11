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
    templateSize?: number;      // Decoded byte count
    templateFormat?: string;    // e.g. "SilkID v10.0 Standard (1232 bytes)"
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
     * 
     * @param onProgress Callback for status updates (e.g. "Capture 1/3")
     */
    async enrollFingerprint(onProgress?: (status: string) => void): Promise<ScanResult> {
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
                    const statusLine = text.trim().split('\n').find((l: string) => l.includes('STATUS:'));
                    if (statusLine) {
                        const statusMsg = statusLine.replace('STATUS:', '').trim();
                        logger.info(`[Scanner Bridge] ${statusMsg}`);
                        if (onProgress) onProgress(statusMsg);
                    }
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

                    // Extract template diagnostics from PowerShell output
                    let templateSize: number | undefined;
                    let templateFormat: string | undefined;

                    const sizeMatch = output.match(/TEMPLATE_SIZE:\s*(\d+)/);
                    if (sizeMatch) {
                        templateSize = parseInt(sizeMatch[1], 10);
                        logger.info(`[Scanner] Template size: ${templateSize} bytes`);
                    }

                    const formatMatch = output.match(/TEMPLATE_FORMAT:\s*(.+)/);
                    if (formatMatch) {
                        templateFormat = formatMatch[1].trim();
                        logger.info(`[Scanner] Template format: ${templateFormat}`);
                    }

                    const hexMatch = output.match(/TEMPLATE_HEADER_HEX:\s*([A-Fa-f0-9]+)/);
                    if (hexMatch) {
                        logger.info(`[Scanner] Template header hex: ${hexMatch[1]}`);
                    }

                    resolve({
                        success: true,
                        template: successMatch[1],
                        quality: 100,
                        templateSize,
                        templateFormat,
                    });
                } else {
                    // Check for specific error
                    const errorMatch = output.match(/ERROR:\s*(.+)/);
                    const msg = errorMatch ? errorMatch[1] : (errorOutput || 'Unknown capture error');

                    logger.warn(`[Scanner] Capture failed: ${msg}`);
                    resolve({ success: false, error: msg.trim() });
                }
            });

            // Safety timeout (increased for 3-step enrollment)
            setTimeout(() => {
                if (this.isBusy) {
                    ps.kill();
                    this.isBusy = false;
                    resolve({ success: false, error: 'Capture process timed out' });
                }
            }, 60000);
        });
    }
}

export const scannerService = new ScannerService();
