/**
 * REST API Routes
 *
 * Provides endpoints for the Next.js dashboard to:
 * - Get terminal status
 * - Get connected devices
 * - Trigger manual sync
 * - Handle ADMS device communication
 */
import { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
export declare function setupApiRoutes(app: Express, io: SocketIOServer): void;
//# sourceMappingURL=routes.d.ts.map