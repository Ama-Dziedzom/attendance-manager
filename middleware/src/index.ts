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

import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';
import { initSupabase } from './services/supabase';
import { startZKTecoServer } from './zkteco/server';
import { setupApiRoutes } from './api/routes';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'attendance-middleware'
    });
});

// Setup API routes
setupApiRoutes(app, io);

// Initialize services
async function main() {
    try {
        logger.info('Starting Attendance Middleware...');

        // Initialize Supabase client
        const supabase = initSupabase();
        logger.info('Supabase client initialized');

        // Start ZKTeco TCP server
        const zktecoPort = parseInt(process.env.ZKTECO_PORT || '4370');
        startZKTecoServer(zktecoPort, supabase, io);
        logger.info(`ZKTeco server listening on port ${zktecoPort}`);

        // Start HTTP server (API + WebSocket)
        const apiPort = parseInt(process.env.API_PORT || '3001');
        httpServer.listen(apiPort, () => {
            logger.info(`API server listening on port ${apiPort}`);
            logger.info(`WebSocket server ready on port ${apiPort}`);
        });

        // Handle Socket.IO connections
        io.on('connection', (socket) => {
            logger.info(`Dashboard connected: ${socket.id}`);

            socket.on('disconnect', () => {
                logger.info(`Dashboard disconnected: ${socket.id}`);
            });
        });

        logger.info('Attendance Middleware started successfully!');
        logger.info('Waiting for MB460 terminal connections...');

    } catch (error) {
        logger.error('Failed to start middleware:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down...');
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Start the server
main();
