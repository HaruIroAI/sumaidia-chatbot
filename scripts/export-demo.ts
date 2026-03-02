/*
  Demo Excel export (ASCII logs only).
  - Loads template (primary, optional fallback)
  - Reads JSON input (members: KJ, KN, TGL, YGLH)
  - Writes four Excel files to out/demo/
  - Writes verification meta into '営業' sheet:
    ZZ1=period, ZZ2=department, ZZ3=code, ZZ4=role, ZZ5=tpl:version

  Usage:
    pnpm tsx scripts/export-demo.ts \
      --template data/templates/評価テンプレート.xlsx \
      --in data/demo/sumaidia_sales_2025Natsu.json \
      --out out/demo
*/
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Excel: any = require('exceljs');

type Member = { code: 'KJ'|'KN'|'TGL'|'YGLH'; role: 'member'|'manager'; scores: any };
type InputJSON = { period: string; department: string; members: Member[] };

function parseArgs(argv: string[]) {
  const args: Record<string,string> = {};
  for (let i=0;i<argv.length;i++) {
    const k = argv[i];
    const v = argv[i+1];
    if ((k === '--template' || k==='--in' || k==='--out') && v && !v.startsWith('--')) { args[k.slice(2)] = v; i++; }
  }
  return args;
}

function asciiLog(s: string) { console.log(s); }
function asciiErr(s: string): never { console.error(`[x] ${s}`); process.exit(1); }

async function loadTemplate(primary: string, fallback?: string): Promise<any> {
  const wb = new Excel.Workbook();
  try {
    await wb.xlsx.readFile(primary);
    return wb;
  } catch (e) {
    if (fallback && fs.existsSync(fallback)) {
      const wb2 = new Excel.Workbook();
      await wb2.xlsx.readFile(fallback);
      return wb2;
    }
    asciiErr(`template not readable: ${primary}`);
}
}

function computeVersion(wb: any): string {
  const names = wb.worksheets.map(w=>w.name).join('|');
  const hash = crypto.createHash('sha256').update(names).digest('hex').slice(0,12);
  return `tpl:${wb.worksheets.length}#${hash}`;
}

async function exportOne(wbBase: any, input: InputJSON, member: Member, outDir: string) {
  const ws = wbBase.getWorksheet('営業');
  if (!ws) asciiErr("sheet missing: 営業");
  // clone workbook by re-serializing
  const wb = new Excel.Workbook();
  const buf = await wbBase.xlsx.writeBuffer();
  await wb.xlsx.load(buf as Buffer);
  const ws2 = wb.getWorksheet('営業');
  if (!ws2) asciiErr("sheet missing after clone: 営業");
  const version = computeVersion(wb);
  // Write meta cells (far right to avoid visible collisions)
  ws2.getCell('ZZ1').value = input.period;
  ws2.getCell('ZZ2').value = input.department;
  ws2.getCell('ZZ3').value = member.code;
  ws2.getCell('ZZ4').value = member.role;
  ws2.getCell('ZZ5').value = version;

  fs.mkdirSync(outDir, { recursive: true });
  const fname = `${input.department}_${input.period}_${member.code}.xlsx`;
  const outPath = path.join(outDir, fname);
  await wb.xlsx.writeFile(outPath);
  asciiLog(`OK: ${outPath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const template = args.template || 'data/templates/評価テンプレート.xlsx';
  const fallback = 'data/templates/評価テンプレート.backup.xlsx';
  const inPath = args.in || 'data/demo/sumaidia_sales_2025Natsu.json';
  const outDir = args.out || 'out/demo';

  if (!fs.existsSync(template)) asciiErr(`missing template: ${template}`);
  const wbBase = await loadTemplate(template, fs.existsSync(fallback) ? fallback : undefined);
  const raw = fs.readFileSync(inPath, 'utf8');
  const input = JSON.parse(raw) as InputJSON;

  const order: Array<Member['code']> = ['TGL','YGLH','KJ','KN'];
  const byCode: Record<string, Member> = Object.fromEntries(input.members.map(m=>[m.code, m]));
  for (const code of order) {
    const m = byCode[code];
    if (!m) asciiErr(`member missing in JSON: ${code}`);
    await exportOne(wbBase, input, m, outDir);
  }
}

main().catch(e=>asciiErr(String(e)));
