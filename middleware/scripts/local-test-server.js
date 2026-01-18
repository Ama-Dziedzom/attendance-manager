/**
 * Simple test server to verify MB460 can connect locally
 * 
 * Configure your MB460 with:
 * - Server Address: 192.168.0.196 (your computer's IP)
 * - Server Port: 80
 */

const http = require('http');

const server = http.createServer((req, res) => {
    let body = [];

    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        const data = Buffer.concat(body).toString();

        console.log('='.repeat(60));
        console.log(`[${new Date().toISOString()}] REQUEST RECEIVED!`);
        console.log(`Method: ${req.method}`);
        console.log(`URL: ${req.url}`);
        console.log(`Headers:`, req.headers);
        console.log(`Body: ${data}`);
        console.log('='.repeat(60));

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    });
});

const PORT = 80;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST SERVER RUNNING`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nListening on http://0.0.0.0:${PORT}`);
    console.log(`\nConfigure your MB460 with:`);
    console.log(`  Server Address: 192.168.0.196`);
    console.log(`  Server Port: ${PORT}`);
    console.log(`\nWaiting for connections from MB460...`);
    console.log(`(Press Ctrl+C to stop)\n`);
});

server.on('error', (err) => {
    if (err.code === 'EACCES') {
        console.error(`\nERROR: Port ${PORT} requires admin privileges.`);
        console.error(`Run PowerShell as Administrator and try again.\n`);
    } else {
        console.error('Server error:', err);
    }
});
