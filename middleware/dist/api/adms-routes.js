"use strict";
/**
 * ADMS (Advanced Device Management System) Routes
 *
 * Handles ZKTeco device communication via PUSH protocol:
 * - Device registration (/iclock/registry)
 * - Command polling (/iclock/getrequest)
 * - Attendance data push (/iclock/cdata)
 * - Device commands (/iclock/devicecmd)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAdmsRoutes = setupAdmsRoutes;
const logger_1 = require("../utils/logger");
function setupAdmsRoutes(app, supabase) {
    // Device Registration
    app.post('/iclock/registry', async (req, res) => {
        try {
            logger_1.logger.info('[ADMS] Device registration request', {
                query: req.query,
                body: req.body,
                headers: req.headers
            });
            // Extract device info from query params
            const { SN, // Serial Number
            pushver, // Push version
             } = req.query;
            logger_1.logger.info('[ADMS] Device registered', {
                serialNumber: SN,
                version: pushver
            });
            // Respond with server timestamp
            res.send(`GET OPTION FROM: ${SN}\nStamp=9999\n`);
        }
        catch (error) {
            logger_1.logger.error('[ADMS] Registry error:', error);
            res.status(500).send('ERROR');
        }
    });
    // Device polling for commands
    app.get('/iclock/getrequest', async (req, res) => {
        try {
            const { SN } = req.query;
            logger_1.logger.info('[ADMS] Device polling', { serialNumber: SN });
            // No commands for now, just respond OK
            res.send('OK');
        }
        catch (error) {
            logger_1.logger.error('[ADMS] Getrequest error:', error);
            res.status(500).send('ERROR');
        }
    });
    // Attendance data push (main endpoint)
    app.post('/iclock/cdata', async (req, res) => {
        try {
            logger_1.logger.info('[ADMS] Received cdata request', {
                query: req.query,
                body: req.body,
                contentType: req.headers['content-type']
            });
            const { SN } = req.query;
            const terminalSerial = String(SN || 'UNKNOWN');
            // Get raw data - handle both string and Buffer
            let rawData = req.body;
            if (Buffer.isBuffer(rawData)) {
                rawData = rawData.toString('utf8');
            }
            logger_1.logger.info('[ADMS] Raw data type:', typeof rawData);
            logger_1.logger.info('[ADMS] Raw data:', rawData);
            // Parse attendance data
            // Format: PIN\tDateTime\tStatus\tVerifyType\tWorkCode\tReserved1\tReserved2
            // Example: 1\t2026-01-18 11:15:00\t0\t15\t0\t0\t0
            if (typeof rawData === 'string' && rawData.trim().length > 0) {
                const lines = rawData.split('\n').filter((line) => line.trim().length > 0);
                for (const line of lines) {
                    logger_1.logger.info('[ADMS] Processing line:', line);
                    // Try different ATTLOG formats
                    // Format 1: ATTLOG PIN\tDateTime\tStatus\tVerifyType\tDeviceID
                    let match = line.match(/ATTLOG\s+(\d+)\t(.+?)\t(\d+)\t(\d+)\t(\d+)/);
                    // Format 2: Just PIN\tDateTime\tStatus\tVerifyType\t...
                    if (!match) {
                        match = line.match(/^(\d+)\t(.+?)\t(\d+)\t(\d+)/);
                    }
                    if (match) {
                        const [, empId, datetime, status, verifyType] = match;
                        // Determine verification method
                        let verificationMethod = 'fingerprint';
                        if (verifyType === '15')
                            verificationMethod = 'face';
                        else if (verifyType === '1')
                            verificationMethod = 'fingerprint';
                        else if (verifyType === '2')
                            verificationMethod = 'card';
                        else if (verifyType === '3')
                            verificationMethod = 'password';
                        // Determine clock in or out (status 0 = clock in, 1 = clock out)
                        const isClockIn = status === '0';
                        logger_1.logger.info('[ADMS] Parsed attendance:', {
                            empId,
                            datetime,
                            status,
                            isClockIn,
                            verifyType,
                            verificationMethod,
                            terminalSerial
                        });
                        // Use RPC function to save attendance
                        const rpcName = isClockIn ? 'clock_in_from_terminal' : 'clock_out_from_terminal';
                        const { data, error } = await supabase.rpc(rpcName, {
                            p_emp_id: empId,
                            p_terminal_serial: terminalSerial,
                            p_verification_method: verificationMethod,
                            p_timestamp: new Date(datetime).toISOString()
                        });
                        if (error) {
                            logger_1.logger.error('[ADMS] Supabase RPC error:', error);
                        }
                        else {
                            logger_1.logger.info('[ADMS] ✅ Attendance saved via RPC:', data);
                        }
                    }
                    else {
                        logger_1.logger.warn('[ADMS] Could not parse line:', line);
                    }
                }
            }
            else {
                logger_1.logger.info('[ADMS] No attendance data in request body');
            }
            res.send('OK');
        }
        catch (error) {
            logger_1.logger.error('[ADMS] Cdata error:', error);
            res.status(500).send('ERROR');
        }
    });
    // Device command endpoint (optional)
    app.post('/iclock/devicecmd', async (req, res) => {
        try {
            logger_1.logger.info('[ADMS] Device command', {
                query: req.query,
                body: req.body
            });
            res.send('OK');
        }
        catch (error) {
            logger_1.logger.error('[ADMS] Devicecmd error:', error);
            res.status(500).send('ERROR');
        }
    });
    logger_1.logger.info('[ADMS] Routes configured');
}
//# sourceMappingURL=adms-routes.js.map