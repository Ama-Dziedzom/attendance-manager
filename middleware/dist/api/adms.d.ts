/**
 * ADMS (Advanced Device Management System) Routes
 *
 * Handles ZKTeco device communication via PUSH protocol:
 * - Device registration (/iclock/registry)
 * - Command polling (/iclock/getrequest)
 * - Attendance data push (/iclock/cdata)
 * - Device commands (/iclock/devicecmd)
 */
import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
export declare function setupAdmsRoutes(router: Router, supabase: SupabaseClient): void;
//# sourceMappingURL=adms.d.ts.map