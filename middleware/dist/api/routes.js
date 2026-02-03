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
const scanner_1 = require("../services/scanner");
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
    // BIOMETRICS
    // =========================================================================
    /**
     * POST /api/scanner/capture
     * Trigger the physical SLK20R scanner to capture a finger
     */
    app.post('/api/scanner/capture', async (req, res) => {
        try {
            const result = await scanner_1.scannerService.enrollFingerprint((status) => {
                io.emit('scanner:progress', { status });
            });
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Scanner capture error:', error);
            res.status(500).json({ success: false, error: String(error) });
        }
    });
    /**
     * POST /api/fingerprints/enroll
     * Store fingerprint enrolled via SLK20R
     */
    app.post('/api/fingerprints/enroll', async (req, res) => {
        const { employeeId, fingerIndex, template } = req.body;
        logger_1.logger.info(`[Enroll] Enrollment request received for employee: ${employeeId}, finger: ${fingerIndex}`);
        if (!employeeId || fingerIndex === undefined || !template) {
            logger_1.logger.warn('[Enroll] Missing required fields');
            return res.status(400).json({ success: false, error: 'employeeId, fingerIndex, and template are required' });
        }
        try {
            // 1. Store the Fingerprint
            logger_1.logger.info(`[Enroll] Attempting to upsert fingerprint for UUID: ${employeeId}`);
            const { error: upsertError } = await supabase
                .from('employee_fingerprints')
                .upsert({
                employee_id: employeeId,
                finger_index: fingerIndex,
                template: template,
                updated_at: new Date().toISOString()
            }, { onConflict: 'employee_id,finger_index' });
            if (upsertError) {
                logger_1.logger.error('[Enroll] Fingerprint DB error:', upsertError);
                throw upsertError;
            }
            logger_1.logger.info(`[Enroll] Fingerprint template saved to DB for employee ${employeeId}`);
            // 2. Lookup Alphanumeric emp_id
            logger_1.logger.info(`[Enroll] Looking up emp_id for UUID: ${employeeId}`);
            const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('emp_id, agency_id')
                .eq('id', employeeId)
                .single();
            if (empError) {
                logger_1.logger.error('[Enroll] Employee lookup error:', empError);
                throw empError;
            }
            if (employee) {
                logger_1.logger.info(`[Enroll] Resolved UUID ${employeeId} to emp_id: ${employee.emp_id}. Agency: ${employee.agency_id}`);
                // 3. Find Terminals
                const { data: terminals, error: terminalError } = await supabase
                    .from('terminal_agencies')
                    .select('terminal_sn')
                    .eq('agency_id', employee.agency_id);
                if (terminalError) {
                    logger_1.logger.warn(`[Enroll] terminal_agencies lookup failed (maybe using fallback): ${terminalError.message}`);
                }
                if (terminals && terminals.length > 0) {
                    logger_1.logger.info(`[Enroll] Found ${terminals.length} terminals for agency ${employee.agency_id}`);
                    for (const t of terminals) {
                        logger_1.logger.info(`[Enroll] Queuing re-sync for ${employee.emp_id} on ${t.terminal_sn}`);
                        const { error: syncError } = await supabase.from('employee_terminal_sync').upsert({
                            emp_id: employee.emp_id,
                            terminal_sn: t.terminal_sn,
                            status: 'pending',
                            last_sync_at: new Date().toISOString()
                        }, { onConflict: 'emp_id,terminal_sn' });
                        if (syncError)
                            logger_1.logger.error(`[Enroll] Sync queue error for ${t.terminal_sn}:`, syncError);
                    }
                }
                else {
                    logger_1.logger.info(`[Enroll] No specific terminals found for agency ${employee.agency_id}`);
                }
            }
            res.json({ success: true, message: 'Fingerprint enrolled and sync triggered' });
        }
        catch (error) {
            logger_1.logger.error('[Enroll] Enrollment processing error:', error);
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