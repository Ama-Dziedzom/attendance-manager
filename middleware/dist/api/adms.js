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
function setupAdmsRoutes(router, supabase) {
    // Device Registration
    router.post('/iclock/registry', async (req, res) => {
        try {
            logger_1.logger.info('[ADMS] Device registration request', {
                query: req.query,
                body: req.body,
                headers: req.headers
            });
            // Extract device info from query params
            const { SN, // Serial Number
            pushver, // Push version
            language, pushOptions } = req.query;
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
    router.get('/iclock/getrequest', async (req, res) => {
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
    router.post('/iclock/cdata', async (req, res) => {
        try {
            logger_1.logger.info('[ADMS] Received cdata request', {
                query: req.query,
                body: req.body,
                contentType: req.headers['content-type']
            });
            const { SN, table } = req.query;
            const rawData = req.body;
            // Parse attendance data
            // Format: ATTLOG PIN\tDateTime\tStatus\tVerifyType\tDeviceID
            // Example: ATTLOG 1\t2026-01-18 11:15:00\t0\t15\t1
            if (typeof rawData === 'string' && rawData.includes('ATTLOG')) {
                const lines = rawData.split('\n').filter(line => line.includes('ATTLOG'));
                for (const line of lines) {
                    const match = line.match(/ATTLOG\s+(\d+)\t(.+?)\t(\d+)\t(\d+)\t(\d+)/);
                    if (match) {
                        const [, userId, datetime, status, verifyType, deviceId] = match;
                        logger_1.logger.info('[ADMS] Parsed attendance:', {
                            userId,
                            datetime,
                            status,
                            verifyType,
                            deviceId
                        });
                        // Save to Supabase
                        const { error } = await supabase
                            .from('attendance')
                            .insert({
                            employee_id: userId,
                            timestamp: datetime,
                            status: status === '0' ? 'clock_in' : 'clock_out',
                            verification_method: verifyType === '15' ? 'face' : 'fingerprint',
                            device_id: String(deviceId),
                            created_at: new Date().toISOString()
                        });
                        if (error) {
                            logger_1.logger.error('[ADMS] Supabase error:', error);
                        }
                        else {
                            logger_1.logger.info('[ADMS] ✅ Attendance saved to Supabase');
                        }
                    }
                }
            }
            res.send('OK');
        }
        catch (error) {
            logger_1.logger.error('[ADMS] Cdata error:', error);
            res.status(500).send('ERROR');
        }
    });
    // Device command endpoint (optional)
    router.post('/iclock/devicecmd', async (req, res) => {
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
//# sourceMappingURL=adms.js.map