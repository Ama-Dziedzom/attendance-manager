# Attendance Middleware

Middleware server for ZKTeco MB460 terminals. Connects biometric terminals to Supabase for attendance management.

## Architecture

```
MB460 Terminals (×6)
        │
        │ TCP/IP (Port 4370)
        ▼
  This Middleware Server
        │
        │ HTTPS
        ▼
     Supabase
```

## Features

- 📡 TCP server for MB460 connections (port 4370)
- 🔄 Real-time attendance event processing
- 📊 REST API for dashboard integration
- 🔔 WebSocket for real-time notifications
- 📝 Comprehensive logging

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example file and fill in your values:

```bash
cp env.example.txt .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/terminals` | GET | List all terminals |
| `/api/terminals/connected` | GET | List connected terminals |
| `/api/terminals/:serial/status` | GET | Check terminal status |
| `/api/fingerprints/enroll` | POST | Enroll fingerprint template (SLK20R) |
| `/api/simulate/attendance` | POST | Simulate attendance (dev only) |
| `/api/stats` | GET | Server statistics |

## WebSocket Events

### Emitted Events

| Event | Description |
|-------|-------------|
| `attendance:event` | New clock in/out event |
| `terminal:status` | Terminal connection status change |

### Event Payload: `attendance:event`

```json
{
  "type": "clock_in" | "clock_out",
  "empId": "EMP001",
  "employeeName": "John Doe",
  "department": "IT",
  "verificationMethod": "fingerprint" | "face",
  "terminal": "MB460-001",
  "timestamp": "2024-01-07T15:30:00Z",
  "success": true
}
```

## Production Deployment (Oracle Cloud)

See the main project's implementation plan for Oracle Cloud deployment steps.

### Quick Start on Oracle Cloud

```bash
# Clone the repo
git clone <repo-url>
cd attendance-middleware

# Install dependencies
npm install

# Configure environment
nano .env

# Start with PM2
pm2 start npm --name "attendance-middleware" -- start
pm2 save
pm2 startup
```

## Notes

- The ZKTeco protocol parser is simplified and may need adjustments for your specific MB460 firmware version
- The simulation endpoint is disabled in production
- Logs are written to `logs/` directory in production mode
