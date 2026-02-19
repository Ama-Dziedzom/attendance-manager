/**
 * ADMS Protocol Routes
 * 
 * Core ZKTeco PUSH protocol handlers:
 * - POST /iclock/registry    — Device registration + time sync
 * - GET  /iclock/getrequest  — Command polling (heartbeat)
 * - POST /iclock/cdata       — Attendance data push
 * - POST /iclock/devicecmd   — Device command responses
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { generateDevicePin } from '../utils/pin-generator';
import { buildFingerprintCommand } from './helpers/fingerprint-command';
import { smartToggleAttendance, getEmployeeByEmpId, getTerminalAgencies, getEmployeesByAgencies, getTerminalSyncStatus, markEmployeeSynced, getEmployeeFingerprints } from '../services/supabase';
import { enqueueCommand, getNextCommand, markCommandSuccess, markCommandFailed, getCommandDescription, CMD_TYPES } from '../services/command-queue';

// Time sync throttle (in-memory — low risk, not critical data)
const lastTimeSyncMap: Record<string, number> = {};

export function setupProtocolRoutes(app: Express) {

    // ── Device Registration ──────────────────────────────────────────────
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

    // ── Command Polling (Heartbeat) ──────────────────────────────────────
    app.get('/iclock/getrequest', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            const terminalSerial = String(SN || 'UNKNOWN');

            // 1. Time sync throttle (once per 10 minutes)
            const now = Date.now();
            const lastSync = lastTimeSyncMap[terminalSerial] || 0;
            const TEN_MINUTES = 10 * 60 * 1000;

            if (now - lastSync > TEN_MINUTES) {
                lastTimeSyncMap[terminalSerial] = now;
                const currentTime = new Date();
                const serverTime = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')} ${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}:${String(currentTime.getSeconds()).padStart(2, '0')}`;
                const timeSyncCmd = `C:${Math.floor(Math.random() * 10000)}:SET OPTIONS ServerTime=${serverTime}`;
                await enqueueCommand(terminalSerial, CMD_TYPES.TIME_SYNC, timeSyncCmd, 'Time sync');
                logger.info(`[ADMS] ⏰ Time sync queued for ${terminalSerial}: ${serverTime}`);
            }

            // 2. Check persistent command queue for the next pending command
            const nextCmd = await getNextCommand(terminalSerial);
            if (nextCmd) {
                logger.info(`[ADMS] 📤 Delivering command to ${terminalSerial}: ${nextCmd.description || nextCmd.command_payload.substring(0, 80)}`);
                return res.send(nextCmd.command_payload);
            }

            // 3. Automatic Synchronization Logic
            // PHASE 2: Check for employees who have user created but need fingerprints
            const syncStatus = await getTerminalSyncStatus(terminalSerial);
            const PHASE2_DELAY_MS = 10000;

            const userCreatedEmpIds = syncStatus
                .filter(s => {
                    if (s.status !== 'user_created') return false;
                    if (s.last_sync_at) {
                        const createdAt = new Date(s.last_sync_at).getTime();
                        const elapsed = now - createdAt;
                        if (elapsed < PHASE2_DELAY_MS) {
                            logger.info(`[SYNC PHASE 2] ⏳ Waiting for ${s.emp_id} - ${Math.round((PHASE2_DELAY_MS - elapsed) / 1000)}s remaining before fingerprint sync`);
                            return false;
                        }
                    }
                    return true;
                })
                .map(s => s.emp_id);

            if (userCreatedEmpIds.length > 0) {
                const { data: userCreatedEmps } = await (await import('../services/supabase')).getSupabase()
                    .from('employees')
                    .select('*')
                    .in('emp_id', userCreatedEmpIds)
                    .eq('is_active', true);

                if (userCreatedEmps && userCreatedEmps.length > 0) {
                    const emp = userCreatedEmps[0];
                    const fingerprints = await getEmployeeFingerprints(emp.id);

                    if (fingerprints.length > 0) {
                        const fp = fingerprints[0];
                        const fpCmdId = Math.floor(Math.random() * 10000);
                        const simplePin = generateDevicePin(emp);
                        const base64Template = fp.template.replace(/\s/g, '');
                        const fingerID = Math.min(9, Math.max(0, fp.finger_index));
                        const templateSize = Buffer.from(base64Template, 'base64').length;
                        const fpCmd = buildFingerprintCommand(fpCmdId, simplePin, fingerID, base64Template);

                        await enqueueCommand(terminalSerial, CMD_TYPES.FINGERPRINT_SYNC, fpCmd, `FINGERPRINT(biodata): ${emp.name} (PIN ${simplePin}) Finger ${fingerID}`, 5);

                        logger.info(`\n========================================`);
                        logger.info(`[SYNC PHASE 2] 🖐️ SYNCING FINGERPRINT for ${emp.name}`);
                        logger.info(`[SYNC PHASE 2] PIN: ${simplePin}, Finger: ${fingerID}`);
                        logger.info(`[SYNC PHASE 2] Template size: ${templateSize} bytes (raw from SLK20R)`);
                        logger.info(`[SYNC PHASE 2] Format: DATA UPDATE biodata`);
                        logger.info(`========================================`);

                        await markEmployeeSynced(emp.emp_id, terminalSerial, 'synced');
                    } else {
                        await markEmployeeSynced(emp.emp_id, terminalSerial, 'synced');
                        logger.info(`[SYNC PHASE 2] No fingerprints for ${emp.name}, marking as synced`);
                    }
                }
            }

            // PHASE 1: Check for employees explicitly marked as 'pending'
            const pendingEmpIds = syncStatus.filter(s => s.status === 'pending').map(s => s.emp_id);
            let missingEmployees: any[] = [];

            if (pendingEmpIds.length > 0) {
                const { data: pendingEmps } = await (await import('../services/supabase')).getSupabase()
                    .from('employees')
                    .select('*')
                    .in('emp_id', pendingEmpIds)
                    .eq('is_active', true);
                missingEmployees = pendingEmps || [];
                if (missingEmployees.length > 0) {
                    logger.info(`[ADMS] Found ${missingEmployees.length} explicitly pending employees for ${terminalSerial}`);
                }
            }

            // Fallback: agency-based auto-discovery
            if (missingEmployees.length === 0) {
                const agencyIds = await getTerminalAgencies(terminalSerial);
                if (agencyIds.length > 0) {
                    const agencyEmployees = await getEmployeesByAgencies(agencyIds);
                    const syncedEmpIds = new Set(syncStatus.filter(s => s.status === 'synced' || s.status === 'user_created').map(s => s.emp_id));
                    missingEmployees = agencyEmployees.filter(emp => !syncedEmpIds.has(emp.emp_id));
                    if (missingEmployees.length > 0) {
                        logger.info(`[ADMS] Auto-discovery: Found ${missingEmployees.length} missing employees from agencies for ${terminalSerial}`);
                    }
                }
            }

            if (missingEmployees.length > 0) {
                const emp = missingEmployees[0];
                const cmdId = Math.floor(Math.random() * 10000);
                const simplePin = generateDevicePin(emp);
                const tab = String.fromCharCode(9);
                const fingerprints = await getEmployeeFingerprints(emp.id);

                logger.info(`\n========================================`);
                logger.info(`[SYNC] 👤 SYNCING EMPLOYEE: ${emp.name}`);
                logger.info(`[SYNC] PIN: ${simplePin}, UUID: ${emp.id}`);
                logger.info(`[SYNC] Fingerprints found: ${fingerprints.length}`);
                logger.info(`========================================`);

                if (fingerprints.length === 0) {
                    logger.warn(`[SYNC] ⚠️ NO FINGERPRINT TEMPLATES for ${emp.name} - user will be created but won't have biometric data!`);
                }

                const userCmd = `C:${cmdId}:DATA UPDATE userinfo${tab}PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=1`;
                await enqueueCommand(terminalSerial, CMD_TYPES.USER_SYNC, userCmd, `DATA USER: ${emp.name} (PIN ${simplePin})`, 10);

                logger.info(`[SYNC] 📤 User command created: CmdID ${cmdId}`);
                logger.info(`[SYNC] User command: ${userCmd}`);

                if (fingerprints.length > 0) {
                    await markEmployeeSynced(emp.emp_id, terminalSerial, 'user_created');
                    logger.info(`[SYNC] ✅ Marked ${emp.emp_id} as 'user_created' - fingerprints pending`);
                } else {
                    await markEmployeeSynced(emp.emp_id, terminalSerial, 'synced');
                    logger.info(`[SYNC] ✅ Marked ${emp.emp_id} as 'synced' (no fingerprints)`);
                }
            }

            // No commands, respond OK
            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Getrequest error:', error);
            res.status(500).send('ERROR');
        }
    });

    // ── Attendance Data Push ─────────────────────────────────────────────
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
            if (typeof rawData === 'string' && rawData.trim().length > 0) {
                const lines = rawData.split('\n').filter((line: string) => line.trim().length > 0);

                for (const line of lines) {
                    logger.info('[ADMS] Processing line:', line);

                    // Try different ATTLOG formats
                    let match = line.match(/ATTLOG\s+([^\t]+)\t([^\t]+)\t(\d+)\t(\d+)\t(\d+)/);
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

                        const isClockIn = status === '0';

                        // Resolve numeric PIN to full emp_id if needed
                        let resolvedEmpId = empId;
                        const employee = await getEmployeeByEmpId(empId);

                        if (employee) {
                            resolvedEmpId = employee.emp_id;
                            logger.info(`[ADMS] Resolved numeric PIN ${empId} to ${resolvedEmpId} (${employee.name})`);
                        } else {
                            logger.warn(`[ADMS] Could not resolve numeric PIN ${empId} to any active employee`);
                        }

                        logger.info('[ADMS] Parsed attendance:', {
                            empId, resolvedEmpId, datetime, status, isClockIn, verifyType, verificationMethod, terminalSerial
                        });

                        // Parse Date safely
                        let attendanceTime = new Date(datetime);
                        if (isNaN(attendanceTime.getTime())) {
                            attendanceTime = new Date(datetime.replace(' ', 'T'));
                        }

                        // Use Smart Toggle
                        const { success, action, data, error: rpcError } = await smartToggleAttendance(
                            employee?.id || resolvedEmpId,
                            resolvedEmpId,
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
                        logger.info(`[ADMS RAW DATA] Device ${terminalSerial} sent:`, line);
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

    // ── Device Command Responses ─────────────────────────────────────────
    app.post('/iclock/devicecmd', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            let bodyStr = '';

            if (Buffer.isBuffer(req.body)) {
                bodyStr = req.body.toString();
            } else if (typeof req.body === 'string') {
                bodyStr = req.body;
            } else if (typeof req.body === 'object') {
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(req.body)) {
                    params.append(key, String(value));
                }
                bodyStr = params.toString();
            }

            logger.info(`\n========================================`);
            logger.info(`[DEVICECMD] Device ${SN} Response`);
            logger.info(`[DEVICECMD] Raw body: ${bodyStr}`);
            logger.info(`========================================`);

            const params = new URLSearchParams(bodyStr.replace(/\0/g, ''));
            const cmdId = params.get('ID');
            const returnCode = params.get('Return');
            const cmdVal = params.get('CMD');
            const terminalSerial = String(SN || 'UNKNOWN');

            logger.info(`[DEVICECMD] Parsed: CmdID=${cmdId}, Return=${returnCode}, CMD=${cmdVal}`);

            const cmdInfo = cmdId ? (await getCommandDescription(parseInt(cmdId, 10), terminalSerial) || 'unknown command') : 'no command ID';
            logger.info(`[DEVICECMD] This response is for: ${cmdInfo}`);

            if (returnCode && returnCode !== '0') {
                logger.error(`\n🚨🚨🚨 COMMAND FAILED 🚨🚨🚨`);
                logger.error(`[DEVICECMD FAILED] Device ${SN} rejected command ${cmdId}`);
                logger.error(`[DEVICECMD FAILED] Return Code: ${returnCode}`);
                logger.error(`[DEVICECMD FAILED] Command was: ${cmdInfo}`);

                const errorMeanings: Record<string, string> = {
                    '-1': 'General error / Invalid command syntax',
                    '-2': 'Illegal fingerprint/template structure',
                    '-3': 'User not found (PIN doesnt exist)',
                    '-4': 'Fingerprint already exists',
                    '-5': 'Invalid parameter',
                    '-6': 'Device memory full',
                    '-7': 'Invalid fingerprint index',
                    '-8': 'Template too large',
                };

                const meaning = errorMeanings[returnCode] || 'Unknown error code';
                logger.error(`[DEVICECMD FAILED] Error meaning: ${meaning}`);

                if (cmdId) {
                    await markCommandFailed(parseInt(cmdId, 10), terminalSerial, parseInt(returnCode, 10), meaning);
                }
            } else if (returnCode === '0') {
                logger.info(`\n✅✅✅ COMMAND SUCCESS ✅✅✅`);
                logger.info(`[DEVICECMD SUCCESS] Command ${cmdId} accepted by device ${SN}`);
                logger.info(`[DEVICECMD SUCCESS] Command was: ${cmdInfo}`);

                if (cmdId) {
                    await markCommandSuccess(parseInt(cmdId, 10), terminalSerial);
                }
            }

            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Devicecmd error:', error);
            res.status(500).send('OK'); // Always send OK to device to prevent retries
        }
    });

    logger.info('[ADMS] Protocol routes configured');
}
