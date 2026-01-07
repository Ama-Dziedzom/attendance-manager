# MB460 Terminal Migration Plan

## Overview

**Migration:** ZKTeco K40 (Fingerprint Only) → ZKTeco MB460 (Fingerprint + Face Recognition)

**Objective:** Update the attendance management system to support the new MB460 terminal across multiple agencies, with a centralized middleware server for device communication.

**Scale:** 6 agencies, each with their own MB460 terminal

**Estimated Effort:** High (1-2 weeks including middleware development)

---

## Rollout Strategy

### Development Scope
- ✅ Code will support **both** fingerprint and face recognition
- ✅ Database schema supports both biometric types
- ✅ Middleware handles both verification methods

### Deployment Phases

| Phase | Biometric | Scope | Timeline |
|-------|-----------|-------|----------|
| **Phase A** | Fingerprint only | All 6 agencies | Initial rollout |
| **Phase B** | Fingerprint + Face | Pilot agency | After Phase A stable |
| **Phase C** | Fingerprint + Face | All agencies | Full rollout |

### Why Fingerprint First?
1. **Proven technology** — Fingerprint is well-established and reliable
2. **Simpler enrollment** — Employees are familiar with fingerprint scanners
3. **Lower risk** — Validates the entire pipeline before adding face complexity
4. **Face as enhancement** — Can be added incrementally without disruption

### Face Recognition Enablement
When ready to enable face recognition:
1. Update MB460 device settings to enable face enrollment
2. Employees register face on device (self-service or admin-assisted)
3. Middleware already handles `verifyType: 15` (face) — no code changes needed
4. Dashboard already displays verification method

---

## Architecture

### Confirmed Architecture (4-Tier)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           6 × MB460 TERMINALS                                   │
│                         (Face + Fingerprint)                                    │
│                                                                                 │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│   │ Agency 1  │ │ Agency 2  │ │ Agency 3  │ │ Agency 4  │ │ Agency 5  │ │ Agency 6  │
│   │  MB460    │ │  MB460    │ │  MB460    │ │  MB460    │ │  MB460    │ │  MB460    │
│   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
│         │             │             │             │             │             │     │
└─────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────┘
          │             │             │             │             │             │
          └─────────────┴─────────────┴──────┬──────┴─────────────┴─────────────┘
                                             │
                                    TCP/IP (Port 4370)
                                             │
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │    ORACLE CLOUD (Always Free VM)        │
                        │                                         │
                        │  • ZKTeco Protocol Handler (TCP)        │
                        │  • Device Connection Manager            │
                        │  • Attendance Event Processor           │
                        │  • REST API (for dashboard)             │
                        │  • WebSocket (real-time updates)        │
                        │                                         │
                        │  Node.js + Express + Socket.io          │
                        └────────────────────┬────────────────────┘
                                             │
                                    HTTPS (Supabase SDK)
                                             │
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │            SUPABASE                      │
                        │                                          │
                        │  • PostgreSQL Database                   │
                        │  • employees table                       │
                        │  • attendance_records table              │
                        │  • terminals table (NEW)                 │
                        │  • biometric_credentials table           │
                        │                                          │
                        │  • Auth (admin users)                    │
                        │  • RLS Policies (multi-tenant)           │
                        └────────────────────┬─────────────────────┘
                                             │
                                    HTTPS (Supabase Client)
                                             │
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │        NEXT.JS DASHBOARD                 │
                        │                                          │
                        │  • Admin login & authentication          │
                        │  • Employee management                   │
                        │  • Attendance reports                    │
                        │  • Real-time attendance feed             │
                        │  • Terminal status monitoring            │
                        │                                          │
                        │  Hosted on Vercel (or similar)           │
                        └──────────────────────────────────────────┘
