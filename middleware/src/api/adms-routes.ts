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
import { smartToggleAttendance, getEmployeeByEmpId, getTerminalBySN, getTerminalAgencies, getEmployeesByAgencies, getTerminalSyncStatus, markEmployeeSynced, getEmployeeFingerprints } from '../services/supabase';

export function setupAdmsRoutes(app: Express, supabase: SupabaseClient) {
    // Add a catch-all logger for transparency
    app.use('/iclock', (req, res, next) => {
        logger.info(`[ADMS Request] ${req.method} ${req.url}`, {
            query: req.query,
            ip: req.ip
        });
        next();
    });

    // Device Registration
    app.post('/iclock/registry', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const serverTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            logger.info(`[ADMS] Device ${SN} registered. Syncing time to: ${serverTime}`);

            // Respond with server timestamp and sync the terminal clock
            res.send(`GET OPTION FROM: ${SN}\nStamp=9999\nServerTime=${serverTime}\n`);
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

            // 1. Time Sync (Throttled to once every 30 mins)
            const lastTimeSync = (global as any).lastTimeSync || {};
            const nowTime = Date.now();

            if (!lastTimeSync[terminalSerial] || (nowTime - lastTimeSync[terminalSerial] > 30 * 60 * 1000)) {
                const now = new Date();
                const serverTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                const timeCmdId = Math.floor(Math.random() * 10000);
                const timeCmd = `C:${timeCmdId}:SET OPTION DateTime=${serverTime}`;

                if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];
                commandQueue[terminalSerial].push(timeCmd);

                (global as any).lastTimeSync = { ...lastTimeSync, [terminalSerial]: nowTime };
                logger.info(`[ADMS] ⏰ Clock sync queued for ${terminalSerial}: ${serverTime}`);
            }

            // 2. Check for priority commands in queue
            if (commandQueue[terminalSerial] && commandQueue[terminalSerial].length > 0) {
                const command = commandQueue[terminalSerial].shift();
                logger.info('[ADMS] Sending priority command to device:', { terminalSerial, command });
                return res.send(command);
            }

            // 2. Automatic Agency-Based Synchronization Logic
            // This implements the "Middleware as the Brain" architecture:
            // - Identify device -> Identify agencies (supports multi-agency) -> Identify employees -> Push missing

            const agencyIds = await getTerminalAgencies(terminalSerial);
            logger.info(`[ADMS] Heartbeat from ${terminalSerial}. Linked agencies: ${agencyIds.join(', ') || 'None'}`);

            if (agencyIds.length > 0) {
                const agencyEmployees = await getEmployeesByAgencies(agencyIds);
                const syncStatus = await getTerminalSyncStatus(terminalSerial);

                // Find employees that belong to linked agencies but are not yet synced to this terminal
                const syncedEmpIds = new Set(syncStatus.filter(s => s.status === 'synced').map(s => s.emp_id));
                const missingEmployees = agencyEmployees.filter(emp => !syncedEmpIds.has(emp.emp_id));

                logger.info(`[ADMS] Found ${missingEmployees.length} unsynced employees for ${terminalSerial}`);

                if (missingEmployees.length > 0) {
                    const emp = missingEmployees[0]; // Process one at a time per heartbeat to avoid flooding
                    const cmdId = Math.floor(Math.random() * 10000);

                    let numericPin: string;
                    if (emp.device_pin) {
                        numericPin = emp.device_pin.toString();
                    } else {
                        const partToUse = emp.emp_id.includes('-') ? emp.emp_id.split('-')[1] : emp.emp_id;
                        numericPin = partToUse.replace(/\D/g, '');
                    }

                    const simplePin = parseInt(numericPin, 10).toString();
                    const tab = String.fromCharCode(9);

                    logger.info(`[ADMS] Processing sync for ${emp.name} (UUID: ${emp.id}, PIN: ${simplePin})`);

                    // 1. Fetch Fingerprints first so we know what to queue
                    const fingerprints = await getEmployeeFingerprints(emp.id);
                    logger.info(`[ADMS] Fingerprints found in DB for ${emp.name}: ${fingerprints.length}`);

                    // 2. Create User Command
                    // We must send the USER first, then the FPTMP commands will follow from the queue
                    // Added Verify=0 (Fingerprint+Password) for better compatibility
                    const userCmd = `C:${cmdId}:DATA USER PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=0`;

                    logger.info(`[ADMS] Auto-syncing employee to device: ${emp.name} (PIN ${simplePin}) to ${terminalSerial}`);

                    // 3. Queue Fingerprint Commands (These will be pulled on the NEXT heartbeats)
                    if (fingerprints.length > 0) {
                        if (!commandQueue[terminalSerial]) {
                            commandQueue[terminalSerial] = [];
                        }
                        for (const fp of fingerprints) {
                            const fpCmdId = Math.floor(Math.random() * 10000);
                            const cleanTemplate = fp.template.trim();

                            // Log template properties for debugging
                            logger.info(`[ADMS] Syncing finger ${fp.finger_index} for ${emp.name}. Template length: ${cleanTemplate.length}`);

                            /**
                             * MB460 / ADMS Standard Fingerprint Command Format:
                             * DATA FPTMP PIN=X [TAB] FingerID=X [TAB] Valid=1 [TAB] Template=XXX [TAB] Reserved=0 [TAB] MajorVer=10
                             * 
                             * Note: Some firmwares use 'Size' but 'MajorVer' + 'Template' is the modern standard.
                             */
                            const fpCmd = `C:${fpCmdId}:DATA FPTMP PIN=${simplePin}${tab}FingerID=${fp.finger_index}${tab}Valid=1${tab}Template=${cleanTemplate}${tab}Reserved=0${tab}MajorVer=10`;

                            commandQueue[terminalSerial].push(fpCmd);
                        }
                        logger.info(`[ADMS] Queued ${fingerprints.length} fingerprints for ${emp.name} to ${terminalSerial}`);
                    } else {
                        logger.warn(`[ADMS] No fingerprints found in DB for ${emp.name}. Device will only have names, verification will FAIL.`);
                    }

                    // Mark as synced ONLY after the fingerprints are queued
                    await markEmployeeSynced(emp.emp_id, terminalSerial, 'synced');

                    logger.info(`[ADMS] Sending USER command for ${emp.name} (Next heartbeats will pull ${fingerprints.length} fingerprints)`);
                    return res.send(userCmd);
                }
            }

            // No commands, just respond OK
            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Getrequest error:', error);
            res.status(500).send('ERROR');
        }
    });

    // Helper endpoint to queue employee sync (can be triggered by dashboard)
    app.get('/api/sync-to-device', async (req: Request, res: Response) => {
        try {
            const { SN, force } = req.query;
            if (!SN) return res.status(400).json({ error: 'Missing SN (Serial Number)' });

            const terminalSerial = String(SN).trim();
            logger.info(`[Sync API] Requested sync for device SN: "${terminalSerial}"`);

            // Get all agencies linked to this terminal
            const agencyIds = await getTerminalAgencies(terminalSerial);
            logger.info(`[Sync API] Agencies found for ${terminalSerial}:`, agencyIds);

            if (agencyIds.length === 0) {
                logger.warn(`[Sync API] Sync failed: No agencies linked to ${terminalSerial}`);
                return res.status(404).json({ error: `Device ${terminalSerial} not linked to any agency. Please register the terminal first.` });
            }

            // Fetch employees for all linked agencies
            const employees = await getEmployeesByAgencies(agencyIds);

            if (!employees || employees.length === 0) {
                return res.json({ message: `No employees found for the linked agencies` });
            }

            // If force is provided, we reset the sync status for these employees on this device
            if (force === 'true') {
                logger.info(`[Sync] Force-resetting sync status for ${employees.length} employees on ${terminalSerial}`);
                for (const emp of employees) {
                    await markEmployeeSynced(emp.emp_id, terminalSerial, 'pending');
                    logger.info(`[Sync] Employee ${emp.emp_id} (${emp.name}) marked as pending`);
                }
            }

            res.json({
                success: true,
                message: `Sync initiated for ${employees.length} employees on device ${terminalSerial}. They will be pushed during next heartbeats.`,
                agencyCount: agencyIds.length,
                employees: employees.map((e: { name: string }) => e.name)
            });
        } catch (error: unknown) {
            logger.error('[ADMS] Sync error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
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
                        // (e.g., "4" -> device_pin lookup -> "ID-00004")
                        let resolvedEmpId = empId;

                        const employee = await getEmployeeByEmpId(empId);

                        if (employee) {
                            resolvedEmpId = employee.emp_id;
                            logger.info(`[ADMS] Resolved numeric PIN ${empId} to ${resolvedEmpId} (${employee.name})`);
                        } else {
                            logger.warn(`[ADMS] Could not resolve numeric PIN ${empId} to any active employee`);
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

                        // Parse Date safely - ZK terminals use YYYY-MM-DD HH:mm:ss
                        // Most JS environments handle this, but adding a fallback just in case
                        let attendanceTime = new Date(datetime);
                        if (isNaN(attendanceTime.getTime())) {
                            attendanceTime = new Date(datetime.replace(' ', 'T'));
                        }

                        // Use Smart Toggle instead of relying on the device status
                        const { success, action, data, error: rpcError } = await smartToggleAttendance(
                            employee?.id || resolvedEmpId, // Pass internal UUID if found, fallback to resolved ID
                            resolvedEmpId,                  // Pass human-readable emp_id
                            terminalSerial,
                            verificationMethod,
                            attendanceTime
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

    // Device command endpoint
    app.post('/iclock/devicecmd', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            let body = req.body;
            if (Buffer.isBuffer(body)) body = body.toString();

            // Log the raw response from device (Crucial for debugging "Illegal Fingerprint")
            // Usually looks like: ID=123&Return=0 (Success) or ID=123&Return=-1 (Error)
            logger.info(`[ADMS CMD Response] Device ${SN || 'unknown'}:`, body);

            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Devicecmd error:', error);
            res.status(500).send('OK'); // Always send OK to device to prevent retries
        }
    });

    logger.info('[ADMS] Routes configured');
}
