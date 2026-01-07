/**
 * ZKTeco TCP Server
 * 
 * Handles connections from MB460 terminals via TCP/IP.
 * The ZKTeco Push Protocol sends attendance events in real-time.
 */

import net from 'net';
import { SupabaseClient } from '@supabase/supabase-js';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { parseZKTecoPacket, ZKTecoEvent } from './parser';
import { handleAttendanceEvent } from './handler';

// Track connected devices
const connectedDevices = new Map<string, net.Socket>();

export function startZKTecoServer(
    port: number,
    supabase: SupabaseClient,
    io: SocketIOServer
): net.Server {
    const server = net.createServer((socket) => {
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.info(`MB460 connected from ${clientAddress}`);

        // Temporary ID until we identify the device
        let deviceSerial: string | null = null;

        socket.on('data', async (data) => {
            try {
                logger.debug(`Received data from ${clientAddress}: ${data.toString('hex')}`);

                // Parse the ZKTeco packet
                const event = parseZKTecoPacket(data);

                if (event) {
                    // Store device serial for tracking
                    if (event.deviceSerial && !deviceSerial) {
                        deviceSerial = event.deviceSerial;
                        connectedDevices.set(deviceSerial, socket);
                        logger.info(`Device identified: ${deviceSerial}`);
                    }

                    // Handle the event
                    await handleAttendanceEvent(event, supabase, io);
                }
            } catch (error) {
                logger.error(`Error processing data from ${clientAddress}:`, error);
            }
        });

        socket.on('close', () => {
            logger.info(`MB460 disconnected: ${clientAddress}`);
            if (deviceSerial) {
                connectedDevices.delete(deviceSerial);
                // Emit offline status
                io.emit('terminal:status', { serial: deviceSerial, status: 'offline' });
            }
        });

        socket.on('error', (err) => {
            logger.error(`Socket error from ${clientAddress}:`, err.message);
        });

        // Set socket options
        socket.setKeepAlive(true, 60000); // Keep alive every 60 seconds
        socket.setTimeout(300000); // 5 minute timeout

        socket.on('timeout', () => {
            logger.warn(`Socket timeout for ${clientAddress}`);
            socket.end();
        });
    });

    server.on('error', (err) => {
        logger.error('ZKTeco server error:', err);
    });

    server.listen(port, '0.0.0.0', () => {
        logger.info(`ZKTeco TCP server listening on 0.0.0.0:${port}`);
    });

    return server;
}

/**
 * Get connected devices
 */
export function getConnectedDevices(): string[] {
    return Array.from(connectedDevices.keys());
}

/**
 * Check if a device is connected
 */
export function isDeviceConnected(serial: string): boolean {
    return connectedDevices.has(serial);
}
