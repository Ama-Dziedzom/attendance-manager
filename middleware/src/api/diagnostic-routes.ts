/**
 * Diagnostic Routes
 * 
 * Debug and testing endpoints for terminal interaction:
 * - GET /api/terminals/:serial/query-templates     — Queue template query
 * - GET /api/terminals/:serial/diagnostic-pull      — Multi-format diagnostic pull
 * - GET /api/terminals/:serial/force-upload         — Force device data upload
 * - GET /api/terminals/:serial/queue                — Inspect command queue
 * - GET /api/terminals/:serial/test-combined-sync   — Test user + fingerprint sync
 * - GET /api/terminals/:serial/test-fp-formats      — Test different FP formats
 * - GET /api/terminals/:serial/send-raw-command     — Queue arbitrary command
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { generateDevicePin } from '../utils/pin-generator';
import { buildFingerprintCommand } from './helpers/fingerprint-command';
import { getEmployeeFingerprints } from '../services/supabase';
import { enqueueCommand, getQueueSummary, CMD_TYPES } from '../services/command-queue';

export function setupDiagnosticRoutes(app: Express) {

    // ── Query templates from device ──────────────────────────────────────
    app.get('/api/terminals/:serial/query-templates', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            const queryCmdId = Math.floor(Math.random() * 10000);
            const queryCmd = `C:${queryCmdId}:DATA QUERY FPTMP`;
            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, queryCmd, 'DIAGNOSTIC: Template query');

            logger.info(`[Diagnostic] Template query queued for ${terminalSerial}, command ID ${queryCmdId}`);
            res.json({ success: true, cmdId: queryCmdId, command: queryCmd });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // ── Multi-format diagnostic pull ─────────────────────────────────────
    app.get('/api/terminals/:serial/diagnostic-pull', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            const cmd1 = `C:${Math.floor(Math.random() * 10000)}:DATA QUERY FPTMP PIN=1`;
            const cmd2 = `C:${Math.floor(Math.random() * 10000)}:GET USERPIN 1 FPTMP`;
            const cmd3 = `C:${Math.floor(Math.random() * 10000)}:DATA QUERY FPTMP`;
            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, cmd1, 'DIAG: FPTMP PIN=1');
            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, cmd2, 'DIAG: GET USERPIN 1 FPTMP');
            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, cmd3, 'DIAG: DATA QUERY FPTMP');

            logger.info(`[Diagnostic] 3-way Diagnostic Pull queued for ${terminalSerial}`);
            res.json({ success: true, message: '3 diagnostic formats queued. Watch for Akosua/PIN 1 in logs.' });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // ── Force device data upload ─────────────────────────────────────────
    app.get('/api/terminals/:serial/force-upload', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, `C:${Math.floor(Math.random() * 10000)}:DATA QUERY USERINFO`, 'DIAG: Query user info');
            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, `C:${Math.floor(Math.random() * 10000)}:DATA QUERY FPTMP`, 'DIAG: Query fingerprint templates');
            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, `C:${Math.floor(Math.random() * 10000)}:SET OPTIONS DataPostFp=1`, 'DIAG: Enable FP data push');

            logger.info(`[Diagnostic] Force Upload queued for ${terminalSerial}`);
            res.json({ success: true, message: 'Force upload commands queued. Check /iclock/cdata logs in 60s.' });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // ── Queue inspection ─────────────────────────────────────────────────
    app.get('/api/terminals/:serial/queue', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const terminalSerial = String(serial).trim();

            const summary = await getQueueSummary(terminalSerial);

            logger.info(`[Diagnostic] Queue inspection for ${terminalSerial}: ${summary.pending} pending, ${summary.sent} sent`);

            res.json({
                terminal: terminalSerial,
                pending: summary.pending,
                sent: summary.sent,
                commands: summary.commands
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // ── Test combined USER + FINGERPRINT sync ────────────────────────────
    app.get('/api/terminals/:serial/test-combined-sync', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const { emp_id } = req.query;
            const terminalSerial = String(serial).trim();

            if (!emp_id) {
                return res.status(400).json({ error: 'Missing emp_id query parameter' });
            }

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
            const simplePin = generateDevicePin(emp);

            const userCmdId = Math.floor(Math.random() * 10000);
            const userCmd = `C:${userCmdId}:DATA UPDATE userinfo${tab}PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=1`;

            const fp = fingerprints[0];
            const base64 = fp.template.replace(/\s/g, '');
            const fid = Math.min(9, Math.max(0, fp.finger_index));

            const fpCmdId = Math.floor(Math.random() * 10000);
            const fpCmd = buildFingerprintCommand(fpCmdId, simplePin, fid, base64);

            await enqueueCommand(terminalSerial, CMD_TYPES.USER_SYNC, userCmd, `TEST USER: ${emp.name} (PIN ${simplePin})`, 10);
            await enqueueCommand(terminalSerial, CMD_TYPES.FINGERPRINT_SYNC, fpCmd, `TEST FP: ${emp.name} Finger ${fid}`, 5);

            logger.info(`[TEST] Combined sync queued for ${emp.name} (PIN ${simplePin})`);

            res.json({
                success: true,
                employee: emp.name,
                pin: simplePin,
                queuedCommands: 2,
                userCmdId,
                fpCmdId,
                fpFormat: 'DATA UPDATE biodata',
                message: 'Watch logs for device response. Check /iclock/devicecmd responses.'
            });
        } catch (error) {
            logger.error('[TEST] Combined sync error:', error);
            res.status(500).json({ error: String(error) });
        }
    });

    // ── Test different fingerprint command formats ────────────────────────
    app.get('/api/terminals/:serial/test-fp-formats', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const { emp_id, format } = req.query;
            const terminalSerial = String(serial).trim();
            const formatIdx = parseInt(String(format || '0'), 10);

            if (!emp_id) {
                return res.status(400).json({ error: 'Missing emp_id query parameter' });
            }

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
            const simplePin = generateDevicePin(emp);

            const fp = fingerprints[0];
            let templateBuffer = Buffer.from(fp.template.replace(/\s/g, ''), 'base64');
            if (templateBuffer.length === 1260) templateBuffer = templateBuffer.slice(28);
            else if (templateBuffer.length > 1232) templateBuffer = templateBuffer.slice(templateBuffer.length - 1232);

            const fpCmdId = Math.floor(Math.random() * 10000);
            const base64 = templateBuffer.toString('base64');
            const fid = Math.min(9, Math.max(0, fp.finger_index));
            const size = templateBuffer.length;

            const formats = [
                `C:${fpCmdId}:FP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}`,
                `C:${fpCmdId}:DATA UPDATE biodata${tab}Pin=${simplePin}${tab}No=${fid}${tab}Index=0${tab}Valid=1${tab}Duress=0${tab}Type=1${tab}MajorVer=10${tab}MinorVer=0${tab}Format=0${tab}Tmp=${base64}`,
                `C:${fpCmdId}:DATA UPDATE templatev10${tab}Pin=${simplePin}${tab}FingerID=${fid}${tab}Size=${size}${tab}Valid=1${tab}Template=${base64}`,
                `C:${fpCmdId}:DATA FPTMP PIN=${simplePin}${tab}FID=${fid}${tab}Size=${size}${tab}Valid=1${tab}TMP=${base64}`,
                `C:${fpCmdId}:DATA UPDATE biodata${tab}PIN=${simplePin}${tab}No=${fid}${tab}Index=0${tab}Valid=1${tab}Duress=0${tab}Type=1${tab}MajorVer=10${tab}MinorVer=0${tab}Format=0${tab}Tmp=${base64}`,
                `C:${fpCmdId}:DATA UPDATE templatev10${tab}PIN=${simplePin}${tab}FingerID=${fid}${tab}Size=${size}${tab}Valid=1${tab}Tmp=${base64}`,
                `C:${fpCmdId}:DATA UPDATE userinfo${tab}PIN=${simplePin}${tab}FingerID=${fid}${tab}Template=${base64}`,
                `C:${fpCmdId}:FP PIN=${simplePin}${tab}FID=${fid}${tab}Valid=1${tab}TMP=${base64}`,
            ];

            const selectedFormat = formats[formatIdx] || formats[0];

            await enqueueCommand(terminalSerial, CMD_TYPES.FORMAT_TEST, selectedFormat, `FORMAT TEST ${formatIdx}: ${emp.name} Finger ${fid}`);

            logger.info(`[FORMAT TEST] Testing format ${formatIdx} for ${emp.name}`);

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

    // ── Send raw command for debugging ────────────────────────────────────
    app.get('/api/terminals/:serial/send-raw-command', async (req: Request, res: Response) => {
        try {
            const { serial } = req.params;
            const { cmd } = req.query;
            const terminalSerial = String(serial).trim();

            const cmdId = Math.floor(Math.random() * 10000);
            const fullCmd = `C:${cmdId}:${cmd}`;

            await enqueueCommand(terminalSerial, CMD_TYPES.RAW, fullCmd, `RAW: ${cmd}`);

            logger.info(`[RAW] Queued raw command for ${terminalSerial}: ${fullCmd}`);
            res.json({ success: true, cmdId, fullCmd });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    logger.info('[ADMS] Diagnostic routes configured');
}
