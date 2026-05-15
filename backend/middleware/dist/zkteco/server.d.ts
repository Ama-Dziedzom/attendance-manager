/**
 * ZKTeco TCP Server
 *
 * Handles connections from MB460 terminals via TCP/IP.
 * The ZKTeco Push Protocol sends attendance events in real-time.
 */
import net from 'net';
import { SupabaseClient } from '@supabase/supabase-js';
import { Server as SocketIOServer } from 'socket.io';
export declare function startZKTecoServer(port: number, supabase: SupabaseClient, io: SocketIOServer): net.Server;
/**
 * Get connected devices
 */
export declare function getConnectedDevices(): string[];
/**
 * Check if a device is connected
 */
export declare function isDeviceConnected(serial: string): boolean;
//# sourceMappingURL=server.d.ts.map