```

### Data Flow

| Step | From | To | Protocol | Data |
|------|------|-----|----------|------|
| 1 | Employee | MB460 | Physical | Fingerprint or Face scan |
| 2 | MB460 | Oracle Cloud | TCP/IP | Attendance event (user ID, timestamp, verify type) |
| 3 | Oracle Cloud | Supabase | HTTPS | Insert attendance record |
| 4 | Oracle Cloud | Next.js | WebSocket | Real-time attendance notification |
| 5 | Next.js | Supabase | HTTPS | Query attendance data, employee data |

### Network Requirements

| Component | Requirement |
|-----------|-------------|
| **MB460 (×6)** | Internet connection (Ethernet/WiFi), ability to reach Oracle Cloud IP on port 4370 |
| **Oracle Cloud** | Public IP, open ports 4370/443/8080, PM2 for uptime, Always Free tier |
| **Supabase** | Existing project (already configured) |
| **Next.js** | Existing app (already deployed or localhost:3000) |

---

## Phase 1: Middleware Server Development (NEW - Critical Path)

This is the **most important new component**. The middleware server bridges MB460 terminals across all agencies with the Supabase database.

### 1.1 Project Setup

**Repository:** Create new repo `attendance-middleware` (or monorepo structure)

**Technology Stack:**
- **Runtime:** Node.js 20+ (or Python 3.11+)
- **Framework:** Express.js + Socket.io (or FastAPI + WebSockets)
- **Database Client:** Supabase JS SDK
- **ZKTeco Protocol:** Custom TCP handler or ZKTeco SDK

**Directory Structure:**
```
attendance-middleware/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── env.ts               # Environment variables
│   │   └── devices.ts           # Agency/device registry
│   ├── zkteco/
│   │   ├── protocol.ts          # TCP protocol handler
│   │   ├── commands.ts          # ZKTeco command definitions
│   │   ├── parser.ts            # Response/event parser
│   │   └── connection.ts        # Device connection manager
│   ├── api/
│   │   ├── routes.ts            # REST API routes
│   │   ├── attendance.ts        # Attendance endpoints
│   │   ├── devices.ts           # Device management endpoints
│   │   └── employees.ts         # Employee sync endpoints
│   ├── websocket/
│   │   ├── server.ts            # WebSocket server
│   │   └── events.ts            # Real-time event emitter
│   ├── services/
│   │   ├── supabase.ts          # Supabase client
│   │   ├── attendance.ts        # Attendance business logic
│   │   └── sync.ts              # Device ↔ DB sync logic
│   └── utils/
│       ├── logger.ts
│       └── queue.ts             # Event processing queue
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

### 1.2 ZKTeco Protocol Implementation

**MB460 uses the ZKTeco Push/Pull protocol over TCP:**

```typescript
// Example: TCP Server for MB460 connections
import net from 'net';

const server = net.createServer((socket) => {
    console.log('MB460 connected:', socket.remoteAddress);
    
    socket.on('data', (data) => {
        // Parse ZKTeco protocol data
        const event = parseZKTecoPacket(data);
        
        if (event.type === 'ATTENDANCE') {
            // Process clock-in/out event
            processAttendance({
                deviceSerial: event.deviceSerial,
                userId: event.userId,          // Internal MB460 user ID
                timestamp: event.timestamp,
                verifyType: event.verifyType,  // 1=fingerprint, 15=face
            });
        }
    });
    
    socket.on('close', () => {
        console.log('MB460 disconnected');
    });
});

server.listen(4370, '0.0.0.0');
```

**Key Protocol Events to Handle:**
| Event Code | Description | Action |
|------------|-------------|--------|
| `CMD_ATTLOG_RRQ` | Real-time attendance log | Write to Supabase, emit WS |
| `CMD_REG_EVENT` | User enrollment event | Sync employee biometric |
| `CMD_VERIFY_WG` | Verification result | Log verification attempt |

### 1.3 Device Registry

**Track all MB460 devices across agencies:**

```typescript
interface DeviceConfig {
    serial: string;           // MB460 serial number
    agencyId: string;         // Links to agencies table
    agencyName: string;
    ipAddress?: string;       // Static IP or last known
    port: number;             // Default 4370
    status: 'online' | 'offline' | 'unknown';
    lastSeen?: Date;
}

// devices.ts - Initial configuration
export const DEVICES: DeviceConfig[] = [
    { serial: 'MB460-001', agencyId: 'agency-uuid-1', agencyName: 'Agency 1', port: 4370 },
    { serial: 'MB460-002', agencyId: 'agency-uuid-2', agencyName: 'Agency 2', port: 4370 },
    { serial: 'MB460-003', agencyId: 'agency-uuid-3', agencyName: 'Agency 3', port: 4370 },
    // ... 6+ agencies
];
```

### 1.4 REST API Endpoints

