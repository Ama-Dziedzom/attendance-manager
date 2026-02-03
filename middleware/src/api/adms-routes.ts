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

    // Global command tracker to correlate responses (initialized on global)
    if (!(global as any).cmdTracker) {
        (global as any).cmdTracker = {};
    }

    // Device polling for commands - ENHANCED WITH DEBUGGING
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

                // Track command
                (global as any).cmdTracker[timeCmdId] = `TIME SYNC: ${serverTime}`;

                (global as any).lastTimeSync = { ...lastTimeSync, [terminalSerial]: nowTime };
                logger.info(`[ADMS] ⏰ Clock sync queued for ${terminalSerial}: ${serverTime}`);
            }

            // 2. Check for priority commands in queue
            if (commandQueue[terminalSerial] && commandQueue[terminalSerial].length > 0) {
                const command = commandQueue[terminalSerial].shift();

                // Extract command ID for tracking
                const cmdIdMatch = command?.match(/^C:(\d+):/);
                const cmdId = cmdIdMatch ? cmdIdMatch[1] : 'unknown';

                logger.info(`\n========================================`);
                logger.info(`[GETREQUEST] 📤 SENDING COMMAND TO DEVICE ${terminalSerial}`);
                logger.info(`[GETREQUEST] Command ID: ${cmdId}`);
                logger.info(`[GETREQUEST] Queue remaining: ${commandQueue[terminalSerial].length} commands`);

                // Log the command (truncate long templates for readability)
                if (command && command.includes('TMP=')) {
                    const truncated = command.substring(0, 150) + '...[template data]';
                    logger.info(`[GETREQUEST] Command: ${truncated}`);
                } else {
                    logger.info(`[GETREQUEST] Command: ${command}`);
                }
                logger.info(`========================================\n`);

                return res.send(command);
            }

            // 3. Automatic Synchronization Logic
            // Priority: Check for employees explicitly marked as 'pending' for this terminal
            const syncStatus = await getTerminalSyncStatus(terminalSerial);
            const pendingEmpIds = syncStatus.filter(s => s.status === 'pending').map(s => s.emp_id);

            let missingEmployees: any[] = [];

            if (pendingEmpIds.length > 0) {
                // Fetch specific pending employees
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

            // Fallback: If no explicit pending, do agency-based auto-discovery
            if (missingEmployees.length === 0) {
                const agencyIds = await getTerminalAgencies(terminalSerial);
                if (agencyIds.length > 0) {
                    const agencyEmployees = await getEmployeesByAgencies(agencyIds);
                    const syncedEmpIds = new Set(syncStatus.filter(s => s.status === 'synced').map(s => s.emp_id));
                    missingEmployees = agencyEmployees.filter(emp => !syncedEmpIds.has(emp.emp_id));
                    if (missingEmployees.length > 0) {
                        logger.info(`[ADMS] Auto-discovery: Found ${missingEmployees.length} missing employees from agencies for ${terminalSerial}`);
                    }
                }
            }

            if (missingEmployees.length > 0) {
                const emp = missingEmployees[0];
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

                // 1. Fetch Fingerprints
                const fingerprints = await getEmployeeFingerprints(emp.id);

                logger.info(`\n========================================`);
                logger.info(`[SYNC] 👤 SYNCING EMPLOYEE: ${emp.name}`);
                logger.info(`[SYNC] PIN: ${simplePin}, UUID: ${emp.id}`);
                logger.info(`[SYNC] Fingerprints found: ${fingerprints.length}`);
                logger.info(`========================================`);

                if (fingerprints.length === 0) {
                    logger.warn(`[SYNC] ⚠️ NO FINGERPRINT TEMPLATES for ${emp.name} - user will be created but won't have biometric data!`);
                }

                // 2. Create User Command
                const userCmd = `C:${cmdId}:DATA USER PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=0`;

                // Track command
                (global as any).cmdTracker[cmdId] = `DATA USER: ${emp.name} (PIN ${simplePin})`;

                logger.info(`[SYNC] 📤 User command created: CmdID ${cmdId}`);
                logger.info(`[SYNC] User command: ${userCmd}`);

                // 3. Queue Fingerprints with detailed logging
                for (const fp of fingerprints) {
                    const fpCmdId = Math.floor(Math.random() * 10000);

                    // Log original template info
                    const originalSize = Buffer.from(fp.template.replace(/\s/g, ''), 'base64').length;
                    logger.info(`[SYNC] 🖐️ Processing fingerprint ${fp.finger_index} for ${emp.name}`);
                    logger.info(`[SYNC] Original template size: ${originalSize} bytes`);

                    let templateBuffer = Buffer.from(fp.template.replace(/\s/g, ''), 'base64');

                    // Force alignment to 1232 bytes (SilkID raw)
                    if (templateBuffer.length === 1260) {
                        templateBuffer = templateBuffer.slice(28);
                        logger.info(`[SYNC] Template adjusted: 1260 -> ${templateBuffer.length} bytes (removed 28-byte header)`);
                    } else if (templateBuffer.length > 1232) {
                        const oldLen = templateBuffer.length;
                        templateBuffer = templateBuffer.slice(templateBuffer.length - 1232);
                        logger.info(`[SYNC] Template adjusted: ${oldLen} -> ${templateBuffer.length} bytes (took last 1232)`);
                    } else {
                        logger.info(`[SYNC] Template size OK: ${templateBuffer.length} bytes`);
                    }

                    const templateSize = templateBuffer.length;
                    const base64Template = templateBuffer.toString('base64');
                    const fingerID = Math.min(9, Math.max(0, fp.finger_index));

                    // Using terminal-native verb (FP) and tags (PIN, FID, Size, Valid, TMP)
                    const fpCmd = `C:${fpCmdId}:FP PIN=${simplePin}${tab}FID=${fingerID}${tab}Size=${templateSize}${tab}Valid=1${tab}TMP=${base64Template}`;

                    if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];
                    commandQueue[terminalSerial].push(fpCmd);

                    // Track command
                    (global as any).cmdTracker[fpCmdId] = `FP: ${emp.name} (PIN ${simplePin}) FID ${fingerID} Size ${templateSize}`;

                    logger.info(`[SYNC] 📋 Fingerprint command QUEUED: CmdID ${fpCmdId}`);
                    logger.info(`[SYNC] FP command preview: C:${fpCmdId}:FP PIN=${simplePin} FID=${fingerID} Size=${templateSize} Valid=1 TMP=[${base64Template.length} chars]`);
                }

                // Show queue status
                logger.info(`\n[SYNC] 📊 QUEUE STATUS for ${terminalSerial}:`);
                logger.info(`[SYNC] Commands in queue: ${commandQueue[terminalSerial]?.length || 0}`);
                logger.info(`[SYNC] User command will be sent NOW`);
                logger.info(`[SYNC] Fingerprint commands will be sent on SUBSEQUENT heartbeats`);

                // Update status to synced
                await markEmployeeSynced(emp.emp_id, terminalSerial, 'synced');

                logger.info(`[SYNC] ✅ Marked ${emp.emp_id} as synced for ${terminalSerial}`);
                logger.info(`[SYNC] 📤 SENDING USER COMMAND NOW...\n`);

                return res.send(userCmd);
            }

            // No commands, just respond OK
            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Getrequest error:', error);
            res.status(500).send('ERROR');
        }
    });

    // Helper endpoint to queue template query (for diagnostics)
    app.get('/api/terminals/:serial/query-templates', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            if (!commandQueue[terminalSerial]) {
                commandQueue[terminalSerial] = [];
            }

            const queryCmdId = Math.floor(Math.random() * 10000);
            const queryCmd = `C:${queryCmdId}:DATA QUERY FPTMP`;
            commandQueue[terminalSerial].push(queryCmd);

            logger.info(`[Diagnostic] Template query queued for ${terminalSerial}`);
            res.json({
                success: true,
                message: `Template query command (${queryCmdId}) queued for ${terminalSerial}. It will be picked up on the next heartbeat.`,
                queueSize: commandQueue[terminalSerial].length
            });
        } catch (error) {
            logger.error('[ADMS] Query-templates error:', error);
            res.status(500).json({ error: String(error) });
        }
    });

    // New diagnostic pull that tries multiple formats
    app.get('/api/terminals/:serial/diagnostic-pull', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];

            // Try 3 common formats to get templates back
            commandQueue[terminalSerial].push(`C:${Math.floor(Math.random() * 10000)}:DATA QUERY FPTMP PIN=1`);
            commandQueue[terminalSerial].push(`C:${Math.floor(Math.random() * 10000)}:GET USERPIN 1 FPTMP`);
            commandQueue[terminalSerial].push(`C:${Math.floor(Math.random() * 10000)}:DATA QUERY FPTMP`);

            logger.info(`[Diagnostic] 3-way Diagnostic Pull queued for ${terminalSerial}`);
            res.json({ success: true, message: '3 diagnostic formats queued. Watch for Akosua/PIN 1 in logs.' });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // Final attempt to force the device to push its own data
    app.get('/api/terminals/:serial/force-upload', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();
            if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];

            // These commands tell the device to upload its current user database to the server
            commandQueue[terminalSerial].push(`C:${Math.floor(Math.random() * 10000)}:DATA QUERY USERINFO`);
            commandQueue[terminalSerial].push(`C:${Math.floor(Math.random() * 10000)}:DATA QUERY FPTMP`);
            commandQueue[terminalSerial].push(`C:${Math.floor(Math.random() * 10000)}:SET OPTIONS DataPostFp=1`);

            logger.info(`[Diagnostic] Force Upload queued for ${terminalSerial}`);
            res.json({ success: true, message: 'Force upload commands queued. Check /iclock/cdata logs in 60s.' });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // Helper endpoint to queue employee sync (can be triggered by dashboard)
    app.get('/api/sync-to-device', async (req: Request, res: Response) => {
        try {
            const { SN, force, all, clear } = req.query;
            if (!SN) return res.status(400).json({ error: 'Missing SN (Serial Number)' });

            const terminalSerial = String(SN).trim();
            logger.info(`[Sync API] Requested sync for ${terminalSerial} (All: ${all}, Clear: ${clear})`);

            if (clear === 'true') {
                commandQueue[terminalSerial] = [];
                logger.info(`[Sync API] Command queue cleared for ${terminalSerial}`);
            }

            let employees;
            if (all === 'true') {
                const { data } = await (await import('../services/supabase')).getSupabase()
                    .from('employees').select('*').eq('is_active', true);
                employees = data || [];
            } else {
                const agencyIds = await getTerminalAgencies(terminalSerial);
                employees = await getEmployeesByAgencies(agencyIds);
            }

            if (!employees || employees.length === 0) return res.json({ message: 'No employees found.' });

            for (const emp of employees) {
                // Force state to pending so heartbeat doesn't skip
                await markEmployeeSynced(emp.emp_id, terminalSerial, 'pending');

                // EXTRA: For small test sets, we can queue commands IMMEDIATELY
                if (employees.length < 5) {
                    const fingerprints = await getEmployeeFingerprints(emp.id);
                    const partToUse = emp.emp_id.includes('-') ? emp.emp_id.split('-')[1] : emp.emp_id;
                    const simplePin = parseInt(partToUse.replace(/\D/g, ''), 10).toString();
                    const tab = String.fromCharCode(9);

                    // 1. Queue User
                    const userCmd = `C:${Math.floor(Math.random() * 10000)}:DATA USER PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=0`;
                    if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];
                    commandQueue[terminalSerial].push(userCmd);

                    // 2. Queue Fingerprints with the 1232-byte alignment
                    for (const fp of fingerprints) {
                        let templateBuffer = Buffer.from(fp.template.replace(/\s/g, ''), 'base64');
                        if (templateBuffer.length === 1260) templateBuffer = templateBuffer.slice(28);
                        else if (templateBuffer.length > 1232) templateBuffer = templateBuffer.slice(templateBuffer.length - 1232);

                        const size = templateBuffer.length;
                        const base64 = templateBuffer.toString('base64');
                        const fid = Math.min(9, Math.max(0, fp.finger_index));

                        // We use the DATA FPTMP verb but FID/TMP tags
                        const fpCmd = `C:${Math.floor(Math.random() * 10000)}:DATA FPTMP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}${tab}MajorVer=10${tab}MinorVer=1`;

                        commandQueue[terminalSerial].push(fpCmd);
                        logger.info(`[Sync API] Direct Queue for ${emp.name} (PIN ${simplePin}): FID ${fid}, Size ${size}`);
                    }
                }
            }

            res.json({ success: true, message: `Sync/Queue initiated for ${employees.length} employees.` });
        } catch (error) {
            logger.error('[Sync API] Error:', error);
            res.status(500).json({ error: String(error) });
        }
    });

    // ============ NEW DIAGNOSTIC ENDPOINTS ============

    // 1. Queue Inspection - See what's pending for a terminal
    app.get('/api/terminals/:serial/queue', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            const queue = commandQueue[terminalSerial] || [];
            const cmdTracker = (global as any).cmdTracker || {};

            // Summarize commands (don't show full templates)
            const summary = queue.map((cmd, idx) => {
                const cmdMatch = cmd.match(/^C:(\d+):(.{50})/);
                if (cmdMatch) {
                    const cmdId = cmdMatch[1];
                    const preview = cmdMatch[2];
                    const info = cmdTracker[cmdId] || 'untracked';
                    return { index: idx, cmdId, preview: preview + '...', info };
                }
                return { index: idx, cmdId: 'unknown', preview: cmd.substring(0, 50), info: 'unknown' };
            });

            logger.info(`[Diagnostic] Queue inspection for ${terminalSerial}: ${queue.length} commands`);

            res.json({
                terminal: terminalSerial,
                queueLength: queue.length,
                commands: summary,
                trackerSize: Object.keys(cmdTracker).length
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // 2. Test Combined USER + FINGERPRINT in single command
    // Some ZKTeco devices need both in the same response
    app.get('/api/terminals/:serial/test-combined-sync', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const { emp_id } = req.query;
            const terminalSerial = String(serial).trim();

            if (!emp_id) {
                return res.status(400).json({ error: 'Missing emp_id query parameter' });
            }

            // Get employee
            const { data: emp } = await (await import('../services/supabase')).getSupabase()
                .from('employees')
                .select('*')
                .eq('emp_id', emp_id)
                .single();

            if (!emp) {
                return res.status(404).json({ error: `Employee ${emp_id} not found` });
            }

            const fingerprints = await getEmployeeFingerprints(emp.id);
            if (fingerprints.length === 0) {
                return res.status(400).json({ error: `No fingerprints found for ${emp.name}` });
            }

            // Build combined command
            const tab = String.fromCharCode(9);
            const partToUse = emp.emp_id.includes('-') ? emp.emp_id.split('-')[1] : emp.emp_id;
            const simplePin = parseInt(partToUse.replace(/\D/g, ''), 10).toString();

            const userCmdId = Math.floor(Math.random() * 10000);
            const userCmd = `C:${userCmdId}:DATA USER PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=0`;

            // Process first fingerprint
            const fp = fingerprints[0];
            let templateBuffer = Buffer.from(fp.template.replace(/\s/g, ''), 'base64');
            if (templateBuffer.length === 1260) templateBuffer = templateBuffer.slice(28);
            else if (templateBuffer.length > 1232) templateBuffer = templateBuffer.slice(templateBuffer.length - 1232);

            const fpCmdId = Math.floor(Math.random() * 10000);
            const base64 = templateBuffer.toString('base64');
            const fid = Math.min(9, Math.max(0, fp.finger_index));
            const size = templateBuffer.length;

            // Try different fingerprint command formats
            const fpFormats = [
                `C:${fpCmdId}:FP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}`,
                `C:${fpCmdId}:DATA FPTMP PIN=${simplePin}${tab}FingerID=${fid}${tab}Size=${size}${tab}Valid=1${tab}Template=${base64}`,
                `C:${fpCmdId}:DATA FPTMP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}${tab}MajorVer=10`,
            ];

            // Queue user first
            if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];
            commandQueue[terminalSerial].push(userCmd);

            // Track
            (global as any).cmdTracker[userCmdId] = `TEST USER: ${emp.name} (PIN ${simplePin})`;

            // Queue fingerprint with format 0 (we'll try others if this fails)
            const selectedFormat = 0;
            commandQueue[terminalSerial].push(fpFormats[selectedFormat]);
            (global as any).cmdTracker[fpCmdId] = `TEST FP: ${emp.name} FID ${fid} (format ${selectedFormat})`;

            logger.info(`[TEST] Combined sync queued for ${emp.name} (PIN ${simplePin})`);
            logger.info(`[TEST] User cmd: ${userCmdId}`);
            logger.info(`[TEST] FP cmd: ${fpCmdId} (format ${selectedFormat})`);

            res.json({
                success: true,
                employee: emp.name,
                pin: simplePin,
                queuedCommands: 2,
                userCmdId,
                fpCmdId,
                fpFormat: selectedFormat,
                message: 'Watch logs for device response. Check /iclock/devicecmd responses.'
            });
        } catch (error) {
            logger.error('[TEST] Combined sync error:', error);
            res.status(500).json({ error: String(error) });
        }
    });

    // 3. Try different fingerprint command formats
    app.get('/api/terminals/:serial/test-fp-formats', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const { emp_id, format } = req.query;
            const terminalSerial = String(serial).trim();
            const formatIdx = parseInt(String(format || '0'), 10);

            if (!emp_id) {
                return res.status(400).json({ error: 'Missing emp_id query parameter' });
            }

            // Get employee
            const { data: emp } = await (await import('../services/supabase')).getSupabase()
                .from('employees')
                .select('*')
                .eq('emp_id', emp_id)
                .single();

            if (!emp) {
                return res.status(404).json({ error: `Employee ${emp_id} not found` });
            }

            const fingerprints = await getEmployeeFingerprints(emp.id);
            if (fingerprints.length === 0) {
                return res.status(400).json({ error: `No fingerprints found for ${emp.name}` });
            }

            const tab = String.fromCharCode(9);
            const partToUse = emp.emp_id.includes('-') ? emp.emp_id.split('-')[1] : emp.emp_id;
            const simplePin = parseInt(partToUse.replace(/\D/g, ''), 10).toString();

            const fp = fingerprints[0];
            let templateBuffer = Buffer.from(fp.template.replace(/\s/g, ''), 'base64');
            if (templateBuffer.length === 1260) templateBuffer = templateBuffer.slice(28);
            else if (templateBuffer.length > 1232) templateBuffer = templateBuffer.slice(templateBuffer.length - 1232);

            const fpCmdId = Math.floor(Math.random() * 10000);
            const base64 = templateBuffer.toString('base64');
            const fid = Math.min(9, Math.max(0, fp.finger_index));
            const size = templateBuffer.length;

            // All possible formats to test
            const formats = [
                // Format 0: Standard FP verb with TMP
                `C:${fpCmdId}:FP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}`,
                // Format 1: DATA FPTMP with FingerID/Template
                `C:${fpCmdId}:DATA FPTMP PIN=${simplePin}${tab}FingerID=${fid}${tab}Size=${size}${tab}Valid=1${tab}Template=${base64}`,
                // Format 2: DATA FPTMP with FID/TMP + MajorVer
                `C:${fpCmdId}:DATA FPTMP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}${tab}MajorVer=10`,
                // Format 3: DATA FP (no TMP suffix)
                `C:${fpCmdId}:DATA FP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}`,
                // Format 4: DATA UPDATE FPTMP
                `C:${fpCmdId}:DATA UPDATE FPTMP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}`,
                // Format 5: Simple format without Size
                `C:${fpCmdId}:FP PIN=${simplePin}${tab}FID=${fid}${tab}Valid=1${tab}TMP=${base64}`,
            ];

            const selectedFormat = formats[formatIdx] || formats[0];

            if (!commandQueue[terminalSerial]) commandQueue[terminalSerial] = [];
            commandQueue[terminalSerial].push(selectedFormat);

            (global as any).cmdTracker[fpCmdId] = `FP FORMAT TEST ${formatIdx}: ${emp.name} FID ${fid}`;

            logger.info(`[FORMAT TEST] Testing format ${formatIdx} for ${emp.name}`);
            logger.info(`[FORMAT TEST] Command: ${selectedFormat.substring(0, 120)}...`);

            res.json({
                success: true,
                formatIndex: formatIdx,
                formatCount: formats.length,
                cmdId: fpCmdId,
                preview: selectedFormat.substring(0, 150),
                message: `Testing format ${formatIdx}. Watch devicecmd logs for Return code.`
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // 4. Clear and reset sync status for an employee
    app.get('/api/terminals/:serial/reset-sync', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const { emp_id } = req.query;
            const terminalSerial = String(serial).trim();

            if (emp_id) {
                await markEmployeeSynced(String(emp_id), terminalSerial, 'pending');
                logger.info(`[RESET] Employee ${emp_id} marked as pending for ${terminalSerial}`);
                return res.json({ success: true, message: `${emp_id} reset to pending` });
            }

            // Reset all for this terminal
            const syncStatus = await getTerminalSyncStatus(terminalSerial);
            for (const s of syncStatus) {
                await markEmployeeSynced(s.emp_id, terminalSerial, 'pending');
            }

            commandQueue[terminalSerial] = [];

            logger.info(`[RESET] All employees reset to pending for ${terminalSerial}`);
            res.json({ success: true, message: `${syncStatus.length} employees reset, queue cleared` });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

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
                        // Log unknown lines - this is where we'll catch pushed templates/users
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

    // Device command endpoint - ENHANCED LOGGING
    app.post('/iclock/devicecmd', async (req: Request, res: Response) => {
        try {
            const { SN } = req.query;
            let bodyStr = '';

            if (Buffer.isBuffer(req.body)) {
                bodyStr = req.body.toString();
            } else if (typeof req.body === 'string') {
                bodyStr = req.body;
            } else if (typeof req.body === 'object') {
                // If express.urlencoded already parsed it
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(req.body)) {
                    params.append(key, String(value));
                }
                bodyStr = params.toString();
            }

            // ============ ENHANCED LOGGING ============
            logger.info(`\n========================================`);
            logger.info(`[DEVICECMD] Device ${SN} Response`);
            logger.info(`[DEVICECMD] Raw body: ${bodyStr}`);
            logger.info(`========================================`);

            // Parse response (Format: ID=123&Return=0)
            const params = new URLSearchParams(bodyStr.replace(/\0/g, ''));
            const cmdId = params.get('ID');
            const returnCode = params.get('Return');
            const cmdVal = params.get('CMD');

            logger.info(`[DEVICECMD] Parsed: CmdID=${cmdId}, Return=${returnCode}, CMD=${cmdVal}`);

            // Track which command this response is for
            const cmdTracker = (global as any).cmdTracker || {};
            const cmdInfo = cmdId ? (cmdTracker[cmdId] || 'unknown command') : 'no command ID';
            logger.info(`[DEVICECMD] This response is for: ${cmdInfo}`);

            if (returnCode && returnCode !== '0') {
                logger.error(`\n🚨🚨🚨 COMMAND FAILED 🚨🚨🚨`);
                logger.error(`[DEVICECMD FAILED] Device ${SN} rejected command ${cmdId}`);
                logger.error(`[DEVICECMD FAILED] Return Code: ${returnCode}`);
                logger.error(`[DEVICECMD FAILED] Command was: ${cmdInfo}`);

                // Detailed error code explanations
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
                logger.error(`🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨`);
            } else if (returnCode === '0') {
                logger.info(`\n✅✅✅ COMMAND SUCCESS ✅✅✅`);
                logger.info(`[DEVICECMD SUCCESS] Command ${cmdId} accepted by device ${SN}`);
                logger.info(`[DEVICECMD SUCCESS] Command was: ${cmdInfo}`);
                logger.info(`✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅`);
            }

            res.send('OK');
        } catch (error) {
            logger.error('[ADMS] Devicecmd error:', error);
            res.status(500).send('OK'); // Always send OK to device to prevent retries
        }
    });

    logger.info('[ADMS] Routes configured');
}
