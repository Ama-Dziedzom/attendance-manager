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
export interface ScanResult {
    success: boolean;
    template?: string;
    error?: string;
    quality?: number;
}
export declare class ScannerService {
    private isBusy;
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
    enrollFingerprint(onProgress?: (status: string) => void): Promise<ScanResult>;
}
export declare const scannerService: ScannerService;
//# sourceMappingURL=scanner.d.ts.map