#!/usr/bin/env node
// Orchestrate demo export and e2e, then summarize meta cells into report.json
// macOS, Node 18+
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Excel = require('exceljs');

const ROOT = process.cwd();
const OUT_DIR = path.resolve('out/demo');
const LOG_EXPORT = path.join(OUT_DIR, 'export.log');
const LOG_E2E = path.join(OUT_DIR, 'e2e.log');
const REPORT = path.join(OUT_DIR, 'report.json');

function nowISO() { return new Date().toISOString(); }

function ensureOut() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function runWithLog(args, logPath) {
  return new Promise((resolve) => {
    const [sec, ...cmdParts] = args;
    const cmd = ['scripts/run-with-timeout.mjs', sec, cmdParts.join(' ')];
    const child = spawn('node', cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const start = nowISO();
    const ws = fs.createWriteStream(logPath, { flags: 'a' });
    child.stdout.on('data', (d) => { ws.write(d); });
    child.stderr.on('data', (d) => { ws.write(d); });
    child.on('close', (code) => {
      ws.end();
      const end = nowISO();
      resolve({ start, end, exit: code ?? 0 });
    });
  });
}

async function summarizeFiles() {
  const files = fs.existsSync(OUT_DIR)
    ? fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.xlsx')).map(f => path.join(OUT_DIR, f))
    : [];
  const results = [];
  for (const f of files) {
    try {
      const wb = new Excel.Workbook();
      await wb.xlsx.readFile(f);
      const ws = wb.getWorksheet('営業') || wb.worksheets[0];
      const get = (addr) => {
        try { return String((ws.getCell(addr)?.value ?? '')).trim(); } catch { return ''; }
      };
      let period = get('ZZ1');
      let dept = get('ZZ2');
      let member = get('ZZ3');
      let role = get('ZZ4');
      let version = get('ZZ5');

      // Fallback: scan first 5 rows to guess headers (very simple)
      if (!(period || dept || member || role || version)) {
        for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
          const row = ws.getRow(r);
          row.eachCell((cell, colNumber) => {
            const v = String(cell.value ?? '').trim();
            if (/^period$/i.test(v)) period = String(ws.getCell(r + 1, colNumber).value ?? '');
            if (/^(dept|department)$/i.test(v)) dept = String(ws.getCell(r + 1, colNumber).value ?? '');
            if (/^(code|member)$/i.test(v)) member = String(ws.getCell(r + 1, colNumber).value ?? '');
            if (/^role$/i.test(v)) role = String(ws.getCell(r + 1, colNumber).value ?? '');
            if (/^(version|tpl)$/i.test(v)) version = String(ws.getCell(r + 1, colNumber).value ?? '');
          });
        }
      }

      results.push({ file: path.resolve(f), period, department: dept, member, role, version });
    } catch (e) {
      results.push({ file: path.resolve(f), error: String(e) });
    }
  }
  return results;
}

async function main() {
  ensureOut();
  // 1) export via timeout runner
  const exp = await runWithLog(['60', 'pnpm -s export:demo'], LOG_EXPORT);
  // 2) e2e via timeout runner (CI, non-watch)
  const e2e = await runWithLog(['90', 'pnpm -s e2e'], LOG_E2E);
  // 3) summarize xlsx
  const files = await summarizeFiles();
  const report = { export: exp, e2e, files };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
  const ok = exp.exit === 0 && e2e.exit === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  ensureOut();
  const fallback = { error: String(e), at: nowISO() };
  try { fs.writeFileSync(REPORT, JSON.stringify(fallback, null, 2), 'utf8'); } catch {}
  process.exit(1);
});

