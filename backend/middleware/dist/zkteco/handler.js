"use strict";
/**
 * ZKTeco Event Handler
 *
 * Processes attendance events from MB460 terminals:
 * 1. Validates the event
 * 2. Calls Supabase to record attendance
 * 3. Emits WebSocket event to dashboard
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAttendanceEvent = handleAttendanceEvent;
const logger_1 = require("../utils/logger");
const parser_1 = require("./parser");
const supabase_1 = require("../services/supabase");
async function handleAttendanceEvent(event, supabase, io) {
    if (event.type === 'heartbeat') {
        // Update terminal status
        if (event.deviceSerial) {
            await (0, supabase_1.updateTerminalStatus)(event.deviceSerial, 'online');
            io.emit('terminal:status', {
                serial: event.deviceSerial,
                status: 'online',
                timestamp: new Date().toISOString()
            });
        }
        return;
    }
    if (event.type !== 'attendance') {
        logger_1.logger.debug('Ignoring non-attendance event:', event.type);
        return;
    }
    // Validate required fields
    if (!event.userId || !event.timestamp) {
        logger_1.logger.warn('Invalid attendance event - missing userId or timestamp');
        return;
    }
    const verifyMethod = (0, parser_1.getVerifyMethodName)(event.verifyType || 1);
    const isClockOut = event.inOutState === 1;
    logger_1.logger.info(`Attendance event: User ${event.userId}, ${isClockOut ? 'OUT' : 'IN'}, Method: ${verifyMethod}`);
    try {
        // Get employee info for the notification
        const employee = await (0, supabase_1.getEmployeeByEmpId)(event.userId);
        let result;
        if (isClockOut) {
            result = await (0, supabase_1.clockOutFromTerminal)(event.userId, event.deviceSerial || 'unknown', verifyMethod, event.timestamp);
        }
        else {
            result = await (0, supabase_1.clockInFromTerminal)(event.userId, event.deviceSerial || 'unknown', verifyMethod, event.timestamp);
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
            logger_1.logger.info(`Successfully recorded ${isClockOut ? 'clock out' : 'clock in'} for ${event.userId}`);
        }
        else {
            logger_1.logger.warn(`Clock ${isClockOut ? 'out' : 'in'} failed for ${event.userId}: ${result.error}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error handling attendance event:', error);
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
//# sourceMappingURL=handler.js.map