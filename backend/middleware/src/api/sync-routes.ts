/**
 * Sync Routes
 * 
 * Employee-to-terminal synchronization endpoints:
 * - GET /api/sync-to-device  — Trigger sync for a terminal (all or agency-based)
 * - GET /api/terminals/:serial/reset-sync — Reset sync status for a terminal
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { generateDevicePin } from '../utils/pin-generator';
import { buildFingerprintCommand } from './helpers/fingerprint-command';
import { getTerminalAgencies, getEmployeesByAgencies, getTerminalSyncStatus, markEmployeeSynced, getFingerprintsByEmployeeIds } from '../services/supabase';
import { enqueueCommand, clearQueue, CMD_TYPES } from '../services/command-queue';

export function setupSyncRoutes(app: Express) {

    // ── Sync employees to device ─────────────────────────────────────────
    app.get('/api/sync-to-device', async (req: Request, res: Response) => {
        try {
            const { SN, force, all, clear } = req.query;
            if (!SN) return res.status(400).json({ error: 'Missing SN (Serial Number)' });

            const terminalSerial = String(SN).trim();
            logger.info(`[Sync API] Requested sync for ${terminalSerial} (All: ${all}, Clear: ${clear})`);

            if (clear === 'true') {
                await clearQueue(terminalSerial);
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

            // Batch-fetch all fingerprints in a single query (avoids N+1)
            const employeeUuids = employees.map((e: any) => e.id);
            const fingerprintMap = employees.length < 5
                ? await getFingerprintsByEmployeeIds(employeeUuids)
                : new Map<string, any[]>(); // Only pre-fetch for small sets that queue immediately

            for (const emp of employees) {
                // Force state to pending so heartbeat doesn't skip
                await markEmployeeSynced(emp.emp_id, terminalSerial, 'pending');

                // For small test sets, queue commands immediately
                if (employees.length < 5) {
                    const fingerprints = fingerprintMap.get(emp.id) || [];
                    const simplePin = generateDevicePin(emp);
                    const tab = String.fromCharCode(9);

                    // 1. Queue User
                    const userCmd = `C:${Math.floor(Math.random() * 10000)}:DATA UPDATE userinfo${tab}PIN=${simplePin}${tab}Name=${emp.name}${tab}Pri=0${tab}Pass=${tab}Grp=1${tab}TZ=00000001${tab}Verify=1`;
                    await enqueueCommand(terminalSerial, CMD_TYPES.USER_SYNC, userCmd, `DATA USER: ${emp.name} (PIN ${simplePin})`, 10);

                    // 2. Queue Fingerprints
                    for (const fp of fingerprints) {
                        const base64 = fp.template.replace(/\s/g, '');
                        const fid = Math.min(9, Math.max(0, fp.finger_index));
                        const size = Buffer.from(base64, 'base64').length;

                        const fpCmdId = Math.floor(Math.random() * 10000);
                        const fpCmd = buildFingerprintCommand(fpCmdId, simplePin, fid, base64);

                        await enqueueCommand(terminalSerial, CMD_TYPES.FINGERPRINT_SYNC, fpCmd, `FP(biodata): ${emp.name} Finger ${fid}`, 5);
                        logger.info(`[Sync API] Direct Queue for ${emp.name} (PIN ${simplePin}): Finger ${fid}, Size ${size}, Format: biodata`);
                    }
                }
            }

            res.json({ success: true, message: `Sync/Queue initiated for ${employees.length} employees.` });
        } catch (error) {
            logger.error('[Sync API] Error:', error);
            res.status(500).json({ error: String(error) });
        }
    });

    // ── Reset sync status ────────────────────────────────────────────────
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

            await clearQueue(terminalSerial);

            logger.info(`[RESET] All employees reset to pending for ${terminalSerial}`);
            res.json({ success: true, message: `${syncStatus.length} employees reset, queue cleared` });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    logger.info('[ADMS] Sync routes configured');
}
