// scripts/start-all.mjs
// Launches both Django REST Backend (port 8000) and Static Web Frontend (port 3000)

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 1. Detect Python executable
let pythonBin = path.join(rootDir, 'backend', 'venv', 'Scripts', 'python.exe');
if (!fs.existsSync(pythonBin)) {
  pythonBin = path.join(rootDir, 'backend', 'venv', 'bin', 'python');
  if (!fs.existsSync(pythonBin)) {
    pythonBin = process.platform === 'win32' ? 'python.exe' : 'python3';
  }
}

const managePy = path.join(rootDir, 'backend', 'manage.py');

console.log('='.repeat(60));
console.log('STARTING AMALA SCHOOL ERP SYSTEM (24/7 AVAILABILITY)');
console.log('='.repeat(60));
console.log(`[Python Binary]: ${pythonBin}`);
console.log(`[Manage.py]   : ${managePy}`);

// 2. Spawn Django Backend
console.log('\n[1/2] Starting Django REST Backend on http://127.0.0.1:8000 ...');
const backendProcess = spawn(pythonBin, [managePy, 'runserver', '127.0.0.1:8000'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (err) => {
  console.error('[Django Error]:', err.message);
});

// 3. Spawn Static Web Server
console.log('[2/2] Starting Frontend Portal on http://localhost:3000 ...\n');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const frontendProcess = spawn(npxCmd, ['serve', '.', '-p', '3000'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

frontendProcess.on('error', (err) => {
  console.error('[Frontend Error]:', err.message);
});

function cleanup() {
  console.log('\nShutting down Amala School ERP servers...');
  try { backendProcess.kill(); } catch (e) {}
  try { frontendProcess.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

