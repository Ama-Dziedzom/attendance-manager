/**
 * REST API Routes
 * 
 * Provides endpoints for the Next.js dashboard to:
 * - Get terminal status
 * - Get connected devices
 * - Trigger manual sync
 */

import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { getTerminals } from '../services/supabase';
import { getConnectedDevices, isDeviceConnected } from '../zkteco/server';

export function setupApiRoutes(app: Express, io: SocketIOServer): void {

    // =========================================================================
    // TERMINALS
    // =========================================================================

    /**
     * GET /api/terminals
     * Get all registered terminals with their status
     */
    app.get('/api/terminals', async (req: Request, res: Response) => {
        try {
            const terminals = await getTerminals();
            const connectedSerials = getConnectedDevices();

            // Enrich with connection status
            const enrichedTerminals = terminals.map(terminal => ({
                ...terminal,
                isConnected: connectedSerials.includes(terminal.serial_number),
                name: terminal.name || `Terminal ${terminal.serial_number}`,
                agencyName: terminal.agency?.name || null
            }));

            res.json({
                success: true,
                terminals: enrichedTerminals,
                connectedCount: connectedSerials.length,
                totalCount: terminals.length
            });
        } catch (error) {
            logger.error('GET /api/terminals error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch terminals' });
        }
    });

    /**
     * GET /api/terminals/connected
     * Get list of currently connected device serials
     */
    app.get('/api/terminals/connected', (req: Request, res: Response) => {
        const connectedDevices = getConnectedDevices();
        res.json({
            success: true,
            devices: connectedDevices,
            count: connectedDevices.length
        });
    });

    /**
     * GET /api/terminals/:serial/status
     * Check if a specific terminal is connected
     */
    app.get('/api/terminals/:serial/status', (req: Request, res: Response) => {
        const { serial } = req.params;
        const isConnected = isDeviceConnected(serial);

        res.json({
            success: true,
            serial,
            isConnected,
            status: isConnected ? 'online' : 'offline'
        });
    });

    // =========================================================================
    // SIMULATION (for testing without actual MB460)
    // =========================================================================

    /**
     * POST /api/simulate/attendance
     * Simulate an attendance event (for testing)
     * 
     * Body: { empId, type: 'in' | 'out', verifyMethod: 'fingerprint' | 'face' }
     */
    app.post('/api/simulate/attendance', async (req: Request, res: Response) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, error: 'Simulation disabled in production' });
        }

        const { empId, type = 'in', verifyMethod = 'fingerprint', terminalSerial = 'SIMULATOR' } = req.body;

        if (!empId) {
            return res.status(400).json({ success: false, error: 'empId is required' });
        }

        logger.info(`Simulating ${type} event for employee ${empId}`);

        // Import handler functions
        const { clockInFromTerminal, clockOutFromTerminal, getEmployeeByEmpId } = require('../services/supabase');

        try {
            const employee = await getEmployeeByEmpId(empId);
            let result;

            if (type === 'out') {
                result = await clockOutFromTerminal(empId, terminalSerial, verifyMethod, new Date());
            } else {
                result = await clockInFromTerminal(empId, terminalSerial, verifyMethod, new Date());
            }

            // Emit WebSocket event
            io.emit('attendance:event', {
                type: type === 'out' ? 'clock_out' : 'clock_in',
                employeeId: employee?.id || null,
                empId,
                employeeName: employee?.name || 'Unknown',
                department: employee?.department?.name || null,
                agency: employee?.agency?.name || null,
                verificationMethod: verifyMethod,
                terminal: terminalSerial,
                timestamp: new Date().toISOString(),
                success: result.success,
                error: result.error || null,
                simulated: true
            });

            res.json(result);
        } catch (error) {
            logger.error('Simulation error:', error);
            res.status(500).json({ success: false, error: String(error) });
        }
    });

    // =========================================================================
    // STATISTICS
    // =========================================================================

    /**
     * GET /api/stats
     * Get middleware statistics
     */
    app.get('/api/stats', (req: Request, res: Response) => {
        const connectedDevices = getConnectedDevices();

        res.json({
            success: true,
            uptime: process.uptime(),
            connectedTerminals: connectedDevices.length,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage()
        });
    });

    logger.info('API routes configured');
}
