/**
 * Fingerprint Command Builder
 * 
 * Builds the correct PUSH protocol command for syncing a fingerprint template.
 * Uses DATA FPTMP format which writes to the biometric verification database.
 * 
 * NOTE: DATA UPDATE userinfo with Template= does NOT work — it updates the user record
 * but silently discards the biometric data. The biodata table is the correct target.
 */

/**
 * Build a ZKTeco PUSH protocol fingerprint sync command.
 * 
 * @param cmdId   - Unique command ID for tracking responses
 * @param pin     - Device-side PIN (numeric employee identifier)
 * @param fingerIndex - Finger index (0-9)
 * @param templateBase64 - Raw fingerprint template in base64
 * @returns Formatted command string ready for device delivery
 */
export function buildFingerprintCommand(cmdId: number, pin: string, fingerIndex: number, templateBase64: string): string {
    const tab = String.fromCharCode(9);
    const fid = Math.min(9, Math.max(0, fingerIndex));

    // Trim 28-byte header if present (SilkID 10 templates from some SDKs are 1260 bytes)
    // MB460 expects the raw 1232-byte template data.
    let templateBuffer = Buffer.from(templateBase64, 'base64');
    if (templateBuffer.length === 1260) {
        templateBuffer = templateBuffer.slice(28);
    }
    const finalTemplateBase64 = templateBuffer.toString('base64');
    const templateSize = templateBuffer.length;

    // DATA FPTMP — exact format seen in device's own data push
    return `C:${cmdId}:DATA FPTMP PIN=${pin}${tab}FingerID=${fid}${tab}Size=${templateSize}${tab}Valid=1${tab}Template=${finalTemplateBase64}`;
}
