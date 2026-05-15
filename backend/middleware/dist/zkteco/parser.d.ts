/**
 * ZKTeco Protocol Parser
 *
 * Parses data packets from MB460 terminals.
 *
 * ZKTeco Push Protocol sends attendance logs in the following format:
 * - Device sends heartbeat/registration packet on connect
 * - Authentication events are sent as ATTLOG_RRQ responses
 *
 * Verify Types (MB460):
 * - 1: Fingerprint
 * - 15: Face
 * - 0: Password (not used in our case)
 */
export interface ZKTecoEvent {
    type: 'heartbeat' | 'attendance' | 'unknown';
    deviceSerial: string | null;
    userId: string | null;
    timestamp: Date | null;
    verifyType: number | null;
    inOutState: number | null;
}
/**
 * Parse ZKTeco packet
 *
 * This is a simplified parser. The actual ZKTeco protocol is complex and
 * may require adjustments based on specific MB460 firmware version.
 *
 * Common packet structure:
 * - Header: 4 bytes (usually starts with 0x50, 0x50, 0x82, 0x7D)
 * - Command: 2 bytes
 * - Session: 2 bytes
 * - Reply: 2 bytes
 * - Data length: 4 bytes
 * - Data: variable
 */
export declare function parseZKTecoPacket(data: Buffer): ZKTecoEvent | null;
/**
 * Get verification method name
 */
export declare function getVerifyMethodName(verifyType: number): string;
//# sourceMappingURL=parser.d.ts.map