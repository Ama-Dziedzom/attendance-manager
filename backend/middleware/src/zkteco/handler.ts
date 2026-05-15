/**
 * ZKTeco Event Handler
 * 
 * Processes attendance events from MB460 terminals:
 * 1. Validates the event
 * 2. Calls Supabase to record attendance
 * 3. Emits WebSocket event to dashboard
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { ZKTecoEvent, getVerifyMethodName } from './parser';
import {
    clockInFromTerminal,
    clockOutFromTerminal,
    updateTerminalStatus,
    getEmployeeByEmpId
} from '../services/supabase';

export async function handleAttendanceEvent(
    event: ZKTecoEvent,
    supabase: SupabaseClient,
    io: SocketIOServer
): Promise<void> {
    if (event.type === 'heartbeat') {
        // Update terminal status
        if (event.deviceSerial) {
            await updateTerminalStatus(event.deviceSerial, 'online');
            io.emit('terminal:status', {
                serial: event.deviceSerial,
                status: 'online',
                timestamp: new Date().toISOString()
            });
        }
        return;
    }

    if (event.type !== 'attendance') {
        logger.debug('Ignoring non-attendance event:', event.type);
        return;
    }

    // Validate required fields
    if (!event.userId || !event.timestamp) {
        logger.warn('Invalid attendance event - missing userId or timestamp');
        return;
    }

    const verifyMethod = getVerifyMethodName(event.verifyType || 1);
    const isClockOut = event.inOutState === 1;

    logger.info(`Attendance event: User ${event.userId}, ${isClockOut ? 'OUT' : 'IN'}, Method: ${verifyMethod}`);

    try {
        // Get employee info for the notification
        const employee = await getEmployeeByEmpId(event.userId);

        let result;
        if (isClockOut) {
            result = await clockOutFromTerminal(
                event.userId,
                event.deviceSerial || 'unknown',
                verifyMethod,
                event.timestamp
            );
        } else {
            result = await clockInFromTerminal(
                event.userId,
                event.deviceSerial || 'unknown',
                verifyMethod,
                event.timestamp
            );
        }

        // Emit WebSocket event to dashboard
        const attendanceEvent = {
            type: isClockOut ? 'clock_out' : 'clock_in',
            employeeId: employee?.id || null,
            empId: event.userId,
            employeeName: employee?.name || 'Unknown Employee',
            department: employee?.department?.name || null,
            agency: employee?.agency?.name || null,
            verificationMethod: verifyMethod,
            terminal: event.deviceSerial,
            timestamp: event.timestamp.toISOString(),
            success: result.success,
            error: result.error || null,
            status: result.data?.status || null,
            totalHours: result.data?.total_hours || null
        };

        io.emit('attendance:event', attendanceEvent);

        if (result.success) {
            logger.info(`Successfully recorded ${isClockOut ? 'clock out' : 'clock in'} for ${event.userId}`);
        } else {
            logger.warn(`Clock ${isClockOut ? 'out' : 'in'} failed for ${event.userId}: ${result.error}`);
        }

    } catch (error) {
        logger.error('Error handling attendance event:', error);

        // Still emit the event to dashboard (with error)
        io.emit('attendance:event', {
            type: isClockOut ? 'clock_out' : 'clock_in',
            empId: event.userId,
            employeeName: 'Unknown',
            verificationMethod: verifyMethod,
            terminal: event.deviceSerial,
            timestamp: event.timestamp.toISOString(),
            success: false,
            error: String(error)
        });
    }
}
