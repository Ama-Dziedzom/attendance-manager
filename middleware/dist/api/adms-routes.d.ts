/**
 * ADMS (Advanced Device Management System) Routes
 *
 * Handles ZKTeco device communication via PUSH protocol:
 * - Device registration (/iclock/registry)
 * - Command polling (/iclock/getrequest)
 * - Attendance data push (/iclock/cdata)
 * - Device commands (/iclock/devicecmd)
 */
import { Express } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
export declare function setupAdmsRoutes(app: Express, supabase: SupabaseClient): void;
//# sourceMappingURL=adms-routes.d.ts.map