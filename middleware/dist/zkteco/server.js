"use strict";
/**
 * ZKTeco TCP Server
 *
 * Handles connections from MB460 terminals via TCP/IP.
 * The ZKTeco Push Protocol sends attendance events in real-time.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startZKTecoServer = startZKTecoServer;
exports.getConnectedDevices = getConnectedDevices;
exports.isDeviceConnected = isDeviceConnected;
const net_1 = __importDefault(require("net"));
const logger_1 = require("../utils/logger");
const parser_1 = require("./parser");
const handler_1 = require("./handler");
// Track connected devices
const connectedDevices = new Map();
function startZKTecoServer(port, supabase, io) {
    const server = net_1.default.createServer((socket) => {
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        logger_1.logger.info(`MB460 connected from ${clientAddress}`);
        // Temporary ID until we identify the device
        let deviceSerial = null;
        socket.on('data', async (data) => {
            try {
                logger_1.logger.debug(`Received data from ${clientAddress}: ${data.toString('hex')}`);
                // Parse the ZKTeco packet
                const event = (0, parser_1.parseZKTecoPacket)(data);
                if (event) {
                    // Store device serial for tracking
                    if (event.deviceSerial && !deviceSerial) {
                        deviceSerial = event.deviceSerial;
                        connectedDevices.set(deviceSerial, socket);
                        logger_1.logger.info(`Device identified: ${deviceSerial}`);
                    }
                    // Handle the event
                    await (0, handler_1.handleAttendanceEvent)(event, supabase, io);
                }
            }
            catch (error) {
                logger_1.logger.error(`Error processing data from ${clientAddress}:`, error);
            }
        });
        socket.on('close', () => {
            logger_1.logger.info(`MB460 disconnected: ${clientAddress}`);
            if (deviceSerial) {
                connectedDevices.delete(deviceSerial);
                // Emit offline status
                io.emit('terminal:status', { serial: deviceSerial, status: 'offline' });
            }
        });
        socket.on('error', (err) => {
            logger_1.logger.error(`Socket error from ${clientAddress}:`, err.message);
        });
        // Set socket options
        socket.setKeepAlive(true, 60000); // Keep alive every 60 seconds
        socket.setTimeout(300000); // 5 minute timeout
        socket.on('timeout', () => {
            logger_1.logger.warn(`Socket timeout for ${clientAddress}`);
            socket.end();
        });
    });
    server.on('error', (err) => {
        logger_1.logger.error('ZKTeco server error:', err);
    });
    server.listen(port, '0.0.0.0', () => {
        logger_1.logger.info(`ZKTeco TCP server listening on 0.0.0.0:${port}`);
    });
    return server;
}
/**
 * Get connected devices
 */
function getConnectedDevices() {
    return Array.from(connectedDevices.keys());
}
/**
 * Check if a device is connected
 */
function isDeviceConnected(serial) {
    return connectedDevices.has(serial);
}
//# sourceMappingURL=server.js.map