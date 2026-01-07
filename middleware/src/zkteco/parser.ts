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

import { logger } from '../utils/logger';

export interface ZKTecoEvent {
    type: 'heartbeat' | 'attendance' | 'unknown';
    deviceSerial: string | null;
    userId: string | null;
    timestamp: Date | null;
    verifyType: number | null;  // 1 = fingerprint, 15 = face
    inOutState: number | null;  // 0 = check-in, 1 = check-out
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
export function parseZKTecoPacket(data: Buffer): ZKTecoEvent | null {
    try {
        // Convert to string for log parsing (ZKTeco Push often sends text-based logs)
        const dataStr = data.toString('utf-8').trim();

        logger.debug('Raw data:', dataStr);

        // Check if this is a text-based attendance log (ATTLOG format)
        // Format: "USER_ID\tTIMESTAMP\tVERIFY_TYPE\tIN_OUT_STATE\tDEVICE_SERIAL"
        // Example: "12345\t2024-01-07 15:30:00\t1\t0\tABC123"
        if (dataStr.includes('\t')) {
            return parseAttendanceLog(dataStr);
        }

        // Check for heartbeat/registration packets
        if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x50) {
            return parseHeartbeat(data);
        }

        // Try to extract device serial from various packet types
        const serialMatch = dataStr.match(/SN[=:]?(\w+)/i);
        if (serialMatch) {
            return {
                type: 'heartbeat',
                deviceSerial: serialMatch[1],
                userId: null,
                timestamp: null,
                verifyType: null,
                inOutState: null
            };
        }

        // Unknown packet
        logger.debug('Unknown packet format:', data.toString('hex'));
        return null;

    } catch (error) {
        logger.error('Parse error:', error);
        return null;
    }
}

/**
 * Parse text-based attendance log
 */
function parseAttendanceLog(logLine: string): ZKTecoEvent | null {
    try {
        // Tab-separated: USER_ID, TIMESTAMP, VERIFY_TYPE, IN_OUT_STATE, [WORKCODE], [RESERVED]
        const parts = logLine.split('\t');

        if (parts.length < 4) {
            logger.warn('Invalid attendance log format:', logLine);
            return null;
        }

        const [userId, timestampStr, verifyType, inOutState] = parts;

        // Parse timestamp (format: "YYYY-MM-DD HH:mm:ss")
        const timestamp = new Date(timestampStr);
        if (isNaN(timestamp.getTime())) {
            logger.warn('Invalid timestamp in log:', timestampStr);
            return null;
        }

        return {
            type: 'attendance',
            deviceSerial: parts[4] || null,  // Device serial might be in 5th field
            userId: userId,
            timestamp: timestamp,
            verifyType: parseInt(verifyType) || 1,
            inOutState: parseInt(inOutState) || 0
        };
    } catch (error) {
        logger.error('Parse attendance log error:', error);
        return null;
    }
}

/**
 * Parse heartbeat/registration packet
 */
function parseHeartbeat(data: Buffer): ZKTecoEvent {
    // Extract device info from packet
    // This varies by firmware version, so we return a generic heartbeat
    return {
        type: 'heartbeat',
        deviceSerial: null,  // Will be extracted from subsequent packets
        userId: null,
        timestamp: null,
        verifyType: null,
        inOutState: null
    };
}

/**
 * Get verification method name
 */
export function getVerifyMethodName(verifyType: number): string {
    const methods: Record<number, string> = {
        0: 'password',
        1: 'fingerprint',
        2: 'card',
        15: 'face'
    };
    return methods[verifyType] || 'unknown';
}
