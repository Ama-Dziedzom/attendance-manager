"use strict";
/**
 * Attendance Middleware Server
 *
 * This server bridges ZKTeco MB460 terminals with Supabase:
 * 1. Listens for TCP connections from MB460 terminals
 * 2. Processes attendance events (clock in/out)
 * 3. Writes to Supabase database
 * 4. Provides REST API for the Next.js dashboard
 * 5. Provides WebSocket for real-time updates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const logger_1 = require("./utils/logger");
const supabase_1 = require("./services/supabase");
const server_1 = require("./zkteco/server");
const routes_1 = require("./api/routes");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO for real-time updates
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});
// Middleware
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'attendance-middleware'
    });
});
// Setup API routes
(0, routes_1.setupApiRoutes)(app, io);
// Initialize services
async function main() {
    try {
        logger_1.logger.info('Starting Attendance Middleware...');
        // Initialize Supabase client
        const supabase = (0, supabase_1.initSupabase)();
        logger_1.logger.info('Supabase client initialized');
        // Start ZKTeco TCP server
        const zktecoPort = parseInt(process.env.ZKTECO_PORT || '4370');
        (0, server_1.startZKTecoServer)(zktecoPort, supabase, io);
        logger_1.logger.info(`ZKTeco server listening on port ${zktecoPort}`);
        // Start HTTP server (API + WebSocket)
        const apiPort = parseInt(process.env.API_PORT || '3001');
        httpServer.listen(apiPort, () => {
            logger_1.logger.info(`API server listening on port ${apiPort}`);
            logger_1.logger.info(`WebSocket server ready on port ${apiPort}`);
        });
        // Handle Socket.IO connections
        io.on('connection', (socket) => {
            logger_1.logger.info(`Dashboard connected: ${socket.id}`);
            socket.on('disconnect', () => {
                logger_1.logger.info(`Dashboard disconnected: ${socket.id}`);
            });
        });
        logger_1.logger.info('Attendance Middleware started successfully!');
        logger_1.logger.info('Waiting for MB460 terminal connections...');
    }
    catch (error) {
        logger_1.logger.error('Failed to start middleware:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down...');
    httpServer.close(() => {
        logger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down...');
    httpServer.close(() => {
        logger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
});
// Start the server
main();
//# sourceMappingURL=index.js.map