**For the Next.js frontend to consume:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/devices` | GET | List all connected MB460 devices |
| `/api/devices/:serial/status` | GET | Get device status (online/offline) |
| `/api/devices/:serial/users` | GET | Get users enrolled on device |
| `/api/devices/:serial/sync` | POST | Trigger sync between device and DB |
| `/api/attendance/realtime` | WS | WebSocket for real-time attendance |
| `/api/employees/:id/enroll` | POST | Push employee to MB460 device |

### 1.5 Employee Synchronization

**Bi-directional sync between Supabase and MB460 devices:**

```typescript
// Sync employee to device when created in web app
async function pushEmployeeToDevice(employee: Employee, deviceSerial: string) {
    const device = getDeviceConnection(deviceSerial);
    
    // ZKTeco command to add user
    await device.sendCommand('SET_USER', {
        userId: employee.empId,      // Use emp_id as device user ID
        userName: employee.name,
        privilege: 0,                // Normal user
        enabled: true,
    });
    
    // If biometric already captured, push template
    if (employee.fingerprintTemplate) {
        await device.sendCommand('SET_FP', {
            userId: employee.empId,
            fingerId: 0,             // Finger index
            template: employee.fingerprintTemplate,
        });
    }
}

// Sync attendance from device (real-time push event)
async function handleAttendanceEvent(event: AttendanceEvent) {
    // Lookup employee by device user ID
    const employee = await supabase
        .from('employees')
        .select('*')
        .eq('emp_id', event.userId)
        .single();
    
    if (!employee) {
        logger.warn(`Unknown user ${event.userId} on device ${event.deviceSerial}`);
        return;
    }
    
    // Determine verification method
    const verifyMethod = event.verifyType === 15 ? 'face' : 'fingerprint';
    
    // Insert attendance record
    await supabase.rpc('clock_in', {
        p_emp_id: employee.emp_id,
        p_verification_method: verifyMethod,
    });
    
    // Emit real-time event
    websocket.emit('attendance:new', {
        employeeId: employee.id,
        employeeName: employee.name,
        agency: employee.agency_id,
        method: verifyMethod,
        timestamp: event.timestamp,
    });
}
```

### 1.6 Oracle Cloud Server Setup (Always Free)

**Why Oracle Cloud?**
- 🆓 **$0/month forever** (Always Free tier)
- 1GB RAM AMD VM or up to 6GB ARM VM
- 200GB storage included
- 10TB bandwidth/month

**Recommended Configuration:**

| Spec | Value |
|------|-------|
| **Shape** | `VM.Standard.E2.1.Micro` (AMD, 1GB RAM) |
| **OS** | Ubuntu 22.04 (Canonical) |
| **Region** | UK South (London) — closest to Ghana |
| **Boot Volume** | 50GB |
| **Ports** | 4370 (ZKTeco), 443 (HTTPS API), 8080 (WebSocket) |

**Alternative (More RAM):**

| Spec | Value |
|------|-------|
| **Shape** | `VM.Standard.A1.Flex` (ARM, up to 6GB RAM) |
| **Note** | ARM requires code to be compatible (Node.js works fine) |

---

**Server Setup Steps:**

#### Step 1: Create Oracle Cloud Account
1. Go to [cloud.oracle.com](https://cloud.oracle.com)
2. Sign up with credit card (verification only, won't charge)
3. Select home region: **UK South (London)**

#### Step 2: Create Always Free VM
1. Go to **Compute → Instances → Create Instance**
2. Name: `attendance-middleware`
3. Image: **Ubuntu 22.04** (Canonical)
4. Shape: **VM.Standard.E2.1.Micro** (Always Free)
5. Add SSH public key from your Mac:
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```
6. Click **Create**

#### Step 3: Configure Security List (Firewall)
1. Go to **Networking → Virtual Cloud Networks**
2. Click your VCN → **Security Lists** → **Default Security List**
3. Add **Ingress Rules**:

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 22 | TCP | 0.0.0.0/0 | SSH |
| 4370 | TCP | 0.0.0.0/0 | ZKTeco MB460 |
| 443 | TCP | 0.0.0.0/0 | HTTPS API |
| 8080 | TCP | 0.0.0.0/0 | WebSocket |

#### Step 4: Configure Ubuntu Firewall
```bash
# SSH into the VM
ssh ubuntu@<your-vm-public-ip>

# Open required ports
sudo iptables -I INPUT -p tcp --dport 4370 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT

# Save rules
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

#### Step 5: Install Node.js & PM2
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Verify
node --version   # Should show v20.x
pm2 --version    # Should show 5.x
```

