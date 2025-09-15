#!/usr/bin/env node
import { spawn } from 'node:child_process';

function now() { return new Date().toISOString(); }

function usage() {
  console.error("Usage: node scripts/run-with-timeout.mjs <seconds> \"<command>\"");
}

const [, , secArg, ...cmdParts] = process.argv;
if (!secArg || cmdParts.length === 0) { usage(); process.exit(2); }
const seconds = Number(secArg);
if (!Number.isFinite(seconds) || seconds <= 0) { console.error('[x] invalid seconds'); process.exit(2); }
const cmd = cmdParts.join(' ');

console.log(`START=${now()}`);
const child = spawn('bash', ['-lc', cmd], { stdio: 'inherit', detached: true });
let timeoutHit = false;
const timer = setTimeout(() => {
  timeoutHit = true;
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 5000);
}, seconds * 1000);

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  console.log(`END=${now()}`);
  if (timeoutHit) { console.log('EXIT=124'); process.exit(124); }
  const ec = code ?? (signal ? 128 : 0);
  console.log(`EXIT=${ec}`);
  process.exit(ec);
});

