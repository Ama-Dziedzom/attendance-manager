/**
 * ZKTeco Event Handler
 *
 * Processes attendance events from MB460 terminals:
 * 1. Validates the event
 * 2. Calls Supabase to record attendance
 * 3. Emits WebSocket event to dashboard
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { Server as SocketIOServer } from 'socket.io';
import { ZKTecoEvent } from './parser';
export declare function handleAttendanceEvent(event: ZKTecoEvent, supabase: SupabaseClient, io: SocketIOServer): Promise<void>;
//# sourceMappingURL=handler.d.ts.map