#### Step 6: Deploy Middleware
```bash
# Clone your middleware repo
git clone https://github.com/your-org/attendance-middleware.git
cd attendance-middleware

# Install dependencies
npm install

# Create .env file
nano .env  # Add environment variables

# Start with PM2
pm2 start src/index.js --name attendance-middleware
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

---

**Fallback Option:**
If Oracle Always Free is unavailable (high demand), use:
- **Linode Nanode** ($5/month)
- **DigitalOcean Droplet** ($4-6/month)
- **Vultr** ($5/month)


### 1.7 Environment Variables

```bash
# .env for middleware server
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# ZKTeco
ZKTECO_PORT=4370
ZKTECO_TIMEOUT=30000

# API
API_PORT=3001
API_SECRET=your-jwt-secret

# WebSocket
WS_PORT=8080
WS_PATH=/realtime

# Logging
LOG_LEVEL=info
```

---

## Phase 2: Database Schema Updates

### 2.1 Add Terminals Table (NEW)

Track each MB460 device in the database:

```sql
CREATE TABLE terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    agency_id UUID REFERENCES agencies(id),
    name VARCHAR(100),
    model VARCHAR(50) DEFAULT 'MB460',
    ip_address INET,
    port INTEGER DEFAULT 4370,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_terminals_serial ON terminals(serial_number);
CREATE INDEX idx_terminals_agency ON terminals(agency_id);
```

### 2.2 Extend Biometric Credentials Table

Add support for face recognition and MB460 device tracking:

**File:** New migration file in `supabase/migrations/`

**Changes:**
- Add `face_template_id` column (nullable string) for face recognition data
- Add `biometric_type` column (enum: 'fingerprint', 'face', 'both')
- Add `terminal_id` to track which device enrolled the biometric
- Update `device_type` to support 'mb460' value

**SQL Migration:**
```sql
-- Add face recognition and terminal tracking
ALTER TABLE biometric_credentials 
ADD COLUMN face_template_id VARCHAR(255) NULL,
ADD COLUMN biometric_type VARCHAR(20) DEFAULT 'fingerprint',
ADD COLUMN terminal_id UUID REFERENCES terminals(id);

COMMENT ON COLUMN biometric_credentials.face_template_id IS 'Face template ID for MB460 face recognition';
COMMENT ON COLUMN biometric_credentials.biometric_type IS 'Type of biometric: fingerprint, face, or both';
COMMENT ON COLUMN biometric_credentials.terminal_id IS 'MB460 terminal where biometric was enrolled';
```

### 2.3 Update Attendance Records

Link attendance to terminal and distinguish verification methods:

```sql
-- Add terminal reference
ALTER TABLE attendance_records 
ADD COLUMN terminal_id UUID REFERENCES terminals(id);

-- Update verification_method to use consistent values
-- 'fingerprint' | 'face' | 'card' | 'manual'
```

**Existing Values:** 'fingerprint', 'manual'
**New Values:** 'face', 'card' (MB460 also supports RFID cards)

---

## Phase 2: Type Definitions

### 2.1 Update `lib/database.types.ts`

Regenerate or manually update the Supabase types to include new columns.

### 2.2 Update `lib/types.ts`

**Changes to `BiometricCredential` interface:**
```typescript
export interface BiometricCredential {
    id: string
    employeeId: string
    credentialId: string
    fingerprintId: string | null      // Now nullable (may use face only)
    faceTemplateId: string | null     // NEW: Face template ID
    biometricType: 'fingerprint' | 'face' | 'both'  // NEW
    publicKey: string
    counter: number
    deviceType: string                // Will include 'mb460'
    isActive: boolean
    registeredAt: string
    lastUsedAt: string | null
}
```

**Changes to `Employee` interface:**
```typescript
// Add these fields
faceRegistered?: boolean
biometricType?: 'fingerprint' | 'face' | 'both'
```

### 2.3 Update mappers in `lib/types.ts`

Update `mapDbEmployeeToEmployee()` to include:
- `faceRegistered` field
- `biometricType` field

---

## Phase 3: WebAuthn Helper Updates

### 3.1 Update `lib/webauthn-helper.ts`

**New Functions to Add:**

```typescript
// Check if face recognition is available (platform-dependent)
export async function isFaceRecognitionAvailable(): Promise<boolean>

// Register face credential
export async function registerFace(
    employeeId: string,
    employeeName: string,
    employeeEmail: string
): Promise<BiometricCredential>

