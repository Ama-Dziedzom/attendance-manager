"use strict";
/**
 * REST API Routes
 *
 * Provides endpoints for the Next.js dashboard to:
 * - Get terminal status
 * - Get connected devices
 * - Trigger manual sync
 * - Handle ADMS device communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApiRoutes = setupApiRoutes;
const adms_routes_1 = require("./adms-routes");
const logger_1 = require("../utils/logger");
const supabase_1 = require("../services/supabase");
const server_1 = require("../zkteco/server");
function setupApiRoutes(app, io) {
    // Initialize Supabase for ADMS routes
    const supabase = (0, supabase_1.initSupabase)();
    // Setup ADMS routes for ZKTeco PUSH protocol
    (0, adms_routes_1.setupAdmsRoutes)(app, supabase);
    // =========================================================================
    // TERMINALS
    // =========================================================================
    /**
     * GET /api/terminals
     * Get all registered terminals with their status
     */
    app.get('/api/terminals', async (req, res) => {
        try {
            const terminals = await (0, supabase_1.getTerminals)();
            const connectedSerials = (0, server_1.getConnectedDevices)();
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
        }
        catch (error) {
            logger_1.logger.error('GET /api/terminals error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch terminals' });
        }
    });
    /**
     * GET /api/terminals/connected
     * Get list of currently connected device serials
     */
    app.get('/api/terminals/connected', (req, res) => {
        const connectedDevices = (0, server_1.getConnectedDevices)();
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
    app.get('/api/terminals/:serial/status', (req, res) => {
        const { serial } = req.params;
        const isConnected = (0, server_1.isDeviceConnected)(serial);
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
    app.post('/api/simulate/attendance', async (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, error: 'Simulation disabled in production' });
        }
        const { empId, type = 'in', verifyMethod = 'fingerprint', terminalSerial = 'SIMULATOR' } = req.body;
        if (!empId) {
            return res.status(400).json({ success: false, error: 'empId is required' });
        }
        logger_1.logger.info(`Simulating ${type} event for employee ${empId}`);
        // Import handler functions
        const { clockInFromTerminal, clockOutFromTerminal, getEmployeeByEmpId } = require('../services/supabase');
        try {
            const employee = await getEmployeeByEmpId(empId);
            let result;
            if (type === 'out') {
                result = await clockOutFromTerminal(empId, terminalSerial, verifyMethod, new Date());
            }
            else {
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
        }
        catch (error) {
            logger_1.logger.error('Simulation error:', error);
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
    app.get('/api/stats', (req, res) => {
        const connectedDevices = (0, server_1.getConnectedDevices)();
        res.json({
            success: true,
            uptime: process.uptime(),
            connectedTerminals: connectedDevices.length,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage()
        });
    });
    logger_1.logger.info('API routes configured');
}
//# sourceMappingURL=routes.js.map