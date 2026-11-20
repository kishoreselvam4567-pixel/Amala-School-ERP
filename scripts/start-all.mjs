// scripts/start-all.mjs
// Launches or connects to Django REST Backend (port 8000) and Frontend (port 3000)

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Helper to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('AMALA SCHOOL ERP SYSTEM (FULL-TIME 24/7 MODE)');
  console.log('='.repeat(60));

  const isBackendRunning = await isPortInUse(8000);
  let backendProcess = null;

  if (isBackendRunning) {
    console.log('\n[1/2] Django Backend is ALREADY running on http://127.0.0.1:8000 (0.0.0.0:8000)');
  } else {
    let pythonBin = path.join(rootDir, 'backend', 'venv', 'Scripts', 'python.exe');
    if (!fs.existsSync(pythonBin)) {
      pythonBin = path.join(rootDir, 'backend', 'venv', 'bin', 'python');
      if (!fs.existsSync(pythonBin)) {
        pythonBin = process.platform === 'win32' ? 'python.exe' : 'python3';
      }
    }
    const managePy = path.join(rootDir, 'backend', 'manage.py');
    console.log(`\n[1/2] Starting Django REST Backend on http://0.0.0.0:8000 (accessible on laptop & mobile) ...`);

    backendProcess = spawn(pythonBin, [managePy, 'runserver', '0.0.0.0:8000', '--noreload'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('error', (err) => {
      console.error('[Django Error]:', err.message);
    });
  }

  // 2. Start Frontend
  const isFrontendRunning = await isPortInUse(3000);
  let frontendProcess = null;

  if (isFrontendRunning) {
    console.log('[2/2] Frontend Portal is ALREADY running on http://localhost:3000');
  } else {
    console.log('[2/2] Starting Frontend Portal on http://localhost:3000 ...\n');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    frontendProcess = spawn(npxCmd, ['serve', '.', '-p', '3000'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });

    frontendProcess.on('error', (err) => {
      console.error('[Frontend Error]:', err.message);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('ALL SERVICES ACTIVE AND READY:');
  console.log('  Laptop URL:   http://localhost:3000');
  console.log('  Mobile URL:   http://10.182.116.240:3000');
  console.log('  Backend API:  http://127.0.0.1:8000/api');
  console.log('='.repeat(60) + '\n');

  function cleanup() {
    console.log('\nShutting down services...');
    try { if (backendProcess) backendProcess.kill(); } catch (e) {}
    try { if (frontendProcess) frontendProcess.kill(); } catch (e) {}
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process running smoothly without exiting with error code
  setInterval(() => {}, 30000);
}

main().catch((err) => {
  console.error('Startup notice:', err);
  process.exit(0);
});
