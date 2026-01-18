/**
 * ADMS (Advanced Device Management System) Routes
 * 
 * Handles ZKTeco device communication via PUSH protocol:
 * - Device registration (/iclock/registry)
 * - Command polling (/iclock/getrequest)
 * - Attendance data push (/iclock/cdata)
 * - Device commands (/iclock/devicecmd)
 */

import { Express, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { smartToggleAttendance } from '../services/supabase';

export function setupAdmsRoutes(app: Express, supabase: SupabaseClient) {

    // Device Registration
    app.post('/iclock/registry', async (req: Request, res: Response) => {
        try {
            logger.info('[ADMS] Device registration request', {
                query: req.query,
                body: req.body,
                headers: req.headers
            });

            // Extract device info from query params
            const {
                SN,        // Serial Number
                pushver,   // Push version
            } = req.query;

            logger.info('[ADMS] Device registered', {
                serialNumber: SN,
                version: pushver
            });

            // Respond with server timestamp
            res.send(`GET OPTION FROM: ${SN}\nStamp=9999\n`);
        } catch (error) {
            logger.error('[ADMS] Registry error:', error);
            res.status(500).send('ERROR');
        }
    });

    // Simple in-memory command queue for demonstration
    const commandQueue: Record<string, string[]> = {};

    // Device polling for commands
    app.get('/iclock/getrequest', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            const terminalSerial = String(SN || 'UNKNOWN');

            logger.info('[ADMS] Device polling', { serialNumber: terminalSerial });

            // Check for pending commands
            if (commandQueue[terminalSerial] && commandQueue[terminalSerial].length > 0) {
                const command = commandQueue[terminalSerial].shift();
                logger.info('[ADMS] Sending command to device:', { terminalSerial, command });
                return res.send(command);
            }

            // No commands, just respond OK
            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Getrequest error:', error);
            res.status(500).send('ERROR');
        }
    });

    // Helper endpoint to queue employee sync
    app.get('/api/sync-to-device', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            if (!SN) return res.status(400).json({ error: 'Missing SN (Serial Number)' });

            const terminalSerial = String(SN);

            // Fetch employees from Supabase
            const { data: employees, error } = await supabase
                .from('employees')
                .select('emp_id, name')
                .eq('is_active', true);

            if (error) throw error;

            if (!employees || employees.length === 0) {
                return res.json({ message: 'No active employees found in Supabase' });
            }

            // Initialize queue for this device if not exists
            if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];

            // Generate commands
            employees.forEach((emp, index) => {
                const cmdId = Math.floor(Math.random() * 10000);

                // Get the numeric part after the dash, or just all digits
                const partToUse = emp.emp_id.includes('-') ? emp.emp_id.split('-')[1] : emp.emp_id;
                const numericPin = partToUse.replace(/\D/g, '');

                if (!numericPin) {
                    logger.warn(`[ADMS] Skipping employee ${emp.name} - no numeric ID found in ${emp.emp_id}`);
                    return;
                }

                // Clean up leading zeros to keep it simple (e.g., 00001 -> 1)
                const simplePin = parseInt(numericPin, 10).toString();

                const tab = String.fromCharCode(9);
                const cmd = `C:${cmdId}:DATA USER PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001`;

                commandQueue[terminalSerial].push(cmd);
                logger.info(`[ADMS] Queued sync command for ${emp.name}: PIN=${simplePin} (${emp.emp_id})`);
            });

            logger.info(`[ADMS] Queued ${employees.length} sync commands for device ${terminalSerial}`);

            res.json({
                success: true,
                message: `Queued ${employees.length} sync commands for device ${terminalSerial}. Wait for the device to poll (usually every 30s).`,
                employees: employees.map(e => e.name)
            });
        } catch (error: any) {
            logger.error('[ADMS] Sync error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Attendance data push (main endpoint)
    app.post('/iclock/cdata', async (req: Request, res: Response) => {
        try {
            logger.info('[ADMS] Received cdata request', {
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

            logger.info('[ADMS] Raw data type:', typeof rawData);
            logger.info('[ADMS] Raw data:', rawData);

            // Parse attendance data
            // Format: PIN\tDateTime\tStatus\tVerifyType\tWorkCode\tReserved1\tReserved2
            // Example: 1\t2026-01-18 11:15:00\t0\t15\t0\t0\t0

            if (typeof rawData === 'string' && rawData.trim().length > 0) {
                const lines = rawData.split('\n').filter((line: string) => line.trim().length > 0);

                for (const line of lines) {
                    logger.info('[ADMS] Processing line:', line);

                    // Try different ATTLOG formats
                    // Format 1: ATTLOG PIN\tDateTime\tStatus\tVerifyType\tDeviceID
                    let match = line.match(/ATTLOG\s+([^\t]+)\t([^\t]+)\t(\d+)\t(\d+)\t(\d+)/);

                    // Format 2: Just PIN\tDateTime\tStatus\tVerifyType\t...
                    if (!match) {
                        match = line.match(/^([^\t]+)\t([^\t]+)\t(\d+)\t(\d+)/);
                    }

                    if (match) {
                        const [, empId, datetime, status, verifyType] = match;

                        // Determine verification method
                        let verificationMethod = 'fingerprint';
                        if (verifyType === '15') verificationMethod = 'face';
                        else if (verifyType === '1') verificationMethod = 'fingerprint';
                        else if (verifyType === '2') verificationMethod = 'card';
                        else if (verifyType === '3') verificationMethod = 'password';

                        // Determine clock in or out (status 0 = clock in, 1 = clock out)
                        const isClockIn = status === '0';

                        // Resolve numeric PIN to full emp_id if needed
                        // (e.g., "4" or "00004" -> "ID-00004")
                        let resolvedEmpId = empId;
                        if (/^\d+$/.test(empId)) {
                            const numericValue = parseInt(empId, 10).toString();

                            const { data: employee } = await supabase
                                .from('employees')
                                .select('emp_id')
                                // Search for exact match or suffix match with dash
                                .or(`emp_id.eq.${empId},emp_id.ilike.%-${empId},emp_id.ilike.%-${numericValue}`)
                                .eq('is_active', true)
                                .maybeSingle();

                            if (employee) {
                                resolvedEmpId = employee.emp_id;
                                logger.info(`[ADMS] Resolved numeric PIN ${empId} to ${resolvedEmpId}`);
                            } else {
                                logger.warn(`[ADMS] Could not resolve numeric PIN ${empId} to any employee`);
                            }
                        }

                        logger.info('[ADMS] Parsed attendance:', {
                            empId,
                            resolvedEmpId,
                            datetime,
                            status,
                            isClockIn,
                            verifyType,
                            verificationMethod,
                            terminalSerial
                        });

                        // Use Smart Toggle instead of relying on the device status
                        const { success, action, data, error: rpcError } = await smartToggleAttendance(
                            resolvedEmpId,
                            terminalSerial,
                            verificationMethod,
                            new Date(datetime)
                        );

                        if (!success) {
                            logger.warn(`[ADMS] Smart toggle failed for ${resolvedEmpId}:`, rpcError);
                        } else {
                            logger.info(`[ADMS] ✅ Attendance ${action} successful for ${resolvedEmpId}`, data);
                        }
                    } else {
                        logger.warn('[ADMS] Could not parse line:', line);
                    }
                }
            } else {
                logger.info('[ADMS] No attendance data in request body');
            }

            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Cdata error:', error);
            res.status(500).send('ERROR');
        }
    });

    // Device command endpoint (optional)
    app.post('/iclock/devicecmd', async (req: Request, res: Response) => {
        try {
            let body = req.body;
            if (Buffer.isBuffer(body)) body = body.toString();

            logger.info('[ADMS] Device command response received', {
                query: req.query,
                body: body
            });

            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Devicecmd error:', error);
            res.status(500).send('ERROR');
        }
    });

    logger.info('[ADMS] Routes configured');
}