// Verify face for attendance
export async function verifyFace(
    allowedCredentialIds?: string[]
): Promise<{ credentialId: string; success: boolean }>

// Combined verification (tries fingerprint first, then face)
export async function verifyBiometric(
    preferredMethod?: 'fingerprint' | 'face'
): Promise<{ credentialId: string; method: string; success: boolean }>
```

**Update Existing Functions:**
- Rename `getWindowsHelloInstructions()` → `getBiometricSetupInstructions(type: 'fingerprint' | 'face')`

---

## Phase 4: Component Updates

### 4.1 Create New MB460 Terminal Component

**File:** `components/mb460-terminal.tsx`

**Features:**
- Dual-mode authentication UI
- Toggle/tabs to switch between Fingerprint and Face scan
- Animated face scanning indicator
- Support for automatic detection (try face first if available)
- Fallback logic: if one method fails, prompt for alternate

**UI Elements:**
```
┌─────────────────────────────────────┐
│           [Current Time]            │
│         ZKTeco MB460 Terminal       │
│                                     │
│   ┌─────────────┬─────────────┐    │
│   │ Fingerprint │    Face     │    │ ← Tab/Toggle
│   └─────────────┴─────────────┘    │
│                                     │
│        [Fingerprint Icon]           │ ← Changes based on mode
│              or                     │
│          [Face Icon]                │
│                                     │
│    Place finger on sensor           │
│           or                        │
│    Look at the camera               │
│                                     │
│      [Scan Button]                  │
└─────────────────────────────────────┘
```

### 4.2 Create Face Scanner Enrollment Component

**File:** `components/face-scanner.tsx`

**Purpose:** Enrollment component for new employees to register face.

**Features:**
- Live camera preview (if browser supports)
- Face detection overlay
- Capture and store face template
- Success/error feedback

### 4.3 Update Enrollment Flow

**File:** `components/add-employee-sheet.tsx`

**Changes:**
- Step 2: Allow choice between Fingerprint, Face, or Both
- Update wizard steps:
  1. Basic Info
  2. **Biometric Type Selection** (NEW)
  3. Fingerprint Enrollment (if selected)
  4. Face Enrollment (if selected)
  5. Success

### 4.4 Archive Old K40 Component

**Action:** Move `components/k40-terminal.tsx` to `_archived/` folder

---

## Phase 5: Page Updates

### 5.1 Update Scan Page

**File:** `app/scan/page.tsx`

**Changes:**
```typescript
// Before
import { K40Terminal } from "@/components/k40-terminal"

// After
import { MB460Terminal } from "@/components/mb460-terminal"
```

### 5.2 Update Main Page Comments

**File:** `app/page.tsx`

Update the route comments to reflect MB460:
```typescript
// - /scan - MB460 Terminal for clock in/out (fingerprint or face)
```

---

## Phase 6: Database Layer Updates

### 6.1 Update `lib/supabase/db.ts`

**Extend biometric operations:**

```typescript
// Add new methods
async registerFaceCredential(employeeId: string, credential: FaceCredential)
async getByFaceTemplateId(faceTemplateId: string)

