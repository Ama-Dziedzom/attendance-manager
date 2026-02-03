"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scannerService = exports.ScannerService = void 0;
const logger_1 = require("../utils/logger");
class ScannerService {
    isBusy = false;
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
    async enrollFingerprint(onProgress) {
        if (this.isBusy) {
            return { success: false, error: 'Scanner is already in use' };
        }
        this.isBusy = true;
        logger_1.logger.info('[Scanner] Starting fingerprint enrollment via PowerShell bridge...');
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const path = require('path');
            const scriptPath = path.resolve(__dirname, '../../scripts/capture.ps1');
            const ps = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]);
            let output = '';
            let errorOutput = '';
            ps.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                // Log status updates but don't spam
                if (text.includes('STATUS:')) {
                    const statusLine = text.trim().split('\n').find((l) => l.includes('STATUS:'));
                    if (statusLine) {
                        const statusMsg = statusLine.replace('STATUS:', '').trim();
                        logger_1.logger.info(`[Scanner Bridge] ${statusMsg}`);
                        if (onProgress)
                            onProgress(statusMsg);
                    }
                }
            });
            ps.stderr.on('data', (data) => {
                errorOutput += data.toString();
                logger_1.logger.error(`[Scanner Bridge Error] ${data.toString()}`);
            });
            ps.on('close', (code) => {
                this.isBusy = false;
                // Parse output for SUCCESS: <BASE64>
                const successMatch = output.match(/SUCCESS:\s*([A-Za-z0-9+/=]+)/);
                if (successMatch && successMatch[1]) {
                    logger_1.logger.info('[Scanner] Fingerprint captured successfully (Real Hardware)');
                    resolve({
                        success: true,
                        template: successMatch[1],
                        quality: 100 // DLL doesn't easily give quality in simple capture, assuming good
                    });
                }
                else {
                    // Check for specific error
                    const errorMatch = output.match(/ERROR:\s*(.+)/);
                    const msg = errorMatch ? errorMatch[1] : (errorOutput || 'Unknown capture error');
                    logger_1.logger.warn(`[Scanner] Capture failed: ${msg}`);
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
exports.ScannerService = ScannerService;
exports.scannerService = new ScannerService();
//# sourceMappingURL=scanner.js.map