// Update existing
async clockIn(empId: string, verificationMethod: 'fingerprint' | 'face' | 'manual')
```

---

## Phase 7: Testing

### 7.1 Unit Tests
- [ ] WebAuthn helper functions for face recognition
- [ ] Biometric type detection logic
- [ ] Mapper functions with new fields

### 7.2 Integration Tests
- [ ] Employee enrollment with face
- [ ] Employee enrollment with fingerprint
- [ ] Employee enrollment with both
- [ ] Clock-in via fingerprint
- [ ] Clock-in via face
- [ ] Fallback from face to fingerprint

### 7.3 Manual Testing
- [ ] MB460 device connectivity
- [ ] Face enrollment UX flow
- [ ] Face verification accuracy
- [ ] Error handling and messaging

---

## Phase 8: Deployment

### 8.1 Pre-Deployment
- [ ] Run database migrations in staging
- [ ] Test with actual MB460 hardware
- [ ] Verify backward compatibility for existing fingerprint enrollments

### 8.2 Deployment Steps
1. Deploy database migration
2. Deploy application code
3. Verify existing employees can still clock in via fingerprint
4. Enable face enrollment for new employees

### 8.3 Post-Deployment
- [ ] Monitor error rates
- [ ] Gather user feedback on face recognition
- [ ] Document any hardware-specific issues

---

## File Change Summary

### Middleware Server (NEW - Separate Project)

| File | Action | Priority |
|------|--------|----------|
| `attendance-middleware/` | Create new project | 🔴 Critical |
| `src/index.ts` | Create entry point | 🔴 Critical |
| `src/zkteco/protocol.ts` | Create TCP protocol handler | 🔴 Critical |
| `src/zkteco/commands.ts` | Create ZKTeco commands | 🔴 Critical |
| `src/api/routes.ts` | Create REST API | 🔴 Critical |
| `src/websocket/server.ts` | Create WebSocket server | 🟡 High |
| `src/services/supabase.ts` | Create Supabase client | 🔴 Critical |
| `Dockerfile` | Create for deployment | 🟡 High |

### Attendance Manager (Existing Project)

| File | Action | Priority |
|------|--------|----------|
| `supabase/migrations/YYYYMMDD_mb460_support.sql` | Create | 🔴 High |
| `lib/database.types.ts` | Update | 🔴 High |
| `lib/types.ts` | Update | 🔴 High |
| `lib/supabase/db.ts` | Update | 🟡 Medium |
| `components/terminal-status.tsx` | Create (device status UI) | 🟡 Medium |
| `components/add-employee-sheet.tsx` | Update | 🟡 Medium |
| `app/admin/terminals/page.tsx` | Create (terminal management) | 🟢 Low |
| `app/scan/page.tsx` | Update | 🟢 Low |
| `components/k40-terminal.tsx` | Archive | 🟢 Low |

---

## Dependencies

### Middleware Server (New Project)

**NPM Packages:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "express": "^4.x",
    "socket.io": "^4.x",
    "dotenv": "^16.x",
    "winston": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/express": "^4.x",
    "ts-node": "^10.x",
    "nodemon": "^3.x"
  }
}
```

### Linode Server
- Ubuntu 22.04 LTS
- Node.js 20+
- PM2 (process manager)
- Nginx (reverse proxy, optional)
- Let's Encrypt (SSL)

### Hardware Requirements
- ZKTeco MB460 terminal (one per agency)
- Network connectivity (Ethernet or WiFi)
- Static IP or DDNS for each agency location
- Router with port forwarding capability (if behind NAT)

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **ZKTeco protocol undocumented** | High | Medium | Research open-source implementations; contact ZKTeco support; reverse-engineer if needed |
| **Network connectivity issues** | High | High | Implement offline queueing on MB460; periodic sync; robust reconnection logic |
| **Agency IP changes** | Medium | Medium | Use DDNS or VPN tunnel; implement device heartbeat |
| **Linode server downtime** | High | Low | Use PM2 with auto-restart; set up monitoring; consider backup server |
| **Face recognition accuracy** | Medium | Medium | Allow fingerprint fallback; adjust MB460 sensitivity settings |
| **Existing K40 enrollments** | Medium | Low | Document migration path; keep K40 data intact during transition |
| **Multi-tenant data isolation** | High | Low | Ensure all queries filter by agency_id; add RLS policies |

---

## Open Questions

Before implementation, clarify the following:

1. **ZKTeko Protocol**
   - Do we have ZKTeco SDK documentation or sample code?
   - Is Push (device → server) or Pull (server → device) preferred?
   
2. **Network Setup**
   - Do agencies have static IPs or will we need DDNS?
   - Any firewall restrictions at agency locations?
   
3. **Device Configuration**
   - How are employees enrolled on the MB460? (On device? From web app?)
   - What is the employee ID format on the device?
   
4. **Face Templates**
   - Does the web app need to capture face photos, or only MB460?
   - Should face data be stored in Supabase or only on devices?

5. **Rollout Plan**
   - Pilot with one agency first, then expand?
   - Timeline for decommissioning K40 terminals?

---

## Notes

- **ZKTeco SDK Resources:**
  - Check for `zklib` npm package (community implementation)
  - ZKTeco may provide official SDK via developer portal
  - Alternative: Use ZKTeco ADMS (Attendance Device Management System) as middleware

- **MB460 Default Settings:**
  - Default port: 4370
  - Default communication: TCP/IP
  - Supports up to 1,200 face templates, 3,000 fingerprint templates

- **Consider for Future:**
  - Admin panel to view device status (online/offline)
  - Remote enrollment trigger from web app
  - Attendance sync status per agency

---

*Created: 2026-01-07*
*Last Updated: 2026-01-07*

